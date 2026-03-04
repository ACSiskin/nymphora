/**
 * Nymphora Engine — TRANSFORMS MODULE 
 * ---------------------------------------------------------------
 * Odpowiada za wykonywanie transformów OSINT na pojedynczym
 * zadanym query, wraz z mapowaniem wyników do grafu.
 * * ZMIANY (Refactor):
 * - Usunięto automatyczny pivot WHOIS na domenach z adresów e-mail.
 * - E-mail traktowany jest jako punkt końcowy (dead-end) dla automatyki.
 */

import { mapDns } from "./mapDns"
import { mapWhois } from "./mapWhois"
import { mapHttpTitle } from "./mapHttpTitle"
import { mergeElements, NymphoraElements } from "./merge"
import { isDomain, isUrl, isIp } from "./detectors"

export type TransformKind = "dns" | "whois" | "http-title"

export interface TransformResult {
  mapped: NymphoraElements
  newNodeIds: string[]
}

/**
 * Wysyła zapytanie do API backendowego z obsługą błędów.
 */
async function fetchTransform(kind: TransformKind, query: string): Promise<any> {
  const url = `/api/transform/${kind}?query=${encodeURIComponent(query)}`
  try {
      const r = await fetch(url)
      if (!r.ok) return null
      return await r.json()
  } catch (e) {
      return null
  }
}

/**
 * Główna funkcja wykonująca transform na jednym query.
 */
export async function runSingleTransform(
  kind: TransformKind,
  query: string
): Promise<NymphoraElements> {
  try {
    const payload = await fetchTransform(kind, query)
    if (!payload) return { nodes: [], edges: [] }

    switch (kind) {
      case "dns":
        return mapDns(query, payload)
      case "whois":
        return mapWhois(query, payload)
      case "http-title":
        return mapHttpTitle(query, payload)
      default:
        return { nodes: [], edges: [] }
    }
  } catch (e) {
    console.warn(`[runSingleTransform] handled error for ${kind}/${query}`)
    return { nodes: [], edges: [] }
  }
}

/**
 * Pełna sekwencja transformów dla jednego query.
 */
export async function runFullTransformSequence(
  query: string,
  currentElements: NymphoraElements,
  caseId?: string | null,
  onSearchHistory?: (kind: TransformKind, q: string) => void,
  onPivot?: (info: { id: string; kind: string; count: number }) => void,
  onLog?: (msg: string) => void
): Promise<TransformResult> {
  let merged = currentElements
  let newlyAdded: string[] = []

  onLog?.(`[Transform] Analyzing node: ${query}`)

  const applyTransform = (kind: TransformKind, mapped: NymphoraElements) => {
    const beforeIds = new Set(merged.nodes.map((n) => String(n.data.id)))
    merged = mergeElements(merged, mapped)
    const afterIds = new Set(merged.nodes.map((n) => String(n.data.id)))

    const delta = [...afterIds].filter((x) => !beforeIds.has(x))
    newlyAdded.push(...delta)

    if (delta.length > 0) {
      onLog?.(`[Transform] + ${delta.length} new nodes from ${kind}`)
      onPivot?.({ id: query, kind, count: delta.length })
      onSearchHistory?.(kind, query)
    }
  }

  // =========================================================
  // LOGIKA TRANSFORMÓW (ZMODYFIKOWANA)
  // =========================================================

  // 1. Obsługa EMAIL (mailto:...)
  if (query.startsWith("mailto:")) {
      // PRO MODE: Traktujemy e-mail jako metadaną lub punkt końcowy.
      // Nie robimy automatycznego WHOIS na domenie e-maila, aby uniknąć szumu (np. gmail.com).
      onLog?.(`[Transform] Email node. No automatic pivot performed to avoid noise.`)
      return { mapped: merged, newNodeIds: newlyAdded }
  }

  // 2. Obsługa PHONE (tel:...)
  if (query.startsWith("tel:") || query.startsWith("country:")) {
      onLog?.(`[Transform] Skipping phone/country node.`)
      return { mapped: merged, newNodeIds: newlyAdded }
  }

  // 3. Obsługa DOMEN
  if (isDomain(query)) {
    onLog?.(`[Transform] Running DNS lookup...`)
    const dns = await runSingleTransform("dns", query)
    applyTransform("dns", dns)
  }

  // 4. Obsługa WHOIS (Domeny i IP)
  if (isDomain(query) || isIp(query)) {
     onLog?.(`[Transform] Running WHOIS lookup...`)
     const whois = await runSingleTransform("whois", query)
     applyTransform("whois", whois)
  }

  // 5. Obsługa HTTP
  const shouldRunHttp =
    isUrl(query) ||
    isDomain(query) ||
    (isIp(query) && !query.includes(":")) 

  if (shouldRunHttp) {
    let targetUrl = query
    if (!query.startsWith("http")) {
       targetUrl = `https://${query}`
    }
    
    onLog?.(`[Transform] Probing HTTP Title...`)
    const http = await runSingleTransform("http-title", targetUrl)
    
    if (http.nodes.length === 0 && isDomain(query)) {
        onLog?.(`[Transform] HTTPS failed, retrying Plain HTTP...`)
        const httpPlain = await runSingleTransform("http-title", `http://${query}`)
        applyTransform("http-title", httpPlain)
    } else {
        applyTransform("http-title", http)
    }
  }

  // Oznaczamy węzeł jako ZESKANOWANY
  const newNodesList = merged.nodes.map(n => {
      if (n.data.id === query) {
          return {
              ...n,
              data: { ...n.data, _scanned: true, _lastScan: Date.now() }
          }
      }
      return n
  })
  merged = { ...merged, nodes: newNodesList }

  // Batch Save (opcjonalny)
  if (caseId) {
    try {
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
    } catch (e) {
       // silent fail
    }
  }

  return {
    mapped: merged,
    newNodeIds: newlyAdded,
  }
}
