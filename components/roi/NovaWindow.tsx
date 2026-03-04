"use client"

import React, { useState, useRef, useEffect } from "react"
import { X, Scaling, Minus } from "lucide-react"
import { NovaChat } from "./nova/NovaChat"
import { NovaHistoryPopover } from "./NovaHistoryPopover"
import { useNova } from "@/components/roi/context/NovaContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function NovaWindow({ onClose }: { onClose: () => void }) {
  const windowRef = useRef<HTMLDivElement | null>(null)
  // Ref do trzymania klatki animacji (dla płynności)
  const requestRef = useRef<number | null>(null)
  
  const { activeCaseId, toggleMinimize } = useNova()

  // Domyślny rozmiar "Slim"
  const [size, setSize] = useState({ w: 500, h: 700 }) 
  const [pos, setPos] = useState({ x: 100, y: 100 })

  // --- 1. POZYCJONOWANIE STARTOWE ---
  useEffect(() => {
    if (typeof window !== "undefined") {
        const winW = window.innerWidth
        const winH = window.innerHeight
        
        const initialW = 500
        const initialH = 700

        const startX = (winW / 2) - (initialW / 2)
        const startY = (winH / 2) - (initialH / 2)

        setPos({ 
            x: Math.max(0, startX), 
            y: Math.max(0, startY) 
        })
    }
  }, [])

  // --- 2. LOGIKA PRZESUWANIA (DRAG) ---
  useEffect(() => {
    const el = windowRef.current
    if (!el) return
    let isDragging = false
    let startX = 0; let startY = 0; let startLeft = 0; let startTop = 0

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".nova-titlebar") || target.closest("button")) return
      isDragging = true
      startX = e.clientX; startY = e.clientY
      startLeft = pos.x; startTop = pos.y
      
      // Optymalizacja: Wyłączamy selekcję tekstu podczas przesuwania
      document.body.style.userSelect = "none"
      
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      // Używamy requestAnimationFrame dla płynności przesuwania
      if (requestRef.current) return
      
      requestRef.current = requestAnimationFrame(() => {
          setPos({ x: startLeft + (e.clientX - startX), y: startTop + (e.clientY - startY) })
          requestRef.current = null
      })
    }

    const handleMouseUp = () => {
      isDragging = false
      document.body.style.userSelect = "" // Przywracamy selekcję
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    el.addEventListener("mousedown", handleMouseDown)
    return () => {
        el.removeEventListener("mousedown", handleMouseDown)
        if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [pos])

  // --- 3. LOGIKA ZMIANY ROZMIARU (RESIZE) - ZOPTORMALIZOWANA ---
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    
    const startX = e.clientX
    const startY = e.clientY
    const startW = size.w
    const startH = size.h
    
    document.body.style.userSelect = "none"

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Używamy requestAnimationFrame żeby nie "dławić" przeglądarki
      if (requestRef.current) return

      requestRef.current = requestAnimationFrame(() => {
        setSize({
            w: Math.max(400, startW + (moveEvent.clientX - startX)),
            h: Math.max(500, startH + (moveEvent.clientY - startY))
        })
        requestRef.current = null
      })
    }

    const handleMouseUp = () => {
      document.body.style.userSelect = ""
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <div
      ref={windowRef}
      // ZMIANA: Usunięto backdrop-blur, zmieniono kolor na solidny bg-zinc-950 dla wydajności i stylu
      className="fixed bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-none" 
      style={{ width: size.w, height: size.h, left: pos.x, top: pos.y, zIndex: 999 }}
    >
      {/* === HEADER === */}
      <div className="nova-titlebar flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900 cursor-move select-none h-11 shrink-0">
        
        {/* LEWA STRONA */}
        <div className="flex items-center gap-1">
            <NovaHistoryPopover />
            <div className="h-4 w-px bg-white/10 mx-2" />
            <span className="text-sm font-bold text-zinc-100 tracking-wide">NOVA</span>
            <Badge variant="outline" className="text-[9px] h-4 px-1 border-zinc-700 text-zinc-500 bg-black/40">AI</Badge>
        </div>

        {/* PRAWA STRONA */}
        <div className="flex items-center gap-1">
             {activeCaseId && (
                 <Badge variant="secondary" className="mr-2 text-[9px] bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20">
                    CASE: {activeCaseId.slice(0,8)}...
                 </Badge>
             )}

            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-white/5" onClick={toggleMinimize}>
                <Minus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:bg-red-500/20 hover:text-red-400" onClick={onClose}>
                <X className="h-3 w-3" />
            </Button>
        </div>
      </div>

      {/* === MAIN CONTENT === */}
      {/* ZMIANA: Tło czarne (bg-black) dla lepszego kontrastu wewnątrz */}
      <div className="flex-1 min-h-0 bg-black relative flex flex-col">
          <NovaChat />
      </div>

      {/* === RESIZE HANDLE === */}
      {/* Zwiększyłem obszar aktywny (w-6 h-6) dla łatwiejszego chwytania */}
      <div 
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={handleResizeMouseDown}
      >
         <Scaling className="w-3 h-3 text-zinc-400 rotate-90" />
      </div>
    </div>
  )
}
