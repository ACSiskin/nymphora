// app/api/notes/route.ts

import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const NoteSchema = z.object({
  caseId: z.string(),
  title: z.string(),
  markdown: z.string(),
})

export async function GET(req: NextRequest) {
  const caseId = new URL(req.url).searchParams.get("caseId")
  if (!caseId)
    return Response.json({ error: "Missing caseId" }, { status: 400 })
  const notes = await prisma.note.findMany({ where: { caseId } })
  return Response.json(notes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = NoteSchema.parse(body)
  const created = await prisma.note.create({ data })
  return Response.json(created, { status: 201 })
}
