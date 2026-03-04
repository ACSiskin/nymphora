// app/api/edges/route.ts

import { prisma } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const caseId = searchParams.get("caseId")
    if (!caseId) return Response.json([], { status: 200 })
    const data = await prisma.edge.findMany({
      where: { caseId },
      orderBy: { createdAt: "asc" },
    })
    return Response.json(data)
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "edges failed" }, { status: 500 })
  }
}
