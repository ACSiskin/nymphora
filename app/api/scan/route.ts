// app/api/scan/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { NymphoraScanner } from '@/app/scanner/core';
import { prisma } from '@/lib/db'; 

export const runtime = 'nodejs';
export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, caseId } = body;

    if (!target) {
      return NextResponse.json({ error: 'Brak adresu docelowego' }, { status: 400 });
    }

    // 1. Skanowanie
    const scanner = new NymphoraScanner(target);
    
    // Otrzymujemy obiekt typu NymphoraReport (struktura z metadata)
    const result = await scanner.execute();

    // 2. Detekcja typu
    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(target);

    // 3. Zapis do bazy (Hybrydowy)
    
    // A. Upsert Host (Teczka)
    const host = await prisma.networkHost.upsert({
      where: { target: target },
      update: { updatedAt: new Date() },
      create: {
        target: target,
        type: isIp ? 'IP' : 'DOMAIN'
      }
    });

    // B. Tworzymy wpis skanu
    // 🛠️ POPRAWKA: Pobieramy datę z result.metadata.timestamp
    // Jeśli z jakiegoś powodu jej nie ma, używamy new Date() (teraz)
    const scanDate = result.metadata?.timestamp 
      ? new Date(result.metadata.timestamp) 
      : new Date();

    const savedScan = await prisma.nymphoraScan.create({
      data: {
        hostId: host.id,
        target: target,
        scannedAt: scanDate, // Teraz jest poprawna data
        roiCaseId: caseId || null,
        
        // Zapisujemy cały obiekt wyniku jako JSON
        data: result as any 
      }
    });

    console.log(`[DB] Zapisano JSON skan dla ${target}`);

    // Zwracamy frontendowi wynik
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Błąd skanowania', details: error.message }, 
      { status: 500 }
    );
  }
}
