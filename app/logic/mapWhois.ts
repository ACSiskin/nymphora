/**
 * Nymphora Engine — WHOIS Mapping Module (PRO VERSION)
 * ---------------------------------------------------------------
 * Przetwarza payload WHOIS w zestaw encji OSINT.
 */

import type { NymphoraElements } from "./merge"
import { makeEdgeId } from "./merge"
import { detectType } from "./detectors"

export function mapWhois(query: string, payload: any): NymphoraElements {
  const rootType = detectType(query)

  const nodes: any[] = []
  const edges: any[] = []

  const addNode = (id: string, label: string, _type = "OTHER") => {
    if (!id) return null
    nodes.push({ data: { id, label, _type } })
    return id
  }

  const link = (src: string, tgt: string, label: string) => {
    if (!src || !tgt || src === tgt) return
    edges.push({
      data: {
        id: makeEdgeId(src, tgt, label),
        source: src,
        target: tgt,
        label,
      },
    })
  }

  const data = payload?.result ?? payload ?? {}
  const raw = JSON.stringify(payload)

  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = data[k] ?? data[k.toUpperCase()] ?? data[k.toLowerCase()]
      if (v) return v
    }
    return undefined
  }

  const asArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : [])
  
  const emailsFromText = (txt: string) => {
    const re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    return txt.match(re) ?? []
  }

  // --- METADANE (CONTACTS) ---
  const abuse = get("abuseEmail", "abuse-mailbox", "RegistrarAbuseEmail")
  const extractedEmails = emailsFromText(raw)
  const phone = get("phone", "OrgAbusePhone", "OrgNOCPhone", "RegistrarAbusePhone")

  const contactMetadata = {
    emails: [...new Set([...asArray(abuse).map(String), ...extractedEmails])],
    phones: [...new Set(asArray(phone).map(String))]
  }

  // Root Node z metadanymi
  nodes.push({
    data: { 
      id: query, 
      label: query, 
      _type: rootType,
      contacts: contactMetadata 
    },
  })

  // --- INFRASTRUKTURA ---

  // ORG
  const org = get("orgName", "organization", "owner", "OrgName")
  if (org) {
    const id = addNode(`org:${org}`, String(org), "ORG")
    link(query, id!, "ORG")
  }

  // NETNAME
  const netname = get("netname", "NetName")
  if (netname) {
    const id = addNode(`netname:${netname}`, String(netname), "ORG")
    link(query, id!, "NETNAME")
  }

  // COUNTRY (ZMIANA: Typ explicit COUNTRY)
  const country = get("country", "Country")
  if (country) {
    const id = addNode(`country:${country}`, String(country), "COUNTRY")
    link(query, id!, "COUNTRY")
  }

  // CIDR
  const cidr = get("cidr", "inetnum")
  if (cidr) {
    const id = addNode(`cidr:${cidr}`, String(cidr), "CIDR")
    link(query, id!, "CIDR")
  }

  // ASN
  const rawAsnMatches = raw.match(/AS\d{1,10}/gi) ?? []
  const asns = new Set<string>([...rawAsnMatches])

  for (const asn of asns) {
    const id = addNode(asn, asn, "ASN")
    link(query, id!, "ASN")
  }

  return { nodes, edges }
}
