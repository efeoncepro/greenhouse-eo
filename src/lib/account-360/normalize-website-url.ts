/**
 * TASK-1285 — Normalización canónica de la URL/web de una organización (SSOT del transform).
 *
 * ÚNICO lugar donde se decide cómo se persiste `greenhouse_core.organizations.website_url`.
 * Todo writer (puerta HubSpot, account-360, backfill) llama a este helper — NUNCA normaliza
 * inline, para que no haya drift de formato entre paths.
 *
 * Reglas (robustez + safety):
 *  - Solo `http`/`https`. Cualquier otro esquema (`javascript:`, `data:`, `mailto:`, `ftp:`)
 *    → `null` (defensa contra URIs peligrosas que terminarían en un `<a href>` del portal).
 *  - Sin esquema → se asume `https://`.
 *  - Host en minúsculas, sin `www.` redundante NO se quita (preserva la identidad declarada).
 *  - El host debe tener al menos un punto (rechaza `localhost`, `intranet`, basura).
 *  - Sin query string ni fragment (tracking/junk fuera); sin trailing slash.
 *  - Input vacío/whitespace/no parseable → `null` (honest: no inventamos dominio).
 */

export const normalizeWebsiteUrl = (raw: string | null | undefined): string | null => {
  if (typeof raw !== 'string') return null

  const trimmed = raw.trim()

  if (trimmed.length === 0) return null

  // Sin esquema explícito → asumir https. Detectamos un esquema con el patrón `scheme:`.
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  const candidate = hasScheme ? trimmed : `https://${trimmed}`

  let url: URL

  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  // Safety: solo http(s). Bloquea javascript:/data:/mailto:/ftp:/etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase()

  // El host debe parecer un dominio público (tiene un punto y no es una IP-ish vacía).
  if (!host.includes('.') || host.startsWith('.') || host.endsWith('.')) return null

  // Reconstrucción canónica: esquema + host (+ puerto no-default) + path sin trailing slash.
  // Sin search ni hash (tracking/junk no es identidad de marca).
  const port = url.port && url.port !== '80' && url.port !== '443' ? `:${url.port}` : ''
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '')

  return `${url.protocol}//${host}${port}${path}`
}
