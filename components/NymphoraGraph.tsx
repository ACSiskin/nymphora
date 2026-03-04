"use client"

import { useEffect } from "react"
import { Core, NodeSingular, ElementDefinition } from "cytoscape"

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Hooks
import { useCytoscapeInitializer } from "@/app/hooks/useCytoscapeInitializer"
import { useContextMenu } from "@/app/hooks/useContextMenu"
import { useViewModes } from "@/app/hooks/useViewModes"
import { useFilters } from "@/app/hooks/useFilters"
import { usePathTracing } from "@/app/hooks/usePathTracing"
import { useExternalFocus } from "@/app/hooks/useExternalFocus"
import { useEvidenceSync } from "@/app/hooks/useEvidenceSync"
import { useAutoInvestigate } from "@/app/hooks/useAutoInvestigate"
import { centerOnCollection } from "@/app/utils/centerOnCollection"

// Utils
import { updateEdgeWeightsAndStyles } from "@/app/utils/updateEdgeWeights"
import { toFlatElements } from "@/app/utils/toFlatElements"

// Icons
import {
  Crosshair,
  Pin,
  Palette,
  FileText,
  FolderPlus,
  Minimize2,
  Maximize2,
  Radar,
  Sparkles,
  Waypoints,
  ShieldAlert,
  Network,
} from "lucide-react"

type InvestigatePayload = {
  id: string
  type?: string
  value?: string
  label?: string
  mode?: "manual" | "auto"
}

type Props = {
  elements: ElementDefinition[]
  onSelect?: (id: string | null) => void
  onInvestigate?: (payload: InvestigatePayload) => void
  onEvidenceToggle?: (payload: { id: string; label?: string }) => void
  onDeepScan?: (targetId: string) => void
  scanningNodeId?: string | null

  // Callback do Novy
  onAnalyzeWithNova?: (payload: { prompt: string; contextData: any }) => void

  evidenceIds?: string[]
  focusNodeId?: string | null
  onAssignToCase?: (payload: InvestigatePayload) => void
  onOpenInEyris?: (payload: InvestigatePayload) => void
}

