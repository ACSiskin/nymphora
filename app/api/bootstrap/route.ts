// app/api/nymphora/bootstrap/route.ts
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    let current = await prisma.case.findFirst({
      where: { type: "NYMPHORA" },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    })

    if (!current) {
      current = await prisma.case.create({
        data: {
          type: "NYMPHORA",
          title: "Default Nymphora Session",
          description: "Auto-created session for Nymphora graph",
        },
        select: { id: true },
      })
    }
    return Response.json({ caseId: current.id })
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "bootstrap failed" }, { status: 500 })
  }
}
