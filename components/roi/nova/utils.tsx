import React from "react"
import { Terminal } from "lucide-react"
import { GraphData, GraphNode, GraphEdge } from "./types"

// --- 1. ADAPTER DANYCH (ULEPSZONY O STRING PARSER) ---
export const transformToGraphData = (input: any): GraphData | null => {
    if (!input) return null;

    let nodes: GraphNode[] = [];
    let edges: GraphEdge[] = [];
    const uniqueIds = new Set<string>();

    const addNode = (id: string, type: string = "default", label?: string) => {
        const cleanId = id.trim();
        if (!cleanId) return;
        
        if (!uniqueIds.has(cleanId)) {
            uniqueIds.add(cleanId);
            // Prosta detekcja typu
            let detectedType = type;
            if (cleanId.includes("@")) detectedType = "email";
            else if (cleanId.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) detectedType = "ip";
            else if (cleanId.includes(".")) detectedType = "domain";
            
            nodes.push({ id: cleanId, type: detectedType, label: label || cleanId });
        }
    };

    // --- CASE A: NYMPHORA PAYLOAD (String Neighbors) ---
    // Przykład: neighbors: "[NODE] IP: 1.1.1.1; [EDGE] A; [NODE] DOMAIN: ..."
    if (typeof input === 'object' && input.id && typeof input.neighbors === 'string') {
        // 1. Dodajemy główny węzeł (Centrum)
        addNode(input.id, input.type || "default", input.label);
        
        // 2. Parsujemy dziwny string sąsiadów
        const parts = input.neighbors.split(';');
        
        parts.forEach((part: string) => {
            const p = part.trim();
            // Szukamy wzorca: [NODE] TYP: WARTOŚĆ
            // np. "[NODE] IP: 185.204.218.55"
            if (p.startsWith("[NODE]")) {
                // Usuwamy prefix "[NODE]"
                const content = p.replace("[NODE]", "").trim();
                // Dzielimy na Typ i Wartość po pierwszym dwukropku
                const colonIdx = content.indexOf(":");
                
                let nType = "default";
                let nVal = content;
                
                if (colonIdx !== -1) {
                    nType = content.substring(0, colonIdx).trim().toLowerCase(); // np. "ip"
                    nVal = content.substring(colonIdx + 1).trim(); // np. "185..."
                }

                // Ignorujemy puste
                if (nVal) {
                    addNode(nVal, nType);
                    // Łączymy z głównym węzłem
                    edges.push({ source: input.id, target: nVal });
                }
            }
        });

        return { nodes, edges };
    }

    // --- CASE B: Tablica krawędzi (Standard) ---
    if (Array.isArray(input)) {
        input.forEach(item => {
            if (item.source && item.target) {
                addNode(item.source);
                addNode(item.target);
                edges.push({ source: item.source, target: item.target });
            } else if (item.id || (typeof item === 'string')) {
                const val = item.id || item;
                addNode(val);
            }
        });
    } 
    // --- CASE C: Gotowy obiekt graphData ---
    else if (input.nodes && Array.isArray(input.nodes)) {
        return input as GraphData;
    }
    // --- CASE D: Pojedynczy węzeł bez neighbors ---
    else if (typeof input === 'object' && input.id) {
        addNode(input.id, input.type);
        // Obsługa tablicy neighbors (gdyby była tablicą, a nie stringiem)
        if (Array.isArray(input.neighbors)) {
            input.neighbors.forEach((n: any) => {
                const nId = typeof n === 'string' ? n : n.id;
                addNode(nId);
                edges.push({ source: input.id, target: nId });
            });
        }
    }

    if (nodes.length === 0) return null;
    return { nodes, edges };
}

// ... reszta pliku (calculatePathLayout, formatMessageText) bez zmian ...
// --- 2. SILNIK GRAFOWY (PATH TRACE) ---
export const calculatePathLayout = (data: GraphData, width: number, height: number) => {
    const nodes = data.nodes || []
    const edges = data.edges || []
    
    if (nodes.length === 0) return { nodes: [], edges: [] }
  
    const paddingX = 40
    const centerY = height / 2
    const stepX = (width - (paddingX * 2)) / Math.max(1, nodes.length - 1)
  
    const layoutNodes = nodes.map((node, index) => {
      return {
        ...node,
        x: paddingX + (index * stepX),
        y: centerY + (nodes.length > 2 && index % 2 !== 0 ? 15 : -15) * (index === 0 || index === nodes.length - 1 ? 0 : 0.5),
        isStart: index === 0,
        isEnd: index === nodes.length - 1
      }
    })
  
    const layoutEdges = edges.map(edge => {
      const src = layoutNodes.find(n => n.id === edge.source)
      const trg = layoutNodes.find(n => n.id === edge.target)
      if (src && trg) return { x1: src.x, y1: src.y, x2: trg.x, y2: trg.y }
      const srcRev = layoutNodes.find(n => n.id === edge.target)
      const trgRev = layoutNodes.find(n => n.id === edge.source)
      if (srcRev && trgRev) return { x1: srcRev.x, y1: srcRev.y, x2: trgRev.x, y2: trgRev.y }
      return null
    }).filter(Boolean) as { x1: number, y1: number, x2: number, y2: number }[]
  
    if (layoutEdges.length === 0 && nodes.length > 1) {
        for (let i = 0; i < layoutNodes.length - 1; i++) {
            layoutEdges.push({
                x1: layoutNodes[i].x, y1: layoutNodes[i].y,
                x2: layoutNodes[i+1].x, y2: layoutNodes[i+1].y
            })
        }
    }
  
    return { nodes: layoutNodes, edges: layoutEdges }
}

// --- 3. FORMATTER ---
export const formatMessageText = (text: string, isTool: boolean) => {
    if (!isTool) return text;
    const instructionHeaders = ["WYNIK:", "Zadania:", "Polecenie:", "Instrukcja:", "Analiza:"];
    let bestIndex = -1;
    instructionHeaders.forEach(header => {
        const idx = text.lastIndexOf(header);
        if (idx > bestIndex) bestIndex = idx;
    });

    if (bestIndex !== -1) {
        const cleanInstruction = text.substring(bestIndex).trim();
        return (
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-zinc-500 opacity-70">
                    <Terminal className="h-3 w-3" />
                    <span className="text-[9px] italic">Data payload processed securely.</span>
                </div>
                <div className="mt-1 font-medium text-emerald-400/90 whitespace-pre-wrap">
                    {cleanInstruction}
                </div>
            </div>
        )
    }
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.includes('"source":') || text.length > 300) {
        return (
            <div className="flex items-center gap-2 text-zinc-500">
                <Terminal className="h-3 w-3" />
                <span className="text-[9px] italic">Automated analysis request received.</span>
            </div>
        )
    }
    return text;
}
