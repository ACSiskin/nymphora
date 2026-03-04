// app/api/transform/whois/route.ts

import { NextRequest, NextResponse } from "next/server"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { z } from "zod"
import { addWhoisInfo } from "@/app/utils/scanCacheExtensions"

// Wymuszenie dynamiczności
export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile)

// Walidacja: tylko litery, cyfry, kropki i myślniki (zapobiega command injection)
const Input = z.object({
  query: z.string().trim().regex(/^[a-zA-Z0-9.\-:]+$/, "Invalid chars in query")
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const queryRaw = searchParams.get("query") ?? ""

  // 1. Walidacja Inputu
  const parsed = Input.safeParse({ query: queryRaw })
  if (!parsed.success) {
    // Zwracamy 200 z błędem, żeby nie kruszyć UI
    return NextResponse.json({ error: "Invalid Input" }, { status: 200 })
  }

  const target = parsed.data.query

  try {
    // 2. Wykonanie WHOIS (Timeout 8s - kompromis między szybkością a dokładnością)
    const { stdout } = await execFileAsync("whois", [target], {
      timeout: 8000, 
      maxBuffer: 1024 * 1024 // 1MB buffer limit
    })

    // 3. Zapis do Cache (Fail-safe)
    try {
        addWhoisInfo(target, stdout)
    } catch (cacheErr) {
        console.warn("[Cache] WHOIS write failed", cacheErr)
    }

    // 4. Return
    // Zwracamy w formacie, który mapWhois.ts łatwo "przełknie"
    return NextResponse.json({ 
        query: target, 
        result: {
            raw: stdout,
            // Możemy tu dodać wstępnie sparsowane pola jeśli chcemy, 
            // ale Twój mapWhois.ts robi to regexami po całości payloadu.
        }
    })

  } catch (e: any) {
    // FAIL-SAFE ERROR HANDLING
    // Jeśli komenda whois zwróci exit code 1 (np. brak domeny) lub timeout
    console.error(`[WHOIS] Failed for ${target}:`, e.message)

    let msg = e.message || "Unknown error"
    
    // Obsługa braku binary 'whois' na serwerze
    if (e.code === 'ENOENT') {
        msg = "Server missing 'whois' binary"
    }
    // Obsługa Timeoutu
    if (e.signal === 'SIGTERM') {
        msg = "Timeout (8s)"
    }

    // Zwracamy status 200, żeby AutoScan szedł dalej
    return NextResponse.json({ 
        query: target, 
        error: msg,
        result: null
    }, { status: 200 })
  }
}
