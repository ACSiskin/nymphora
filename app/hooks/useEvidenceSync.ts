/**
 * useEvidenceSync Hook — NymphoraGraph
 * -------------------------------------
 * Odpowiada za wizualną synchronizację dowodów (Evidence)
 *  - Węzły, których ID znajduje się w evidenceIds -> dostają klasę 'evidence'
 *  - Usuwa klasę z pozostałych elementów
 *  - Reaguje na zmianę props.evidenceIds
 *
 * Eksportuje:
 *   applyEvidenceSync(cy, evidenceIds)
 */

import { useCallback } from "react"
import { Core } from "cytoscape"

export function useEvidenceSync() {
  const applyEvidenceSync = useCallback((cy: Core, evidenceIds: string[] = []) => {
    if (!cy) return

    cy.batch(() => {
      cy.nodes().forEach((n) => {
        const id = String(n.id())
        if (evidenceIds.includes(id)) {
          n.addClass("evidence")
        } else {
          n.removeClass("evidence")
        }
      })
    })
  }, [])

  return { applyEvidenceSync }
}
