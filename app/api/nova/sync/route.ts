import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

// Pomocnicza funkcja do generowania tytułu
async function generateTitle(text: string) {
  try {
    const { OpenAI } = require("openai")
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `Podsumuj poniższy tekst w max 4 słowach, tworząc tytuł dla wątku operacyjnego (np. "Analiza domeny X", "Skanowanie sieci Y"). Nie używaj cudzysłowów. Tekst: "${text.slice(0, 300)}..."`
      }]
    })
    return response.choices[0]?.message?.content?.trim() || "Nowa operacja"
  } catch (e) {
    return "Analiza danych"
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, role, conversationId, caseId, contextData, toolSource } = body

    // 1. Znajdź lub stwórz wątek
    let convoId = conversationId
    let isNew = false

    if (!convoId) {
      isNew = true
      // Generujemy tytuł od razu na podstawie wiadomości użytkownika
      const initialTitle = role === 'user' ? await generateTitle(text) : "Nowy wątek"

      const convo = await prisma.novaConversation.create({
        data: {
          caseId: caseId || null,
          title: initialTitle
        }
      })
      convoId = convo.id
    }

    // 2. Zapisz wiadomość
    const msg = await prisma.novaMessage.create({
      data: {
        conversationId: convoId,
        role,
        content: text,
        contextData: contextData ? JSON.stringify(contextData) : undefined,
        toolSource,
        caseId: caseId || null
      }
    })

    return NextResponse.json({
      success: true,
      conversationId: convoId,
      messageId: msg.id
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get("conversationId")

  if (!conversationId) return NextResponse.json({ messages: [] })

  const messages = await prisma.novaMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' }
  })

  // Parsowanie contextData z JSON stringa z powrotem do obiektu
  const parsedMessages = messages.map(m => ({
    ...m,
    text: m.content, // frontend oczekuje pola 'text'
    contextData: m.contextData ? JSON.parse(m.contextData as string) : undefined
  }))

  return NextResponse.json({ conversationId, messages: parsedMessages })
}
