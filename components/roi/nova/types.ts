// components/roi/nova/types.ts

export interface GraphNode { 
    id: string
    type: string
    label?: string 
}
  
export interface GraphEdge { 
    source: string
    target: string 
}
  
export interface GraphData { 
    nodes: GraphNode[]
    edges: GraphEdge[] 
}

export const NODE_COLORS: Record<string, string> = {
    ip: "#10b981",      // Emerald
    domain: "#6366f1",  // Indigo
    email: "#f43f5e",   // Rose
    asn: "#f59e0b",     // Amber
    url: "#3b82f6",     // Blue
    default: "#94a3b8"  // Slate
}
