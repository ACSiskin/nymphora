import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

// GET: Pobiera listę wątków (dla konkretnej sprawy lub globalne)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const caseId = searchParams.get("caseId") // null = global

    // Logika filtrowania:
    // Jeśli caseId jest podane -> szukamy wątków tej sprawy
    // Jeśli brak (null) -> szukamy wątków "wolnych" (globalnych)
    const whereClause = caseId ? { caseId } : { caseId: null }

    const conversations = await prisma.novaConversation.findMany({
      where: whereClause,
      orderBy: {
        updatedAt: 'desc'
      },
      take: 50, // Limit ostatnich 50 rozmów
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: {
          select: { messages: true }
        }
      }
    })

    return NextResponse.json(conversations)

  } catch (error) {
    console.error("[NOVA_CONVERSATIONS_GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

// DELETE: Usuwa wątek (wymagane przez przycisk kosza w UI)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 })
    }

    // Usunięcie wątku z bazy.
    // Dzięki relacji onDelete: Cascade w schema.prisma, usunie to też wszystkie wiadomości w tym wątku.
    await prisma.novaConversation.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, deletedId: id })

  } catch (error) {
    console.error("[NOVA_CONVERSATIONS_DELETE]", error)
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 })
  }
}
