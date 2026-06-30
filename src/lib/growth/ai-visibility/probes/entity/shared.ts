/**
 * TASK-1267 — Growth AI Visibility · Entity probes · shared helpers (PURO).
 *
 * Utilidades comunes a los probes de entidad (Knowledge Graph / Wikidata / Reddit):
 * parseo JSON defensivo, matching de host por dominio (desambiguación por dominio, no
 * solo por nombre) y normalización de nombre de marca. Sin IO, sin server-only.
 */

/** Parsea JSON sin lanzar: devuelve `null` si el body no es JSON válido. */
export const safeJsonParse = <T = unknown>(body: string): T | null => {
  try {
    return JSON.parse(body) as T
  } catch {
    return null
  }
}

/** Normaliza un host a comparable: lowercase, sin trailing dot, sin `www.` líder. */
export const normalizeHost = (host: string): string =>
  host
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/^www\./, '')

/**
 * Extrae el host de una URL (o de un string que ya sea un host). Devuelve null si no se
 * puede resolver. Tolera valores con o sin esquema.
 */
export const hostOf = (value: string | null | undefined): string | null => {
  if (!value) return null

  const trimmed = value.trim()

  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).hostname
  } catch {
    return null
  }
}

/**
 * ¿El host candidato corresponde al dominio del sujeto? Compara por registrable aproximado
 * (sin PSL): normaliza ambos (sin `www.`) y acepta igualdad o relación de subdominio en
 * cualquier dirección (`brand.com` ↔ `shop.brand.com`). Suficiente para confirmar la marca.
 */
export const hostMatchesDomain = (
  candidate: string | null | undefined,
  subjectDomain: string
): boolean => {
  const candHost = hostOf(candidate)

  if (!candHost) return false

  const a = normalizeHost(candHost)
  const b = normalizeHost(subjectDomain)

  if (!a || !b) return false

  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`)
}

/** Normaliza un nombre de marca para comparación laxa (lowercase, sin tildes, sin sufijos legales). */
export const normalizeBrandName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/\b(s\.?a\.?(\.?s)?|spa|ltda|inc|llc|corp|gmbh|s\.?r\.?l\.?)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
