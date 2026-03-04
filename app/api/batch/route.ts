// app/api/batch/route.ts

import { prisma } from "@/lib/db"

type EntityType = "EMAIL" | "DOMAIN" | "IP" | "PERSON" | "PHONE" | "URL" | "OTHER"

type NewEntity = {
  type: EntityType
  value: string
  label?: string | null
  tags?: string[]
  props?: any
}

type NewEdge = {
  sourceValue: string
  targetValue: string
  type: string
  label?: string | null
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || !body.caseId) {
    return Response.json({ error: "caseId and payload required" }, { status: 400 })
  }

  const caseId: string = body.caseId
  const entities: NewEntity[] = Array.isArray(body.entities) ? body.entities : []
  const edges: NewEdge[] = Array.isArray(body.edges) ? body.edges : []

  // --- Zbierz unikalne pary (type,value) ---
  const uniqPairs = new Map<string, NewEntity>()
  for (const e of entities) {
    if (!e?.type || !e?.value) continue
    const key = `${e.type}|${e.value}`.toLowerCase()
    if (!uniqPairs.has(key)) uniqPairs.set(key, e)
  }

  // --- Prefetch istniejących encji w jednym zapytaniu ---
  const valuesByType: Record<EntityType, string[]> = {
    EMAIL: [], DOMAIN: [], IP: [], PERSON: [], PHONE: [], URL: [], OTHER: []
  }
  for (const e of uniqPairs.values()) valuesByType[e.type].push(e.value)

  const existing = await prisma.entity.findMany({
    where: {
      caseId,
      OR: Object.entries(valuesByType)
        .filter(([_, vals]) => vals.length)
        .map(([type, vals]) => ({ type: type as any, value: { in: vals } })),
    },
    select: { id: true, type: true, value: true },
  })

  // --- Mapa (type|value) -> id ---
  const idByPair = new Map<string, string>()
  for (const row of existing) {
    idByPair.set(`${row.type}|${row.value}`.toLowerCase(), row.id)
  }

  // --- Utwórz brakujące encje (createMany nie zwraca id; tworzymy per sztuka, ale tylko brakujące) ---
  for (const e of uniqPairs.values()) {
    const key = `${e.type}|${e.value}`.toLowerCase()
    if (idByPair.has(key)) continue
    const created = await prisma.entity.create({
      data: {
        caseId,
        type: e.type as any,
        value: e.value,
        label: e.label ?? null,
        tags: e.tags ?? [],
        props: e.props ?? undefined,
      },
      select: { id: true },
    })
    idByPair.set(key, created.id)
  }

  // --- Krawędzie: mapuj po value -> id, unikaj duplikatów ---
  for (const l of edges) {
    const sId = idByPair.get(`DOMAIN|${l.sourceValue}`.toLowerCase()) // domeny często są source
      || idByPair.get(`IP|${l.sourceValue}`.toLowerCase())
      || idByPair.get(`URL|${l.sourceValue}`.toLowerCase())
      || idByPair.get(`OTHER|${l.sourceValue}`.toLowerCase())

    const tId = idByPair.get(`DOMAIN|${l.targetValue}`.toLowerCase())
      || idByPair.get(`IP|${l.targetValue}`.toLowerCase())
      || idByPair.get(`URL|${l.targetValue}`.toLowerCase())
      || idByPair.get(`OTHER|${l.targetValue}`.toLowerCase())

    if (!sId || !tId) continue

    const exists = await prisma.edge.findFirst({
      where: { caseId, sourceId: sId, targetId: tId, type: l.type },
      select: { id: true },
    })
    if (!exists) {
      await prisma.edge.create({
        data: { caseId, sourceId: sId, targetId: tId, type: l.type, label: l.label ?? null },
      })
    }
  }

  // --- Zwróć świeży snapshot ---
  const ents = await prisma.entity.findMany({ where: { caseId } })
  const edgs = await prisma.edge.findMany({ where: { caseId } })
  return Response.json({ entities: ents, edges: edgs })
}
