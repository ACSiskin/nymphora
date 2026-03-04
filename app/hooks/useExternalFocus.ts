/**
 * useExternalFocus Hook — NymphoraGraph
 * -------------------------------------
 * Odpowiada za obsługę zewnętrznego fokusu grafu:
 *  - Nasłuchuje na zmianę focusNodeId (props)
 *  - Szuka odpowiadającego node w Cytoscape
 *  - Dodaje klasę 'spotlight' i centrowanie
 *  - Usuwa wcześniejsze podświetlenia
 *
 * Eksportuje:
 *  - applyExternalFocus(cy, focusNodeId)
 */

import { useCallback } from "react"
import { Core } from "cytoscape"

type UseExternalFocusProps = {
  centerOnCollection: (cy: Core, collection: any) => void
}

export function useExternalFocus({ centerOnCollection }: UseExternalFocusProps) {
  /**
   * Wywoływane po zmianie focusNodeId w propsach.
   * Usuwa poprzednie highlighty i podświetla wskazany node.
   */
  const applyExternalFocus = useCallback(
    (cy: Core, focusNodeId: string | null) => {
      if (!cy) return

      cy.batch(() => {
        cy.elements().removeClass("spotlight")

        if (focusNodeId) {
          const node = cy.getElementById(focusNodeId)
          if (node && node.nonempty()) {
            node.addClass("spotlight")
            centerOnCollection(cy, node)
          }
        }
      })
    },
    [centerOnCollection]
  )

  return { applyExternalFocus }
}
