import 'server-only'

/**
 * TASK-1267 — Growth AI Visibility · Entity API fetcher (server-only).
 *
 * Fetcher read-only a las APIs PÚBLICAS de entidad de TERCEROS (Google Knowledge Graph,
 * Wikidata, Reddit). Distinto del `safe-fetch` del eje structural/agentic: ese está acotado
 * por SSRF al host del SUJETO; este está acotado por ALLOWLIST a los hosts conocidos de las
 * APIs de entidad. NUNCA toca el sitio del sujeto, NUNCA hosts arbitrarios. NUNCA lanza:
 * un fallo se refleja en `ok=false` + `errorCode` (el probe lo traduce a honest degradation).
 * Cortesía: User-Agent identificable, timeout por request, tope de bytes, sin redirects
 * cross-host fuera de la allowlist.
 */

import { captureWithDomain } from '@/lib/observability/capture'

import {
  type EntityApiFetcher,
  type EntityFetchInit,
  type EntityFetchResult
} from './contracts'

const DEFAULT_TIMEOUT_MS = 8000
const MAX_TIMEOUT_MS = 15000
const DEFAULT_MAX_BYTES = 1_048_576 // 1 MiB defensivo

const COURTESY_USER_AGENT =
  'GreenhouseAEOGrader/1.0 (+https://greenhouse.efeoncepro.com; read-only entity readiness probe)'

/**
 * Allowlist de hosts de APIs de entidad. Solo estos hosts son alcanzables por el fetcher.
 * Cada probe arma su URL contra uno de estos; cualquier otro host → `blocked`.
 */
export const ENTITY_API_ALLOWED_HOSTS = new Set<string>([
  'kgsearch.googleapis.com', // Google Knowledge Graph Search API
  'www.wikidata.org', // Wikidata API (wbsearchentities / wbgetentities)
  'www.reddit.com' // Reddit búsqueda pública read-only (search.json)
])

const isAllowedEntityHost = (host: string): boolean =>
  ENTITY_API_ALLOWED_HOSTS.has(host.toLowerCase().replace(/\.$/, ''))

const resolveAllowedUrl = (rawUrl: string): URL | null => {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  if (url.protocol !== 'https:') return null
  if (!isAllowedEntityHost(url.hostname)) return null

  return url
}

/**
 * Crea el fetcher de entidad host-allowlisted. `fetchImpl` inyectable para tests
 * (default = global fetch). NO resuelve secretos: la API key del KG la pasa el probe
 * vía la query string (la resuelve el command server-side).
 */
export const createEntityApiFetcher = (
  deps: { fetchImpl?: typeof fetch } = {}
): EntityApiFetcher => {
  const fetchImpl = deps.fetchImpl ?? fetch

  return async (rawUrl: string, init: EntityFetchInit = {}): Promise<EntityFetchResult> => {
    const target = resolveAllowedUrl(rawUrl)

    if (!target) {
      return { ok: false, status: 0, body: '', errorCode: 'blocked' }
    }

    const timeoutMs = Math.min(init.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS)
    const maxBytes = init.maxBytes ?? DEFAULT_MAX_BYTES

    const headers: Record<string, string> = {
      'user-agent': COURTESY_USER_AGENT,
      accept: 'application/json,text/plain;q=0.9,*/*;q=0.8'
    }

    if (init.authorization) headers.authorization = init.authorization

    try {
      const response = await fetchImpl(target.toString(), {
        method: 'GET',
        // No se siguen redirects a hosts fuera de la allowlist: si la API redirige
        // fuera, se trata como error en vez de perseguir un host arbitrario.
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
        headers
      })

      // Redirect manual (3xx): no perseguimos cross-host. Lo reflejamos como http_error.
      if (response.status >= 300 && response.status < 400) {
        return { ok: false, status: response.status, body: '', errorCode: 'http_error' }
      }

      const declaredLength = Number(response.headers.get('content-length') ?? '')

      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        return { ok: response.ok, status: response.status, body: '', errorCode: 'too_large' }
      }

      const raw = await response.text()
      const body = raw.length > maxBytes ? raw.slice(0, maxBytes) : raw

      return {
        ok: response.ok,
        status: response.status,
        body,
        errorCode: response.ok ? null : 'http_error'
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError'

      // Observabilidad sin filtrar el raw al cliente; el probe lo degrada honestamente.
      captureWithDomain(error, 'growth', {
        level: 'info',
        tags: {
          source: 'growth_ai_visibility_entity_fetch',
          reason: isTimeout ? 'timeout' : 'network'
        },
        extra: { host: target.hostname }
      })

      return {
        ok: false,
        status: 0,
        body: '',
        errorCode: isTimeout ? 'timeout' : 'network'
      }
    }
  }
}

/** Deriva el idioma ISO-639-1 (p.ej. `es`) de un locale (`es-CL`); fallback `en`. */
export const localeToLanguage = (locale: string | null | undefined): string => {
  const base = (locale ?? '').trim().toLowerCase().split(/[-_]/)[0]

  return /^[a-z]{2}$/.test(base) ? base : 'en'
}
