"use client"

import { useState, useCallback } from "react"
import { toast } from "@/app/hooks/use-toast"
import { useNymphoraConsole } from "../../NymphoraConsoleContext"
import { useDeepReconRouter } from "./useDeepReconRouter"

export function useDeepScan() {
  const [isScanning, setIsScanning] = useState(false)
  const { setDeepResult, toggle, isOpen, addJob } = useNymphoraConsole()
  const { applyDeepRecon } = useDeepReconRouter()

  const runDeepScan = useCallback(async (target: string) => {
    if (!target) {
      toast({ title: "Błąd", description: "Brak celu (target).", variant: "destructive" })
      return
    }

    try {
      setIsScanning(true)
      
      if (!isOpen) toggle()
      
      addJob("Deep Recon", target)
      toast({ title: "Deep Recon", description: `Rozpoczynam analizę: ${target}...` })

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      })

      if (!response.ok) {
        throw new Error(`Błąd serwera: ${response.statusText}`)
      }

      const data = await response.json()

      // Aktualizacja stanu
      setDeepResult(data)
      applyDeepRecon(data)

      // FIX: Zmieniono 'ports' na 'network' + dodano bezpiecznik '|| 0'
      const count = data.network?.length || 0;
      
      toast({ 
        title: "Sukces", 
        description: `Skanowanie zakończone. Wykryto usług: ${count}.` 
      })

    } catch (err: any) {
      console.error("DeepScan error:", err)
      toast({ title: "Błąd", description: err.message, variant: "destructive" })
    } finally {
      setIsScanning(false)
    }
  }, [isOpen, toggle, addJob, setDeepResult, applyDeepRecon])

  return { isScanning, runDeepScan }
}
