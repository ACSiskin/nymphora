"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Globe,
  Network,
  Code,
  Download,
  Monitor,
  Cpu,
  ChevronDown,
  ChevronRight,
  Fingerprint,
  Server,
  Building,
  FileText,
  Map,
  Locate,
  Mail,
  Shield,
  Hash,
  Sparkles,
  Swords, 
  Satellite 
} from "lucide-react"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

import { useNymphoraConsole } from "../../NymphoraConsoleContext"
import { useNova } from "@/components/roi/context/NovaContext"

interface McpResource {
  uri: string;
  name: string;
  mimeType: string;
  text: string;
}

type AnalysisMode = "osint" | "red"

export function DeepReconPanel() {
  const { deepResult } = useNymphoraConsole()
  const { askNova } = useNova()
  
  const [isSending, setIsSending] = useState(false)
  const [mode, setMode] = useState<AnalysisMode>("osint")

  const raw = deepResult as any
  const data = (raw?.data ? raw.data : raw)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    network: true,
    stack: true,
    attribution: true,
    infra: true,
    raw: false,
    export: false
  })

  const toggle = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }))

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60 p-10 select-none">
      <Network className="w-12 h-12 mb-2 opacity-20" />
      <p className="text-xs font-mono">WAITING FOR TARGET ACQUISITION</p>
      <p className="text-[10px] mt-2">Select node → Right Click → Deep Scan</p>
    </div>
  )

  const hasVersions =
    data.network?.some((n: any) => n.version || n.product) ||
    data.stack?.some((s: any) => s.version)

  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `report_${data.target}.json`
    a.click()
  }

  const handleAnalyzeWithNova = () => {
    if (!data) return
    setIsSending(true)

    const resourceUri = `nymphora://deep-recon/${data.target}?ts=${Date.now()}`;
    
    const mcpPayload: McpResource = {
        uri: resourceUri,
        name: `Deep Scan Report: ${data.target}`,
        mimeType: "application/vnd.nymphora.scan+json",
        text: JSON.stringify(data, null, 2)
    };

    const prompt = mode === "osint"
        ? `
[MODE: OSINT / PASSIVE ANALYSIS]
[PROTOCOL: MCP Resource Attached]

Rules:
- Treat this as PASSIVE reconnaissance only.
- Do NOT infer vulnerabilities, CVEs, or exploits.
- Clearly separate facts from interpretation.

TASK:
1. Summarize observed infrastructure and services.
2. Highlight security-relevant configurations.
3. Identify anomalies ONLY if directly supported by data.

RESOURCE CONTENT:
\`\`\`json
${JSON.stringify(data, null, 2).slice(0, 12000)} 
\`\`\`
`.trim()
        : `
[MODE: RED / OFFENSIVE – ANALYTICAL]
[PROTOCOL: MCP Resource Attached]

Rules:
- Do NOT execute attacks.
- Do NOT assume vulnerabilities.
- CVEs may ONLY be referenced if exact versions are present.
- Missing data = non-exploitable by default.

TASK:
1. Enumerate observed attack surface (facts only).
2. Assess exploitability based on available evidence.
3. List hypothetical attack paths with CONDITIONS and STATUS.

Version data present: ${hasVersions ? "YES" : "NO"}

RESOURCE CONTENT:
\`\`\`json
${JSON.stringify(data, null, 2).slice(0, 12000)} 
\`\`\`
`.trim();

    askNova({
      prompt: prompt,
      toolSource: mode === "osint" ? "nymphora-osint" : "nymphora-red",
      contextData: mcpPayload 
    })

    toast.success(
        mode === "osint" ? "OSINT Analysis started" : "RED Analysis started", 
        {
            icon: mode === "osint" ? "🛰️" : "⚔️",
            style: {
              borderRadius: '8px',
              background: '#09090b',
              color: '#fff',
              border: '1px solid #333',
              fontSize: '12px'
            },
        }
    )
    
    setTimeout(() => setIsSending(false), 1500)
  }

  const hasWhoisParsed = data.attribution && (
    data.attribution.organization || 
    data.attribution.registrar || 
    data.attribution.createdDate
  );

  return (
    <div className="flex flex-col w-full text-gray-200 font-sans h-full">
      
      {/*  SLIM HEADER */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-blue-500/10 rounded border border-blue-500/20">
                <Monitor className="w-4 h-4 text-blue-400" />
             </div>
             <div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-tight">{data.target}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-white/5">
                        {data.metadata?.scanDuration?.toFixed(2)}s
                    </span>
                </div>
                {data.metadata?.os && (
                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Cpu size={10} /> {data.metadata.os}
                    </div>
                )}
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             {/*  TOGGLE OSINT / RED (Monochromatyczny + Outline + Świecące ikony) */}
             <div className="flex bg-black/40 rounded-md border border-white/10 p-0.5">
                <button
                    onClick={() => setMode("osint")}
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-all duration-200 border",
                        mode === "osint" 
                          ? "border-blue-500/50 text-blue-300 shadow-[0_0_10px_-5px_rgba(59,130,246,0.3)] bg-transparent" 
                          : "border-transparent text-gray-500 hover:text-gray-300"
                    )}
                >
                    {/*  NEON BLUE ICON */}
                    <Satellite 
                      size={10} 
                      className={mode === "osint" ? "text-blue-400 drop-shadow-[0_0_3px_rgba(96,165,250,0.8)]" : ""}
                    />
                    OSINT
                </button>
                <button
                    onClick={() => setMode("red")}
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-all duration-200 border",
                        mode === "red" 
                          ? "border-red-500/50 text-red-300 shadow-[0_0_10px_-5px_rgba(239,68,68,0.3)] bg-transparent" 
                          : "border-transparent text-gray-500 hover:text-gray-300"
                    )}
                >
                    {/*  NEON RED ICON */}
                    <Swords 
                      size={10} 
                      className={mode === "red" ? "text-red-400 drop-shadow-[0_0_3px_rgba(248,113,113,0.8)]" : ""} 
                    />
                    RED
                </button>
             </div>

             {/*  ANALYZE BUTTON (Green text focus) */}
             <Button 
                size="sm" 
                variant="outline" 
                onClick={handleAnalyzeWithNova}
                disabled={isSending}
                className="h-7 text-[10px] gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all group"
             >
                {isSending ? (
                    "Sending..."
                ) : (
                    <>
                       <Sparkles size={12} className="text-gray-400 group-hover:text-emerald-400 transition-colors" /> 
                       Analyze <span className="text-emerald-400 font-semibold group-hover:text-emerald-300">Nova AI</span>
                    </>
                )}
             </Button>

             <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-gray-300" onClick={download}>
                <Download size={14} />
             </Button>
          </div>
      </div>

      {/* CONTENT SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">

        {/* 1. USŁUGI SIECIOWE */}
        <div className="border border-white/10 rounded bg-black/20 overflow-hidden">
            <button onClick={() => toggle('network')} className="w-full flex justify-between px-4 py-2 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
                {openSections.network ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Server className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Network Services</span>
                <Badge variant="secondary" className="text-[9px] h-4 px-1">{data.network?.length || 0}</Badge>
            </div>
            </button>
            {openSections.network && (
            <div className="divide-y divide-white/5 bg-black/20">
                {data.network?.map((svc: any, i: number) => (
                <div key={i} className="p-3 text-xs hover:bg-white/5">
                    <div className="flex items-center gap-2 mb-1">
                    <span className={cn("w-1.5 h-1.5 rounded-full", svc.status === 'active' ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-yellow-500")}></span>
                    <span className="font-mono text-gray-300">{svc.port}</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-gray-500 uppercase">{svc.protocol}</span>
                    <span className="ml-auto font-bold text-blue-300">{svc.name}</span>
                    </div>
                    <div className="pl-5 text-gray-400">
                    {svc.product} <span className="text-gray-600">{svc.version}</span>
                    </div>
                    {svc.details && (
                    <div className="mt-2 ml-5 p-2 border-l-2 border-purple-500/30 bg-black/40 text-gray-400 font-mono text-[10px] whitespace-pre-wrap">
                        {svc.details}
                    </div>
                    )}
                </div>
                ))}
                {(!data.network || data.network.length === 0) && <div className="text-xs text-gray-600 p-3 italic">No open ports detected.</div>}
            </div>
            )}
        </div>

        {/* 2. STOS APLIKACYJNY */}
        <div className="border border-white/10 rounded bg-black/20 overflow-hidden">
            <button onClick={() => toggle('stack')} className="w-full flex justify-between px-4 py-2 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
                {openSections.stack ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Globe className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Tech Stack</span>
                <Badge variant="secondary" className="text-[9px] h-4 px-1">{data.stack?.length || 0}</Badge>
            </div>
            </button>
            {openSections.stack && (
            <div className="p-3 bg-black/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.stack?.map((tech: any, i: number) => (
                    <div key={i} className="flex flex-col gap-2 p-2.5 border border-white/5 bg-white/5 rounded hover:border-orange-500/30 transition-colors h-full">
                    
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-gray-100">{tech.name}</span>
                        {tech.version && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 rounded font-mono ml-2">
                            v{tech.version}
                        </span>
                        )}
                    </div>

                    {tech.category && (
                        <div className="text-[10px] text-gray-500 leading-tight">
                        {tech.category}
                        </div>
                    )}

                    {/* Konta / ID */}
                    {tech.accounts && tech.accounts.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                        {tech.accounts.map((acc: string, k: number) => (
                            <div key={k} className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[9px] text-yellow-200 font-mono">
                            <Hash size={8} /> {acc}
                            </div>
                        ))}
                        </div>
                    )}

                    {/* Moduły */}
                    {tech.modules && tech.modules.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                        {tech.modules.map((mod: string, k: number) => (
                            <span key={k} className="bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded text-[9px] text-purple-200">
                            {mod}
                            </span>
                        ))}
                        </div>
                    )}
                    
                    </div>
                ))}
                </div>
                {(!data.stack || data.stack.length === 0) && <div className="text-xs text-gray-600 p-2 italic">No technologies identified.</div>}
            </div>
            )}
        </div>

        {/* 3. INFRASTRUKTURA */}
        <div className="border border-white/10 rounded bg-black/20 overflow-hidden">
            <button onClick={() => toggle('infra')} className="w-full flex justify-between px-4 py-2 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
                {openSections.infra ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Map className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Infrastructure</span>
            </div>
            </button>
            {openSections.infra && (
            <div className="p-3 bg-black/20 space-y-4">
                {/* LOKALIZACJA */}
                {data.location && (
                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded border border-white/5">
                        <div className="bg-pink-500/20 p-2 rounded-full">
                            <Locate className="w-5 h-5 text-pink-400" />
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Server Location</div>
                            <div className="text-sm text-gray-200">
                                {data.location.city}, {data.location.country}
                            </div>
                            <div className="text-[10px] font-mono text-gray-500">
                                {data.location.lat}, {data.location.lon}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* DNS */}
                {data.dns && (
                    <div className="grid grid-cols-1 gap-3">
                        {data.dns.mx?.length > 0 && (
                            <div className="text-xs">
                                <div className="flex items-center gap-2 mb-2 text-gray-400">
                                    <Mail size={12} /> <span className="font-semibold">MX Records</span>
                                </div>
                                <div className="space-y-1">
                                    {data.dns.mx.map((mx: any, i: number) => (
                                        <div key={i} className="font-mono text-gray-300 bg-black/40 p-1.5 rounded border border-white/5">
                                            <span className="text-pink-500 mr-2">[{mx.priority}]</span>
                                            {mx.exchange}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                         {data.dns.txt?.length > 0 && (
                            <div className="text-xs">
                                <div className="flex items-center gap-2 mb-2 text-gray-400">
                                    <Shield size={12} /> <span className="font-semibold">TXT Records</span>
                                </div>
                                <div className="space-y-1">
                                    {data.dns.txt.map((txt: string, i: number) => (
                                        <div key={i} className="font-mono text-[10px] text-gray-400 bg-black/40 p-1.5 rounded border-l-2 border-gray-600 break-all">
                                            {txt}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                 {(!data.dns && !data.location) && <div className="text-xs text-gray-600 italic">No infra data.</div>}
            </div>
            )}
        </div>

        {/* 4. ATRYBUCJA */}
        <div className="border border-white/10 rounded bg-black/20 overflow-hidden">
            <button onClick={() => toggle('attribution')} className="w-full flex justify-between px-4 py-2 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
                {openSections.attribution ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Fingerprint className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Attribution</span>
            </div>
            </button>
            {openSections.attribution && data.attribution ? (
            <div className="p-0 bg-black/20 divide-y divide-white/5">
                {hasWhoisParsed && (
                <>
                    <div className="p-3 grid grid-cols-1 gap-2">
                    {data.attribution.organization && (
                        <div className="flex items-center gap-2 text-xs">
                            <Building className="w-3 h-3 text-cyan-500" />
                            <span className="text-gray-500">Org:</span>
                            <span className="text-cyan-100 font-medium">{data.attribution.organization}</span>
                        </div>
                    )}
                    {data.attribution.registrar && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500 pl-5">Registrar:</span>
                            <span className="text-gray-300">{data.attribution.registrar}</span>
                        </div>
                    )}
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-4 bg-white/5">
                    <div className="space-y-1">
                        <div className="text-[9px] text-gray-500 uppercase tracking-widest">Created</div>
                        <div className="text-xs font-mono text-green-400">{data.attribution.createdDate || "-"}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[9px] text-gray-500 uppercase tracking-widest">Expires</div>
                        <div className="text-xs font-mono text-red-400">{data.attribution.expiryDate || "-"}</div>
                    </div>
                    </div>
                </>
                )}
                {data.attribution.raw && (
                <div className="p-3">
                    <div className="text-[10px] text-gray-500 mb-2 flex items-center gap-2">
                        <FileText className="w-3 h-3" /> Raw Data
                    </div>
                    <div className="bg-black/50 p-2 rounded border border-white/5">
                        <pre className="text-[9px] font-mono text-cyan-600/80 whitespace-pre-wrap max-h-[200px] overflow-auto custom-scrollbar">
                        {data.attribution.raw}
                        </pre>
                    </div>
                </div>
                )}
            </div>
            ) : (
                openSections.attribution && <div className="text-xs text-gray-600 p-3 italic">No attribution data.</div>
            )}
        </div>

      </div>
    </div>
  )
}
