import 'server-only'

/**
 * TASK-1266 / TASK-1778 — Growth AI Visibility · Probe fetcher (server-only).
 *
 * Fetcher read-only SSRF-guarded para los probes técnicos del sitio analizado y para el
 * grounded read de brand-intelligence. SIEMPRE GET de superficies públicas; NUNCA
 * autentica, muta ni toca hosts no públicos. NUNCA lanza: un fallo se refleja en
 * `ok=false` + `errorCode` (el probe lo traduce a honest degradation).
 *
 * Garantías IMPLEMENTADAS (cada una tiene mecanismo en este archivo y test que falla si
 * divergen — `probes-safe-fetch-hardening.test.ts`):
 *
 *  - Contención de redirects (flag `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED`):
 *    `redirect: 'manual'` + bucle propio con tope `MAX_REDIRECTS`, revalidando CADA
 *    `Location` contra la familia del sujeto (mismo host, `apex ↔ www`, upgrade
 *    `http → https`; downgrade y todo otro host → `blocked_redirect`, cuerpo NO leído).
 *  - Guarda de host que RESUELVE DNS (mismo flag): `node:dns/promises` antes de conectar;
 *    si ALGUNA dirección resuelta cae en rango no público → `blocked_private_address`,
 *    en la URL inicial y en cada salto. Riesgo residual aceptado: entre resolver y
 *    conectar hay una ventana TOCTOU; la mitigación real (pin de la IP resuelta al
 *    conectar) queda declarada como follow-up en TASK-1778, no fingida como resuelta.
 *  - Tope de bytes REAL (sin flag): lectura por stream con corte duro (`readBodyWithCap`)
 *    — protege memoria incluso sin `content-length` (respuestas chunked) y deja rastro
 *    (`truncated: true`) para que un probe de presencia jamás afirme ausencia sobre un
 *    cuerpo parcial. `observable` retira además la afirmación sobre shells de render JS.
 *  - `robots.txt` OBEDECIDO (sin flag): la política se descarga UNA vez por sujeto (la
 *    misma lectura que analiza el probe de robots), se matchea NUESTRO token de UA —
 *    jamás los de los bots de IA que auditamos — y toda ruta prohibida devuelve
 *    `blocked_robots` (hallazgo, no fallo). El propio `/robots.txt` SIEMPRE es alcanzable.
 *
 * Con el flag de red OFF, el comportamiento de red es el previo (`redirect: 'follow'`,
 * sin resolución DNS): kill switch de cobertura sin revert. Cortesía: User-Agent
 * identificable (`ProbeFetchInit.userAgent` varía NUESTRO token, NUNCA suplanta el de un
 * tercero), timeout con techo, `cache: 'no-store'`, ejecución secuencial en el gatherer.
 */

import { lookup as dnsLookup } from 'node:dns/promises'

import { captureWithDomain } from '@/lib/observability/capture'

import { isProbeFetchStrictNetworkEnabled } from '../flags'
import {
  type ProbeFetchInit,
  type ProbeFetchResult,
  type ProbeFetcher
} from './contracts'
import { assessHtmlObservability } from './html'
import { readBodyWithCap } from './read-body'
import { isPathAllowed, parseRobotsPolicy, type RobotsPolicyGroup } from './robots-policy'

const DEFAULT_TIMEOUT_MS = 8000
const MAX_TIMEOUT_MS = 20000

/**
 * 4 MiB (TASK-1778 §3): `response.text()` entrega HTML DESCOMPRIMIDO — una página de
 * ~200 KB en tránsito ronda 1–1,5 MB de texto, así que 1 MiB se cruzaba sin que el sitio
 * fuera exótico. Con lectura por stream el valor es un techo real de memoria; cruzarlo
 * produce degradación honesta (`truncated`), no un hallazgo falso.
 */
const DEFAULT_MAX_BYTES = 4_194_304

/** Tope de saltos de redirect en modo estricto (TASK-1778 Slice 1). */
export const MAX_REDIRECTS = 5

/** Tope defensivo para la lectura de robots.txt (política, no contenido a analizar). */
const ROBOTS_POLICY_MAX_BYTES = 524_288

const COURTESY_USER_AGENT =
  'GreenhouseAEOGrader/1.0 (+https://greenhouse.efeoncepro.com; read-only AEO readiness probe)'

