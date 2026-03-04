"use client"

import React from "react"
import { Maximize2, X, Zap } from "lucide-react"
import { NovaWindow } from "./NovaWindow"
import { useNova } from "@/components/roi/context/NovaContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* --- KOMPONENT DOKUJĄCY (MALA ZAKŁADKA) --- */
const NovaDock = ({ onRestore, onClose }: { onRestore: () => void, onClose: () => void }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[1000] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div 
        className="flex items-center gap-3 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-full shadow-2xl shadow-emerald-900/10 cursor-pointer group hover:border-zinc-700 transition-all"
        onClick={onRestore} // Kliknięcie w belkę przywraca
      >
        {/* Status Icon */}
        <div className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </div>

        {/* Label */}
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-100 tracking-wider group-hover:text-emerald-400 transition-colors">
                NOVA AI
            </span>
            <span className="text-[8px] text-zinc-500 font-mono flex items-center gap-1">
                <Zap className="h-2 w-2" /> ONLINE
            </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-zinc-800 mx-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
                onClick={(e) => { e.stopPropagation(); onRestore(); }}
            >
                <Maximize2 className="h-3 w-3" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full hover:bg-red-900/20 text-zinc-500 hover:text-red-400"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            >
                <X className="h-3 w-3" />
            </Button>
        </div>
      </div>
    </div>
  )
}

/* --- GŁÓWNY OVERLAY --- */
export function NovaOverlay() {
  const { isOpen, isMinimized, closeNova, toggleMinimize } = useNova()

  // 1. Jeśli zamknięte całkowicie (krzyżykiem) -> nic nie renderuj
  if (!isOpen) return null

  // 2. Jeśli zminimalizowane (-) -> Pokaż Dock na dole
  if (isMinimized) {
      return <NovaDock onRestore={toggleMinimize} onClose={closeNova} />
  }

  // 3. W przeciwnym razie -> Pokaż pełne okno
  // WAŻNE: Nie dodajemy tu żadnych stylów pozycjonujących, NovaWindow pozycjonuje się samo.
  return (
    <NovaWindow onClose={closeNova} />
  )
}
