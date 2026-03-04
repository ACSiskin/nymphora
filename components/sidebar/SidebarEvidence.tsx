"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SidebarEvidence({
  evidenceNodes,
  onEvidenceSelect,
}: {
  evidenceNodes?: { id: string; label: string }[];
  onEvidenceSelect?: (id: string) => void;
}) {
  return (
    <Card className="p-3 space-y-2">
      {/* Header */}
      <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Evidence
      </div>

      {/* Empty state */}
      {!evidenceNodes || evidenceNodes.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          No evidence marked. Right-click on the node →{" "}
          <span className="font-semibold">Mark as evidence</span>.
        </div>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {evidenceNodes.map((ev) => (
            <Button
              key={ev.id}
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs"
              onClick={() => onEvidenceSelect?.(ev.id)}
            >
              <span className="truncate">{ev.label}</span>
              <span className="ml-2 text-[10px] text-amber-400">
                scroll to node
              </span>
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}
