"use client"

import React from "react"
import { useNymphoraConsole } from "../../NymphoraConsoleContext"


export function DeepReconLogs() {
  const { consoleMessages } = useNymphoraConsole()

  // pobieramy tylko logi deep-recon
  const logs = consoleMessages.filter((m) => m.type === "deep-recon")

  // jeśli brak logów
  if (logs.length === 0) {
    return (
      <div className="text-xs p-3 opacity-60">
        No Deep Recon logs yet…
      </div>
    )
  }

  return (
    <div className="p-3 text-xs font-mono whitespace-pre-wrap overflow-y-auto h-full">

      {logs.map((msg) => (
        <div
          key={msg.id}
          className="mb-4 pb-3 border-b border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold opacity-80">
              {msg.tool}
            </span>
            <span className="opacity-50">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Treść logu */}
          <pre className="text-[11px] leading-tight whitespace-pre-wrap break-all">
            {msg.content}
          </pre>
        </div>
      ))}

    </div>
  )
}
