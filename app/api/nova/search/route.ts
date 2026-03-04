// app/api/nova/search/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { query } = body

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Łączymy się z Twoim skryptem Python (main.py) działającym lokalnie
    // Upewnij się, że uruchomiłeś go komendą: python3 nova-inet/main.py
    const pythonServiceUrl = "http://127.0.0.1:8001/search"
    
    const res = await fetch(pythonServiceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    })

    if (!res.ok) {
        console.error(`Python service error: ${res.status}`)
        return NextResponse.json({ error: "Search engine unavailable" }, { status: 503 })
    }

    const data = await res.json()
    
    // Jeśli Python zwrócił status: blocked
    if (data.status === "blocked") {
        return NextResponse.json({ 
            results: [], 
            message: data.reason || "Zapytanie zablokowane przez politykę bezpieczeństwa." 
        })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error("Search Proxy Error:", error)
    return NextResponse.json({ error: "Internal Server Error - Is Python script running?" }, { status: 500 })
  }
}
