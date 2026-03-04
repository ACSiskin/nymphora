/**
 * Nymphora Engine — DEEP SCAN MODULE (PRO VERSION)
 * ---------------------------------------------------------------
 * Obsługuje pełny tryb skanowania portów/usług.
 *
 * API endpoint (backend):
 *   /api/nymphora/transform/scan?query=<host>
 *
 * Zakładamy, że backend może zwrócić elementy w formacie:
 * [
 *   { type: "node", data: { id, label, _type, ... } },
 *   { type: "edge", data: { id, source, target, label } }
 * ]
 *
 * Moduł:
 *  - Parsuje wynik skanu
 *  - Filtruje SERVICE nodes (opcjonalnie: można zachować)
 *  - Tworzy mapę do grafu
 *  - Zwraca newNodeIds → ID nowych pivotów
 */

import { mergeElements, NymphoraElements } from "./merge"
import { detectType } from "./detectors"

export interface DeepScanResult {
  mapped: NymphoraElements
  newNodeIds: string[]
  raw?: any
}

/**
 * Pobiera raw z backendu.
 */
async function fetchDeepScan(query: string): Promise<any> {
  const url = `/api/transform/scan?query=${encodeURIComponent(query)}`
  
  const r = await fetch(url)
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`DeepScan failed: ${txt}`)
  }

  return await r.json()
}

/**
 * Główna funkcja obsługująca Deep Scan.
 * Zwraca elementy zgodne z cytoscape + listę nowych węzłów.
 */
export async function runDeepScanEngine(
  query: string,
  current: NymphoraElements,
  caseId?: string | null,
  onSearchHistory?: (kind: "scan", q: string) => void,
  onPivot?: (info: { id: string; kind: string; count: number }) => void
): Promise<DeepScanResult> {
  try {
    const raw = await fetchDeepScan(query)
    const nodes: any[] = []
    const edges: any[] = []

    // root node
    nodes.push({
      data: {
        id: query,
        label: query,
        _type: detectType(query),
      },
    })

    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item.type === "node") {
          const t = (item.data?._type ?? "").toUpperCase()
          
          // Jeżeli SERVICE – zdecyduj, czy używać czy nie
          if (t === "SERVICE" || t === "PORT" || t === "NMAP-SERVICE") {
            // albo odrzuć i trzymaj w sidebarze
            continue
          }

          nodes.push({
            data: {
              ...item.data,
              id: String(item.data.id),
              label: item.data.label ?? item.data.id,
            },
          })
        }

        if (item.type === "edge") {
          if (!item.data?.source || !item.data?.target) continue

          edges.push({
            data: {
              id: String(item.data.id ?? crypto.randomUUID()),
              source: String(item.data.source),
              target: String(item.data.target),
              label: item.data.label ?? "",
            },
          })
        }
      }
    }

    /** MERGE z grafem głównym */
    const before = new Set(current.nodes.map((n) => String(n.data.id)))
    const merged = mergeElements(current, { nodes, edges })
    const after = new Set(merged.nodes.map((n) => String(n.data.id)))

    const newNodes = [...after].filter((x) => !before.has(x))

    onSearchHistory?.("scan", query)
    onPivot?.({ id: query, kind: "scan", count: newNodes.length })

    /** Opcjonalny zapis batch do sprawy */
    if (caseId) {
      fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          entities: merged.nodes.map((n) => ({
            type: n.data._type,
            value: n.data.id,
            label: n.data.label,
            data: n.data,
          })),
          edges: merged.edges.map((e) => ({
            sourceValue: e.data.source,
            targetValue: e.data.target,
            type: e.data.label ?? "",
          })),
        }),
      })
    }

    return { mapped: merged, newNodeIds: newNodes, raw }
  } catch (e) {
    console.error("[runDeepScanEngine] error:", e)
    return { mapped: current, newNodeIds: [] }
  }
}
