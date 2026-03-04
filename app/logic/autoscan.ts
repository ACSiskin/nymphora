/**
 * Nymphora Engine — AUTOSCAN MODULE (PRO VERSION)
 */

import { NymphoraElements } from "./merge"
import { runFullTransformSequence } from "./transforms"

export interface AutoScanOptions {
  maxDepth?: number
  maxLayers?: number
  delayMs?: number
}

export interface AutoScanResult {
  mapped: NymphoraElements
  scanned: string[]
  errors: string[]
}

// Typy, po których crawler może "chodzić" (tylko twarda infra)
const ALLOWED_BFS_TYPES = new Set(["DOMAIN", "IP", "ASN", "CIDR"])

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function runAutoScanEngine(
  rootQueries: string[], 
  current: NymphoraElements,
  caseId?: string | null,
  opts: AutoScanOptions = {},
  onSearchHistory?: (kind: any, q: string) => void,
  onPivot?: (info: any) => void,
  onGraphUpdate?: (elements: NymphoraElements) => void,
  onLog?: (msg: string) => void
): Promise<AutoScanResult> {
  const maxDepth = opts.maxDepth ?? 10
  const maxLayers = opts.maxLayers ?? 15
  const delayMs = opts.delayMs ?? 500 

  let merged = current
  const visited = new Set<string>()
  const scanned: string[] = []
  const errors: string[] = []

  // Setup kolejki
  const queue: { id: string; depth: number }[] = rootQueries.map(q => ({ id: q, depth: 0 }))
  rootQueries.forEach(q => visited.add(q))

  onLog?.(`[AutoScan] Started. Queue: ${queue.length}. Strict Mode: ON`)

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!

    if (depth > maxDepth) continue
    if (scanned.length > maxLayers * 25) {
        onLog?.(`[AutoScan] Limit reached.`)
        break 
    }

    scanned.push(id)

    try {
      onLog?.(`[AutoScan] Scanning: ${id}`)

      const result = await runFullTransformSequence(
        id,
        merged,
        caseId,
        onSearchHistory,
        onPivot,
        onLog
      )

      const before = new Set(merged.nodes.map((n) => n.data.id))
      merged = result.mapped
      const after = new Set(merged.nodes.map((n) => n.data.id))

      // Aktualizuj UI natychmiast
      if (onGraphUpdate) {
        onGraphUpdate(merged)
      }

      // Sprawdź co nowego doszło
      const allNewIds = [...after].filter((x) => !before.has(x))
      
      let addedCount = 0
      for (const nxtId of allNewIds) {
        if (visited.has(nxtId)) continue

        const nodeObj = merged.nodes.find(n => n.data.id === nxtId)
        const type = String(nodeObj?.data?._type || "OTHER").toUpperCase()

        // Decyzja o pivotowaniu:
        // Dodajemy do grafu WSZYSTKO (już dodane w merged),
        // ale do kolejki skanowania tylko INFRASTRUKTURĘ.
        if (ALLOWED_BFS_TYPES.has(type)) {
            visited.add(nxtId)
            queue.push({ id: nxtId, depth: depth + 1 })
            addedCount++
        }
      }

      if (allNewIds.length > 0) {
        if (addedCount > 0) {
             onLog?.(`[AutoScan] +${allNewIds.length} nodes found (${addedCount} queued for deep scan)`)
        } else {
             // To wyjaśni użytkownikowi dlaczego skanowanie staje:
             onLog?.(`[AutoScan] +${allNewIds.length} nodes found (endpoints only - no new infrastructure to pivot)`)
        }
      } else {
        onLog?.(`[AutoScan] No new nodes found for ${id}`)
      }

      await sleep(delayMs)

    } catch (e) {
      console.error(e)
      onLog?.(`[AutoScan] Error: ${String(e)}`)
      errors.push(`${id}: ${String(e)}`)
    }
  }

  onLog?.(`[AutoScan] Finished.`)
  return {
    mapped: merged,
    scanned,
    errors,
  }
}