const DEFAULT_ACCEPT = 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8'

/** Product token propio para el matching de robots.txt (NUNCA el de un bot de terceros). */
const userAgentToken = (userAgent: string): string => {
  const token = userAgent.split('/')[0]?.trim()

  return token && token.length > 0 ? token : 'GreenhouseAEOGrader'
}

// ── Clasificación de hosts/direcciones no públicas ───────────────────────────

/** Rangos IPv4 no públicos: loopback, privados, link-local + metadata, CGNAT, 0/8. */
const isNonPublicIpv4 = (ip: string): boolean => {
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip)

  if (!ipv4) return false

  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]

  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true // link-local + metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT

  return false
}

/** Hosts no públicos por LITERAL: loopback, nombres locales, IPs en rango no público. */
const isNonPublicHost = (host: string): boolean => {
  const h = host.toLowerCase().replace(/\.$/, '')

  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) {
    return true
  }

  // IPv6 loopback / unspecified / link-local / unique-local (con o sin corchetes de URL).
  const bare = h.replace(/^\[|\]$/g, '')

  if (bare.includes(':')) return isNonPublicResolvedAddress(bare)

  return isNonPublicIpv4(bare)
}

/**
 * Clasifica una dirección RESUELTA (A/AAAA) como no pública. Cubre IPv4, IPv6
 * (loopback/link-local/ULA/unspecified) e IPv4-mapped IPv6 (`::ffff:10.0.0.5`).
 */
export const isNonPublicResolvedAddress = (address: string): boolean => {
  const addr = address.trim().toLowerCase()

  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(addr)

  if (mapped) return isNonPublicIpv4(mapped[1])

  if (addr.includes(':')) {
    if (addr === '::' || addr === '::1') return true
    if (addr.startsWith('fe80:')) return true
    if (addr.startsWith('fc') || addr.startsWith('fd')) return true

    return false
  }

  return isNonPublicIpv4(addr)
}

// ── Familia del sujeto (TASK-1778 §2 — la regla que preserva cobertura) ──────

/**
 * Familia del sujeto: mismo hostname, o el par `apex ↔ www`. Deliberadamente NO se razona
 * el dominio registrable (eTLD+1): hacerlo bien exige la Public Suffix List (la heurística
 * de "dos últimas etiquetas" da `com.mx` para `berel.com.mx`) — follow-up declarado.
 * Bloquear otros subdominios es la postura conservadora elegida.
 */
const familyHost = (host: string): string => {
  const h = host.toLowerCase().replace(/\.$/, '')

  return h.startsWith('www.') ? h.slice(4) : h
}

const isSubjectFamilyHost = (host: string, subjectHost: string): boolean =>
  familyHost(host) === familyHost(subjectHost)

/**
 * Resuelve la URL del probe contra el baseUrl: exige http(s), host público y host dentro
 * de la FAMILIA del sujeto (mismo host o `apex ↔ www`; TASK-1778 §2 — la igualdad exacta
 * rompería los redirects más comunes de la web al revalidar por salto).
 */
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
  if (!isSubjectFamilyHost(url.hostname, base.hostname)) return null

  return url
}

// ── Deps inyectables ─────────────────────────────────────────────────────────

export interface ResolvedAddress {
  address: string
  family: number
}

export interface ProbeFetcherDeps {
  /** fetch inyectable para tests (default = global fetch). */
  fetchImpl?: typeof fetch
  /** Resolución DNS inyectable para tests (default = node:dns/promises lookup all). */
  lookupImpl?: (hostname: string) => Promise<ResolvedAddress[]>
  /**
   * Override del modo estricto de red (default = flag
   * `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED`, evaluado al crear el fetcher).
   */
  strictNetwork?: boolean
}

const defaultLookup = async (hostname: string): Promise<ResolvedAddress[]> =>
  dnsLookup(hostname, { all: true, verbatim: true })

// ── Helpers de presupuesto de tiempo ─────────────────────────────────────────

class ProbeDnsTimeoutError extends Error {
  constructor() {
    super('DNS resolution exceeded the request budget')
    this.name = 'TimeoutError'
  }
}

