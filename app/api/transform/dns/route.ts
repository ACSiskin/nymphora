// app/api/transform/dns/route.ts

import { NextRequest, NextResponse } from "next/server"
import { promises as dns } from "node:dns"
import { addDnsRecord } from "@/app/utils/scanCacheExtensions"

// Wymuszenie dynamiczności
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const domain = searchParams.get("query")?.trim()

  if (!domain) {
    return NextResponse.json({ error: "Missing ?query=" }, { status: 400 })
  }

  try {
    // Ustawiamy timeout na całą operację DNS (np. 5 sekund)
    // Promise.race zwróci wynik lub rzuci błędem po 5s
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("DNS Timeout (5s)")), 5000)
    );

    const lookupPromise = (async () => {
        // Równoległe pobieranie rekordów (Fail-Safe per rekord)
        const [A, AAAA, MX, NS, CNAME] = await Promise.allSettled([
            dns.resolve4(domain),
            dns.resolve6(domain),
            dns.resolveMx(domain),
            dns.resolveNs(domain),
            dns.resolveCname(domain)
        ])

        return {
            A: A.status === "fulfilled" ? A.value : [],
            AAAA: AAAA.status === "fulfilled" ? AAAA.value : [],
            MX: MX.status === "fulfilled" ? MX.value.map(x => x.exchange) : [],
            NS: NS.status === "fulfilled" ? NS.value : [],
            CNAME: CNAME.status === "fulfilled" ? CNAME.value : []
        }
    })();

    // Wyścig z czasem
    const out = await Promise.race([lookupPromise, timeoutPromise]) as any;

    // -------------------------
    // Write to Scan Cache
    // -------------------------
    // Zabezpieczamy zapis do cache, żeby błąd bazy nie uwalił odpowiedzi
    try {
        Object.entries(out).forEach(([type, values]) => {
            if (Array.isArray(values) && values.length > 0) {
                addDnsRecord(domain, type, values as string[])
            }
        })
    } catch (cacheErr) {
        console.warn("[DNS Cache] Failed to write", cacheErr)
    }

    return NextResponse.json({ domain, result: out })

  } catch (e: any) {
    //  FAIL-SAFE: Zwracamy 200 OK nawet przy błędzie
    console.error(`[DNS] Failed for ${domain}:`, e.message)
    
    let msg = e.message;
    if (e.code === 'ENOTFOUND') msg = "Domain not found";
    if (e.code === 'ESERVFAIL') msg = "DNS Server Failure";

    return NextResponse.json({ 
        domain, 
        result: {}, // Pusty wynik = brak węzłów, ale skan idzie dalej
        error: msg 
    }, { status: 200 })
  }
}
