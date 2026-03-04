"use client";

import React, { useEffect, useState, useRef } from "react";
import { Map, Marker, MapRef } from "react-map-gl/maplibre";
import type { ElementsDefinition } from "cytoscape";
import { Node3D } from "@/lib/nymphora-3d-utils";
import "maplibre-gl/dist/maplibre-gl.css";

// Importy lokalne
import { DeckGLOverlay } from "./graph3d/DeckGLOverlay";
import { NodeMarker } from "./graph3d/NodeMarker";
import { useGraphData, useGraphLayers, useCameraControl } from "./graph3d/hooks";

// UI Components
import { Button } from "@/components/ui/button";
import { Radar, Crosshair, X, Layers, Share2 } from "lucide-react";

// Używamy stylu Carto Dark Matter, ale bez wymuszania HTTPS na tile'ach jeśli proxy blokuje
// Alternatywa stabilna: "https://demotiles.maplibre.org/style.json" (ale jest jasna)
// Pozostajemy przy Carto, ale ignorujemy błędy sieciowe w konsoli (są one po stronie dostawcy free tier)
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const INITIAL_VIEW_STATE = {
  longitude: 10.0,
  latitude: 45.0,
  zoom: 2,
  pitch: 45,
  bearing: 0,
};

type Props = {
  elements: ElementsDefinition;
  onSelect?: (id: string | null) => void;
  focusNodeId?: string | null;
  scanningNodeId?: string | null;
  onDeepScan?: (id: string) => void;
  onInvestigate?: (payload: any) => void;
};

