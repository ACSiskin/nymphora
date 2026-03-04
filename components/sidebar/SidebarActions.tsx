"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { Globe, Network, Code, Beaker } from "lucide-react";

export default function SidebarActions({
  isScanning,
  runTransform,
}: {
  isScanning: boolean;
  runTransform: (
    kind: "dns" | "whois" | "http-title",
    initialQuery?: string
  ) => Promise<void>;
}) {
  // Sample graph callback (z oryginału — scalenie do UI)
  const sampleGraph = () => {
    alert(
      "SampleGraph"
    );
  };

  return (
    <Card className="p-3 space-y-2">
      {/* DNS */}
      <Button
        onClick={() => runTransform("dns")}
        disabled={isScanning}
        variant="outline"
        className="w-full justify-start"
      >
        <Globe className="mr-2 h-4 w-4" /> DNS
      </Button>

      {/* WHOIS */}
      <Button
        onClick={() => runTransform("whois")}
        disabled={isScanning}
        variant="outline"
        className="w-full justify-start"
      >
        <Network className="mr-2 h-4 w-4" /> IP / WHOIS
      </Button>

      {/* HTTP TITLE */}
      <Button
        onClick={() => runTransform("http-title")}
        disabled={isScanning}
        variant="outline"
        className="w-full justify-start"
      >
        <Code className="mr-2 h-4 w-4" /> HTTP Title
      </Button>

    
    </Card>
  );
}
