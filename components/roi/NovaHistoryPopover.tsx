"use client"

import React, { useState } from "react"
import { Clock, Trash2, MessageSquare, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNova } from "./context/NovaContext"
import { cn } from "@/lib/utils"

export function NovaHistoryPopover() {
  const { 
    conversations, 
    loadConversation, 
    deleteConversation, 
    activeConversationId,
    startNewConversation 
  } = useNova()

  const [open, setOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    await deleteConversation(id)
    setDeletingId(null)
  }

  const handleSelect = (id: string) => {
    loadConversation(id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5">
          <Clock className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      
      {/* KEY FIX: Added bg-zinc-950 and explicit border to fix 'dark spot' issue */}
      <PopoverContent align="start" sideOffset={5} className="w-80 p-0 bg-zinc-950 border border-zinc-800 shadow-2xl text-zinc-200 z-[1000]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900/50">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation History</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 px-2"
            onClick={() => { startNewConversation(); setOpen(false); }}
          >
            <Plus className="h-3 w-3" /> New
          </Button>
        </div>
        
        {/* List */}
        <ScrollArea className="h-[320px]">
          <div className="p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-600 gap-2">
                 <MessageSquare className="h-8 w-8 opacity-20" />
                 <span className="text-xs">Brak zapisanych operacji</span>
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-all border",
                    activeConversationId === c.id
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-100 shadow-sm"
                      : "bg-transparent border-transparent hover:bg-zinc-900 hover:text-zinc-200 hover:border-zinc-800"
                  )}
                >
                  <div className="flex flex-col overflow-hidden mr-2">
                    <span className="text-xs font-medium truncate w-[200px]">
                      {c.title || "Bez tytułu"}
                    </span>
                    <span className="text-[9px] text-zinc-600 mt-0.5 font-mono">
                         {new Date(c.updatedAt).toLocaleDateString()} • {new Date(c.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === c.id}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-400"
                    onClick={(e) => handleDelete(e, c.id)}
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
