// app/api/geoip/route.ts

import { NextResponse } from "next/server";

let reader: any = null;

// Lazy load, bo 'maxmind' jest ESM/CJS—ładujemy na żądanie, tylko w środowisku serwera.
async function getReader() {
  if (reader) return reader;
  const fs = await import("fs");
  const path = await import("path");
  const mm = await import("maxmind"); // pnpm add maxmind
  const dbPath = path.join(process.cwd(), "data", "GeoLite2-City.mmdb");
  if (!fs.existsSync(dbPath)) {
    throw new Error("Brak pliku data/GeoLite2-City.mmdb. Dodaj go lokalnie (offline).");
  }
  reader = await mm.open(dbPath);
  return reader;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ip = searchParams.get("ip");
    if (!ip) return NextResponse.json({ error: "Parametr ?ip= jest wymagany" }, { status: 400 });

    const r = await getReader();
    const res = r.get(ip);
    if (!res) return NextResponse.json({ ip, found: false });

    const city = res?.city?.names?.en ?? null;
    const country = res?.country?.names?.en ?? null;
    const lat = res?.location?.latitude ?? null;
    const lng = res?.location?.longitude ?? null;

    return NextResponse.json({
      ip,
      found: true,
      city,
      country,
      lat,
      lng,
      raw: res,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "GeoIP error" }, { status: 500 });
  }
}
