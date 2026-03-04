"use client"

import React, { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNova, NovaMessage } from "../context/NovaContext"
import { StatusHeader, TypingDots } from "./widgets"
import { NovaMessageBubble } from "./NovaMessageBubble"

export function NovaChat() {
  const { messages, addMessage, pendingRequest, clearPendingRequest } = useNova()
  const [draft, setDraft] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const lastProcessedPromptRef = useRef<string>("")

  // Auto-scroll
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // --- INTEGRATION: PENDING REQUESTS ---
  useEffect(() => {
    if (pendingRequest && !isLoading) {
      if (pendingRequest.prompt === lastProcessedPromptRef.current) {
        clearPendingRequest()
        return
      }
      lastProcessedPromptRef.current = pendingRequest.prompt

      const userMsg: NovaMessage = {
        id: `req-${Date.now()}`,
        role: "user",
        text: pendingRequest.prompt,
        contextData: pendingRequest.contextData,
        toolSource: pendingRequest.toolSource || "external-tool"
      }

      clearPendingRequest()
      addMessage(userMsg)
      triggerNovaApi([...messages, userMsg])
    }
  }, [pendingRequest, isLoading, messages, addMessage, clearPendingRequest])

  // --- API LOGIC (OPENAI STREAMING) ---
  const triggerNovaApi = async (history: NovaMessage[]) => {
    setIsLoading(true)
    const newAssistantId = `assistant-${Date.now()}`
    try {
      const apiMessages = history.map((m, i) => ({
        role: m.role,
        content: typeof m.text === 'string' ? m.text : "Data payload",
        context: i === history.length - 1 ? m.contextData : undefined
      }))

      const res = await fetch("/api/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", messages: apiMessages }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error("Stream returned no reader")

      const decoder = new TextDecoder()
      let replyText = ""

      // Add empty assistant message initially (do not save yet)
      addMessage({
        id: newAssistantId,
        role: "assistant",
        text: ""
      }, true)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        replyText += chunk

        // Update the UI state with new chunks
        addMessage({
          id: newAssistantId,
          role: "assistant",
          text: replyText
        }, true)
      }

      // Done streaming, finally save to database
      addMessage({
        id: newAssistantId,
        role: "assistant",
        text: replyText
      }, false)

    } catch (err) {
      console.error(err)
      addMessage({ id: `err-${Date.now()}`, role: "assistant", text: "⚠️ Connection lost with Neural Interface." })
    } finally {
      setIsLoading(false)
    }
  }

  // --- MAIN SEND HANDLER ---
  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!draft.trim() || isLoading) return

    // 1. Dodaj wiadomość usera
    const userMsg: NovaMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: draft,
      toolSource: "chat-input"
    }

    setDraft("")
    addMessage(userMsg)

    // 2. OBSŁUGA KOMENDY /SEARCH
    if (draft.trim().startsWith("/search")) {
      const query = draft.replace("/search", "").trim()
      if (!query) {
        // Jeśli user wpisał samo /search bez frazy
        setTimeout(() => {
          addMessage({
            id: `sys-${Date.now()}`, role: "assistant",
            text: "Podaj frazę do wyszukania. Przykład:\n/search osintownia.pl"
          })
        }, 200)
        return
      }

      setIsLoading(true)
      try {
        // Proxy do Python Searcher (main.py)
        const res = await fetch("/api/nova/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query })
        })

        const data = await res.json()

        if (data.results && data.results.length > 0) {
          addMessage({
            id: `search-${Date.now()}`,
            role: "assistant",
            text: `Raport wywiadowczy (OSINT) dla frazy: "${query}"`,
            toolSource: "web-search",
            contextData: data // Przekazujemy wyniki do widgetu
          })
        } else if (data.message) {
          // Obsługa blokady (blocked)
          addMessage({
            id: `search-block-${Date.now()}`, role: "assistant",
            text: `⛔ ${data.message}`
          })
        } else {
          addMessage({
            id: `search-fail-${Date.now()}`, role: "assistant",
            text: "Brak wyników lub błąd silnika wyszukiwania."
          })
        }
      } catch (err) {
        addMessage({
          id: `err-${Date.now()}`, role: "assistant",
          text: "⚠️ Błąd modułu Web Search. Sprawdź, czy 'main.py' działa na porcie 8001."
        })
      } finally {
        setIsLoading(false)
      }
      return; // WAŻNE: Nie wysyłamy /search do Ollamy
    }

    // 3. Jeśli to zwykła wiadomość -> wyślij do AI
    await triggerNovaApi([...messages, userMsg])
  }

  return (
    <div className="flex h-full flex-col bg-transparent">
      <StatusHeader isGenerating={isLoading} />

      <div ref={messagesRef} className="flex-1 overflow-y-auto px-2 py-4 space-y-4 scroll-smooth scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-40">
            <ShieldCheck className="h-16 w-16 mb-4 stroke-[0.5]" />
            <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-zinc-500">NOVA SECURE CHANNEL</p>
            <p className="text-[9px] text-zinc-600 mt-2 font-mono">Try: /search domain.com</p>
          </div>
        )}

        {messages.map((m) => (
          <NovaMessageBubble key={m.id} msg={m} />
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300 pl-2">
            <div className="bg-zinc-900 rounded-2xl rounded-tl-sm px-4 py-2 border border-zinc-800/50">
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-black border-t border-zinc-900">
        <form onSubmit={sendMessage} className="relative flex items-center gap-2">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/50 rounded-full">
            <Paperclip className="h-4 w-4" />
          </Button>

          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Execute command or /search..."
            disabled={isLoading}
            className="h-9 text-xs bg-zinc-900/30 border-zinc-800/60 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/30 placeholder:text-zinc-700 rounded-md text-zinc-300 shadow-inner"
          />

          <Button type="submit" size="icon" disabled={isLoading} className="h-8 w-8 bg-emerald-600/90 hover:bg-emerald-500 text-white shrink-0 shadow-[0_0_10px_-2px_rgba(16,185,129,0.2)] transition-all rounded-md">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3 w-3" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
