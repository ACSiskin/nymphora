"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { nanoid } from "nanoid"

// ─────────────────────────────────────────────
// Typy
// ─────────────────────────────────────────────
type LogEntry = { ts: number; text: string }
type PortEntry = {
  port: number
  protocol: string
  state: string
  service?: string
  banner?: string
}
type RawEntry = { ts: number; payload: any }
type JobEntry = { ts: number; name: string; target: string; status: string }

export type ConsoleMessage = {
  id: string
  type: string
  tool: string
  content: string
  timestamp: number
  scanId?: string
  target?: string
}

// ─────────────────────────────────────────────
// Typ kontekstu
// ─────────────────────────────────────────────
type ConsoleContextType = {
  isOpen: boolean
  toggle: () => void

  bottomOffset: number
  setBottomOffset: (v: number) => void

  logs: LogEntry[]
  addLog: (text: string) => void

  ports: PortEntry[]
  addPorts: (ports: PortEntry[]) => void

  raw: RawEntry[]
  addRaw: (payload: any) => void

  jobs: JobEntry[]
  addJob: (name: string, target: string) => void

  consoleMessages: ConsoleMessage[]
  addConsoleMessage: (msg: ConsoleMessage) => void

  deepResult: any | null
  setDeepResult: (v: any) => void

  clear: () => void
}

const NymphoraConsoleContext = createContext<ConsoleContextType | null>(null)

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function NymphoraConsoleProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [bottomOffset, setBottomOffset] = useState(38)

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [ports, setPorts] = useState<PortEntry[]>([])
  const [raw, setRaw] = useState<RawEntry[]>([])
  const [jobs, setJobs] = useState<JobEntry[]>([])
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])

  //  state dla pełnych wyników Deep Recon
  const [deepResult, setDeepResult] = useState<any>(null)

  //  dynamiczne dopasowanie wysokości bottom baru
  useEffect(() => {
    setBottomOffset(isOpen ? 320 : 38)
  }, [isOpen])

  // ─────────────────────────────────────────────
  // Główna logika przechwytywania wiadomości
  // ─────────────────────────────────────────────
  const addConsoleMessage = (msg: ConsoleMessage) => {
    // przechwytywanie kompletnego JSON z deep scan
    if (msg.type === "deep-result") {
      try {
        const parsed = JSON.parse(msg.content)
        setDeepResult(parsed)
      } catch (e) {
        console.error("Failed to parse deep-result JSON:", e)
      }
    }

    // dodanie message do listy
    setConsoleMessages((m) => [...m, { ...msg, id: msg.id || nanoid() }])
  }

  return (
    <NymphoraConsoleContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen((v) => !v),

        bottomOffset,
        setBottomOffset,

        logs,
        addLog: (text) => setLogs((l) => [...l, { ts: Date.now(), text }]),

        ports,
        addPorts: (p) => setPorts((prev) => [...prev, ...p]),

        raw,
        addRaw: (payload) =>
          setRaw((r) => [...r, { ts: Date.now(), payload }]),

        jobs,
        addJob: (name, target) =>
          setJobs((j) => [
            ...j,
            { ts: Date.now(), name, target, status: "done" },
          ]),

        consoleMessages,
        addConsoleMessage,

        // NOWE:
        deepResult,
        setDeepResult,

        clear: () => {
          setLogs([])
          setPorts([])
          setRaw([])
          setJobs([])
          setConsoleMessages([])
          setDeepResult(null)
        },
      }}
    >
      {children}
    </NymphoraConsoleContext.Provider>
  )
}

export const useNymphoraConsole = () => {
  const ctx = useContext(NymphoraConsoleContext)
  if (!ctx) throw new Error("Console context missing")
  return ctx
}
