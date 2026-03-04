// app/api/nova/route.ts
import { NextResponse } from "next/server"
import OpenAI from "openai"

export const runtime = "nodejs"

type IncomingMessage = {
  role: string
  content: string
}

type IncomingImage = {
  name: string
  type: string
  data: string // base64 bez prefixu data:
}

type ChatBody = {
  messages: IncomingMessage[]
  images?: IncomingImage[]
  mode?: "chat" | "investigator"
}

const BASE_SYSTEM_PROMPT = `
You are NOVA — an analytical OSINT assistant created by sh@dowrig — the author of Reconica and the H.R.P. protocol.
You operate inside the NYMPHORA application and you know the tool:
- Nymphora: relationship graph (IP, domains, WHOIS, entities)

Rules:
- Be specific and professional; no fluff.
- If you provide recommended actions, use a bullet list.
- In your answers you may use sections:
  • Evidence:
  • Lead:
  • Source:
  • Risk:
  • Possible actions:
- If you don’t know something, don’t make it up — propose methods or OSINT sources.
- Do not provide confidential data or private information unless it comes from public sources.
- You are on the analyst’s side — your answers should help them make operational decisions.
`.trim()

const INVESTIGATOR_SUFFIX = `
Mode: INVESTIGATOR.

In addition to the normal response:
- At the end, add a section:
"Investigative questions (next steps):"
- List 1–3 short questions that will help move the investigation forward.
- Questions must be specific (e.g., "Do we know the hosting company?", "Does the domain appear in leaks?", "Has the IP been seen in GreyNoise/AbuseIPDB?").
`.trim()

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody

    if (!body.messages || body.messages.length === 0) {
      return NextResponse.json({ error: "NO_MESSAGES" }, { status: 400 })
    }

    const { mode = "chat" } = body
    let systemPrompt = BASE_SYSTEM_PROMPT
    if (mode === "investigator") {
      systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${INVESTIGATOR_SUFFIX}`
    }

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...body.messages.map((m) => {
        if (m.role === "user" && body.images && body.images.length > 0) {
          // Jeśli mamy obrazki i to ostatnia wiadomość usera, dodaj jako multipart
          const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
            { type: "text", text: m.content },
            ...body.images.map((img) => ({
              type: "image_url" as const,
              image_url: { url: `data:${img.type};base64,${img.data}` },
            })),
          ]
          return { role: "user" as const, content: userContent }
        }
        return {
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        }
      }),
    ]

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      stream: true,
    })

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ""
          if (text) {
            controller.enqueue(new TextEncoder().encode(text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (err) {
    console.error("NOVA API error:", err)
    return NextResponse.json({ error: "Internal NOVA error" }, { status: 500 })
  }
}
