import type { ElementsDefinition } from "cytoscape";

export type NodeDataExtended = {
    id: string;
    domains: string[];      
    dns: string[];          
    emails: string[];       
    infrastructure: string[]; 
    raw: any;
};

export type Node3D = {
  id: string;
  type: string;
  label: string;
  position: [number, number, number];
  color: [number, number, number];
  radius: number;
  icon: string;
  data: NodeDataExtended;
  isCluster?: boolean;
  clusterCount?: number;
};

export type Edge3D = {
  id: string;
  source: [number, number, number];
  target: [number, number, number];
  sourceColor: [number, number, number];
  targetColor: [number, number, number];
  type: 'PHYSICAL' | 'LOGICAL' | 'DNS_LINK';
  label?: string; 
};

// Paleta neonowych kolorów dla różnych domen (aby się nie myliły)
const DOMAIN_PALETTE = [
    [255, 0, 128],   // Neon Pink
    [0, 255, 255],   // Cyan
    [255, 255, 0],   // Yellow
    [0, 255, 0],     // Lime Green
    [138, 43, 226],  // Blue Violet
    [255, 165, 0],   // Orange
    [255, 20, 147],  // Deep Pink
    [0, 191, 255],   // Deep Sky Blue
];

// Funkcja generująca spójny kolor dla danej domeny
function generateDomainColor(domain: string): [number, number, number] {
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
        hash = domain.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % DOMAIN_PALETTE.length;
    return DOMAIN_PALETTE[index] as [number, number, number];
}

// Baza lokalizacji dla znanych dostawców (gdy GeoIP zawiedzie lub API nie odpowie)
// Rozbudowana o więcej providerów, żeby unikać "zrzutów na Antarktydę"
const KNOWN_HUBS: Record<string, { lat: number, lon: number }> = {
    // US Tech Giants
    'google': { lat: 37.422, lon: -122.084 },       
    'gmail': { lat: 37.422, lon: -122.084 },
    'cloudflare': { lat: 37.774, lon: -122.419 },   
    'microsoft': { lat: 47.674, lon: -122.121 },    
    'outlook': { lat: 47.674, lon: -122.121 },
    'azure': { lat: 47.674, lon: -122.121 },
    'amazon': { lat: 38.907, lon: -77.036 },        
    'aws': { lat: 38.907, lon: -77.036 },
    'facebook': { lat: 37.485, lon: -122.148 },     
    'meta': { lat: 37.485, lon: -122.148 },
    
    // Hosting / Infrastructure
    'ovh': { lat: 50.692, lon: 3.174 },             
    'hetzner': { lat: 49.206, lon: 10.865 },        
    'digitalocean': { lat: 40.712, lon: -74.006 },
    'linode': { lat: 39.952, lon: -75.165 },
    'akamai': { lat: 42.360, lon: -71.094 },
    'fastly': { lat: 37.774, lon: -122.419 },
    'leaseweb': { lat: 52.370, lon: 4.895 },
    'godaddy': { lat: 33.425, lon: -111.943 },
    'namecheap': { lat: 34.052, lon: -118.243 },
    
    // Registries / RIRs (ostateczność)
    'ripe': { lat: 52.370, lon: 4.895 },
    'arin': { lat: 38.907, lon: -77.036 },
    'lacnic': { lat: -34.901, lon: -56.164 },
    'apnic': { lat: -27.469, lon: 153.025 },
};

function getLocKey(lat: number, lon: number): string {
  const safeLat = Math.max(-89.9, Math.min(89.9, lat));
  return `${safeLat.toFixed(4)},${lon.toFixed(4)}`;
}

// ULEPSZONY FALLBACK LOKALIZACJI
function getSmartGeoFallback(ip: string, intel: NodeDataExtended): { lat: number, lon: number } {
    // 1. Analiza kontekstowa (szukanie słów kluczowych w danych węzła)
    const allText = [
        ...intel.infrastructure,
        ...intel.domains,
        ...intel.dns,
        ...intel.emails
    ].join(' ').toLowerCase();

    for (const [key, coords] of Object.entries(KNOWN_HUBS)) {
        if (allText.includes(key)) {
            // Dodajemy lekki "jitter" (szum), żeby punkty jednego providera nie nakładały się idealnie w jednym pikselu
            const jitter = (ip.charCodeAt(ip.length - 1) % 20) * 0.05; 
            return { lat: coords.lat + jitter, lon: coords.lon + jitter };
        }
    }

    // 2. Jeśli nadal nic nie wiemy -> Zrzut na "Null Island" (0,0 - Zatoka Gwinejska)
    // Zmieniono z Antarktydy na środek oceanu, żeby nie myliło z fizyczną lokalizacją badawczą.
    // Rozkładamy je na siatce wokół punktu 0,0
    let hash = 0;
    for (let i = 0; i < ip.length; i++) hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    const safeHash = Math.abs(hash);

    const row = (safeHash % 20) - 10; // spread lat -10 do +10
    const col = ((safeHash >> 1) % 20) - 10; // spread lon -10 do +10
    
    return { lat: row, lon: col };
}

