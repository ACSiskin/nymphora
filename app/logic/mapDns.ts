/**
 * Nymphora Engine — DNS Mapping Module (PRO VERSION)
 * ---------------------------------------------------------------
 * Zamienia payload DNS w zestaw węzłów i krawędzi OSINT-friendly.
 *
 * ZMIANY:
 * - Użycie makeEdgeId dla unikalnych krawędzi
 */

import type { NymphoraElements } from "./merge"
import { makeEdgeId } from "./merge"
import { detectType } from "./detectors"

export function mapDns(domain: string, payload: any): NymphoraElements {
  const R = payload?.result ?? payload ?? {}

  const nodes: any[] = []
  const edges: any[] = []

  // Node główny
  nodes.push({
    data: {
      id: domain,
      label: domain,
      _type: detectType(domain),
    },
  })

  const addIp = (ip: string, label: string) => {
    if (!ip) return
    nodes.push({
      data: {
        id: ip,
        label: ip,
        _type: "IP",
      },
    })
    edges.push({
      data: {
        id: makeEdgeId(domain, ip, label),
        source: domain,
        target: ip,
        label,
      },
    })
  }

  // A
  for (const ip of R.A ?? []) addIp(ip, "A")

  // AAAA
  for (const ip of R.AAAA ?? []) addIp(ip, "AAAA")

  // CNAME
  for (const cn of R.CNAME ?? []) {
    if (!cn) continue
    nodes.push({
      data: { id: cn, label: cn, _type: "DOMAIN" },
    })
    edges.push({
      data: {
        id: makeEdgeId(domain, cn, "CNAME"),
        source: domain,
        target: cn,
        label: "CNAME",
      },
    })
  }

  // NS
  for (const ns of R.NS ?? []) {
    if (!ns) continue
    nodes.push({
      data: { id: ns, label: ns, _type: "DOMAIN" },
    })
    edges.push({
      data: {
        id: makeEdgeId(domain, ns, "NS"),
        source: domain,
        target: ns,
        label: "NS",
      },
    })
  }

  // MX
  for (const mx of R.MX ?? []) {
    const exch = typeof mx === "string" ? mx : mx?.exchange
    if (!exch) continue

    const label = `MX${mx?.priority ? `:${mx.priority}` : ""}`

    nodes.push({
      data: { id: exch, label: exch, _type: "DOMAIN" },
    })

    edges.push({
      data: {
        id: makeEdgeId(domain, exch, label),
        source: domain,
        target: exch,
        label: label,
      },
    })
  }

  return { nodes, edges }
}
