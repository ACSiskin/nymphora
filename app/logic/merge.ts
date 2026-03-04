/**
 * Nymphora Engine — MERGE MODULE (PRO VERSION)
 * ---------------------------------------------------------------
 * Odpowiada za scalanie nowych elementów grafu (nodes + edges)
 * z istniejącymi, w sposób stabilny, deterministyczny i OSINT-friendly.
 *
 * ZMIANY:
 * - Dodano helper makeEdgeId (deterministyczne ID krawędzi)
 */

import type { ElementsDefinition } from "cytoscape"

export type NymphoraNode = {
  data: {
    id: string
    label?: string
    _type?: string
    [key: string]: any
  }
}

export type NymphoraEdge = {
  data: {
    id: string
    source: string
    target: string
    label?: string
    [key: string]: any
  }
}

export type NymphoraElements = {
  nodes: NymphoraNode[]
  edges: NymphoraEdge[]
}

/**
 * Helper do generowania deterministycznego ID krawędzi.
 * Zapobiega duplikatom wizualnym w grafie (np. przy ponownym skanie).
 * Format: edge:SOURCE:LABEL:TARGET
 */
export function makeEdgeId(source: string, target: string, label: string = ""): string {
  // Prosta sanityzacja, aby ID było bezpiecznym stringiem
  const s = source.replace(/[^a-zA-Z0-9.\-_:]/g, "")
  const t = target.replace(/[^a-zA-Z0-9.\-_:]/g, "")
  const l = label.replace(/[^a-zA-Z0-9.\-_:]/g, "")

  return `edge:${s}:${l}:${t}`
}

/**
 * Konwersja “elements” do struktury { nodes, edges }
 */
export function ensureStruct(input: ElementsDefinition): NymphoraElements {
  try {
    if (Array.isArray(input)) {
      return {
        nodes: (input as any).filter((e: any) => !("source" in (e.data ?? {}))),
        edges: (input as any).filter((e: any) => "source" in (e.data ?? {})),
      }
    }

    return {
      nodes: (input as any).nodes ?? [],
      edges: (input as any).edges ?? [],
    }
  } catch (e) {
    console.error("[merge.ensureStruct] Invalid elements payload:", e)
    return { nodes: [], edges: [] }
  }
}

/**
 * MERGE — rdzeń logiki grafowej Nymphory.
 */
export function mergeElements(
  current: ElementsDefinition,
  incoming: NymphoraElements
): NymphoraElements {
  const cur = ensureStruct(current)

  const nodeMap = new Map<string, NymphoraNode>()
  const edgeMap = new Map<string, NymphoraEdge>()

  // Wypełniamy istniejące węzły
  for (const node of cur.nodes) {
    if (!node?.data?.id) continue
    nodeMap.set(String(node.data.id), node)
  }

  // Wypełniamy istniejące krawędzie
  for (const edge of cur.edges) {
    if (!edge?.data?.id) continue
    edgeMap.set(String(edge.data.id), edge)
  }

  // MERGE: aktualizacja / nowe węzły
  for (const n of incoming.nodes) {
    const id = String(n.data?.id ?? "")
    if (!id) continue

    if (nodeMap.has(id)) {
      const existing = nodeMap.get(id)!
      // Merge properties (zachowujemy stare dane, nadpisujemy nowymi)
      existing.data = { ...existing.data, ...n.data }
    } else {
      nodeMap.set(id, n)
    }
  }

  // MERGE: krawędzie
  for (const e of incoming.edges) {
    const id = String(e.data?.id ?? "")
    const src = String(e.data?.source ?? "")
    const tgt = String(e.data?.target ?? "")

    if (!id || !src || !tgt) continue

    // Zabezpieczenie: dodajemy krawędź tylko jeśli 'src' i 'tgt' są znane
    // (są w mapie po kroku wyżej).
    if (!nodeMap.has(src) || !nodeMap.has(tgt)) {
      continue
    }

    if (!edgeMap.has(id)) {
      edgeMap.set(id, e)
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  }
}

export const emptyElements: NymphoraElements = {
  nodes: [],
  edges: [],
}
