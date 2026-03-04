/**
 * useCytoscapeInitializer Hook — Full Production Version
 * ------------------------------------------------------
 * Zadanie:
 * - Jednorazowa inicjalizacja instancji Cytoscape
 * - Ustawienie kontenera grafu (mountRef)
 * - Załadowanie pełnych styli Reconica (node, edge, risk, hub, evidence itd.)
 * - Włączenie obsługi pluginów (fcose, dagre, bilkent)
 * - Fit / centering / resize handling
 */

import { useRef, useState, useCallback } from "react"
import cytoscape, { Core } from "cytoscape"

// 🔹 Layout pluginy (opcjonalne ale dostępne w projekcie)
import fcose from "cytoscape-fcose"
import coseBilkent from "cytoscape-cose-bilkent"
import dagre from "cytoscape-dagre"

// 🔹 Rejestracja layoutów
cytoscape.use(fcose)
cytoscape.use(coseBilkent)
cytoscape.use(dagre)

export function useCytoscapeInitializer() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)
  const [isReady, setIsReady] = useState(false)

  const initGraph = useCallback(() => {
    if (!mountRef.current) return
    if (cyRef.current) return // Nie inicjuj ponownie

    const cy = cytoscape({
      container: mountRef.current,

      wheelSensitivity: 0.25,
      pixelRatio: "auto",
      textureOnViewport: true,
      boxSelectionEnabled: true,
      autoungrabify: false,

      layout: { name: "preset" }, // Layout uruchamiany dopiero w NymphoraGraph.tsx

      //  STYLE — pełna wersja (Reconica branding, czytelność OSINT)
      style: [
        // ===== Podstawowe węzły =====
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-max-width": "130px",
            "font-size": "11px",
            "font-weight": "400",
            color: "#F1F5F9",               //  🔹 jasny szary — lepszy niż biały
            "text-outline-color": "#000",
            "text-outline-width": 1,
            
            // Node body
            "background-color": "#1E293B",  //  granat (stabilny, nie krzykliwy)
            "background-opacity": 0.95,

            // BIAŁY border + lekki glow
            "border-color": "#FFFFFF",
            "border-width": 2,
            "border-opacity": 0.8,

            //  glow (white-ish)
            "box-shadow": "0 0 12px rgba(255,255,255,0.25)",

            width: 18,
            height: 18,
            shape: "ellipse",
          },
        },

        // Root / Entry Node
        {
          selector: "node[root]",
          style: {
            "background-color": "#FFD60A",
            "border-color": "#FFFFFF",
            "border-width": 3,
            color: "#000",
            width: 30,
            height: 30,
            "font-weight": "bold",
            "box-shadow": "0 0 18px rgba(255,214,10,0.55)",
          },
        },

        // ===== Węzły według typów =====
        {
          selector: "node[type = 'DOMAIN']",
          style: {
            "background-color": "#00A6FB",
          },
        },
        {
          selector: "node[type = 'IP']",
          style: {
            "background-color": "#7B2CBF",
          },
        },
        {
          selector: "node[type = 'EMAIL']",
          style: {
            "background-color": "#FF6B35",
          },
        },
        {
          selector: "node[type = 'NS'], node[type = 'MX']",
          style: {
            "background-color": "#4361EE",
          },
        },
        {
          selector: "node[type = 'ASN']",
          style: {
            "background-color": "#4CC9F0",
          },
        },
        {
          selector: "node[type = 'URL'], node[type = 'ORG']",
          style: {
            "background-color": "#2DD4BF",
          },
        },

        // ===== Evidence Node =====
        {
          selector: "node.evidence",
          style: {
            "background-color": "#DC2626",
            "border-color": "#FFFFFF",
            "border-width": 3,
            "box-shadow": "0 0 18px rgba(255,80,80,0.75)",
            color: "#ffffff",
          },
        },

        // ===== Focus / Spotlight =====
        {
          selector: "node.spotlight",
          style: {
            "z-index": 9999,
            "background-color": "#FFD60A",
            "border-color": "#FF9500",
            "border-width": 4,
            "box-shadow": "0 0 14px #FFC300",

            // Wymuszenie białego tekstu absolutnie
            "color": "white !important",
            "text-fill-color": "white !important",
            "text-outline-width": 0,
            "text-outline-color": "transparent",
          },
        },

        // ===== Risk Levels =====
        {
          selector: "node.risk-low",
          style: {
            "background-color": "#7CBD1E",
          },
        },
        {
          selector: "node.risk-mid",
          style: {
            "background-color": "#FF8800",
          },
        },
        {
          selector: "node.risk-high",
          style: {
            "background-color": "#B00020",
          },
        },

        // ===== Hubs (degree-based) =====
        {
          selector: "node.hub-low",
          style: {
            "border-width": 2,
            "border-color": "#3b82f6",
          },
        },
        {
          selector: "node.hub-mid",
          style: {
            "border-width": 3,
            "border-color": "#fbbf24",
          },
        },
        {
          selector: "node.hub-high",
          style: {
            "border-width": 4,
            "border-color": "#ef4444",
          },
        },

        // ===== Edges =====
        {
          selector: "edge",
          style: {
            "line-color": "#64748B",
            "target-arrow-color": "#94A3B8",
            "target-arrow-shape": "vee",
            width: "mapData(weight, 1, 10, 1, 3)",
            "curve-style": "bezier",
            "arrow-scale": 1,
            "opacity": 0.85,
          },
        },

        // Highlighted path edges
        {
          selector: "edge.path-edge",
          style: {
            "line-color": "#FFB703",
            "target-arrow-color": "#FFB703",
            width: 6,
          },
        },

        // DEEP SCANNING PULSE EFFECT 
        {
          selector: '.deep-scanning',
          style: {
            'border-width': 2,
            'border-color': '#ef4444',      // Czerwony
            'background-color': '#7f1d1d',  // Ciemny czerwony
            'shadow-blur': 0,
            'shadow-color': '#ef4444',
            'shadow-opacity': 0,
            
            // P lynna animacja bez błędów JS:
            'transition-property': 'border-width, background-color, shadow-blur, shadow-opacity',
            'transition-duration': 800,     // Czas trwania "wdechu"
            'transition-timing-function': 'ease-in-out-sine',
            'z-index': 9999
          }
        },
        // 2. Stan "Napompowany" (Pulse Active)
        // Cytoscape sam obliczy klatki pośrednie między bazą a tym stylem
        {
          selector: '.deep-scanning-pulse',
          style: {
            'border-width': 6,              // Grubiej
            'background-color': '#b91c1c',  // Jaśniej
            'shadow-blur': 30,              // Mocny glow
            'shadow-opacity': 1
          }
        }
      ],
    })

    // ResizeObserver — automatyczne skalowanie po zmianie view
    const observer = new ResizeObserver(() => {
      cy.resize()
      cy.fit(undefined, 80)
    })
    observer.observe(mountRef.current)

    // Fit grafu na starcie (bez layoutu)
    setTimeout(() => {
      if (cy && cy.elements().length > 0) {
        cy.fit(undefined, 100)
      }
    }, 400)

    cy.on("render", () => {
      cy.$("node.spotlight").style({
        color: "white",
        "text-fill-color": "white",
        "text-outline-color": "transparent",
        "text-outline-width": 0,
      })
    })

    cyRef.current = cy
    setIsReady(true)
    
  }, [])
  
  return {
    mountRef,
    cyRef,
    isReady,
    initGraph,
  }
}
