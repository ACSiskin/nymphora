/**
 * Nymphora Engine — HTTP Title Mapping Module (PRO VERSION)
 * ---------------------------------------------------------------
 * ZMIANY:
 * - Dodano tworzenie krawędzi (LINK) między URL a jego źródłem (domain/ip).
 * - Zapobiega to powstawaniu "wiszących" węzłów na grafie.
 */

import type { NymphoraElements } from "./merge"
import { makeEdgeId } from "./merge"

export function mapHttpTitle(url: string, payload: any): NymphoraElements {
  const nodes: any[] = []
  const edges: any[] = []

  // 1. Węzeł URL (cel)
  nodes.push({
    data: {
      id: url,
      label: payload?.title || url,
      _type: "URL",
      http: payload,
    },
  })

  // 2. Logika łączenia z rodzicem
  // Wyciągamy domenę/IP z URL-a, żeby stworzyć krawędź
  try {
    const urlObj = new URL(url)
    const parent = urlObj.hostname // np. "reconica.dev" lub "192.168.1.1"

    // Jeśli parent (domena) różni się od całego URL-a (co jest oczywiste), 
    // to zakładamy, że węzeł-rodzic (domena) JUŻ ISTNIEJE w grafie (bo z niego wyszliśmy).
    // Tworzymy więc krawędź łączącą DOMENĘ -> URL.
    
    if (parent) {
       edges.push({
         data: {
           id: makeEdgeId(parent, url, "HTTP"),
           source: parent,
           target: url,
           label: "HTTP",
         },
       })
    }
  } catch (e) {
    // Jeśli URL jest niepoprawny, trudno – węzeł będzie wisiał, 
    // ale przy poprawnym AutoScanie to się nie zdarzy.
  }

  return { nodes, edges }
}
