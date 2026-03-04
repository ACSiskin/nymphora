import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ArcLayer, ScatterplotLayer } from "@deck.gl/layers";
import { transformToDeckGL, Node3D } from "@/lib/nymphora-3d-utils";
import { MapRef } from "react-map-gl/maplibre";

export function useGraphData(elements: any) {
    const [geoCache, setGeoCache] = useState<Record<string, { lat: number; lon: number }>>({});
    const requestedIps = useRef<Set<string>>(new Set());

    useEffect(() => {
        const nodes = Array.isArray(elements)
          ? (elements as any).filter((e: any) => !e.data.source)
          : (elements as any).nodes || [];
    
        const ipsToFetch = nodes
          .map((n: any) => n.data.id)
          .filter((id: string) => {
            const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(id);
            return isIp && !geoCache[id] && !requestedIps.current.has(id);
          });
    
        if (ipsToFetch.length > 0) {
          ipsToFetch.forEach((ip: string) => requestedIps.current.add(ip));
          
          fetch("/api/geoip/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ips: ipsToFetch.slice(0, 100) }),
          })
            .then((res) => res.ok ? res.json() : {})
            .then((data) => {
              if (data && Object.keys(data).length > 0) {
                  setGeoCache((prev) => ({ ...prev, ...data }));
              }
            })
            .catch((err) => console.warn("[3D] GeoIP Error:", err));
        }
    }, [elements, geoCache]);

    const { nodes, edges } = useMemo(() => {
        return transformToDeckGL(elements, geoCache);
    }, [elements, geoCache]);

    return { nodes, edges };
}

// Funkcja pomocnicza do generowania "szumu" wysokości
function getPseudoRandomOffset(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0; 
    }
    return 0.8 + (Math.abs(hash % 60) / 100);
}

export function useGraphLayers(nodes: Node3D[], edges: any[], scanningNodeId: string | null) {
    const [animTick, setAnimTick] = useState(0);

    useEffect(() => {
        let animId: number;
        const animate = () => {
            setAnimTick(Date.now());
            animId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animId);
    }, []);

    const pulseScale = (Math.sin(animTick / 200) + 1) / 2;

    const layers = useMemo(() => {
        return [
          // WARSTWA 1: Łuki połączeń
          new ArcLayer({
            id: "connections-flow",
            data: edges,
            pickable: true,
            getWidth: 0.5,
            
            getSourcePosition: (d: any) => [d.source[0], d.source[1], 0],
            getTargetPosition: (d: any) => [d.target[0], d.target[1], 0],
            
            // --- ZMIANA KOLOROWANIA ---

            getSourceColor: (d: any) => d.sourceColor ? [...d.sourceColor, 200] : [34, 197, 94, 200], 
            getTargetColor: (d: any) => d.targetColor ? [...d.targetColor, 200] : [14, 165, 233, 200],
            
            // skalibrowana logika wysokości + Jitter
            getHeight: (d: any) => {
                const dx = d.source[0] - d.target[0];
                const dy = d.source[1] - d.target[1];
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                const jitter = getPseudoRandomOffset(d.id);
                
                if (dist < 1) return 0.05;
                // kalibracja (mnożniki), ale z dodanym jitterem
                // żeby linie różnych domen nie zlewały się, jeśli biegną tą samą trasą
                return Math.min(dist * 0.3, 0.4) * jitter; 
            },
            
            getTilt: (d: any) => (getPseudoRandomOffset(d.id) * 10) - 5,

            widthMinPixels: 2,
            updateTriggers: {
                getSourceColor: [edges],
                getTargetColor: [edges]
            }
          }),
          
          // WARSTWA 2: Efekt skanowania
          ...(scanningNodeId ? [
              new ScatterplotLayer({
                  id: "deep-scan-pulse",
                  data: nodes.filter(n => {
                      if (n.id === scanningNodeId) return true;
                      if (n.isCluster && n.data.raw?.ips) return n.data.raw.ips.some((ip:any) => ip.id === scanningNodeId);
                      return false;
                  }),
                  getPosition: (d: Node3D) => [d.position[0], d.position[1], 0],
                  getFillColor: [239, 68, 68, 0], 
                  getRadius: (d: Node3D) => (d.radius * 1.5) + (d.radius * pulseScale * 1.5), 
                  stroked: true,
                  getLineColor: [239, 68, 68, 200 - (pulseScale * 200)], 
                  getLineWidth: 80,
                  updateTriggers: { getRadius: [animTick] }
              })
          ] : []),
    
          // WARSTWA 3: Poświata pod węzłami
          new ScatterplotLayer({
            id: "node-base-glow",
            data: nodes,
            pickable: false,
            getPosition: (d: Node3D) => [d.position[0], d.position[1], 0],
            getFillColor: (d: Node3D) => d.isCluster ? [234, 179, 8, 30] : [34, 197, 94, 30],
            getRadius: (d: Node3D) => d.radius * 1.2,
            stroked: true,
            getLineColor: (d: Node3D) => d.isCluster ? [234, 179, 8, 100] : [34, 197, 94, 100], 
            getLineWidth: 50,
            lineWidthMinPixels: 1,
          }),
        ];
    }, [nodes, edges, scanningNodeId, animTick, pulseScale]);

    return layers;
}

export function useCameraControl(mapRef: React.RefObject<MapRef>) {
    const flyToNode = useCallback((node: Node3D) => {
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [node.position[0], node.position[1]],
                zoom: 8,      
                pitch: 60,    
                bearing: (mapRef.current.getBearing() + 45) % 360,
                duration: 2500, 
                essential: true 
            });
        }
    }, [mapRef]);

    return { flyToNode };
}
