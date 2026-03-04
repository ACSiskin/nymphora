import { useState, useRef, useCallback } from "react"
import { Core } from "cytoscape"

export type NodeKind =
  | "IP"
  | "DOMAIN"
  | "URL"
  | "EMAIL"
  | "ASN"
  | "PHONE"
  | "ORG"
  | "OTHER"
  | "CIDR"
  | "COUNTRY" // Nowy typ dla jasności

export const ALL_TYPES: NodeKind[] = [
  "IP",
  "DOMAIN",
  "URL",
  "EMAIL",
  "ASN",
  "PHONE",
  "ORG",
  "OTHER",
  "CIDR",
  "COUNTRY",
]

export function useFilters() {
  const [minDegree, setMinDegree] = useState(0)
  
  // DOMYŚLNIE: Włączamy infrastrukturę ORAZ metadane typu Country/Other (np. HTTP Title)
  const [typeFilter, setTypeFilter] = useState<Record<NodeKind, boolean>>({
    IP: true,
    DOMAIN: true,
    ASN: true,
    ORG: true,
    CIDR: true,
    COUNTRY: true, // Pokaż lokalizację
    URL: true,     // Pokaż URL (często wynik HTTP Title)
    OTHER: true,   // WAŻNE: Tu wpadają nagłówki HTTP i rekordy TXT/MX
    EMAIL: false,  // Noise OFF
    PHONE: false,  // Noise OFF
  })

  const filtersRef = useRef({
    minDegree: 0,
    typeFilter: { ...typeFilter },
  })

  const applyFilters = useCallback((cy: Core) => {
    const { minDegree: minDeg, typeFilter: tf } = filtersRef.current
    const visibleNodes = new Set<string>()

    cy.batch(() => {
      cy.nodes().forEach((n) => {
        const data = n.data ? n.data() : {}
        const rawType = String((data._type ?? "OTHER")).toUpperCase() as NodeKind
        // Fallback dla nieznanych typów
        const type = ALL_TYPES.includes(rawType) ? rawType : "OTHER"

        let visible = true

        if (!tf[type]) visible = false

        // Ignorujemy krawędzie CONTACT przy liczeniu degree
        const deg = n.connectedEdges('[label != "CONTACT"]').length
        if (deg < minDeg) visible = false

        if (n.hasClass("collapsed")) {
          n.style("display", "none")
        } else {
          n.style("display", visible ? "element" : "none")
        }

        if (visible && !n.hasClass("collapsed")) {
          visibleNodes.add(n.id())
        }
      })

      cy.edges().forEach((e) => {
        const s = String(e.data("source") ?? "")
        const t = String(e.data("target") ?? "")
        const visible =
          visibleNodes.has(s) && visibleNodes.has(t) && !e.hasClass("collapsed")
        e.style("display", visible ? "element" : "none")
      })
    })
  }, [])

  const handleDegreeChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = Number(e.target.value) || 0
    setMinDegree(value)
    filtersRef.current.minDegree = value
  }

  const handleToggleType = (kind: NodeKind) => {
    setTypeFilter((prev) => {
      const next = { ...prev, [kind]: !prev[kind] }
      filtersRef.current.typeFilter = next
      return next
    })
  }

  return {
    minDegree,
    typeFilter,
    ALL_TYPES,
    applyFilters,
    handleDegreeChange,
    handleToggleType,
    filtersRef,
  }
}