export function NymphoraGraph({
  elements,
  onSelect,
  onInvestigate,
  onEvidenceToggle,
  onDeepScan,
  scanningNodeId,
  onAnalyzeWithNova,
  evidenceIds,
  focusNodeId,
  onAssignToCase,
  onOpenInEyris,
}: Props) {
  /** Core Graph Instance */
  const { mountRef, cyRef, initGraph } = useCytoscapeInitializer()

  /** Feature Hooks */
  const { viewMode, handleViewModeChange, applyViewMode } = useViewModes()
  const { minDegree, typeFilter, handleDegreeChange, handleToggleType, applyFilters } = useFilters()
  const { applyExternalFocus } = useExternalFocus({ centerOnCollection })
  const { applyEvidenceSync } = useEvidenceSync()
  const { pathMode, handleTogglePathMode, handleGraphPathInteraction } = usePathTracing(cyRef.current as Core)

  const { autoRunning, startAutoInvestigate } = useAutoInvestigate({
    cyRef,
    onInvestigate,
    isReady: Boolean(cyRef.current && cyRef.current.nodes().length > 0),
  })

  /** Context Menu Hook */
  const {
    isMenuOpen,
    menuPosition,
    currentTarget,
    colorInput,
    setColorInput,
    setIsMenuOpen,
    handleContextInvestigate,
    handleDeepScanClick,
    handleNovaAnalyzeClick,
    handleTogglePin,
    handleCollapse,
    handleExpand,
    handleAssignToCaseClick,
    handleToggleEvidence,
    handleChangeColor,
    handleAddNote,
  } = useContextMenu({
    cyRef,
    triggerDeps: elements,
    onInvestigate,
    onAssignToCase,
    onOpenInEyris,
    onEvidenceToggle,
    onDeepScan,
    onAnalyzeWithNova,
  })

  /** Init Graph */
  useEffect(() => {
    initGraph()
  }, [initGraph])

  /** Sync View & Filters */
  useEffect(() => {
    if (cyRef.current) applyViewMode(cyRef.current)
  }, [viewMode, applyViewMode])

  useEffect(() => {
    if (cyRef.current) applyFilters(cyRef.current)
  }, [minDegree, typeFilter, applyFilters])

  /** Elements Update */
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    const flat = toFlatElements(elements)

    cy.batch(() => {
      cy.elements().remove()
      if (flat.length) cy.add(flat)
      applyViewMode(cy)
      applyFilters(cy)
      updateEdgeWeightsAndStyles(cy)
    })

    cy.layout({
      name: "fcose",
      animate: true,
      animationDuration: 1000,
      randomize: true,
      fit: true,
      padding: 30,
      nodeRepulsion: 65000,
      idealEdgeLength: 150,
      edgeElasticity: 0.45,
      nestingFactor: 0.1,
      gravity: 0.25,
      numIter: 2500,
      tile: true,
    }).run()
  }, [elements, applyViewMode, applyFilters])

  useEffect(() => {
    if (cyRef.current && evidenceIds) applyEvidenceSync(cyRef.current, evidenceIds)
  }, [evidenceIds, applyEvidenceSync])

  useEffect(() => {
    if (cyRef.current && focusNodeId) applyExternalFocus(cyRef.current, focusNodeId)
  }, [focusNodeId, applyExternalFocus])

  /** Puls podczas skanowania */
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.nodes().removeClass("deep-scanning")
    cy.nodes().removeClass("deep-scanning-pulse")

    if (!scanningNodeId) return

    const node = cy.$id(scanningNodeId)
    if (node.empty()) return

    node.addClass("deep-scanning")

    let isActive = false
    const togglePulse = () => {
      if (!node || node.removed() || !node.hasClass("deep-scanning")) return
      if (isActive) node.removeClass("deep-scanning-pulse")
      else node.addClass("deep-scanning-pulse")
      isActive = !isActive
    }

    const startTimeout = setTimeout(() => togglePulse(), 50)
    const intervalId = setInterval(togglePulse, 800)

    return () => {
      clearTimeout(startTimeout)
      clearInterval(intervalId)
      if (node && !node.removed()) {
        node.removeClass("deep-scanning")
        node.removeClass("deep-scanning-pulse")
      }
    }
  }, [scanningNodeId])

  /** Interactions */
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.on("tap", "node", (e) => {
      const node = e.target as NodeSingular
      if (pathMode) {
        handleGraphPathInteraction(node, cy)
        return
      }
      onSelect?.(node.id())
    })

    return () => {
      cy.off("tap", "node")
    }
  }, [pathMode, handleGraphPathInteraction, onSelect])

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Subtelny glow + vignette */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-48 -right-48 h-[620px] w-[620px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04),rgba(0,0,0,0)_55%)]" />
        <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.85)]" />
      </div>

      {/* PANEL: View / Filters */}
      <div className="absolute left-4 top-4 z-20 flex w-[280px] flex-col gap-2">
        {/* Header / Title */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-950/65 px-3 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-slate-300" />
            <div className="leading-tight">
              <div className="text-xs font-semibold tracking-wide text-slate-100">Graph</div>
              <div className="text-[10px] text-slate-400">Explore • Filter • Trace</div>
            </div>
          </div>

          <Button
            size="sm"
            variant={pathMode ? "destructive" : "secondary"}
            onClick={handleTogglePathMode}
            className="h-8 gap-1.5 rounded-lg px-2.5 text-[11px]"
          >
            <Waypoints className="h-3.5 w-3.5" />
            Trace
          </Button>
        </div>

        {/* View mode pills */}
        <div className="inline-flex w-full items-center justify-between gap-1 rounded-xl border border-slate-800/70 bg-slate-950/65 p-1 shadow-2xl backdrop-blur-md">
          <Button
            size="sm"
            variant={viewMode === "degree" ? "secondary" : "ghost"}
            onClick={() => handleViewModeChange("degree")}
            className="h-8 flex-1 rounded-lg text-[11px]"
          >
            Degree
          </Button>
          <Button
            size="sm"
            variant={viewMode === "type" ? "secondary" : "ghost"}
            onClick={() => handleViewModeChange("type")}
            className="h-8 flex-1 rounded-lg text-[11px]"
          >
            Type
          </Button>
          <Button
            size="sm"
            variant={viewMode === "risk" ? "secondary" : "ghost"}
            onClick={() => handleViewModeChange("risk")}
            className="h-8 flex-1 rounded-lg text-[11px]"
          >
            Risk
          </Button>
        </div>

        {/* Filters card */}
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/65 px-3 py-2.5 text-xs shadow-2xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Min connections</span>
            <span className="rounded-md bg-slate-900/70 px-2 py-0.5 font-mono text-[11px] text-slate-100 ring-1 ring-white/5">
              {minDegree}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={10}
            value={minDegree}
            onChange={handleDegreeChange}
            className="mb-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800/80"
          />

          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Types</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              {Object.keys(typeFilter).map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-[11px] text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <input
                    type="checkbox"
                    checked={typeFilter[t as any]}
                    onChange={() => handleToggleType(t as any)}
                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-0"
                  />
                  <span className="truncate uppercase tracking-wider text-[10px]">{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CORE GRAPH */}
      <div ref={mountRef} className="relative z-10 h-full w-full" />



      {/* CONTEXT MENU */}
      {isMenuOpen && (
        <div
          className="absolute z-50 w-72 rounded-xl border border-slate-700/70 bg-slate-950/90 p-1.5 text-slate-200 shadow-[0_25px_70px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Header */}
          {currentTarget?.isNode?.() ? (
            <div className="mb-1 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2">
              <div className="text-[10px] font-mono text-slate-400">TARGET</div>
              <div className="truncate text-[12px] font-semibold text-slate-100">
                {currentTarget.data("label") || currentTarget.id()}
              </div>
            </div>
          ) : (
            <div className="mb-1 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2">
              <div className="text-[10px] font-mono text-slate-400">CANVAS</div>
              <div className="text-[12px] font-semibold text-slate-100">Actions</div>
            </div>
          )}

          {/* Actions */}
          {currentTarget?.isNode?.() && onInvestigate && (
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-full justify-start gap-2 rounded-lg px-2 text-[12px] hover:bg-blue-900/25 hover:text-blue-200"
              onClick={handleContextInvestigate}
            >
              <Crosshair className="h-4 w-4" />
              Investigate
            </Button>
          )}

          {onAnalyzeWithNova && currentTarget?.isNode?.() && (
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-full justify-start gap-2 rounded-lg px-2 text-[12px] text-emerald-300 hover:bg-emerald-950/25 hover:text-emerald-200"
              onClick={handleNovaAnalyzeClick}
            >
              <Sparkles className="h-4 w-4" />
              Nova Analyze
            </Button>
          )}

          {onDeepScan &&
            currentTarget?.isNode?.() &&
            ["DOMAIN", "IP"].includes((currentTarget.data("_type") || "").toUpperCase()) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-full justify-start gap-2 rounded-lg px-2 text-[12px] text-red-300 hover:bg-red-950/25 hover:text-red-200"
                onClick={handleDeepScanClick}
              >
                <Radar className="h-4 w-4 animate-pulse" />
                Deep Recon
              </Button>
            )}

          {currentTarget?.isNode?.() && (
            <>
              <div className="my-2 h-px bg-white/10" />

              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-full justify-start gap-2 rounded-lg px-2 text-[12px] hover:bg-white/5"
                onClick={handleTogglePin}
              >
                <Pin className="h-4 w-4" />
                {currentTarget.locked() ? "Unpin node" : "Pin node"}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-full justify-start gap-2 rounded-lg px-2 text-[12px] hover:bg-white/5"
                onClick={handleToggleEvidence}
              >
                <FolderPlus className="h-4 w-4" />
                Evidence
              </Button>

              <div className="mt-2 grid grid-cols-2 gap-2 px-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg border-slate-700 bg-slate-900/60 text-[11px] hover:bg-slate-900"
                  onClick={handleCollapse}
                >
                  <Minimize2 className="mr-1 h-4 w-4" />
                  Collapse
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg border-slate-700 bg-slate-900/60 text-[11px] hover:bg-slate-900"
                  onClick={handleExpand}
                >
                  <Maximize2 className="mr-1 h-4 w-4" />
                  Expand
                </Button>
              </div>

              <div className="my-2 h-px bg-white/10" />

              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-full justify-start gap-2 rounded-lg px-2 text-[12px] hover:bg-white/5"
                onClick={handleAssignToCaseClick}
              >
                <FileText className="h-4 w-4" />
                Assign case…
              </Button>

              {/* Color */}
              <div className="mt-2 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-2">
                <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
                  <Palette className="h-3.5 w-3.5" />
                  Color
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 rounded-lg bg-slate-900/70 text-[12px] border-slate-700"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    placeholder="#HEX / name"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button size="sm" className="h-8 rounded-lg px-3 text-[11px]" onClick={handleChangeColor}>
                    Set
                  </Button>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-9 w-full justify-start gap-2 rounded-lg px-2 text-[12px] hover:bg-white/5"
                onClick={handleAddNote}
              >
                <FileText className="h-4 w-4" />
                Add note
              </Button>
            </>
          )}
        </div>
      )}

      {/* Overlay close */}
      {isMenuOpen && (
        <div
          className="absolute inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
          onContextMenu={(e) => {
            e.preventDefault()
            setIsMenuOpen(false)
          }}
        />
      )}
    </div>
  )
}

