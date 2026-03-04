// components/roi/nova/widgets.tsx
import React, { useState, useMemo } from "react"
import { Network, Database, ChevronRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { GraphData, NODE_COLORS } from "./types"
import { calculatePathLayout } from "./utils"
import { Globe, ExternalLink, Search } from "lucide-react"

// --- STATUS HEADER ---
export const StatusHeader = ({ isGenerating }: { isGenerating: boolean }) => (
    <div className="flex items-center justify-between px-4 py-2 bg-black border-b border-zinc-800 text-[10px] select-none h-9">
        <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              {isGenerating && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            </div>
            <span className={cn("font-bold tracking-wider transition-colors", isGenerating ? "text-emerald-400" : "text-zinc-400")}>
                {isGenerating ? "PROCESSING..." : "SYSTEM ONLINE"}
            </span>
        </div>
        <div className="flex items-center gap-1 text-zinc-600 opacity-60">
            <Zap className="h-3 w-3" />
            <span className="font-mono">OLLAMA v2.1</span>
        </div>
    </div>
)

// --- TYPING DOTS ---
export const TypingDots = () => (
    <div className="flex items-center gap-1 p-2">
      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce" />
    </div>
)

// --- PATH TRACE WIDGET ---
export const PathTraceWidget = ({ data }: { data: GraphData }) => {
    const width = 300
    const height = 100
    const layout = useMemo(() => calculatePathLayout(data, width, height), [data])
  
    if (!layout.nodes.length) return null
  
    return (
      <div className="mt-3 mb-1 p-0 rounded-lg border border-indigo-500/20 bg-[#050505] w-full max-w-[340px] shadow-lg relative group overflow-hidden">
          <div className="absolute top-2 left-3 flex items-center gap-2 z-10">
              <div className="flex h-4 w-4 items-center justify-center rounded bg-indigo-500/10">
                   <Network className="h-2.5 w-2.5 text-indigo-400" />
              </div>
              <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider opacity-80">Path Trace</span>
          </div>
          
          <div className="relative overflow-visible" style={{ height }}>
               <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                  <defs>
                      <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
                          <stop offset="50%" stopColor="#6366f1" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
                      </linearGradient>
                      <marker id="arrow-trace" markerWidth="6" markerHeight="6" refX="8" refY="3" orient="auto">
                          <path d="M0,0 L0,6 L6,3 z" fill="#6366f1" />
                      </marker>
                  </defs>
                  {layout.edges.map((e, i) => (
                      <line 
                          key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} 
                          stroke="url(#line-gradient)" strokeWidth="1.5" markerEnd="url(#arrow-trace)"
                      />
                  ))}
                  {layout.nodes.map((n, i) => {
                      const color = NODE_COLORS[n.type?.toLowerCase()] || NODE_COLORS.default
                      return (
                          <TooltipProvider key={n.id}>
                              <Tooltip delayDuration={0}>
                                  <TooltipTrigger asChild>
                                      <g className="cursor-pointer hover:scale-125 transition-transform duration-200">
                                          <circle cx={n.x} cy={n.y} r="8" fill={color} opacity="0.15" className="blur-[2px]" />
                                          <circle cx={n.x} cy={n.y} r={4} fill="#000" stroke={color} strokeWidth="2"/>
                                          {(n.isStart || n.isEnd || layout.nodes.length <= 3) && (
                                              <text x={n.x} y={n.y + 15} fontSize="8" fill="#52525b" textAnchor="middle" fontFamily="monospace">
                                                  {n.label?.slice(0, 12) || n.type}
                                              </text>
                                          )}
                                      </g>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-zinc-900 border-zinc-800 text-[10px] text-zinc-300">
                                      <p className="font-bold text-white mb-0.5">{n.type?.toUpperCase()}</p>
                                      <p className="font-mono text-xs">{n.label || n.id}</p>
                                  </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                      )
                  })}
               </svg>
          </div>
          
          <div className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost" className="h-4 px-1 text-[8px] text-zinc-500 hover:text-indigo-400">
                  Open in Nymphora <ChevronRight className="h-2 w-2 ml-0.5" />
              </Button>
          </div>
      </div>
    )
}

// --- DATA CONTEXT BADGE ---
export const DataContextBadge = ({ data }: { data: any }) => {
    const [isOpen, setIsOpen] = useState(false)
    const nodeCount = data?.nodes?.length || 0
    if (!data) return null
  
    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2 w-full">
            <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900/50 rounded cursor-pointer hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors w-fit group">
                    <Database className="h-3 w-3 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                    <span className="text-[9px] font-mono text-zinc-500 group-hover:text-zinc-300">
                        {isOpen ? "HIDE RAW PAYLOAD" : `DATA CONTEXT: ${nodeCount} ENTITIES`}
                    </span>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mt-2 p-2 bg-black/50 rounded border border-zinc-900 overflow-x-auto max-h-[100px] scrollbar-thin">
                    <pre className="text-[8px] text-zinc-500 font-mono leading-tight">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

// --- SEARCH RESULTS WIDGET ---
export const SearchResultsWidget = ({ data }: { data: any }) => {
    // Spodziewamy się formatu z main.py: { results: [{ title, url, snippet }, ...] }
    // lub jeśli dane przyjdą w contextData jako tablica
    const results = data?.results || (Array.isArray(data) ? data : [])

    if (!results || results.length === 0) return null

    return (
        <div className="mt-3 mb-1 w-full max-w-[340px] rounded-lg border border-zinc-800 bg-[#050505] overflow-hidden shadow-lg">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
                <Globe className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                    Web Intelligence
                </span>
                <span className="ml-auto text-[9px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    {results.length} HITS
                </span>
            </div>

            {/* Lista wyników */}
            <div className="flex flex-col">
                {results.slice(0, 4).map((item: any, idx: number) => (
                    <a 
                        key={idx} 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group flex flex-col gap-1 p-3 border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors last:border-0"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-medium text-blue-400 group-hover:text-blue-300 group-hover:underline decoration-blue-500/30 underline-offset-2 leading-tight">
                                {item.title || "No Title"}
                            </span>
                            <ExternalLink className="h-2.5 w-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        
                        <div className="text-[9px] text-zinc-500 truncate font-mono opacity-70">
                            {new URL(item.url).hostname}
                        </div>
                        
                        {item.snippet && (
                            <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2 mt-0.5">
                                {item.snippet}
                            </p>
                        )}
                    </a>
                ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 bg-zinc-900/20 border-t border-zinc-800 flex justify-between items-center">
                 <span className="text-[8px] text-zinc-600">Source: Brave / DuckDuckGo</span>
                 {results.length > 4 && (
                     <span className="text-[8px] text-zinc-500 italic">+{results.length - 4} more hidden</span>
                 )}
            </div>
        </div>
    )
}
