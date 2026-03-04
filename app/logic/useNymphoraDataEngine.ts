/**
 * Nymphora Engine — DATA ENGINE HOOK (PRO VERSION)
 * ---------------------------------------------------------------
 * Centralny silnik zarządzający danymi:
 * - Transformy: DNS/WHOIS/HTTP
 * - DeepScan (Nmap/Rustscan)
 * - AutoScan BFS (Multi-Root + Live Update)
 * - Merge logic (Cytoscape-friendly)
 * - NOVA Integration: Anomaly Detection
 */

"use client"

import { useState, useCallback, useRef, useEffect } from "react"

import { mergeElements, NymphoraElements, emptyElements } from "./merge"
import { runFullTransformSequence } from "./transforms"
import { runDeepScanEngine } from "./deepScan"
import { runAutoScanEngine } from "./autoscan"
import { detectType } from "./detectors"

export interface DataEngineOptions {
  caseId?: string | null
  onSearchHistory?: (kind: string, query: string) => void
  onPivot?: (info: { id: string; kind: string; count: number }) => void
  onGraphUpdated?: (el: NymphoraElements) => void
  // Callback do wysyłania raportu anomali do Novy
  onNovaReport?: (prompt: string) => void
  // Callback do logów konsoli
  onLog?: (msg: string) => void
}

/**
 * Funkcja przygotowuje "lekki" zrzut grafu dla modelu AI
 * aby wykryć anomalie w topologii.
 */
function detectGraphAnomalies(
  elements: NymphoraElements, 
  onNovaReport: (reportPrompt: string) => void
) {
  // 1. Filtracja: Zostawiamy tylko logikę, usuwamy pozycje i style
  const cleanNodes = elements.nodes.map(n => ({
      id: n.data.id,
      type: n.data._type,
      label: n.data.label,
  }));

  const cleanEdges = elements.edges.map(e => ({
      source: e.data.source,
      target: e.data.target,
      label: e.data.label
  }));

  // Limitujemy dane, żeby nie zabić kontekstu LLM (np. pierwsze 200 węzłów/krawędzi)
  const nodesSlice = JSON.stringify(cleanNodes.slice(0, 200));
  const edgesSlice = JSON.stringify(cleanEdges.slice(0, 300));
  const overflow = cleanNodes.length > 200 ? "... (dane przycięte)" : "";

  // 3. Budujemy SZTYWNY PROMPT dla Anomalii
  const anomalyPrompt = `
    SYSTEM: Graph Anomaly Analysis (OSINT).

You are given a graph structure of relationships in JSON format.
Your task is to detect anomalies such as:
- "Fast Flux" (many IPs resolving to a single domain in a short time).
- Connections with exotic top-level domains (TLDs) for this company.
- Unusual ports or services (if present in the data).
- Isolated clusters (islands) that do not match the rest of the infrastructure.

    GRAPH DATA::
    Nodes: ${nodesSlice} ${overflow}
    Edges: ${edgesSlice}

    RESULT:
List only the detected anomalies in bullet points. If everything appears normal, write: "No obvious anomalies in the topology."".
  `.trim();

  // 4. Wysyłamy do Novy
  onNovaReport(anomalyPrompt);
}

