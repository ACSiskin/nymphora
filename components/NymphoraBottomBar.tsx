"use client"

import React, { useRef, useEffect } from "react"
import { useNymphoraConsole } from "./NymphoraConsoleContext"

import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown } from "lucide-react"


import { DeepReconPanel } from "./console/deep/DeepReconPanel"

export default function NymphoraBottomBar() {
  const { isOpen, toggle, logs, ports, raw, jobs } = useNymphoraConsole()

  const [hydrated, setHydrated] = React.useState(false)
  
  // Auto-scroll ref dla logów głównych
  const logsEndRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => setHydrated(true), [])

  // Auto-scroll effect
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, isOpen])

  if (!hydrated) return null

  return (
    <div
      className={cn(
        "fixed z-[999] transition-all duration-200",
        "left-[18rem] right-0",
        isOpen ? "bottom-0 h-[440px]" : "bottom-0 h-[45px]"
      )}
    >
      <Card className="h-full border-t bg-card/95 backdrop-blur-sm shadow-inner rounded-none flex flex-col">
        {/* Header */}
        <div
          onClick={toggle}
          className="
            flex items-center justify-between 
            px-3 border-b cursor-pointer select-none h-[20px] flex-shrink-0
            hover:bg-white/5 transition-colors
          "
        >
          <span className="text-xs opacity-80 font-semibold tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500/50 animate-pulse" />
            Nymphora Console
          </span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 opacity-70" />
          ) : (
            <ChevronUp className="w-4 h-4 opacity-70" />
          )}
        </div>

        {isOpen && (
          <Tabs defaultValue="deep" className="flex-1 flex flex-col min-h-0">
            <div className="px-3 border-b bg-black/20">
                <TabsList className="h-9 bg-transparent p-0">
                  <TabsTrigger value="logs" className="text-xs h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">Logs</TabsTrigger>
                  <TabsTrigger value="deep" className="text-xs h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent">Deep Recon</TabsTrigger>

                  <TabsTrigger value="jobs" className="text-xs h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent">Jobs</TabsTrigger>
                </TabsList>
            </div>

            {/* ─────────────────────────────────────────────── */}
            {/* DEEP RECON */}
            {/* ─────────────────────────────────────────────── */}
            <TabsContent value="deep" className="flex-1 overflow-hidden p-0 m-0 data-[state=inactive]:hidden">
               <DeepReconPanel />
            </TabsContent>

            {/* ─────────────────────────────────────────────── */}
            {/* PORTS */}
            {/* ─────────────────────────────────────────────── */}
            <TabsContent value="ports" className="flex-1 overflow-y-auto p-3 text-xs space-y-1 m-0">
              {ports.length === 0 ? (
                <div className="opacity-60 italic">No open ports detected.</div>
              ) : (
                ports.map((p, i) => (
                  <div key={i} className="flex justify-between border-b border-white/5 pb-1 hover:bg-white/5 px-2 rounded">
                    <span className="font-mono text-emerald-400">
                      {p.port}/{p.protocol}
                    </span>
                    <div className="flex gap-3">
                        <span className="opacity-80">{p.service}</span>
                        <span className="opacity-50 text-[10px] uppercase border px-1 rounded border-white/10">{p.state}</span>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* ─────────────────────────────────────────────── */}
            {/* LOGS */}
            {/* ─────────────────────────────────────────────── */}
            <TabsContent value="logs" className="flex-1 overflow-y-auto p-3 text-xs font-mono m-0 pb-10">
              {logs.map((l, i) => {
                 let colorClass = "opacity-80"
                 if (l.text.includes("[ERROR]") || l.text.includes("Error") || l.text.startsWith("[!]")) colorClass = "text-red-400"
                 else if (l.text.includes("Finished") || l.text.includes("Success") || l.text.startsWith("[+]")) colorClass = "text-emerald-400"
                 else if (l.text.includes("[DeepScan]")) colorClass = "text-orange-400"
                 
                 return (
                    <div key={i} className={cn("border-b border-white/5 pb-0.5 mb-0.5 break-all flex gap-2", colorClass)}>
                      <span className="opacity-30 flex-shrink-0 select-none">
                        {new Date(l.ts).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute:"2-digit", second:"2-digit" })}
                      </span> 
                      <span>{l.text}</span>
                    </div>
                 )
              })}
              <div ref={logsEndRef} />
            </TabsContent>

            {/* ─────────────────────────────────────────────── */}
            {/* RAW & JOBS */}
            {/* ─────────────────────────────────────────────── */}
            <TabsContent value="raw" className="flex-1 overflow-y-auto p-3 text-xs m-0">
              {raw.map((r, i) => (
                <pre key={i} className="text-[10px] bg-black/30 p-2 rounded border border-white/10 mb-2 overflow-x-auto">
                  {JSON.stringify(r.payload, null, 2)}
                </pre>
              ))}
            </TabsContent>

            <TabsContent value="jobs" className="flex-1 overflow-y-auto p-3 text-xs m-0">
              {jobs.map((j, i) => (
                <div key={i} className="border-b border-white/5 pb-1 mb-1">
                  <span className="opacity-50 mr-2">[{new Date(j.ts).toLocaleTimeString()}]</span> 
                  <span className="font-semibold text-blue-300">{j.name}</span> → {j.target}
                </div>
              ))}
            </TabsContent>

          </Tabs>
        )}
      </Card>
    </div>
  )
}
