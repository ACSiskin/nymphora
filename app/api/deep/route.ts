// app/api/deep/route.ts

import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import { nanoid } from "nanoid"

const sh = promisify(exec)

async function safeRun(tool: string, cmd: string, result: any) {
  try {
    await emitConsole(tool, `>>> START ${tool}: ${cmd}`)
    const { stdout, stderr } = await sh(cmd, {
      timeout: 90000,
      maxBuffer: 1024 * 1024 * 20,
    })

    if (stdout) await emitConsole(tool, stdout)
    if (stderr) await emitConsole(tool, "STDERR:\n" + stderr)

    result[tool] = stdout || stderr || null
    return stdout || stderr
  } catch (err: any) {
    await emitConsole(tool, "ERROR:\n" + err.toString())
    result[tool] = "ERROR: " + err.toString()
    return null
  }
}

// logi bieżące
async function emitConsole(tool: string, content: string) {
  try {
    await fetch("http://localhost:3002/api/console", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "deep-recon",
        tool,
        content,
        timestamp: Date.now(),
      }),
    })
  } catch (err) {
    console.error("Emit console error:", err)
  }
}

// finalny wynik w strukturze wymaganej przez useDeepReconRouter.ts
async function emitResultStructured(result: any, target: string) {
  const scanId = nanoid()

  const payload = {
    scanId,
    target,

    ports: {
      rustscan: result.rustscan,
      naabu: result.naabu,
      nmap: result.nmap,
    },

    web: {
      whatweb: result.whatweb,
    },

    dns: result.dns,
    whois: result.whois,

    subdomains: result.subdomains || [],

    vulnerabilities: {
      nuclei: result.nuclei,
    },
  }

  try {
    await fetch("http://localhost:3002/api/console", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "deep-result",
        tool: "deep-scan",
        content: JSON.stringify(payload),
        target,
        timestamp: Date.now(),
      }),
    })
  } catch (err) {
    console.error("Emit deep-result error:", err)
  }
}

export async function POST(req: Request) {
  const { target, options } = await req.json()

  if (!target) {
    return NextResponse.json(
      { error: "Missing target parameter" },
      { status: 400 }
    )
  }

  const result: any = {
    target,
    ports: [],
    services: [],
    rustscan: null,
    naabu: null,
    nmap: null,
    whatweb: null,
    dns: null,
    whois: null,
    nuclei: null,
  }

  try {
    // RUSTSCAN
    const rust = await safeRun(
      "rustscan",
      `rustscan -a ${target} --ulimit 5000`,
      result
    )

    if (rust) {
      const rustPorts = rust
        .split("\n")
        .filter((l: any) => l.includes("Open"))
        .map((l: any) => {
          try {
            const p = l.split(":")[2]?.trim()
            return { port: Number(p), protocol: "tcp", state: "open" }
          } catch {
            return null
          }
        })
        .filter(Boolean)

      result.ports.push(...rustPorts)
    }

    // NAABU
    const naabu = await safeRun(
      "naabu",
      `naabu -host ${target} -p - -rate 5000`,
      result
    )

    if (naabu) {
      const naabuPorts = naabu
        .split("\n")
        .filter((l: any) => l.includes(":"))
        .map((l: any) => ({
          port: Number(l.split(":")[1]),
          protocol: "tcp",
          state: "open",
        }))
      result.ports.push(...naabuPorts)
    }

    // dedupe
    result.ports = Array.from(
      new Map(result.ports.map((p: any) => [`${p.port}/${p.protocol}`, p])).values()
    )

    // NMAP
    const portList = result.ports.map((p: any) => p.port).join(",") || "1-1000"
    const nmap = await safeRun(
      "nmap",
      `nmap -sV -sC -Pn -p ${portList} ${target}`,
      result
    )

    if (nmap) {
      const services: any[] = []
      for (const line of nmap.split("\n")) {
        if (line.match(/^[0-9]+\/tcp/)) {
          const [port, state, service] = line.trim().split(/\s+/)
          services.push({ port, state, service })
        }
      }
      result.services = services
    }

    // WHATWEB
    const ww = await safeRun(
      "whatweb",
      `whatweb ${target} --log-json=-`,
      result
    )
    try {
      result.whatweb = JSON.parse(ww)
    } catch {
      result.whatweb = ww
    }

    // DNS
    const dnsA = await safeRun("dns-A", `dig +short A ${target}`, result)
    const dnsMX = await safeRun("dns-MX", `dig +short MX ${target}`, result)
    const dnsNS = await safeRun("dns-NS", `dig +short NS ${target}`, result)
    const dnsTXT = await safeRun("dns-TXT", `dig +short TXT ${target}`, result)

    result.dns = {
      A: dnsA?.trim().split("\n").filter(Boolean) || [],
      MX: dnsMX?.trim().split("\n").filter(Boolean) || [],
      NS: dnsNS?.trim().split("\n").filter(Boolean) || [],
      TXT: dnsTXT?.trim().split("\n").filter(Boolean) || [],
    }

    // WHOIS
    await safeRun("whois", `whois ${target}`, result)

    // NUCLEI
    if (options?.nuclei) {
      await safeRun(
        "nuclei",
        `nuclei -u ${target} -severity medium,high,critical`,
        result
      )
    }

    // FINAL PAYLOAD → zgodny z routerem
    await emitResultStructured(result, target)

    return NextResponse.json({ ok: true, result })
  } catch (err: any) {
    await emitConsole("fatal", err.toString())
    return NextResponse.json(
      { error: err.toString() },
      { status: 500 }
    )
  }
}
