/**
 * useViewModes Hook — NymphoraGraph
 * ---------------------------------
 * Odpowiada za przełączanie trybów widoku grafu:
 *   - By Degree — dynamiczne klasy hub-low, hub-mid, hub-high, hub-ultra
 *   - By Type — kolorowanie wg typu (IP, DOMAIN, EMAIL itd.)
 *   - By Risk — kolorowanie wg wielkości ryzyka (risk-low/mid/high)
 *
 * Zarządza stanem:
 *   - viewMode (local state + ref)
 *   - applyViewMode() — nakładanie odpowiednich klas na nodes
 *
 * Będzie importowany w NymphoraGraph.tsx i wywoływany po:
 *   - zmianie viewMode
 *   - przebudowie grafu
 *   - filtrach / auto-scan
 */

import { useState, useRef, useCallback } from "react"
import { Core } from "cytoscape"
import { updateDegreeClasses } from "../utils/updateDegreeClasses"
import { updateEdgeWeightsAndStyles } from "../utils/updateEdgeWeights"

export type ViewMode = "degree" | "type" | "risk"

export function useViewModes() {
  const [viewMode, setViewMode] = useState<ViewMode>("degree")
  const viewModeRef = useRef<ViewMode>("degree")

  const applyViewMode = useCallback((cy: Core) => {
    const mode = viewModeRef.current

    cy.batch(() => {
      if (mode === "degree") {
        updateDegreeClasses(cy)

        cy.nodes().forEach((n) => {
          n.removeClass(
            "t-ip t-domain t-url t-email t-asn t-phone t-org t-other " +
            "risk-low risk-mid risk-high"
          )
        })
      }

      else if (mode === "type") {
        cy.nodes().forEach((n) => {
          n.removeClass(
            "hub-low hub-mid hub-high hub-ultra risk-low risk-mid risk-high " +
            "t-ip t-domain t-url t-email t-asn t-phone t-org t-other"
          )

          const data = n.data() || {}
          const rawType = String((data._type ?? "OTHER") as string).toUpperCase()

          const map: Record<string, string> = {
            IP: "t-ip",
            DOMAIN: "t-domain",
            URL: "t-url",
            EMAIL: "t-email",
            ASN: "t-asn",
            PHONE: "t-phone",
            ORG: "t-org",
            OTHER: "t-other",
          }

          n.addClass(map[rawType] || "t-other")
        })
      }

      else if (mode === "risk") {
        cy.nodes().forEach((n) => {
          n.removeClass(
            "hub-low hub-mid hub-high hub-ultra t-ip t-domain t-url t-email " +
            "t-asn t-phone t-org t-other risk-low risk-mid risk-high"
          )

          const data = n.data() || {}
          const risk = typeof data.risk === "number" ? data.risk : 0

          if (risk >= 80) n.addClass("risk-high")
          else if (risk >= 40) n.addClass("risk-mid")
          else n.addClass("risk-low")
        })
      }
    })

    updateEdgeWeightsAndStyles(cy)
  }, [])

  const handleViewModeChange = (mode: ViewMode, cy?: Core) => {
    setViewMode(mode)
    viewModeRef.current = mode

    if (cy) {
      applyViewMode(cy)
    }
  }

  return {
    viewMode,
    viewModeRef,
    applyViewMode,
    handleViewModeChange,
  }
}
