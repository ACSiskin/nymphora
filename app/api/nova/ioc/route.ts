import { NextResponse } from "next/server"

export const runtime = "nodejs"

type Artifact = { type: string; value: string }
type IocBody = { artifacts: Artifact[] }

const TI_JSON_SYSTEM_PROMPT = `
You are a senior Threat Intelligence analyst. Your task is to assess the provided artifacts (IPs, domains, hashes).
Return the result ONLY as valid JSON (no Markdown, no code blocks).

Expected JSON format:
{
  "summary": "One short summary sentence (e.g., 'Potential C2 infrastructure associated with APT28 detected').",
  "risk_score": 0-100,
  "verdict": "BENIGN" | "SUSPICIOUS" | "MALICIOUS" | "UNKNOWN",
  "details": [
    {
      "artifact": "artifact value",
      "analysis": "Short assessment of this specific item",
      "recommended_action": "e.g., Block on Firewall"
    }
  ],
  "global_actions": ["List", "of", "steps", "for", "the analyst"]
}

Be specific. If an artifact looks like a private IP (e.g., 192.168.x.x, 10.x.x.x, 172.16-31.x.x), mark it as BENIGN.
`.trim()

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IocBody
    if (!body.artifacts?.length) {
      return NextResponse.json({ summary: "No data provided" })
    }

    const { OpenAI } = require("openai")
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Tu w przyszłości dodasz "Enrichment" (GeoIP, Whois) przed wysłaniem do LLM
    const artifactsList = body.artifacts.map((a) => `${a.type}: ${a.value}`).join("\n")

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TI_JSON_SYSTEM_PROMPT },
        { role: "user", content: `Analyze:\n${artifactsList}` },
      ],
    })

    const content = response.choices[0]?.message?.content || "{}"

    // Parsowanie JSON z LLM
    try {
      const jsonContent = JSON.parse(content)
      return NextResponse.json(jsonContent)
    } catch (e) {
      // Fallback jeśli model zwrócił brudny JSON
      return NextResponse.json({
        summary: content,
        risk_score: 0,
        verdict: "UNKNOWN",
        details: [],
        global_actions: ["Manual review"],
      })
    }
  } catch (err) {
    console.error("TI Route Error:", err)
    return NextResponse.json({
      summary: "TI analysis error (Backend Error)",
      risk_score: 0,
      verdict: "UNKNOWN",
      details: [],
      global_actions: ["Check server logs"],
    })
  }
}