function isIpAddress(str: string): boolean {
    if (!str) return false;
    if (str.includes("://") || str.includes("@") || str.includes("mailto:")) return false;
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(str)) return true;
    if (str.includes(":") && !str.includes("http")) return true;
    return false;
}

export function transformToDeckGL(
  elements: ElementsDefinition,
  geoCache: Record<string, { lat: number; lon: number }>
) {
  const nodesRaw = Array.isArray(elements) ? (elements as any).filter((e: any) => !e.data.source) : elements.nodes || [];
  const edgesRaw = Array.isArray(elements) ? (elements as any).filter((e: any) => !!e.data.source) : elements.edges || [];

  // 1. Zbieranie metadanych (Metadata Gathering)
  const metaMap = new Map<string, string>(); 
  nodesRaw.forEach((n: any) => {
      if (n.data._type === 'URL' && n.data.http?.title) {
          metaMap.set(n.data.id, `WEB: ${n.data.http.title}`);
      }
      if (n.data._type === 'ASN') {
          metaMap.set(n.data.id, `ASN: ${n.data.id}`);
      }
  });

  const ipIntelligence = new Map<string, NodeDataExtended>();

  // Inicjalizacja węzłów IP - upewniamy się, że zaciągamy maile z JSONa poprawnie
  nodesRaw.forEach((n: any) => {
      if (isIpAddress(n.data.id)) {
          // Wyciągamy maile z obiektu contacts, jeśli istnieje
          const initialEmails = n.data.contacts?.emails || [];
          
          ipIntelligence.set(n.data.id, {
              id: n.data.id,
              domains: [], 
              dns: [], 
              emails: [...initialEmails], 
              infrastructure: [],
              raw: n.data
          });
      }
  });

  const nameToIpMap = new Map<string, string>();
  
  // Budowanie mapy nazw
  edgesRaw.forEach((e: any) => {
      const source = e.data.source;
      const target = e.data.target;
      const type = (e.data.label || "").toUpperCase();

      if ((type === 'A' || type === 'AAAA') && isIpAddress(target)) {
          nameToIpMap.set(source, target);
      }
  });

  const resolveIp = (target: string): string | null => {
      if (isIpAddress(target)) return target;
      return nameToIpMap.get(target) || null;
  };

  // --- AGREGACJA DANYCH ---
  edgesRaw.forEach((e: any) => {
      const type = (e.data.label || "").toUpperCase();
      const source = e.data.source;
      const target = e.data.target;

      // Domena -> IP
      if ((type === 'A' || type === 'AAAA') && isIpAddress(target)) {
          const intel = ipIntelligence.get(target);
          if (intel && !intel.domains.includes(source)) {
              intel.domains.push(source);
          }
      }

      // HTTP info
      if (type === 'HTTP') {
          if (isIpAddress(source) && metaMap.has(target)) {
              const intel = ipIntelligence.get(source);
              const info = metaMap.get(target);
              if (intel && info && !intel.domains.includes(info)) intel.domains.push(info);
          }
      }

      // ASN / Infrastruktura
      if (type === 'ASN') {
           if (isIpAddress(source)) {
                const intel = ipIntelligence.get(source);
                if (intel && !intel.infrastructure.includes(target)) intel.infrastructure.push(target);
           }
      }

      // Metadata z DNS (MX, NS) - bardzo ważne dla lokalizacji (np. email cloudflare)
      if (['NS', 'MX'].includes(type)) {
          const resolvedIp = resolveIp(target);
          if (resolvedIp) {
               const intel = ipIntelligence.get(resolvedIp);
               if (intel) {
                   const record = `${type}: ${source}`;
                   if (!intel.dns.includes(record)) intel.dns.push(record);
               }
          }
      }
  });

  // --- KLASTROWANIE GEOGRAFICZNE ---
  const clusterMap = new Map<string, NodeDataExtended[]>();
  const ipToLocKey = new Map<string, string>();

  ipIntelligence.forEach((intel, ip) => {
      let geo = geoCache[ip];
      if (!geo) {
          geo = getSmartGeoFallback(ip, intel);
      }
      
      const locKey = getLocKey(geo.lat, geo.lon);
      if (!clusterMap.has(locKey)) clusterMap.set(locKey, []);
      clusterMap.get(locKey)?.push(intel);
      ipToLocKey.set(ip, locKey);
  });

  // --- TWORZENIE WĘZŁÓW 3D ---
  const finalNodes: Node3D[] = [];
  const locKeyToNode3D = new Map<string, Node3D>();

  clusterMap.forEach((intels, locKey) => {
      const [latStr, lonStr] = locKey.split(",");
      const count = intels.length;
      const isMulti = count > 1;
      
      const aggregatedData: NodeDataExtended = {
          id: isMulti ? `CLUSTER::${locKey}` : intels[0].id,
          domains: [...new Set(intels.flatMap(i => i.domains))],
          dns: [...new Set(intels.flatMap(i => i.dns))],
          emails: [...new Set(intels.flatMap(i => i.emails))],
          infrastructure: [...new Set(intels.flatMap(i => i.infrastructure))],
          raw: isMulti ? { count, ips: intels } : intels[0].raw
      };

      const node: Node3D = {
          id: aggregatedData.id,
          type: isMulti ? "CLUSTER" : "IP",
          label: isMulti ? `${count} HOSTS` : aggregatedData.id,
          position: [parseFloat(lonStr), parseFloat(latStr), 0],
          color: isMulti ? [234, 179, 8] : [34, 197, 94], 
          radius: isMulti ? 6000 + (Math.log(count) * 2000) : 4000,
          icon: isMulti ? "🏢" : "💻",
          data: aggregatedData,
          isCluster: isMulti,
          clusterCount: count
      };

      finalNodes.push(node);
      locKeyToNode3D.set(locKey, node);
  });

  // --- TWORZENIE KRAWĘDZI (Z KOLOROWANIEM DOMEN) ---
  const finalEdges: Edge3D[] = [];
  const edgeDedupe = new Set<string>();

  const domainTopology = new Map<string, { hubs: string[], spokes: string[] }>();

  edgesRaw.forEach((e: any) => {
      const source = e.data.source; 
      const target = e.data.target; 
      const type = (e.data.label || "").toUpperCase();

      if (!domainTopology.has(source)) {
          domainTopology.set(source, { hubs: [], spokes: [] });
      }
      const topology = domainTopology.get(source)!;

      const resolvedIp = resolveIp(target);
      if (resolvedIp && ipToLocKey.has(resolvedIp)) {
          if (type === 'A' || type === 'AAAA') {
              topology.hubs.push(resolvedIp);
          } else if (['NS', 'MX', 'CNAME'].includes(type)) {
              topology.spokes.push(resolvedIp);
          }
      }
  });

  domainTopology.forEach((topo, domainName) => {
      // Generujemy unikalny kolor dla całej domeny
      const domainColor = generateDomainColor(domainName);

      if (topo.hubs.length > 0 && topo.spokes.length > 0) {
          const mainHubIp = topo.hubs[0];
          const hubKey = ipToLocKey.get(mainHubIp);
          const hubNode = hubKey ? locKeyToNode3D.get(hubKey) : null;

          if (hubNode) {
              topo.spokes.forEach(spokeIp => {
                  const spokeKey = ipToLocKey.get(spokeIp);
                  if (spokeKey && spokeKey !== hubKey) {
                      const spokeNode = locKeyToNode3D.get(spokeKey);
                      if (spokeNode) {
                          const edgeId = `edge:${hubNode.id}:${spokeNode.id}:${domainName}`; // Unique per domain path
                          if (!edgeDedupe.has(edgeId)) {
                              finalEdges.push({
                                  id: edgeId,
                                  source: hubNode.position,
                                  target: spokeNode.position,
                                  // Tutaj aplikujemy kolor domeny!
                                  sourceColor: domainColor,
                                  targetColor: domainColor, // Cała linia w jednym kolorze
                                  type: 'DNS_LINK',
                                  label: domainName
                              });
                              edgeDedupe.add(edgeId);
                          }
                      }
                  }
              });
          }
      }
  });

  return { nodes: finalNodes, edges: finalEdges };
}
