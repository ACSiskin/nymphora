"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"
import { toast } from "@/app/hooks/use-toast" 

export type NovaMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  isEvidence?: boolean
  contextData?: any      
  toolSource?: string    
}

export type NovaConversationHeader = {
  id: string
  title: string | null
  updatedAt: string
}

export type NovaAskPayload = {
  prompt: string
  contextData?: any 
  toolSource?: string 
}

interface NovaContextType {
  // UI State
  isOpen: boolean
  isMinimized: boolean
  openNova: () => void
  closeNova: () => void
  toggleMinimize: () => void
  
  // Chat State
  messages: NovaMessage[]
  addMessage: (msg: NovaMessage, skipSave?: boolean) => void
  clearMessages: () => void
  isGenerating: boolean

  // Conversations Management (NOWE)
  conversations: NovaConversationHeader[]
  loadConversation: (id: string) => void
  deleteConversation: (id: string) => Promise<void>
  startNewConversation: () => void
  activeConversationId: string | null

  // Case Context
  activeCaseId: string | null
  setActiveCaseId: (id: string | null) => void

  // Tools / External requests
  askNova: (payload: NovaAskPayload) => void
  pendingRequest: NovaAskPayload | null
  clearPendingRequest: () => void
  
  // Advanced Features
  runThreatIntel: (artifacts: any[]) => Promise<any>
  performWebSearch: (query: string) => Promise<any>
}

const NovaContext = createContext<NovaContextType | undefined>(undefined)

export function NovaProvider({ children }: { children: ReactNode }) {
  // UI
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  
  // Data
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<NovaMessage[]>([])
  const [conversations, setConversations] = useState<NovaConversationHeader[]>([])
  
  // Flags
  const [pendingRequest, setPendingRequest] = useState<NovaAskPayload | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // --- 1. FETCH CONVERSATIONS (Centralne zarządzanie listą) ---
  const refreshConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (activeCaseId) params.append("caseId", activeCaseId)
      
      const res = await fetch(`/api/nova/conversations?${params.toString()}`)
      if (res.ok) {
        setConversations(await res.json())
      }
    } catch (e) { console.error("Failed to load convos", e) }
  }, [activeCaseId])

  // Ładowanie listy przy zmianie Case ID
  useEffect(() => {
    refreshConversations()
    // Reset czatu przy zmianie sprawy
    if (activeCaseId) startNewConversation()
  }, [activeCaseId, refreshConversations])

  // --- 2. DELETE CONVERSATION (Nowość) ---
  const deleteConversation = useCallback(async (id: string) => {
    // Optimistic Update: Usuń z listy natychmiast
    setConversations(prev => prev.filter(c => c.id !== id))
    
    // Jeśli usuwamy aktywny wątek -> wyczyść ekran
    if (activeConversationId === id) {
        startNewConversation()
    }

    try {
        await fetch(`/api/nova/conversations?id=${id}`, { method: "DELETE" })
        toast({ title: "Wątek usunięty" })
    } catch (e) {
        console.error(e)
        // W razie błędu można by przywrócić, ale w MVP pomijamy rollback
        refreshConversations()
    }
  }, [activeConversationId])

  // --- 3. LOAD & SYNC ---
  const loadConversation = useCallback(async (id: string) => {
    setActiveConversationId(id)
    try {
        const res = await fetch(`/api/nova/sync?conversationId=${id}`)
        if (res.ok) {
            const data = await res.json()
            setMessages(data.messages || [])
        }
    } catch(e) { console.error(e) }
  }, [])

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null)
    setMessages([{
        id: "sys-start",
        role: "assistant",
        text: "System gotowy. Rozpocznij nową operację."
    }])
  }, [])

  const addMessage = useCallback((msg: NovaMessage, skipSave = false) => {
    setMessages(prev => {
        const exists = prev.find(m => m.id === msg.id)
        if (exists) {
             return prev.map(m => m.id === msg.id ? { ...m, ...msg } : m)
        }
        return [...prev, msg]
    })
    setIsGenerating(msg.role === 'user') // Jeśli user pisze, system "myśli"

    if (skipSave) return; // Skip saving to database (useful for streaming chunks)

    // Async save
    fetch("/api/nova/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: msg.text,
        role: msg.role,
        caseId: activeCaseId,
        conversationId: activeConversationId,
        contextData: msg.contextData,
        toolSource: msg.toolSource
      })
    })
    .then(r => r.json())
    .then(data => {
        setIsGenerating(false)
        if (data.conversationId && data.conversationId !== activeConversationId) {
            setActiveConversationId(data.conversationId)
            refreshConversations() // Odśwież listę, bo pojawił się nowy wątek
        }
    })
    .catch(() => setIsGenerating(false))
  }, [activeCaseId, activeConversationId, refreshConversations])

  // --- 4. ADVANCED TOOLS (TI & Search) ---
  const runThreatIntel = async (artifacts: any[]) => {
      const res = await fetch("/api/nova/ioc", {
          method: "POST",
          body: JSON.stringify({ artifacts })
      })
      return res.json()
  }

  const performWebSearch = async (query: string) => {
      // Proxy do Twojego skryptu Python (zakładamy że działa na 8001)
      // W produkcji lepiej zrobić API Route w Next.js jako proxy !!!!!!!!!!
      try {
        const res = await fetch("http://localhost:8001/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
        })
        return res.json()
      } catch (e) {
          console.error("Search failed. Is python script running?", e)
          return { error: "Search unavailable" }
      }
  }

  // UI Helpers
  const openNova = useCallback(() => { setIsOpen(true); setIsMinimized(false); }, [])
  const closeNova = useCallback(() => setIsOpen(false), [])
  const toggleMinimize = useCallback(() => setIsMinimized(prev => !prev), [])
  const clearMessages = useCallback(() => setMessages([]), [])
  const clearPendingRequest = useCallback(() => setPendingRequest(null), [])
  const askNova = useCallback((payload: NovaAskPayload) => { 
      setPendingRequest(payload); 
      setIsOpen(true); 
      setIsMinimized(false); 
  }, [])

  return (
    <NovaContext.Provider value={{
      isOpen, isMinimized, openNova, closeNova, toggleMinimize,
      messages, addMessage, clearMessages, isGenerating,
      activeCaseId, setActiveCaseId,
      conversations, loadConversation, deleteConversation, startNewConversation, activeConversationId,
      askNova, pendingRequest, clearPendingRequest,
      runThreatIntel, performWebSearch
    }}>
      {children}
    </NovaContext.Provider>
  )
}

export function useNova() {
  const context = useContext(NovaContext)
  if (!context) throw new Error("useNova must be used within a NovaProvider")
  return context
}
