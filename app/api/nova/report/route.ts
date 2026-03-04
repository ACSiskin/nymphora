import { NextResponse } from "next/server"

export const runtime = "nodejs"

// --- KONFIGURACJA PROMPTU RAPORTOWEGO ---
const REPORT_SYSTEM_PROMPT = `
Jesteś NOVA — analityczną asystentką OSINT.
Na podstawie poniższej rozmowy (analityk + NOVA) wygeneruj RAPORT OPERACYJNY OSINT w języku polskim.

W raporcie użyj struktury Markdown:

### Cel
(Krótko, czego dotyczy analiza, np. "Weryfikacja domeny / IP / podmiotu")

### Kontekst
(Jakie dane wejściowe, skąd pochodzą, co wiemy)

### Kluczowe ustalenia
- punkt 1
- punkt 2
...

### Artefakty (IOC)
Wymień listę artefaktów z rozmowy w formie tabeli lub listy:
- IP:
- Domeny:
- E-maile:
- Hash:

### Ocena ryzyka
- Poziom ryzyka: NISKI / ŚREDNI / WYSOKI / KRYTYCZNY
- Krótkie uzasadnienie.

### Rekomendowane kroki
Wypisz 3–5 konkretnych działań operacyjnych (technicznych lub formalnych).

Nie opisuj, że generujesz raport – po prostu wygeneruj samą treść w Markdown.
`.trim()

export async function POST(req: Request) {
  // Intro używane, gdy LLM zawiedzie
  const fallbackIntro =
    "## Raport operacyjny (tryb awaryjny)\n\n" +
    "_Nie udało się połączyć z silnikiem LLM (Ollama). Poniżej surowa transkrypcja rozmowy._\n\n"

  try {
    const body = await req.json()
    const { messages } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json({ reportMarkdown: "Brak danych w sesji – nie można wygenerować raportu." })
    }

    // Wybór modelu (z fallbackiem)
    const model = process.env.NOVA_REPORT_MODEL || process.env.NOVA_MODEL || "gemma2:9b"

    // Mapowanie wiadomości z formatu frontendu (text) na format LLM (content)
    const openaiMessages = [
      { role: "system", content: REPORT_SYSTEM_PROMPT },
      ...messages.map((m: any) => ({
        role: (m.role === "assistant" || m.role === "system") ? "assistant" : "user",
        // Obsługa obu formatów: 'text' (frontend) i 'content' (Prisma)
        content: m.text || m.content || ""
      })),
    ]

    let reportMarkdown: string | null = null

    // Próba połączenia z OpenAI
    try {
      const { OpenAI } = require("openai") // or import if at top level, but let's just do dynamic/require or import at top level
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.3,
        messages: openaiMessages as any,
      })

      reportMarkdown = response.choices[0]?.message?.content || null
    } catch (e) {
      console.error("NOVA REPORT: Connection failed", e)
    }

    // SUKCES: Jeśli mamy raport z AI, zwracamy go
    if (reportMarkdown && reportMarkdown.trim().length > 0) {
      return NextResponse.json({ reportMarkdown })
    }

    // FAILURE: Fallback (surowa transkrypcja)
    const conversationText = messages
      .map((m: any) => {
        const who = m.role === "assistant" ? "NOVA" : "Analityk"
        const txt = m.text || m.content || "..."
        return `**${who}:** ${txt}`
      })
      .join("\n\n")

    const fallbackReport =
      fallbackIntro +
      conversationText +
      "\n\n---\n\n_System: Upewnij się, że lokalny model LLM jest aktywny._"

    return NextResponse.json({ reportMarkdown: fallbackReport })

  } catch (err) {
    console.error("NOVA REPORT FATAL ERROR:", err)
    return NextResponse.json({
      reportMarkdown: "## Błąd Krytyczny\nNie udało się wygenerować raportu. Sprawdź logi serwera."
    })
  }
}
