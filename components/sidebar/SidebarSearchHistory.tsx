"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { History } from "lucide-react";

export default function SidebarSearchHistory({
  runTransform,
  searchHistory = [],
  clearHistory,
}: {
  runTransform: (
    kind: "dns" | "whois" | "http-title",
    initialQuery?: string
  ) => Promise<void>;
  searchHistory?: {
    id: string;
    kind: "dns" | "whois" | "http-title" | "scan";
    query: string;
    ts: number;
  }[];
  clearHistory?: () => void;
}) {
  // Skracanie labeli — 1:1 z oryginału
  const shortSearchLabel = (item: { query: string }) => {
    const base = item.query;
    if (base.length <= 34) return base;
    return base.slice(0, 31) + "...";
  };

  // Formatowanie timestampu — 1:1
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card className="p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <History className="h-3 w-3 text-muted-foreground" />
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Search history
          </div>
        </div>

        {searchHistory.length > 0 && (
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground"
            onClick={clearHistory}
          >
            clear
          </button>
        )}
      </div>

      {/* Empty */}
      {searchHistory.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          Tutaj zapisują się wszystkie DNS / WHOIS / HTTP Title / SCAN.
        </div>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {searchHistory.slice(0, 40).map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left text-xs px-2 py-1.5 rounded border border-slate-700/60 bg-slate-900/40 hover:bg-slate-900 flex flex-col gap-0.5"
              onClick={() => {
                // SCAN nie re-runujemy (można dodać później)
                if (item.kind === "scan") {
                  const q = prompt("Re-run scan?", item.query);
                  // aktualnie brak automatycznego re-run w UI
                } else {
                  runTransform(item.kind, item.query);
                }
              }}
            >
              <div className="flex justify-between items-center gap-2">
                {/* Left */}
                <span className="truncate">{shortSearchLabel(item)}</span>

                {/* Right kind badge */}
                <span
                  className={`text-[9px] uppercase ${
                    item.kind === "scan"
                      ? "text-red-400 font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {item.kind}
                </span>
              </div>

              {/* Timestamp */}
              <span className="text-[9px] text-slate-500">
                {formatTime(item.ts)}
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
