import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Radar, ChevronDown, ChevronRight, Server, Globe, Mail, Network, Layers, X, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Node3D } from "@/lib/nymphora-3d-utils"; 

// Sub-komponent dla sekcji rozwijanej
const InfoSection = ({ title, icon: Icon, items, colorClass, defaultOpen = false }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    if (!items || items.length === 0) return null;

    return (
        <div className="border-b border-slate-800/50 last:border-0">
            <button 
                // blokujemy propagację onMouseDown, aby kliknięcie nie "przebijało" do mapy
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center justify-between w-full py-2 px-2 hover:bg-slate-900/50 transition-colors group/btn"
            >
                <div className={cn("flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider", colorClass)}>
                    <Icon className="w-3.5 h-3.5 opacity-70" />
                    <span>{title} <span className="opacity-50">({items.length})</span></span>
                </div>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500"/> : <ChevronRight className="w-3.5 h-3.5 text-slate-600"/>}
            </button>
            
            {isOpen && (
                <div 
                    className="pl-3 pb-2 pr-1 flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-200"
                    onMouseDown={(e) => e.stopPropagation()} // Blokada dla contentu (zaznaczanie tekstu)
                >
                    {items.map((item: string, idx: number) => (
                        <div key={idx} className="text-[10px] text-slate-300 font-mono break-all pl-2 border-l border-slate-700/50 hover:text-slate-100 hover:border-slate-500 cursor-text leading-tight">
                            {item}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const NodeMarker = React.memo(({ node, isExpanded, onToggle, onRightClick, isScanning, onDeepScan }: { 
    node: Node3D, 
    isExpanded: boolean, 
    onToggle: (e: React.MouseEvent) => void,
    onRightClick: (e: React.MouseEvent) => void,
    isScanning: boolean,
    onDeepScan?: (id: string) => void
}) => {
    const isCluster = node.isCluster;
    const data = node.data;

    let containerClasses = "";
    let ledColor = "";
    
    if (isScanning) {
        containerClasses = "bg-red-950/95 border-red-500/80 shadow-[0_0_30px_rgba(220,38,38,0.6)] ring-1 ring-red-500/50";
        ledColor = "bg-red-500 shadow-red-500 animate-ping";
    } else if (isCluster) {
        containerClasses = isExpanded 
            ? "bg-slate-950/95 border-yellow-500/40 rounded-xl ring-1 ring-yellow-500/20 shadow-[0_0_40px_rgba(234,179,8,0.15)]" 
            : "bg-slate-950/80 border-slate-700/60 rounded-full hover:border-yellow-500/60";
        ledColor = "bg-yellow-400 shadow-yellow-400";
    } else {
        containerClasses = isExpanded 
            ? "bg-slate-950/95 border-emerald-500/40 rounded-xl ring-1 ring-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)]" 
            : "bg-slate-950/80 border-slate-700/60 rounded-full hover:border-emerald-500/60";
        ledColor = "bg-emerald-500 shadow-emerald-500";
    }

    return (
        <div className="relative flex flex-col items-center group" style={{ pointerEvents: 'auto' }}>
            <div 
                className={cn(
                    "relative transition-all duration-300 ease-out select-none cursor-pointer",
                    isExpanded ? "z-[9999] min-w-[320px] shadow-2xl" : "z-[10] hover:z-[50]",
                    isScanning && "animate-pulse"
                )}
                // Blokujemy zdarzenia mapy przy klikaniu w marker
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    // Jeśli jest zwinięty, to klikniecie rozwija.
                    // Jeśli rozwinięty, klikniecie w nagłówek (obsłużone niżej) zwija.
                    if (!isExpanded) onToggle(e);
                }}
                onContextMenu={onRightClick} 
            >
                {/* Glow tła */}
                <div className={cn(
                    "absolute inset-0 bg-slate-950/80 blur-xl rounded-full transition-all duration-500",
                    isExpanded ? "opacity-100 scale-105" : "opacity-0 group-hover:opacity-100",
                    isScanning && "bg-red-900/50 opacity-100 scale-125"
                )} />

                {/* Kontener Główny */}
                <div className={cn(
                    "relative flex flex-col backdrop-blur-xl border transition-all duration-300 overflow-hidden",
                    isExpanded ? "p-0 rounded-xl" : "py-1.5 px-3 rounded-full flex-row items-center gap-2 hover:bg-slate-900",
                    containerClasses
                )}>
                    {/* Header */}
                    <div 
                        className={cn(
                            "flex items-center gap-2.5 w-full", 
                            isExpanded && "p-3 border-b border-slate-800/50 bg-slate-900/40 hover:bg-slate-800/50 transition-colors cursor-pointer"
                        )}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            // Kliknięcie w nagłówek ZAWSZE zwija, jeśli jest rozwinięte
                            if (isExpanded) {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggle(e);
                            }
                        }}
                    >
                        <div className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
                             <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_1px] animate-pulse", ledColor)} />
                             {isScanning && <div className="absolute w-full h-full rounded-full border border-red-500 animate-ping opacity-100"/>}
                        </div>

                        <div className="flex flex-col min-w-0">
                            <span className={cn(
                                "font-mono text-[11px] font-bold tracking-tight truncate",
                                isScanning ? "text-red-100" : (isCluster ? "text-yellow-100" : "text-emerald-50")
                            )}>
                                {isScanning ? `RECON::${node.id.replace('CLUSTER::', '')}` : node.id.replace('CLUSTER::', '')}
                            </span>
                            {isExpanded && node.data.infrastructure.length > 0 && (
                                <span className="text-[9px] text-slate-500 font-mono truncate max-w-[200px]">
                                    {node.data.infrastructure[0]}
                                </span>
                            )}
                        </div>

                        {/* Przycisk Zamykania / Strzałka */}
                        <div className="ml-auto pl-2 flex items-center">
                            {isExpanded ? (
                                <div 
                                    className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white transition-colors"
                                    // Upewniamy się, że to działa niezależnie od nagłówka
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onToggle(e);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </div>
                            ) : (
                                <ChevronDown className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </div>
                    </div>

                    {/* Content (Tylko rozwinięte) */}
                    {isExpanded && (
                        <div 
                            className="flex flex-col max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-600 bg-slate-950/50"
                            onMouseDown={(e) => e.stopPropagation()} // Pozwala na scrollowanie bez przesuwania mapy
                        >
                            
                            {/* Sekcja 1: Domeny / HTTP info */}
                            <InfoSection 
                                title="Domains & Services" 
                                icon={Globe2} 
                                items={data.domains} 
                                colorClass="text-emerald-400" 
                                defaultOpen={true}
                            />

                            {/* Sekcja 2: DNS */}
                            <InfoSection 
                                title="DNS Infrastructure" 
                                icon={Network} 
                                items={data.dns} 
                                colorClass="text-blue-400" 
                            />

                            {/* Sekcja 3: ASN */}
                            <InfoSection 
                                title="Network / ASN" 
                                icon={Layers} 
                                items={data.infrastructure} 
                                colorClass="text-yellow-400" 
                                defaultOpen={true}
                            />

                            {/* Sekcja 4: Kontakty */}
                            <InfoSection 
                                title="Contacts & Abuse" 
                                icon={Mail} 
                                items={data.emails} 
                                colorClass="text-pink-400" 
                            />

                            {/* KLASTER IP LIST */}
                            {isCluster && data.raw?.ips && (
                                <div className="p-2 border-t border-slate-800 bg-slate-900/20">
                                    <div className="text-[9px] text-slate-500 font-mono mb-2 uppercase flex justify-between px-1">
                                        <span>Cluster Members</span>
                                        <span>[{data.raw.ips.length}]</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {data.raw.ips.map((ipObj: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center group/ip p-1.5 rounded hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] text-slate-300 font-mono font-bold">
                                                        {ipObj.id}
                                                    </span>
                                                    {/* Jeśli mamy dodatkowe info o konkretnym IP w klastrze */}
                                                    {ipObj.domains && ipObj.domains.length > 0 && (
                                                        <span className="text-[8px] text-emerald-500/70 truncate max-w-[150px]">
                                                            {ipObj.domains[0]}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onDeepScan) onDeepScan(ipObj.id);
                                                    }}
                                                    className="opacity-0 group-hover/ip:opacity-100 p-1 bg-red-950/50 hover:bg-red-900/80 text-red-400 hover:text-white rounded border border-red-900/30 transition-all"
                                                    title="Deep Scan this IP"
                                                >
                                                    <Radar className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer Actions */}
                            {!isCluster && (
                                <div className="p-3 border-t border-slate-800 mt-auto sticky bottom-0 bg-slate-950/95 backdrop-blur shadow-up">
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="w-full h-8 text-[10px] border-red-900/40 text-red-400 hover:bg-red-950 hover:text-red-200 hover:border-red-500/50 bg-slate-900/50 uppercase tracking-wider font-mono shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onDeepScan) onDeepScan(node.id);
                                        }}
                                    >
                                        <Radar className="w-3.5 h-3.5 mr-2" /> Deep Scan Target
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Linka */}
            <div 
                className={cn(
                    "w-px bg-gradient-to-b transition-all duration-300 pointer-events-none",
                    isScanning ? "from-red-500 to-transparent shadow-[0_0_5px_red]" : "from-emerald-500/50 to-transparent",
                    isExpanded ? "h-[50px] opacity-100" : "h-[25px] opacity-40 group-hover:h-[50px] group-hover:opacity-80"
                )}
            />

            {/* Punkt na ziemi */}
            <div className={cn(
                "w-1 h-1 rounded-full shadow-[0_0_10px] pointer-events-none",
                isScanning ? "bg-red-500 shadow-red-500" : "bg-emerald-500 shadow-emerald-500"
            )} />
        </div>
    );
});
NodeMarker.displayName = "NodeMarker";
