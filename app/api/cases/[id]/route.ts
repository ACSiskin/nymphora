import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;  // może być `id` albo `caseId`

  try {
    console.log("🔍 Szukam sprawy po caseId:", id);

    // 🟢 1️⃣ Spróbuj znaleźć po `caseId`
    let caseData = await prisma.roiCase.findUnique({
      where: { caseId: id },
    });

    // 🟡 2️⃣ Jeśli nie znaleziono — spróbuj po PRIMARY KEY `id`
    if (!caseData) {
      console.log("⚠️ Nie znaleziono po caseId. Szukam po PRIMARY KEY id:", id);
      caseData = await prisma.roiCase.findUnique({
        where: { id }, // cuid()
      });
    }

    // 🔴 Jeśli nadal brak — zwróć 404
    if (!caseData) {
      return NextResponse.json(
        { error: "Nie znaleziono sprawy" },
        { status: 404 }
      );
    }

    return NextResponse.json(caseData, { status: 200 });
  } catch (error) {
    console.error("🔥 Błąd GET /api/cases/[id]:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // usuń niezależnie — Prisma automatycznie rozróżnia id i caseId
    await prisma.roiCase.deleteMany({
      where: { OR: [{ id }, { caseId: id }] },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("🔥 Błąd DELETE /api/cases/[id]:", error);
    return NextResponse.json(
      { error: "Nie udało się usunąć sprawy" },
      { status: 500 }
    );
  }
}

