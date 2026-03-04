"use client"

import { useEffect, useMemo, useState } from "react"
import type { ElementsDefinition } from "cytoscape"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

type Props = {
  selectedId: string | null
  elements: ElementsDefinition
  panelJson?: { label: string; data: any } | null
  onOpenChange?: (open: boolean) => void
  // Opcjonalne propsy do obsługi notatek z zewnątrz (na przyszłość)
  notes?: any[]
  onNoteAdded?: () => void
}

export function NymphoraInspector({ selectedId, elements, panelJson, onOpenChange, notes: externalNotes, onNoteAdded }: Props) {
  const open = !!selectedId
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  const data = useMemo(() => {
    const nodes = Array.isArray(elements)
      ? (elements as any).filter((e: any) => !e.data?.source)
      : (elements as any).nodes ?? []

    const edges = Array.isArray(elements)
      ? (elements as any).filter((e: any) => !!e.data?.source)
      : (elements as any).edges ?? []

    const nodeData = nodes.find((n: any) => n.data?.id === selectedId)?.data

    // Wyciągamy wyniki skanowania Nmap (jeśli istnieją)
    const scanResults = nodeData?._scan_results || []
    
    // Wyciągamy OS
    const os = nodeData?._os || null

    const conns = edges
      .filter((e: any) => e.data?.source === selectedId || e.data?.target === selectedId)
      .map((e: any) => ({
        id: e.data?.id,
        dir: e.data?.source === selectedId ? "->" : "<-",
        label: e.data?.label ?? "",
        other: e.data?.source === selectedId ? e.data?.target : e.data?.source,
      }))

    return { node: nodeData, conns, scanResults, os }
  }, [elements, selectedId])

  useEffect(() => { onOpenChange?.(open) }, [open, onOpenChange])

  // Funkcja do dodania notatki
  const addNote = async () => {
    if (!selectedId || !note.trim()) return
    setLoading(true)
    try {
      // Pobieramy ID bazy danych (_dbId) jeśli istnieje, w przeciwnym razie używamy selectedId (value)
      const entityDbId = data.node?._dbId || selectedId

      await fetch("/api/nymphora/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entityDbId,
          content: note,
        }),
      })
      setNote("") 
      onNoteAdded?.() // Powiadom rodzica o zmianie
    } catch (e) {
      console.error("Add note failed:", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => {
      onOpenChange?.(v)
      if (!v) {
        setTimeout(() => window.dispatchEvent(new Event("resize")), 100)
      }
    }}>
      <SheetContent 
        side="right" 
        className="w-[500px] sm:w-[600px] p-0 z-50 shadow-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="h-full flex flex-col bg-background">
          <SheetHeader className="p-6 pb-2 border-b">
            <SheetTitle className="truncate pr-8 flex items-center gap-2">
              {data.node?.label ?? selectedId ?? "Details"}
              {data.node?._type && <Badge variant="outline">{data.node._type}</Badge>}
            </SheetTitle>
            {data.os && <div className="text-xs text-muted-foreground">OS: {data.os}</div>}
          </SheetHeader>

          <Tabs defaultValue={data.scanResults.length > 0 ? "services" : "overview"} className="flex-1 flex flex-col overflow-hidden mt-2">
            <div className="px-6">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="overview">Info</TabsTrigger>
                <TabsTrigger value="services" disabled={data.scanResults.length === 0}>
                   Svcs {data.scanResults.length > 0 && `(${data.scanResults.length})`}
                </TabsTrigger>
                <TabsTrigger value="connections">Links</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="raw">Raw</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 p-6 pt-4">
              
              <TabsContent value="overview" className="mt-0 space-y-3">
                <Card className="p-3 text-sm">
                  <div className="text-muted-foreground">ID / Value</div>
                  <div className="font-mono break-all">{selectedId}</div>
                </Card>
                {data.node?.status && (
                   <Card className="p-3 text-sm">
                      <div className="text-muted-foreground">Status</div>
                      <div className="font-medium">{data.node.status}</div>
                   </Card>
                )}
              </TabsContent>

              {/* NOWA ZAKŁADKA SERVICES (Wyniki Nmapa) */}
              <TabsContent value="services" className="mt-0 space-y-3">
                {data.scanResults.map((s: any, i: number) => (
                    <Card key={i} className="p-3 border-l-4 border-l-red-500 bg-slate-950/50">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                            <Badge variant={s.state === 'open' ? 'default' : 'secondary'}>
                                {s.port}/{s.protocol}
                            </Badge>
                            <span className="font-bold text-sm text-red-400">{s.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase">{s.state}</span>
                      </div>
                      
                      {(s.product || s.version) && (
                          <div className="text-xs text-slate-300 font-mono mb-1">
                              {s.product} {s.version}
                          </div>
                      )}
                      
                      {s.banner && (
                        <div className="mt-2 text-[10px] bg-black p-2 rounded font-mono text-green-500/80 overflow-x-auto whitespace-pre-wrap border border-slate-800">
                            {s.banner}
                        </div>
                      )}
                    </Card>
                  ))}
              </TabsContent>

              <TabsContent value="connections" className="mt-0 space-y-2">
                {data.conns?.length === 0 && (
                  <div className="text-sm text-muted-foreground">No links.</div>
                )}
                {data.conns?.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 border rounded text-xs hover:bg-muted/50">
                    <span className="font-mono text-muted-foreground">{c.dir} {c.label}</span>
                    <span className="font-bold truncate max-w-[200px]">{c.other}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="notes" className="mt-0">
                <Card className="p-3">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Dodaj notatkę do tego węzła..."
                    className="mb-2 bg-background"
                  />
                  <Button onClick={addNote} disabled={loading || !note.trim()} size="sm" className="w-full">
                    {loading ? "Dodawanie..." : "Dodaj notatkę"}
                  </Button>
                </Card>
                {/* Wyświetlanie istniejących notatek (jeśli przekazane przez props) */}
                {externalNotes && externalNotes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {externalNotes.map((n: any) => (
                      <Card key={n.id} className="p-3 text-xs bg-muted/30">
                        <div className="text-muted-foreground mb-1 text-[10px]">{new Date(n.createdAt).toLocaleString()}</div>
                        <div className="whitespace-pre-wrap">{n.content}</div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="raw" className="mt-0">
                <Card className="p-3 bg-muted/20">
                  <pre className="text-[10px] font-mono overflow-auto max-h-[60vh] whitespace-pre-wrap">
                    {JSON.stringify(panelJson ?? data.node ?? {}, null, 2)}
                  </pre>
                </Card>
              </TabsContent>

            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