const raceWithBudget = async <T>(promise: Promise<T>, remainingMs: number): Promise<T> => {
  if (remainingMs <= 0) throw new ProbeDnsTimeoutError()

  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ProbeDnsTimeoutError()), remainingMs)
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// ── Fetcher ──────────────────────────────────────────────────────────────────

type BlockedReason = 'blocked_redirect' | 'blocked_private_address' | 'blocked_robots'

const blockedResult = (url: string, errorCode: BlockedReason, host: string): ProbeFetchResult => {
  // Observabilidad del rechazo (nivel info, sin cuerpo ni URL interna en el resultado).
  captureWithDomain(new Error(`probe fetch ${errorCode}`), 'growth', {
    level: 'info',
    tags: { source: 'growth_ai_visibility_probe_fetch', reason: errorCode },
    extra: { host }
  })

  return {
    ok: false,
    status: 0,
    url,
    body: '',
    contentType: null,
    errorCode,
    truncated: false,
    observable: false
  }
}

/**
 * Crea un fetcher acotado al `baseUrl` del sujeto. Cada probe lo recibe en su contexto.
 * La política de robots.txt se descarga y parsea UNA vez por instancia (una por sujeto).
 */
export const createProbeFetcher = (baseUrl: string, deps: ProbeFetcherDeps = {}): ProbeFetcher => {
  const fetchImpl = deps.fetchImpl ?? fetch
  const lookupImpl = deps.lookupImpl ?? defaultLookup
  const strictNetwork = deps.strictNetwork ?? isProbeFetchStrictNetworkEnabled()

  /** ¿Alguna dirección resuelta cae en rango no público? `null` = todas públicas. */
  const resolvesNonPublic = async (hostname: string, remainingMs: number): Promise<boolean> => {
    // Literales IP ya clasificados por isNonPublicHost; no hay nada que resolver.
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || hostname.includes(':')) return false

    const addresses = await raceWithBudget(lookupImpl(hostname), remainingMs)

    if (addresses.length === 0) throw new Error(`DNS resolved zero addresses for host`)

    return addresses.some(entry => isNonPublicResolvedAddress(entry.address))
  }

  /** Un request HTTP con presupuesto compartido; en estricto, bucle manual de redirects. */
  const guardedFetch = async (
    target: URL,
    base: URL,
    init: { accept: string; userAgent: string; timeoutMs: number; maxBytes: number }
  ): Promise<ProbeFetchResult> => {
    const deadline = Date.now() + init.timeoutMs

    let current = target

    try {
      for (let hop = 0; ; hop++) {
        const remaining = deadline - Date.now()

        if (remaining <= 0) throw new ProbeDnsTimeoutError()

        if (strictNetwork) {
          // Guarda DNS: la URL inicial Y cada salto (TASK-1778 Slice 2).
          if (await resolvesNonPublic(current.hostname, remaining)) {
            return blockedResult(target.toString(), 'blocked_private_address', current.hostname)
          }
        }

        const response = await fetchImpl(current.toString(), {
          method: 'GET',
          redirect: strictNetwork ? 'manual' : 'follow',
          cache: 'no-store',
          signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
          headers: {
            'user-agent': init.userAgent,
            accept: init.accept
          }
        })

        if (strictNetwork && response.status >= 300 && response.status < 400) {
          // El cuerpo del 3xx (y el del destino rechazado) NO se lee.
          void response.body?.cancel().catch(() => {})

          const location = response.headers.get('location')

          if (!location) {
            return {
              ok: false,
              status: response.status,
              url: current.toString(),
              body: '',
              contentType: response.headers.get('content-type'),
              errorCode: 'http_error',
              truncated: false,
              observable: false
            }
          }

          if (hop >= MAX_REDIRECTS) {
            return blockedResult(target.toString(), 'blocked_redirect', current.hostname)
          }

          let next: URL

          try {
            next = new URL(location, current)
          } catch {
            return blockedResult(target.toString(), 'blocked_redirect', current.hostname)
          }

          const validProtocol = next.protocol === 'http:' || next.protocol === 'https:'
          const downgrade = current.protocol === 'https:' && next.protocol === 'http:'

          if (
            !validProtocol ||
            downgrade ||
            isNonPublicHost(next.hostname) ||
            !isSubjectFamilyHost(next.hostname, base.hostname)
          ) {
            return blockedResult(target.toString(), 'blocked_redirect', next.hostname)
          }

          current = next
          continue
        }

        const finalUrl = response.url || current.toString()
        const contentType = response.headers.get('content-type')
        const { body, truncated } = await readBodyWithCap(response, init.maxBytes)

        const isHtml = (contentType ?? '').includes('html')
        const observable = !truncated && (!isHtml || assessHtmlObservability(body).observable)

        return {
          ok: response.ok,
          status: response.status,
          url: finalUrl,
          body,
          contentType,
          errorCode: response.ok ? null : 'http_error',
          truncated,
          observable
        }
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError'

      // Observabilidad sin filtrar el raw al cliente; el probe lo degrada honestamente.
      captureWithDomain(error, 'growth', {
        level: 'info',
        tags: { source: 'growth_ai_visibility_probe_fetch', reason: isTimeout ? 'timeout' : 'network' },
        extra: { host: current.hostname }
      })

      return {
        ok: false,
        status: 0,
        url: target.toString(),
        body: '',
        contentType: null,
        errorCode: isTimeout ? 'timeout' : 'network',
        truncated: false,
        observable: false
      }
    }
  }

  // La lectura de /robots.txt se hace UNA vez por sujeto y sirve a la política Y al probe
  // que la analiza (misma descarga, cero requests extra). First-call-wins en init.
  let robotsFetchMemo: Promise<ProbeFetchResult> | null = null
  let robotsPolicyMemo: Promise<RobotsPolicyGroup[] | null> | null = null

  const fetchRobots = (init: { accept: string; userAgent: string; timeoutMs: number; maxBytes: number }) => {
    if (!robotsFetchMemo) {
      const robotsUrl = resolveProbeUrl(baseUrl, '/robots.txt')

      robotsFetchMemo = robotsUrl
        ? guardedFetch(robotsUrl, new URL(baseUrl), init)
        : Promise.resolve({
            ok: false,
            status: 0,
            url: '/robots.txt',
            body: '',
            contentType: null,
            errorCode: 'blocked' as const,
            truncated: false,
            observable: false
          })
    }

    return robotsFetchMemo
  }

  const loadRobotsPolicy = (userAgent: string): Promise<RobotsPolicyGroup[] | null> => {
    if (!robotsPolicyMemo) {
      robotsPolicyMemo = fetchRobots({
        accept: 'text/plain',
        userAgent,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        maxBytes: ROBOTS_POLICY_MAX_BYTES
      }).then(res => {
        // Conservador: sin robots legible (404, 5xx, red, bloqueo) → sin restricción.
        if (!res.ok || typeof res.body !== 'string' || res.body.length === 0) return null

        return parseRobotsPolicy(res.body)
      })
    }

    return robotsPolicyMemo
  }

  return async (path: string, init: ProbeFetchInit = {}): Promise<ProbeFetchResult> => {
    const target = resolveProbeUrl(baseUrl, path)

    if (!target) {
      return {
        ok: false,
        status: 0,
        url: path,
        body: '',
        contentType: null,
        errorCode: 'blocked',
        truncated: false,
        observable: false
      }
    }

    const base = new URL(baseUrl)
    const timeoutMs = Math.min(init.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS)
    const maxBytes = init.maxBytes ?? DEFAULT_MAX_BYTES
    const userAgent = init.userAgent ?? COURTESY_USER_AGENT
    const requestInit = { accept: init.accept ?? DEFAULT_ACCEPT, userAgent, timeoutMs, maxBytes }

    // `/robots.txt` SIEMPRE es alcanzable (no se puede conocer la política sin leerla), y
    // su lectura es la misma que memoiza la política (una descarga por sujeto).
    if (target.pathname === '/robots.txt') {
      return fetchRobots(requestInit)
    }

    const policy = await loadRobotsPolicy(userAgent)

    if (policy && !isPathAllowed(policy, target.pathname + target.search, userAgentToken(userAgent))) {
      // Hallazgo, no fallo: "no pudimos leer porque tu robots.txt lo prohíbe (a nuestro token)".
      return blockedResult(target.toString(), 'blocked_robots', target.hostname)
    }

    return guardedFetch(target, base, requestInit)
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
