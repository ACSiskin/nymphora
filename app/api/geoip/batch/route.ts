// app/api/geoip/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getGeoBatch } from '@/lib/geoip-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ips } = body;

    if (!Array.isArray(ips)) {
      return NextResponse.json({ error: 'Invalid input, expected array of IPs' }, { status: 400 });
    }

    // Limitujemy batch dla bezpieczeństwa
    if (ips.length > 5000) {
      return NextResponse.json({ error: 'Batch size too large' }, { status: 413 });
    }

    const geoData = await getGeoBatch(ips);
    return NextResponse.json(geoData);
  } catch (error) {
    console.error('GeoIP API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
