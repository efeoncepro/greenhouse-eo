import 'server-only'

/**
 * TASK-1266 — Growth AI Visibility · Probe fetcher (Slice 1, server-only).
 *
 * Fetcher read-only SSRF-guarded para los probes técnicos del sitio analizado. SIEMPRE
 * GET de superficies públicas; NUNCA autentica, muta ni toca hosts no públicos. NUNCA
 * lanza: un fallo se refleja en `ok=false` + `errorCode` (el probe lo traduce a honest
 * degradation). Cortesía: User-Agent identificable, timeout por request, tope de bytes,
 * `redirect: 'follow'` acotado al mismo registrable host (no se persigue cross-host).
 */

import { captureWithDomain } from '@/lib/observability/capture'

import {
  type ProbeFetchInit,
  type ProbeFetchResult,
  type ProbeFetcher
} from './contracts'

const DEFAULT_TIMEOUT_MS = 8000
const MAX_TIMEOUT_MS = 20000
const DEFAULT_MAX_BYTES = 1_048_576 // 1 MiB defensivo

const COURTESY_USER_AGENT =
  'GreenhouseAEOGrader/1.0 (+https://greenhouse.efeoncepro.com; read-only AEO readiness probe)'

/** Hosts no públicos: loopback, link-local, privados, metadata. Defense-in-depth (no resuelve DNS). */
const isNonPublicHost = (host: string): boolean => {
  const h = host.toLowerCase().replace(/\.$/, '')

  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) {
    return true
  }

  // IPv6 loopback / link-local / unique-local.
  if (h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) {
    return true
  }

  // IPv4 literales en rangos privados / loopback / link-local / metadata.
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)

  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]

    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true // link-local + metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  }

  return false
}

/** Resuelve la URL del probe contra el baseUrl, exigiendo https público y mismo host. */
const resolveProbeUrl = (baseUrl: string, path: string): URL | null => {
  let url: URL
  let base: URL

  try {
    base = new URL(baseUrl)
    url = new URL(path, baseUrl)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (isNonPublicHost(url.hostname)) return null
  // Acota al host del sujeto (no se sigue a un host arbitrario declarado en un path absoluto).
  if (url.hostname !== base.hostname) return null

  return url
}

/**
 * Crea un fetcher acotado al `baseUrl` del sujeto. Cada probe lo recibe en su contexto.
 * `withFetch` inyectable para tests (default = global fetch).
 */
export const createProbeFetcher = (
  baseUrl: string,
  deps: { fetchImpl?: typeof fetch } = {}
): ProbeFetcher => {
  const fetchImpl = deps.fetchImpl ?? fetch

  return async (path: string, init: ProbeFetchInit = {}): Promise<ProbeFetchResult> => {
    const target = resolveProbeUrl(baseUrl, path)

    if (!target) {
      return { ok: false, status: 0, url: path, body: '', contentType: null, errorCode: 'blocked' }
    }

    const timeoutMs = Math.min(init.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS)
    const maxBytes = init.maxBytes ?? DEFAULT_MAX_BYTES

    try {
      const response = await fetchImpl(target.toString(), {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'user-agent': COURTESY_USER_AGENT,
          accept: init.accept ?? 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8'
        }
      })

      const finalUrl = response.url || target.toString()
      const contentType = response.headers.get('content-type')

      // Defensa anti-payload: si declara tamaño y excede el tope, no se lee el body.
      const declaredLength = Number(response.headers.get('content-length') ?? '')

      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        return {
          ok: response.ok,
          status: response.status,
          url: finalUrl,
          body: '',
          contentType,
          errorCode: 'too_large'
        }
      }

      const raw = await response.text()
      const body = raw.length > maxBytes ? raw.slice(0, maxBytes) : raw

      return {
        ok: response.ok,
        status: response.status,
        url: finalUrl,
        body,
        contentType,
        errorCode: response.ok ? null : 'http_error'
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError'

      // Observabilidad sin filtrar el raw al cliente; el probe lo degrada honestamente.
      captureWithDomain(error, 'growth', {
        level: 'info',
        tags: { source: 'growth_ai_visibility_probe_fetch', reason: isTimeout ? 'timeout' : 'network' },
        extra: { host: target.hostname }
      })

      return {
        ok: false,
        status: 0,
        url: target.toString(),
        body: '',
        contentType: null,
        errorCode: isTimeout ? 'timeout' : 'network'
      }
    }
  }
}

/** Normaliza el website del perfil a `{ domain, baseUrl }` público, o null si no es válido. */
export const resolveSubjectSite = (websiteUrl: string | null): { domain: string; baseUrl: string } | null => {
  if (!websiteUrl) return null

  const trimmed = websiteUrl.trim()

  // Si trae un esquema explícito que NO es http(s), se rechaza (no se "rescata" prefijando https).
  const explicitScheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(trimmed)

  if (explicitScheme && !/^https?$/i.test(explicitScheme[1])) return null

  const candidate = explicitScheme ? trimmed : `https://${trimmed}`

  let url: URL

  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (isNonPublicHost(url.hostname)) return null

  // baseUrl siempre https (las superficies AEO se sirven por https; evita downgrade).
  return { domain: url.hostname, baseUrl: `https://${url.hostname}` }
}
