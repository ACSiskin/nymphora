//app/api/console/route.ts

import { NextResponse } from "next/server"

let logBuffer: any[] = []
let resultBuffer: any[] = []

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // TYPE: deep-recon logs
    if (data.type === "deep-recon") {
      logBuffer.push({
        id: crypto.randomUUID(),
        tool: data.tool,
        content: data.content,
        timestamp: data.timestamp,
      })
    }

    // TYPE: deep-result (final results)
    if (data.type === "deep-result") {
      resultBuffer = [
        {
          id: crypto.randomUUID(),
          target: data.target,
          content: data.content,
          timestamp: data.timestamp,
        },
      ]
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.toString() }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    logs: logBuffer,
    results: resultBuffer,
  })
}
