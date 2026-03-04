/**
 * 📂 PLIK: tools/nymphora/components/sidebar/SidebarDeepScanButton.tsx
 * * 📝 OPIS:
 * Komponent przycisku w panelu bocznym (Sidebar).
 * Wyświetla stan ładowania (spinner + pasek postępu) podczas trwania skanu.
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Radar, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SidebarDeepScanButtonProps {
  isScanning: boolean;
  runDeepScan: () => void; // Funkcja z hooka useDeepScan
}

export default function SidebarDeepScanButton({
  isScanning,
  runDeepScan,
}: SidebarDeepScanButtonProps) {
  return (
    <Card className="p-3 space-y-2 bg-background/50 border-white/10">
      <Button
        onClick={runDeepScan}
        disabled={isScanning}
        variant={isScanning ? "secondary" : "destructive"}
        className="w-full mt-2 relative overflow-hidden transition-all"
      >
        {isScanning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-xs">SCAN IN PROGRESS…</span>
            {/* Animowany pasek postępu na dole przycisku */}
            <div className="absolute bottom-0 left-0 h-1 bg-red-500/50 w-full animate-pulse" />
          </>
        ) : (
          <>
            <Radar className="mr-2 h-4 w-4" /> 
            <span className="font-bold tracking-wide">DEEP RECON</span>
          </>
        )}
      </Button>

      {/* Informacja pomocnicza podczas skanowania */}
      {isScanning && (
        <div className="text-[10px] text-center text-muted-foreground animate-pulse px-2">
          Analyzing web services and technologies…
          <br />
          Please wait.
        </div>
      )}
    </Card>
  );
}
