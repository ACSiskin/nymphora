import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { addHttpTitle } from "@/app/utils/scanCacheExtensions"

// Wymuszenie dynamiczności (ważne dla skanerów)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query")

  if (!query) {
    return NextResponse.json({ error: "Missing ?query=" }, { status: 400 })
  }

  // Normalizacja URL: domyślnie http jeśli brak protokołu (bezpieczniej dla IP)
  let target = query;
  if (!target.startsWith("http")) {
    target = `http://${target}`;
  }

  // Kontroler timeoutu dla głównego zapytania
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sekundy timeout

  try {
    const res = await fetch(target, { 
        redirect: "follow",
        signal: controller.signal,
        headers: {
            "User-Agent": "Mozilla/5.0 (compatible; NymphoraBot/1.0; +https://nymphora.io)"
        },
        // Opcjonalne ignorowanie SSL dla node-fetch (jeśli środowisko na to pozwala)
        // @ts-ignore
        dispatcher: undefined 
    })
    
    clearTimeout(timeoutId);

    // Jeśli status nie jest 2xx, zwracamy info o błędzie HTTP celu, ale sam endpoint zwraca 200
    if (!res.ok) {
        return NextResponse.json({ 
            url: target, 
            title: `[HTTP ${res.status}]`, 
            error: `Status ${res.status}`,
            hash: null 
        }, { status: 200 });
    }

    const html = await res.text()

    // Ekstrakcja Tytułu
    let title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ""
    if (!title) title = target; // Fallback do URL
    if (title.length > 100) title = title.substring(0, 97) + "..."; // Przycinanie

    // -------------------------
    // FAVICON LOGIC (Fail-safe)
    // -------------------------
    let hash: string | null = null;
    let iconUrl: string | null = null;

    try {
        const iconHref =
        html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
        "/favicon.ico"

        iconUrl = iconHref.startsWith("http")
        ? iconHref
        : new URL(iconHref, target).toString()

        // Krótki timeout na favicon (1s) - nie chcemy blokować głównego wątku
        const iconController = new AbortController();
        const iconTimeout = setTimeout(() => iconController.abort(), 1000);

        const iconRes = await fetch(iconUrl, { signal: iconController.signal }).catch(() => null)
        clearTimeout(iconTimeout);

        const buf = iconRes && iconRes.ok ? Buffer.from(await iconRes.arrayBuffer()) : Buffer.from([])
        hash = buf.length ? crypto.createHash("md5").update(buf).digest("hex") : null
    } catch (iconErr) {
        // Ignorujemy błędy favicony
        console.warn(`[Favicon] Failed for ${target}`, iconErr);
    }

    // -------------------------
    // Write to Scan Cache
    // -------------------------
    // Używamy try/catch, żeby błąd cache'u nie wywalił odpowiedzi API
    try {
        addHttpTitle(target, title, hash)
    } catch (cacheErr) {
        console.error("Cache update failed:", cacheErr);
    }

    return NextResponse.json({ url: target, title, favicon: iconUrl, hash })

  } catch (e: any) {
    // ERROR HANDLING - Zwracamy 200 OK z polem error
    // Dzięki temu frontend nie dostaje 500 i nie przerywa AutoScan.
    
    let userMsg = e.message;
    if (e.name === 'AbortError') userMsg = "Timeout (3s)";
    if (e.message.includes("certificate")) userMsg = "SSL Error";
    if (e.message.includes("ECONNREFUSED")) userMsg = "Connection Refused";

    console.log(`[HTTP Fail] ${target}: ${userMsg}`);

    return NextResponse.json({ 
        url: target, 
        title: null, 
        error: userMsg,
        hash: null 
    }, { status: 200 }) // Ważne: status 200, żeby klient obsłużył JSON
  }
}
