// components/NymphoraSidebar.tsx
"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Sparkles } from "lucide-react";
import SidebarHeader from "./sidebar/SidebarHeader";
import SidebarEvidence from "./sidebar/SidebarEvidence";

import { isIpOrDomain } from "@/app/utils/isIpOrDomain";
import { cn } from "@/lib/utils";

// Typy
import type { useNymphoraDataEngine } from "../logic/useNymphoraDataEngine";

type Props = {
  caseId: string | null;
  engine: ReturnType<typeof useNymphoraDataEngine>;
  // Odbieramy funkcję onInvestigate, którą wcześniej miał NymphoraGraph
  onInvestigate?: (payload: any) => void; 
};

export default function NymphoraSidebar({ caseId, engine, onInvestigate }: Props) {
  const [query, setQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);

  // Bezpieczne sprawdzanie czy graf posiada węzły (odblokowuje Auto-Scan)
  const nodes = Array.isArray(engine.elements)
    ? engine.elements.filter((e: any) => !("source" in (e.data ?? {})))
    : engine.elements.nodes ?? [];
  const hasNodes = nodes.length > 0;

  // 1. QUICK SCAN (Pojedynczy DNS/WHOIS)
  const handleBasicScan = async () => {
    if (!query || query.trim().length === 0) return;
    
    setIsScanning(true);
    try {
      const type = isIpOrDomain(query);
      if (type === "IP") {
         await engine.runTransform("whois", query);
      } else {
         await engine.runTransform("dns", query);
      }
    } catch (e) {
      console.error("Basic scan failed:", e);
    } finally {
      setIsScanning(false);
      setQuery(""); 
    }
  };

  // 2. AUTO-SCAN (Przeskanowanie wszystkich odkrytych nodów)
  const handleAutoScan = async () => {
    setIsAutoScanning(true);
    try {
       // Wysyłamy sygnał "__ALL__" dokładnie tak samo, jak robił to stary przycisk na grafie
       if (onInvestigate) {
           onInvestigate({ id: "__ALL__", type: "BULK", mode: "auto" });
       } else if (engine.runAutoScan) {
           // Fallback, jeśli silnik udostępnia metodę runAutoScan bezpośrednio
           const nodeIds = nodes.map((n: any) => n.data.id);
           await engine.runAutoScan(nodeIds);
       }
    } catch (e) {
      console.error("Auto scan failed:", e);
    } finally {
       // Reset flagi po chwili (AutoScan Engine z page.tsx działa w tle)
       setTimeout(() => setIsAutoScanning(false), 2000);
    }
  };

  return (
    <div className="w-72 border-r p-4 flex flex-col gap-6 bg-card h-full">
      
      {/* 1. Nagłówek */}
      <SidebarHeader caseId={caseId} elements={engine.elements} />

      {/* 2. Główny moduł celowania */}
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase ml-1">
            Target (IP / Domain)
          </label>
          <Input 
            placeholder="example.com or 1.x.x.x etc." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isScanning || isAutoScanning}
            className="bg-background/50 border-white/10 text-sm h-10"
            onKeyDown={(e) => e.key === "Enter" && handleBasicScan()}
          />
        </div>
        
        <div className="flex flex-col gap-2 mt-1">
          {/* Przycisk Quick Scan */}
          <Button
            onClick={handleBasicScan}
            disabled={isScanning || !query.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all"
          >
            {isScanning ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...</>
            ) : (
              <><Search className="mr-2 h-4 w-4" /> Quick Scan</>
            )}
          </Button>

          {/* Przycisk Auto-Scan (Wyszarzony gdy brak węzłów) */}
          <Button
            onClick={handleAutoScan}
            disabled={isScanning || isAutoScanning || !hasNodes}
            variant="outline"
            className={cn(
              "w-full transition-all",
              hasNodes
                ? "text-emerald-400 border-emerald-500/50 hover:bg-emerald-950/30"
                : "text-muted-foreground opacity-50"
            )}
          >
            {isAutoScanning ? (
              <><Sparkles className="mr-2 h-4 w-4 animate-pulse" /> Auto-Scanning...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Auto-Scan Nodes</>
            )}
          </Button>
        </div>
      </div>

      {/* 3. Panel Dowodów (Evidence) */}
      <div className="flex-1 overflow-hidden mt-2">
        <SidebarEvidence
          evidenceNodes={engine.evidenceNodes}
          onEvidenceSelect={(id) => {
             console.log("Wybrano dowód:", id);
          }}
        />
      </div>

    </div>
  );
}
