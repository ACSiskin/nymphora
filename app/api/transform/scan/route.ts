// ============================================================================
// Nymphora – Primary Scan Engine (ETAP 2 + ETAP 3 integration)
// Production Version
// Location: /app/api/transform/scan/route.ts
// ============================================================================

import { NextResponse } from "next/server"
import util from "util"
import { exec } from "child_process"

// CORE + EXTENSIONS
import { ScanCache } from "@/app/utils/scanCache"
import {
  addDnsRecord,
  addWhoisInfo,
  addHttpTitle
} from "@/app/utils/scanCacheExtensions"

const execAsync = util.promisify(exec)

// ============================================================================
// Helper – run shell command safely
// ============================================================================
async function run(cmd: string, timeout = 150000) {
  try {
    const { stdout } = await execAsync(cmd, { timeout })
    return stdout
  } catch (e: any) {
    console.error("[SCAN ERROR]", cmd, e.message)
    return null
  }
}

// ============================================================================
// Parse helpers
// ============================================================================
function parseRustNaabuPorts(raw: string | null): number[] {
  if (!raw) return []
  const m = raw.match(/\d{1,5}\/tcp/g) || []
  return m.map(p => parseInt(p.replace("/tcp", "")))
}

function parseNmap(raw: string | null) {
  if (!raw) return []

  const out: any[] = []
  const lines = raw.split("\n")

  for (const l of lines) {
    const m = l.match(/^(\d+)\/tcp\s+open\s+(\S+)/)
    if (m) {
      out.push({
        port: parseInt(m[1]),
        protocol: "tcp",
        state: "open",
        service: m[2]
      })
    }
  }

  return out
}

function parseTechnologies(raw: string | null) {
  if (!raw) return []
  const t: any[] = []

  const lines = raw.split("\n")
  for (const l of lines) {
    const m = l.match(/(\S+)\s+\(([\d\.]+)?\)/)
    if (m) {
      t.push({
        name: m[1],
        version: m[2] ?? null,
        source: "whatweb"
      })
    }
  }

  return t
}

function parseAmass(raw: string | null): string[] {
  if (!raw) return []
  return raw.split("\n").map(x => x.trim()).filter(x => x.length > 0)
}

function parseNuclei(raw: string | null) {
  if (!raw) return []

  const out: any[] = []
  const lines = raw.split("\n")

  for (const l of lines) {
    const m = l.match(/\[(critical|high|medium|low)\].*\[(CVE-[0-9\-]+)\]/i)
    if (m) {
      out.push({
        cve: m[2],
        severity: m[1],
        source: "nuclei"
      })
    }
  }

  return out
}

// ============================================================================
// MAIN POST HANDLER
// ============================================================================

export async function POST(req: Request) {
  const body = await req.json()
  const host = body.host?.trim()

  if (!host) {
    return NextResponse.json(
      { error: "Missing 'host' field" },
      { status: 400 }
    )
  }

  // NEW SCAN = RESET CACHE? 
  // NIE — ScanCache jest globalne dla całej sesji
  // Jeśli chcesz resetować przed każdym scanem:
  // ScanCache.clear()

  // ==========================================================================
  // 1. RustScan → rapid ports
  // ==========================================================================
  const rustRaw = await run(`rustscan -a ${host} --ulimit 5000`)
  const rustPorts = parseRustNaabuPorts(rustRaw)

  rustPorts.forEach(port => {
    ScanCache.addPort(host, { port, protocol: "tcp", state: "open" })
  })

  // ==========================================================================
  // 2. Naabu → confirm ports
  // ==========================================================================
  const naabuRaw = await run(`naabu -host ${host}`)
  const naabuPorts = parseRustNaabuPorts(naabuRaw)

  naabuPorts.forEach(port => {
    ScanCache.addPort(host, { port, protocol: "tcp", state: "open" })
  })

  const finalPorts = [...new Set([...rustPorts, ...naabuPorts])]

  // ==========================================================================
  // 3. Nmap → service banners
  // ==========================================================================
  if (finalPorts.length > 0) {
    const nmapRaw = await run(`nmap -sV ${host} -p ${finalPorts.join(",")}`)
    const nmapSvcs = parseNmap(nmapRaw)

    nmapSvcs.forEach(svc => ScanCache.addPort(host, svc))
  }

  // ==========================================================================
  // 4. WHATWEB → technologies
  // ==========================================================================
  const whatwebRaw = await run(`whatweb ${host} --log-verbose=-`)
  const tech = parseTechnologies(whatwebRaw)

  tech.forEach(t => ScanCache.addTechnology(host, t))

  // ==========================================================================
  // 5. AMASS → subdomains
  // ==========================================================================
  const amassRaw = await run(`amass enum -d ${host}`)
  const subs = parseAmass(amassRaw)

  subs.forEach(s => ScanCache.addSubdomain(host, s, "amass"))

  // ==========================================================================
  // 6. NUCLEI → vulnerabilities
  // ==========================================================================
  const nucleiRaw = await run(`nuclei -u ${host}`)
  const vulns = parseNuclei(nucleiRaw)

  vulns.forEach(v => ScanCache.addVulnerability(host, v))

  // ==========================================================================
  // 7. HTTP-title + favicon hash (integracja z Etap 3)
  // ==========================================================================
  // Używamy endpointu HTTP-title automatycznie
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/transform/http-title?query=${host}`
    )

    if (res.ok) {
      const { title, hash } = await res.json()
      addHttpTitle(host, title, hash)
    }
  } catch (e) {
    console.warn("HTTP-title fetch failed:", e)
  }

  // ==========================================================================
  // 8. DNS & WHOIS (opcjonalnie automatycznie po skanie)
  // ==========================================================================
  try {
    const dnsRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/transform/dns?query=${host}`
    )
    if (dnsRes.ok) {
      const { result } = await dnsRes.json()
      Object.entries(result).forEach(([type, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          addDnsRecord(host, type, values as string[])
        }
      })
    }
  } catch (e) {}

  try {
    const whoisRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/transform/whois?query=${host}`
    )
    if (whoisRes.ok) {
      const { raw } = await whoisRes.json()
      addWhoisInfo(host, raw)
    }
  } catch (e) {}

  // ==========================================================================
  // FINAL RESPONSE
  // ==========================================================================
  return NextResponse.json({
    status: "completed",
    host,
    cache: ScanCache.snapshot()
  })
}
