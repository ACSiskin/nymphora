"use client";

import React from "react";
import { Card } from "@/components/ui/card";

export default function SidebarPivotHistory({
  pivotHistory,
  onPivotSelect,
  onPivotClear,
}: {
  pivotHistory?: {
    id: string;
    label?: string | null;
    type?: string;
    mode?: "manual" | "auto";
    ts?: number;
  }[];
  onPivotSelect?: (id: string) => void;
  onPivotClear?: () => void;
}) {
  // Skracanie etykiet pivotów — 1:1 z oryginału
  const shortPivotLabel = (item: {
    id: string;
    label?: string | null;
  }) => {
    const base = item.label || item.id;
    if (!base) return item.id;
    if (base.length <= 34) return base;
    return base.slice(0, 31) + "...";
  };

  // Formatowanie czasu pivotu
  const formatTime = (ts?: number) => {
    if (!ts) return "";
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
        <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Pivot history
        </div>

        {pivotHistory && pivotHistory.length > 0 && (
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground"
            onClick={onPivotClear}
          >
            clear
          </button>
        )}
      </div>

      {/* Empty */}
      {!pivotHistory || pivotHistory.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          Tutaj pojawią się wszystkie pivoty z{" "}
          <span className="font-semibold">Badaj</span> oraz auto-badania.
        </div>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {pivotHistory.slice(0, 32).map((item, idx) => (
            <button
              key={`${item.id}-${idx}`}
              type="button"
              className="w-full text-left text-xs px-2 py-1.5 rounded border border-slate-700/60 bg-slate-900/50 hover:bg-slate-900 flex items-center justify-between gap-2"
              onClick={() => onPivotSelect?.(item.id)}
            >
              {/* Left: label + type */}
              <div className="flex flex-col min-w-0">
                <span className="truncate">{shortPivotLabel(item)}</span>

                {item.type && (
                  <span className="text-[10px] text-slate-400">
                    {item.type}
                  </span>
                )}

                {item.ts && (
                  <span className="text-[9px] text-slate-500">
                    {formatTime(item.ts)}
                  </span>
                )}
              </div>

              {/* Right: auto/manual badge */}
              <span
                className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full ${
                  item.mode === "auto"
                    ? "bg-sky-900/80 text-sky-200"
                    : "bg-emerald-900/80 text-emerald-200"
                }`}
              >
                {item.mode === "auto" ? "auto" : "manual"}
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
