/**
 * Nymphora Engine — DETECTORS MODULE (PRO VERSION)
 * ---------------------------------------------------------------
 * Odpowiada za rozpoznawanie typów encji na podstawie id/value.
 *
 * ZMIANY:
 * - Poprawiono isPhone (bardziej rygorystyczny regex)
 */

export type EntityType =
  | "DOMAIN"
  | "SUBDOMAIN"
  | "IP"
  | "URL"
  | "EMAIL"
  | "ASN"
  | "ORG"
  | "PHONE"
  | "CIDR"
  | "SERVICE"
  | "OTHER"
  | "UNKNOWN"

/** IPv4 / IPv6 */
export function isIp(q: string): boolean {
  if (!q) return false
  const v4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(q.trim())
  const v6 = /^[0-9a-f:]+$/i.test(q.trim())
  return v4 || v6
}

/** URL */
export function isUrl(q: string): boolean {
  if (!q) return false
  return /^https?:\/\//i.test(q.trim())
}

/** Domain / Subdomain */
export function isDomain(q: string): boolean {
  if (!q) return false
  if (isUrl(q)) return false
  if (!q.includes(".")) return false
  return /^[A-Za-z0-9.-]+$/.test(q.trim())
}

/** Email */
export function isEmail(q: string): boolean {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(q.trim())
}

/** ASN (AS12345) */
export function isAsn(q: string): boolean {
  return /^AS\d{1,10}$/i.test(q.trim())
}

/** Phone - Stricter Check */
export function isPhone(q: string): boolean {
  const value = q.trim()
  // Musi mieć co najmniej 7 znaków
  if (value.length < 7) return false
  
  // Dozwolone znaki: cyfry, spacje, minusy, nawiasy, plus, kropka
  if (!/^[\d\s\-\(\)\.\+]+$/.test(value)) return false
  
  // Sprawdzenie samej liczby cyfr (min 7, max 15 dla standardu E.164)
  const digits = value.replace(/\D/g, "")
  if (digits.length < 7 || digits.length > 15) return false

  return true
}

/** CIDR */
export function isCidr(q: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(q.trim())
}

/**
 * Inteligentna detekcja typu.
 */
export function detectType(q: string): EntityType {
  try {
    if (!q) return "UNKNOWN"

    const value = q.trim()

    if (isUrl(value)) return "URL"
    if (isIp(value)) return "IP"
    if (isEmail(value)) return "EMAIL"
    if (isAsn(value)) return "ASN"
    if (isCidr(value)) return "CIDR"
    
    // Explicit prefix check first
    if (value.startsWith("tel:") || isPhone(value)) return "PHONE"
    if (value.startsWith("mailto:")) return "EMAIL"
    if (value.startsWith("country:")) return "OTHER"

    if (isDomain(value)) {
      const dots = value.split(".")
      if (dots.length > 2) return "SUBDOMAIN"
      return "DOMAIN"
    }

    return "UNKNOWN"
  } catch (e) {
    console.error("[detectType] Failed to detect type:", e)
    return "UNKNOWN"
  }
}