export const NymphoraGraph3D = React.memo(function NymphoraGraph3D({ 
  elements, 
  onSelect, 
  focusNodeId, 
  scanningNodeId,
  onDeepScan,
  onInvestigate 
}: Props) {
  const mapRef = useRef<MapRef>(null);
  
  // 1. Logika Danych i Warstw
  const { nodes, edges } = useGraphData(elements);
  const layers = useGraphLayers(nodes, edges, scanningNodeId);
  const { flyToNode } = useCameraControl(mapRef);

  // 2. Stan UI
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, node: Node3D | null} | null>(null);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  // 3. Auto Focus
  useEffect(() => {
    if (!focusNodeId || !isMounted || nodes.length === 0) return; 
    
    // Szukamy noda (może być wewnątrz klastra)
    const targetNode = nodes.find((n) => {
        if (n.id === focusNodeId) return true;
        // Sprawdź wewnątrz klastra
        if (n.isCluster && n.data.raw?.ips) {
            // Bezpieczne sprawdzanie czy ips jest tablicą
            const ips = Array.isArray(n.data.raw.ips) ? n.data.raw.ips : [];
            return ips.some((ip: any) => ip.id === focusNodeId);
        }
        return false;
    });

    if (targetNode) {
      flyToNode(targetNode);
      setExpandedNodeId(targetNode.id);
    }
  }, [focusNodeId, nodes, isMounted, flyToNode]);

  if (!isMounted) return null;

  return (
    <div 
        className="relative w-full h-full bg-slate-950 overflow-hidden rounded-lg border border-slate-800"
        onContextMenu={(e) => { e.preventDefault(); }} 
    >
        <Map
            ref={mapRef}
            initialViewState={INITIAL_VIEW_STATE}
            mapStyle={MAP_STYLE}
            attributionControl={false}
            maxPitch={75}
            reuseMaps
            renderWorldCopies={false}
            // Zmniejszenie limitu kafelków 
            maxTileCacheSize={10} 
            onClick={() => {
                setExpandedNodeId(null);
                if (onSelect) onSelect(null);
                setContextMenu(null);
            }}
            onError={(e) => {
                // Tłumimy błędy w konsoli wynikające z braku kafelków (częste w Carto Free)
                console.warn("Map Tile Error (Safe to ignore):", e);
            }}
        >
            {/* Warstwa WebGL (Łuki, Poświaty) */}
            <DeckGLOverlay layers={layers} interleaved={true} />

            {/* Warstwa HTML (Interaktywne Markery) */}
            {nodes.map((node) => (
                <Marker
                    key={node.id}
                    longitude={node.position[0]}
                    latitude={node.position[1]}
                    anchor="bottom"
                    style={{ zIndex: expandedNodeId === node.id ? 999 : 1 }}
                >
                    <NodeMarker 
                        node={node}
                        isExpanded={expandedNodeId === node.id}
                        isScanning={scanningNodeId === node.id || (node.isCluster && Array.isArray(node.data.raw?.ips) && node.data.raw.ips.some((ip:any) => ip.id === scanningNodeId))}
                        onDeepScan={onDeepScan}
                        onToggle={(e) => {
                            e.stopPropagation();
                            setExpandedNodeId(prev => prev === node.id ? null : node.id);
                            if (expandedNodeId !== node.id) flyToNode(node);
                            if (onSelect) onSelect(node.id);
                            setContextMenu(null);
                        }}
                        onRightClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, node: node });
                        }}
                    />
                </Marker>
            ))}
        </Map>
      
      {/* HUD: Status Skanowania */}
      {scanningNodeId && (
        <div className="absolute top-4 left-4 bg-red-950/90 backdrop-blur-md p-2 rounded border border-red-500/50 text-red-100 text-[10px] z-20 font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            ACTIVE_RECON::TARGET_LOCK [{scanningNodeId}]
        </div>
      )}

      {/* MENU KONTEKSTOWE */}
      {contextMenu && (
          <div 
            className="fixed z-[9999] w-64 bg-slate-950/95 border border-slate-700 rounded-lg shadow-2xl backdrop-blur-xl p-1 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseDown={(e) => e.stopPropagation()} 
          >
             <div className="px-3 py-2 text-[10px] font-mono border-b border-slate-800 flex items-center justify-between">
                <span className={contextMenu.node?.isCluster ? "text-yellow-400" : "text-emerald-400"}>
                    {contextMenu.node?.isCluster ? `CLUSTER [${contextMenu.node.clusterCount}]` : 'SINGLE HOST'}
                </span>
                <span className="text-slate-500">{contextMenu.node?.id.replace('CLUSTER::', '').substring(0, 15)}...</span>
            </div>
            
            <div className="p-1 gap-0.5 flex flex-col">
                <Button 
                    variant="ghost" size="sm" 
                    className="w-full justify-start h-8 text-xs text-slate-200 hover:bg-slate-800 font-mono"
                    onClick={() => { 
                        if (contextMenu.node && onInvestigate) {
                            // Bezpieczne pobieranie ID z klastra
                            const ips = contextMenu.node.isCluster && Array.isArray(contextMenu.node.data.raw?.ips) 
                                ? contextMenu.node.data.raw.ips 
                                : [];
                            const target = ips.length > 0 ? ips[0].id : contextMenu.node.id;
                            
                            onInvestigate({ id: target, value: target }); 
                        }
                        setContextMenu(null); 
                    }}
                >
                    <Crosshair className="w-3.5 h-3.5 mr-2 opacity-70" /> Investigate Graph
                </Button>

                <Button 
                    variant="ghost" size="sm" 
                    className="w-full justify-start h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 font-mono"
                    onClick={() => { 
                        const ips = contextMenu.node?.isCluster && Array.isArray(contextMenu.node.data.raw?.ips) 
                            ? contextMenu.node.data.raw.ips 
                            : [];
                        const target = ips.length > 0 ? ips[0].id : contextMenu.node?.id;

                        if (target && onDeepScan) onDeepScan(target); 
                        setContextMenu(null); 
                    }}
                >
                    <Radar className="w-3.5 h-3.5 mr-2 opacity-70" /> Run Deep Recon
                </Button>

                 <Button 
                    variant="ghost" size="sm" 
                    className="w-full justify-start h-8 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 font-mono"
                    onClick={() => setContextMenu(null)}
                >
                    <Share2 className="w-3.5 h-3.5 mr-2 opacity-70" /> Trace Route
                </Button>
            </div>
            
            <div className="border-t border-slate-800 mt-1 p-1">
                <Button 
                    variant="ghost" size="sm" 
                    className="w-full justify-start h-7 text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                    onClick={() => setContextMenu(null)}
                >
                    <X className="w-3 h-3 mr-2" /> Cancel
                </Button>
            </div>
          </div>
      )}
    </div>
  );
});
