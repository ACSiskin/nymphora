"use client"

import { useState, useEffect } from "react"
import { Core, EventObject } from "cytoscape"

type ContextMenuProps = {
  cyRef: React.MutableRefObject<Core | null>
  triggerDeps?: any 
  onInvestigate?: (payload: any) => void
  onAssignToCase?: (payload: any) => void
  onOpenInEyris?: (payload: any) => void
  onEvidenceToggle?: (payload: any) => void
  onDeepScan?: (targetId: string) => void

  onAnalyzeWithNova?: (payload: { prompt: string; contextData: any }) => void
}

export function useContextMenu({
  cyRef,
  triggerDeps,
  onInvestigate,
  onAssignToCase,
  onOpenInEyris,
  onEvidenceToggle,
  onDeepScan,
  onAnalyzeWithNova, // 
}: ContextMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [currentTarget, setCurrentTarget] = useState<any>(null)
  const [colorInput, setColorInput] = useState("")

  useEffect(() => {
    const cy = cyRef.current

    if (!cy) {
        console.log("⏳ [ContextMenu] Waiting for Graph Instance...")
        return
    }

    console.log("✅ [ContextMenu] Graph found! Attaching listeners.")

    const handleContextMenu = (e: EventObject) => {
      e.preventDefault()
      e.originalEvent.preventDefault()
      
      const target = e.target
      const isNode = target && target.isNode && target.isNode()
      
      setCurrentTarget(isNode ? target : null)
      
      if (isNode) {
          setColorInput(target.data('color') || "")
      } else {
          setColorInput("")
      }

      let x = 0
      let y = 0
      if (e.renderedPosition) {
          x = e.renderedPosition.x
          y = e.renderedPosition.y
      } else {
          x = e.originalEvent.offsetX
          y = e.originalEvent.offsetY
      }

      setMenuPosition({ x: x + 5, y: y + 5 })
      setIsMenuOpen(true)
    }

    const closeMenu = () => {
        if (isMenuOpen) setIsMenuOpen(false)
    }

    cy.on("cxttap", handleContextMenu)
    cy.on("tap", closeMenu)
    cy.on("zoom", closeMenu)
    cy.on("pan", closeMenu)

    return () => {
      cy.off("cxttap", handleContextMenu)
      cy.off("tap", closeMenu)
      cy.off("zoom", closeMenu)
      cy.off("pan", closeMenu)
    }
    
  }, [cyRef, triggerDeps, isMenuOpen]) 

  const handleContextInvestigate = () => {
    if (!currentTarget || !onInvestigate) return
    onInvestigate({
      id: currentTarget.id(),
      value: currentTarget.data("value") || currentTarget.id(),
      label: currentTarget.data("label"),
      type: currentTarget.data("_type"),
      mode: "manual",
    })
    setIsMenuOpen(false)
  }

  // Handler dla Deep Scan
  const handleDeepScanClick = () => {
    if (!currentTarget || !onDeepScan) return
    onDeepScan(currentTarget.id())
    setIsMenuOpen(false)
  }

  // Handler dla Nova AI (Sztywny Prompt)
  const handleNovaAnalyzeClick = () => {
    if (!currentTarget || !onAnalyzeWithNova) return

    const id = currentTarget.id()
    const label = currentTarget.data("label")
    const type = currentTarget.data("_type") || "UNKNOWN"
    
    // Pobieramy sąsiadów (1st degree connections) dla kontekstu
    const neighbors = currentTarget.neighborhood().map((ele: any) => {
        if (ele.isNode()) return `[NODE] ${ele.data('_type')}: ${ele.data('label')}`
        if (ele.isEdge()) return `[EDGE] ${ele.data('label')}`
        return ''
    }).filter((x: string) => x !== '').join("; ")

    // 🔒 SZTYWNY PROMPT SYSTEMOWY
    const systemPrompt = `
      You are an OSINT expert. Analyze the following node in the context of the investigation.
      TARGET: ${label} (Type: ${type})
      ID: ${id}
      NEIGHBORHOOD IN THE GRAPH: ${neighbors || "No direct neighbors."}
      
      Tasks:
1. Is this type of object suspicious in this context?
2. What should be the next steps (pivots)?
3. List potential risks (Risk Score).

Respond briefly and specifically.
    `.trim()

    onAnalyzeWithNova({
      prompt: systemPrompt,
      contextData: { id, label, type, neighbors }
    })
    
    setIsMenuOpen(false)
  }

  const handleTogglePin = () => {
    if (!currentTarget) return
    if (currentTarget.locked()) currentTarget.unlock()
    else currentTarget.lock()
    setIsMenuOpen(false)
  }

  const handleToggleEvidence = () => {
    if (!currentTarget || !onEvidenceToggle) return
    onEvidenceToggle({
      id: currentTarget.id(),
      label: currentTarget.data("label"),
    })
    setIsMenuOpen(false)
  }

  const handleCollapse = () => {
    if (!currentTarget || !currentTarget.isNode()) return
    const cy = cyRef.current
    if (!cy) return

    cy.batch(() => {
      // outgoers() pobiera tylko bezpośrednie krawędzie wychodzące 
      // i węzły, do których te krawędzie prowadzą.
      const outgoingElements = currentTarget.outgoers()
      
      // Ukrywamy tylko te powiązania
      outgoingElements.style('display', 'none')
      
      currentTarget.data('collapsed', true)
      currentTarget.addClass("has-collapsed-children")
    })
    
    setIsMenuOpen(false)
  }

  const handleExpand = () => {
    if (!currentTarget || !currentTarget.isNode()) return
    const cy = cyRef.current
    if (!cy) return

    cy.batch(() => {
      // Przywracamy widoczność tylko bezpośrednich wyjść
      const outgoingElements = currentTarget.outgoers()
      outgoingElements.style('display', 'element')
      
      currentTarget.data('collapsed', false)
      currentTarget.removeClass("has-collapsed-children")
    })
    
    setIsMenuOpen(false)
  }

  const handleAssignToCaseClick = () => {
    if (!currentTarget || !onAssignToCase) return
    onAssignToCase({ id: currentTarget.id() })
    setIsMenuOpen(false)
  }

  const handleOpenInEyrisClick = () => {
    if (!currentTarget || !onOpenInEyris) return
    onOpenInEyris({
       id: currentTarget.id(), 
       value: currentTarget.data("label") 
    })
    setIsMenuOpen(false)
  }

  const handleChangeColor = () => {
    if (!currentTarget || !colorInput) return
    currentTarget.data('color', colorInput)
    currentTarget.style({
        'background-color': colorInput,
        'line-color': colorInput,
        'target-arrow-color': colorInput
    })
    setIsMenuOpen(false)
  }

  const handleAddNote = () => {
      setIsMenuOpen(false)
  }

  return {
    isMenuOpen,
    setIsMenuOpen,
    menuPosition,
    currentTarget,
    colorInput,
    setColorInput,
    handleContextInvestigate,
    handleDeepScanClick, 
    handleNovaAnalyzeClick,
    handleTogglePin,
    handleToggleEvidence,
    handleCollapse,
    handleExpand,
    handleAssignToCaseClick,
    handleOpenInEyrisClick,
    handleChangeColor,
    handleAddNote
  }
}
