"use client"

import { useState, useCallback } from "react"
import type { Core } from "cytoscape"

export function useAutoInvestigate({
  cyRef,
  onInvestigate,
  isReady,
}: {
  cyRef: React.MutableRefObject<Core | null>
  onInvestigate?: (payload: any) => void // Zmieniliśmy typ, bo nie musi być Promise
  isReady: boolean
}) {
  // Stan autoRunning w tej wersji służy tylko do wizualizacji "klikalności" przycisku
  const [autoRunning, setAutoRunning] = useState(false)

  const startAutoInvestigate = useCallback(() => {
    const cy = cyRef.current
    if (!cy || !onInvestigate || !isReady) return

    // 1. Sprawdzamy, czy użytkownik zaznaczył konkretne węzły
    const selected = cy.$(":selected")

    if (selected.length > 0) {
      // SCENARIUSZ A: Skanujemy tylko to, co zaznaczone
      const node = selected.first() // Bierzemy pierwszy zaznaczony (lub można pętlę dla wszystkich)
      
      setAutoRunning(true)
      onInvestigate({
        id: node.id(),
        label: node.data("label"),
        type: node.data("_type"),
        mode: "manual"
      })
      
      // Reset flagi po chwili (bo engine działa w tle)
      setTimeout(() => setAutoRunning(false), 1000)
      return
    }

    // 2. SCENARIUSZ B: BULK SCAN / KORELACJA
    // Nic nie zaznaczono -> Wysyłamy sygnał "__ALL__"
    // To uruchomi logikę w page.tsx, która zbierze wszystkie domeny i wyśle do Multi-Root BFS
    
    setAutoRunning(true)
    onInvestigate({
      id: "__ALL__", // Specjalny sygnał
      mode: "manual"
    })
    
    setTimeout(() => setAutoRunning(false), 1000)

  }, [cyRef, onInvestigate, isReady])

  return { 
    autoRunning, 
    startAutoInvestigate 
  }
}
