"use client"

import { useCallback } from "react"
import { useNymphoraConsole } from "../../NymphoraConsoleContext"
import { nanoid } from "nanoid"

//  NOWY INTERFEJS (zgodny z NymphoraReport)
interface StealthReport {
  target: string;
  metadata: {
    hostname?: string;
    os?: string;
    scanDuration: number;
    timestamp: string;
  };
  network?: any[];      // Było ports
  stack?: any[];        // Było webTechnologies
  attribution?: any;    // Było whois
}

export function useDeepReconRouter() {
  const { addConsoleMessage } = useNymphoraConsole()

  const publishLog = useCallback((tool: string, content: string, target: string) => {
    addConsoleMessage({
      id: nanoid(),
      type: "deep-recon",
      tool: tool,
      content: content,
      timestamp: Date.now(),
      target: target
    })
  }, [addConsoleMessage])

  const applyDeepRecon = useCallback((rawResult: any) => {
    // Obsługa przypadku, gdy dane przychodzą z bazy (wrapped in .data) lub prosto z API
    const result = (rawResult.data ? rawResult.data : rawResult) as StealthReport
    
    if (!result || !result.target) return

    const target = result.target

    // 1. Log Systemowy
    publishLog(
      "system",
      `Analysis completed for: ${target}\nDuration: ${result.metadata?.scanDuration?.toFixed(2)}s\nOS: ${result.metadata?.os || "Unknown"}`,
      target
    )

    // 2. Analiza Sieciowa (Ports/Nmap)
    if (result.network && result.network.length > 0) {
      // Szybki podgląd dla RustScan
      const openPorts = result.network.map(s => s.port).join(", ")
      publishLog("rustscan", `Detected open ports: [${openPorts}]`, target)

      // Detale dla Nmapa
      let nmapLog = "Detailed service analysis:\n"
      result.network.forEach(s => {
        nmapLog += `➜ ${s.port}/${s.protocol.toUpperCase()} [${s.name}]\n`
        if (s.product) nmapLog += `   Product: ${s.product} ${s.version || ""}\n`
        //  Tu przywracamy bogate info ze skryptów
        if (s.details) {
            // Czyścimy puste linie, żeby log był zwarty
            const cleanDetails = s.details.split('\n').filter((l: string) => l.trim().length > 0).join('\n   ')
            nmapLog += `   Info: ${cleanDetails}\n`
        }
      })
      publishLog("nmap", nmapLog, target)
    } else {
      publishLog("nmap", "No open network services detected (Filtered/Closed).", target)
    }

    // 3. Stos Aplikacyjny (WhatWeb)
    if (result.stack && result.stack.length > 0) {
      let webLog = "Detected technologies:\n"
      result.stack.forEach(t => {
        webLog += `● ${t.name}`
        if (t.version) webLog += ` (v${t.version})`
        webLog += "\n"
      })
      publishLog("whatweb", webLog, target)
    }

    // 4. Atrybucja (Whois)
    if (result.attribution) {
        let whoisLog = "Registration details:\n"
        if (result.attribution.registrar) whoisLog += `Registrar: ${result.attribution.registrar}\n`
        if (result.attribution.contactEmails?.length) whoisLog += `Emails: ${result.attribution.contactEmails.join(", ")}\n`
        publishLog("whois", whoisLog, target)
    }

  }, [publishLog])

  return {
    applyDeepRecon
  }
}
