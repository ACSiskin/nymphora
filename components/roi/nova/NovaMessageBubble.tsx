import React, { useMemo } from "react"
import { cn } from "@/lib/utils"
import { NovaMessage } from "../context/NovaContext"
import { formatMessageText, transformToGraphData } from "./utils"
// Upewnij się, że SearchResultsWidget jest w widgets.tsx
import { DataContextBadge, SearchResultsWidget } from "./widgets"

export const NovaMessageBubble = React.memo(({ msg }: { msg: NovaMessage }) => {
    const isUser = msg.role === "user"
    const isTool = msg.toolSource && msg.toolSource !== "chat-input"
    
    // 1. Adapter Grafu (Nymphora)
    const graphData = useMemo(() => transformToGraphData(msg.contextData), [msg.contextData])
    const hasGraphData = graphData && graphData.nodes.length > 0
    
    // 2. Detekcja Wyników Wyszukiwania
    // Sprawdzamy czy w danych jest tablica 'results' (z main.py) lub źródło to web-search
    const isSearchResult = msg.contextData && (
        Array.isArray(msg.contextData.results) || 
        msg.toolSource === "web-search"
    )

    const displayContent = typeof msg.text === 'string' 
        ? formatMessageText(msg.text, !!isTool) 
        : msg.text

    return (
        <div className={cn("flex flex-col mb-4", isUser ? "items-end" : "items-start")}>
            <div className={cn(
                "px-4 py-3 max-w-[92%] text-xs leading-relaxed shadow-sm transition-all relative group break-words break-all overflow-hidden",
                isUser 
                  ? "bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm border border-zinc-700" 
                  : isTool 
                    ? "bg-[#0a0a0c] border border-zinc-800 text-zinc-300 font-mono rounded-lg w-full"
                    : "bg-zinc-900 text-zinc-300 rounded-2xl rounded-tl-sm border border-zinc-800"
            )}>
                {/* Tekst wiadomości */}
                <div className="whitespace-pre-wrap">{displayContent}</div>

                {/* --- A. WIDGET WYSZUKIWANIA --- */}
                {isSearchResult && (
                    <SearchResultsWidget data={msg.contextData} />
                )}

                {/* --- B. WIDGET GRAFU (Opcjonalny, tu wyłączony zgodnie z ustaleniami, ale gotowy) --- */}
                {/* {hasGraphData && !isSearchResult && (
                    <div className="mt-3 pt-2 border-t border-dashed border-zinc-800/50">
                        <PathTraceWidget data={graphData} />
                    </div>
                )} */}
                
                {/* --- C. BADGE DANYCH --- */}
                {/* Pokazujemy jeśli są dane, ale TO NIE JEST wynik wyszukiwania (bo on ma swój widget) */}
                {(msg.contextData || isTool) && !isSearchResult && (
                    <DataContextBadge data={msg.contextData || graphData} />
                )}

                {/* --- D. STOPKA ŹRÓDŁA --- */}
                {isTool && !msg.contextData && (
                    <div className="mt-2 pt-1 border-t border-zinc-800 flex items-center gap-2 opacity-50">
                        <span className="text-[9px] text-zinc-500 uppercase">SOURCE: {msg.toolSource}</span>
                    </div>
                )}
            </div>
            
            <span className="text-[9px] text-zinc-600 mt-1 px-1 font-mono opacity-40">
                {isUser ? "USER" : "NOVA"} • {new Date(Number(msg.id.split('-')[1]) || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
        </div>
    )
})
NovaMessageBubble.displayName = "NovaMessageBubble"