export function useNymphoraDataEngine(opts: DataEngineOptions = {}) {
  const { caseId, onSearchHistory, onPivot, onGraphUpdated, onNovaReport, onLog } = opts

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  /**
   * =========================
   * CORE GRAPH STATE
   * =========================
   */
  const [elements, setElements] = useState<NymphoraElements>(emptyElements)

  /**
   * =========================
   * EVIDENCE
   * =========================
   */
  const [evidenceNodes, setEvidenceNodes] = useState<{ id: string; label?: string }[]>([])

  const toggleEvidence = useCallback(
    (nodeId: string) => {
      setEvidenceNodes((prev) => {
        const exists = prev.some((e) => e.id === nodeId)
        if (exists) {
          return prev.filter((e) => e.id !== nodeId)
        }
        const node = elements.nodes.find((n) => n.data.id === nodeId)
        return [
          ...prev,
          {
            id: nodeId,
            label: node?.data.label ?? nodeId,
          },
        ]
      })
    },
    [elements]
  )

  /**
   * =========================
   * GRAPH HELPERS
   * =========================
   */
  const updateGraph = useCallback(
    (el: NymphoraElements) => {
      if (!isMounted.current) return
      setElements(el)
      onGraphUpdated?.(el)
    },
    [onGraphUpdated]
  )

  const resetGraph = useCallback(() => {
    updateGraph(emptyElements)
    setEvidenceNodes([])
  }, [updateGraph])

  const pruneGraph = useCallback(() => {
    if (!isMounted.current) return

    setElements((prev) => {
      const degrees = new Map<string, number>()
      prev.edges.forEach(e => {
        degrees.set(e.data.source, (degrees.get(e.data.source) || 0) + 1)
        degrees.set(e.data.target, (degrees.get(e.data.target) || 0) + 1)
      })

      const nodesToKeep = prev.nodes.filter(n => {
        const id = n.data.id
        const degree = degrees.get(id) || 0
        const type = n.data._type

        if (type === "DOMAIN" || type === "IP" || type === "EMAIL" || type === "PHONE") return true
        if (degree > 1) return true
        return false
      })

      const validNodeIds = new Set(nodesToKeep.map(n => n.data.id))
      const edgesToKeep = prev.edges.filter(e => 
        validNodeIds.has(e.data.source) && validNodeIds.has(e.data.target)
      )

      const pruned = { nodes: nodesToKeep, edges: edgesToKeep }
      onGraphUpdated?.(pruned)
      return pruned
    })
  }, [onGraphUpdated])

  /**
   * =========================
   * TRANSFORMS
   * =========================
   */
  const runTransform = useCallback(
    async (kind: "dns" | "whois" | "http-title", query: string) => {
      const before = elements
      const seq = await runFullTransformSequence(
        query,
        before,
        caseId,
        onSearchHistory,
        onPivot,
        onLog
      )
      updateGraph(seq.mapped)
      return seq
    },
    [elements, updateGraph, caseId, onSearchHistory, onPivot, onLog]
  )

  const runFullTransform = useCallback(
    async (query: string) => {
      const before = elements
      const seq = await runFullTransformSequence(
        query,
        before,
        caseId,
        onSearchHistory,
        onPivot,
        onLog
      )
      updateGraph(seq.mapped)
      return seq
    },
    [elements, updateGraph, caseId, onSearchHistory, onPivot, onLog]
  )

  /**
   * =========================
   * DEEP SCAN
   * =========================
   */
  const runDeepScan = useCallback(
    async (query: string) => {
      // LOG: Start
      onLog?.(`[DeepScan]  Initiating Deep Recon on target: ${query}`)
      
      const before = elements
      
      // Tutaj normalnie wywołujesz engine. 
      // Jeśli `runDeepScanEngine` obsługuje callback onLog, przekaż go tam: runDeepScanEngine(..., onLog)
      const ds = await runDeepScanEngine(
        query,
        before,
        caseId,
        onSearchHistory,
        onPivot
      )
      
      updateGraph(ds.mapped)
      
      //  LOG: Koniec
      onLog?.(`[DeepScan]  Deep Recon finished for ${query}. Nodes updated.`)
      
      return ds
    },
    [elements, updateGraph, caseId, onSearchHistory, onPivot, onLog] // Dodaj onLog do zależności!
  )

  /**
   * =========================
   * AUTO SCAN (BFS / OSINT)
   * =========================
   */
  const runAutoScan = useCallback(
    async (queryOrQueries: string | string[]) => {
      const before = elements
      const roots = Array.isArray(queryOrQueries) ? queryOrQueries : [queryOrQueries];

      const as = await runAutoScanEngine(
        roots,
        before,
        caseId,
        {
          maxDepth: 5,
          maxLayers: 10,
          delayMs: 600,
        },
        onSearchHistory,
        onPivot,
        (partialGraph) => {
            if (isMounted.current) {
                updateGraph(partialGraph)
            }
        },
        onLog //  przekazanie loggera
      )

      if (isMounted.current) {
          updateGraph(as.mapped)
          
          //  POST-SCAN: Wykrywanie anomalii
          if (onNovaReport) {
             onLog?.("[DataEngine] Running Post-Scan Anomaly Detection for Nova...")
             console.log("[DataEngine] Running Post-Scan Anomaly Detection for Nova...")
             detectGraphAnomalies(as.mapped, onNovaReport)
          }
      }
      return as
    },
    [elements, updateGraph, caseId, onSearchHistory, onPivot, onNovaReport, onLog]
  )

  const addNodes = useCallback(
    (list: any[]) => {
      const merged = mergeElements(elements, { nodes: list, edges: [] })
      updateGraph(merged)
    },
    [elements, updateGraph]
  )

  const addEdges = useCallback(
    (list: any[]) => {
      const merged = mergeElements(elements, { nodes: [], edges: list })
      updateGraph(merged)
    },
    [elements, updateGraph]
  )

  return {
    elements,
    updateGraph,
    resetGraph,
    pruneGraph,
    evidenceNodes,
    toggleEvidence,
    runTransform,
    runFullTransform,
    runDeepScan,
    runAutoScan,
    addNodes,
    addEdges,
    detectType,
  }
}
