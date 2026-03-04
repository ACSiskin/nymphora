// lib/geoip-service.ts
import fs from 'fs';
import path from 'path';
import { Reader, City } from 'maxmind';

let dbReader: Reader<City> | null = null;

export async function getGeoBatch(ips: string[]) {
  // Singleton - ładujemy bazę tylko raz
  if (!dbReader) {
    try {
      const dbPath = path.join(process.cwd(), 'data', 'GeoLite2-City.mmdb');
      if (fs.existsSync(dbPath)) {
        const dbBuffer = fs.readFileSync(dbPath);
        dbReader = new Reader<City>(dbBuffer);
      } else {
        console.warn('⚠️ GeoLite2-City.mmdb not found in /data folder.');
        return {};
      }
    } catch (e) {
      console.error('❌ Failed to load MaxMind DB:', e);
      return {};
    }
  }

  const results: Record<string, { lat: number; lon: number; city?: string; country?: string; iso?: string }> = {};

  for (const ip of ips) {
    // Pomijamy adresy lokalne i prywatne, aby nie tracić czasu CPU
    if (!ip || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '127.0.0.1' || ip.startsWith('172.16.')) {
      continue;
    }

    try {
      const resp = dbReader.get(ip);
      if (resp && resp.location && resp.location.latitude && resp.location.longitude) {
        results[ip] = {
          lat: resp.location.latitude,
          lon: resp.location.longitude,
          city: resp.city?.names?.en,
          country: resp.country?.names?.en,
          iso: resp.country?.iso_code,
        };
      }
    } catch (e) {
      // Ignorujemy błędy parsowania pojedynczych IP
    }
  }

  return results;
}
