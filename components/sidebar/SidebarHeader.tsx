// components/sidebar/SidebarHeader.tsx
"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { ElementsDefinition } from "cytoscape";

export default function SidebarHeader({
  caseId,
  elements,
}: {
  caseId: string | null;
  elements: ElementsDefinition;
}) {
  const handleExportJson = () => {
    try {
      if (typeof window === "undefined") return;
      const payload = buildExportPayload(caseId, elements);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `nymphora-${caseId || "graph"}-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("JSON export failed:", e);
    }
  };

  const buildExportPayload = (caseId: string | null, elements: ElementsDefinition) => {
    const isArray = Array.isArray(elements);
    const nodes = isArray
      ? (elements as any).filter((e: any) => !("source" in (e.data ?? {})))
      : (elements as any).nodes ?? [];
    const edges = isArray
      ? (elements as any).filter((e: any) => "source" in (e.data ?? {}))
      : (elements as any).edges ?? [];

    return {
      caseId,
      exportedAt: new Date().toISOString(),
      nodes: nodes.map((n: any) => n.data ?? n),
      edges: edges.map((e: any) => e.data ?? e),
    };
  };

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <Image src="/nymphora.png" alt="Reconica logo" width={56} height={56} className="opacity-90" />
        <h2 className="text-lg font-semibold tracking-wide">NYMPHORA</h2>
      </div>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleExportJson} title="Export JSON">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
