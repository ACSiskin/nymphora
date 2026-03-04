/**
 * usePathTracing Hook — NymphoraGraph
 * -----------------------------------
 * Odpowiedzialny za:
 *  - Włączanie/wyłączanie trybu Path Trace
 *  - Wybór węzłów: start → cel
 *  - Obliczanie ścieżki A* (najkrótszej)
 *  - Podświetlanie .path-node / .path-edge
 *  - Centrowanie na znalezionej ścieżce
 *
 * Eksportuje:
 *   pathMode, setPathMode
 *   pathStartRef
 *   pathModeRef
 *   handleTogglePathMode
 *   handleGraphPathInteraction(node, cy)
 */

"use client"

import { useState, useCallback, useRef } from "react"
import { Core, NodeSingular, CollectionReturnValue } from "cytoscape"
//  IMPORTUJEMY FUNKCJĘ PRZYWRACAJĄCĄ STYL
import { updateEdgeWeightsAndStyles } from "../utils/updateEdgeWeights"

export function usePathTracing(cy: Core | null) {
  const [pathMode, setPathMode] = useState(false)
  const [startNode, setStartNode] = useState<string | null>(null)
  
  const activePathRef = useRef<CollectionReturnValue | null>(null)

  const clearPathStyles = useCallback(() => {
    if (!cy) return

    cy.batch(() => {
      // 1. Reset klas pomocniczych
      cy.elements().removeClass("path-dimmed path-highlighted path-start path-end")
      
      // 2. Reset stylów (to usuwa Glow i Ghost Mode, ale też normalny wygląd!)
      cy.elements().removeStyle()
      
      
      // Bez tego krawędzie zmieniają się w domyślne wielkie strzałki
      updateEdgeWeightsAndStyles(cy)
      
      activePathRef.current = null
    })
    
    setStartNode(null)
  }, [cy])

  const handleTogglePathMode = useCallback(() => {
    if (pathMode) {
      clearPathStyles()
      setPathMode(false)
    } else {
      setPathMode(true)
    }
  }, [pathMode, clearPathStyles])

  const handleGraphPathInteraction = useCallback(
    (node: NodeSingular, cyInstance: Core) => {
      if (!pathMode) return

      // --- 1. WYBÓR STARTU ---
      if (!startNode) {
        setStartNode(node.id())
        
        cyInstance.batch(() => {
          // Wygaszamy tło
          cyInstance.elements().style({
            opacity: 0.4,
            "transition-property": "opacity",
            "transition-duration": 200
          })

          // Start Node: Biały Puls
          node.style({
            opacity: 1,
            "shadow-blur": 20,
            "shadow-color": "#ffffff",
            "shadow-opacity": 0.8,
            "z-index": 999
          })
        })
        return
      }

      // --- 2. WYBÓR KOŃCA + RYSOWANIE ---
      if (startNode === node.id()) {
        clearPathStyles()
        return
      }

      const startEl = cyInstance.$id(startNode)
      const endEl = node
      
      const aStar = cyInstance.elements().aStar({
        root: startEl,
        goal: endEl,
        directed: false 
      })

      if (!aStar.found) {
        clearPathStyles()
        return
      }

      const path = aStar.path

      cyInstance.batch(() => {
        // A. Ghost Mode (Tło znika)
        cyInstance.elements().not(path).style({
          opacity: 0.1, 
          "z-index": 0
        })

        // B. Krawędzie (Ghost Link)
        path.edges().style({
          opacity: 1,
          "width": 2,                  
          "line-color": "#e2e8f0",     // Slate-200 (Biel złamana szarością)
          "target-arrow-color": "#e2e8f0",
          "source-arrow-color": "#e2e8f0",
          
          // Subtelny Glow
          "shadow-blur": 8,
          "shadow-color": "#ffffff",
          "shadow-opacity": 0.5,
          
          "z-index": 100,
          "curve-style": "bezier"
        })
        
        // C. Węzły na ścieżce
        path.nodes().style({
          opacity: 1,
          "border-width": 0,
          
          // Glow wokół węzła
          "shadow-blur": 20,
          "shadow-color": "#ffffff",
          "shadow-opacity": 0.6,
          "z-index": 101
        })

        // D. Start/End Highlight
        startEl.style({ "shadow-opacity": 1, "shadow-blur": 30 })
        endEl.style({ "shadow-opacity": 1, "shadow-blur": 30 })

        // E. Kamera
        cyInstance.animate({
          fit: { eles: path, padding: 80 },
          duration: 600,
          easing: "ease-out-cubic"
        })
      })

      setStartNode(null)
    },
    [pathMode, startNode, clearPathStyles]
  )

  return {
    pathMode,
    handleTogglePathMode,
    handleGraphPathInteraction
  }
}
