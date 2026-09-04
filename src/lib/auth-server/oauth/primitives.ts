/**
 * Efeonce Auth Server — primitives OAuth puras (TASK-1829, EPIC-044).
 *
 * Extraídas del broker sister-platform (`src/lib/sister-platforms/oauth-broker.ts`) SIN cambiar
 * su comportamiento: el broker legacy las importa desde acá y sigue sirviendo Globe/Kortex; el
 * emisor `auth.efeonce.org` las consume con la política estricta del ADR nativo.
 *
 * Sin DB, sin `server-only`, sin dependencia del runtime: se bundlean en `services/auth-server`
 * y se prueban en Vitest sin mocks.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

// ─── Hashing y comparación ──────────────────────────────────────────────────

/** SHA-256 hex del valor. Es lo ÚNICO que se persiste de un code, token o secret. */
export const sha256Hex = (value: string): string => createHash('sha256').update(value).digest('hex')

/** Hash truncado (32 hex) para IP / user-agent: suficiente para correlación, inútil para revertir. */
export const hashSensitiveValue = (value: string | null | undefined): string | null =>
  value ? sha256Hex(value).slice(0, 32) : null

/** Comparación en tiempo constante; longitudes distintas → `false` sin filtrar cuál. */
export const safeEquals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) return false

  return timingSafeEqual(leftBuffer, rightBuffer)
}

// ─── PKCE (RFC 7636) — sólo S256 ────────────────────────────────────────────

/** `code_verifier` / `code_challenge` válidos: 43–128 chars del alfabeto unreserved (RFC 7636 §4.1). */
export const isPkceToken = (value: string): boolean => /^[A-Za-z0-9._~-]{43,128}$/.test(value)

export const buildPkceChallenge = (codeVerifier: string): string =>
  createHash('sha256').update(codeVerifier).digest('base64url')

/** Verifica S256 en tiempo constante. `plain` NUNCA se acepta: no existe un camino para él. */
export const verifyPkceS256 = (codeVerifier: string, codeChallenge: string): boolean =>
  isPkceToken(codeVerifier) && safeEquals(buildPkceChallenge(codeVerifier), codeChallenge)

// ─── Scopes ─────────────────────────────────────────────────────────────────

/** Parsea `scope` (space-delimited), deduplica y cae al fallback si viene vacío. */
export const parseScopeParam = (value: string | null | undefined, fallback: readonly string[]): string[] => {
  const scopes = (value || '')
    .split(/\s+/)
    .map(scope => scope.trim())
    .filter(Boolean)

  return Array.from(new Set(scopes.length > 0 ? scopes : fallback))
}

export const normalizeStringArray = (value: string[] | null | undefined, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback

  return value.map(item => item.trim()).filter(Boolean)
}

// ─── Redirect URIs ──────────────────────────────────────────────────────────

export type RedirectUriRegistrationError = 'missing_redirect_uri' | 'invalid_redirect_uri'

export type RedirectUriRegistrationResult =
  | { ok: true; uris: string[] }
  | { ok: false; error: RedirectUriRegistrationError; reason: 'empty' | 'wildcard' | 'scheme' | 'unparseable' }

export type LoopbackHostPolicy = {
  /** Aceptar `localhost` por nombre como alias de loopback (RFC 8252 §7.3 lo permite; OAuth 2.1 prefiere el literal IP). */
  allowLocalhostAlias: boolean
  /** Aceptar `[::1]` (IPv6 loopback). El broker legacy sólo conoce `127.0.0.1`. */
  allowIpv6Loopback: boolean
}

export const LEGACY_LOOPBACK_POLICY: LoopbackHostPolicy = { allowLocalhostAlias: false, allowIpv6Loopback: false }

const LOOPBACK_IPV4 = '127.0.0.1'
const LOOPBACK_IPV6 = '[::1]'

const isLoopbackHostname = (hostname: string, policy: LoopbackHostPolicy): boolean =>
  hostname === LOOPBACK_IPV4 ||
  (policy.allowIpv6Loopback && hostname === LOOPBACK_IPV6) ||
  (policy.allowLocalhostAlias && hostname === 'localhost')

/**
 * `true` cuando la URI es un redirect loopback de cliente público nativo: `http:`, host loopback,
 * sin userinfo ni fragmento, con path. El puerto es libre (RFC 8252 §7.3 / OAuth 2.1 §8.4.2).
 */
export const isLoopbackRedirectUri = (uri: string, policy: LoopbackHostPolicy = LEGACY_LOOPBACK_POLICY): boolean => {
  try {
    const parsed = new URL(uri)

    return (
      parsed.protocol === 'http:' &&
      isLoopbackHostname(parsed.hostname, policy) &&
      !parsed.username &&
      !parsed.password &&
      !parsed.hash &&
      Boolean(parsed.pathname)
    )
  } catch {
    return false
  }
}

/**
 * Registro de redirect URIs (comportamiento del broker legacy): dedupe, sin wildcards, HTTPS salvo
 * `localhost` / `127.0.0.1`. La regla estricta del emisor (HTTPS exacto para hospedados, loopback
 * sólo para públicos) se aplica encima en `clients.ts`.
 */
export const normalizeRegisteredRedirectUris = (value: readonly string[]): RedirectUriRegistrationResult => {
  const uris = Array.from(new Set(value.map(uri => uri.trim()).filter(Boolean)))

  if (uris.length === 0) return { ok: false, error: 'missing_redirect_uri', reason: 'empty' }

  for (const uri of uris) {
    if (uri.includes('*')) return { ok: false, error: 'invalid_redirect_uri', reason: 'wildcard' }

    let parsed: URL

    try {
      parsed = new URL(uri)
    } catch {
      return { ok: false, error: 'invalid_redirect_uri', reason: 'unparseable' }
    }

    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== LOOPBACK_IPV4) {
      return { ok: false, error: 'invalid_redirect_uri', reason: 'scheme' }
    }
  }

  return { ok: true, uris }
}

export type MatchRedirectUriInput = {
  clientType: 'public' | 'confidential'
  registeredRedirectUri: string
  requestedRedirectUri: string
  /** Política para la URI registrada. */
  registeredPolicy?: LoopbackHostPolicy
  /** Política para la URI pedida (el broker legacy tolera `localhost` acá por la normalización de Next). */
  requestedPolicy?: LoopbackHostPolicy
}

/**
 * Resuelve la redirect URI efectiva de un `authorize`:
 * - confidencial → igualdad exacta de string (HTTPS exacto);
 * - público → ambas loopback; mismo esquema, path y query; host loopback equivalente; **puerto libre**.
 *   Devuelve la URI pedida con el host registrado, para que authorize, callback y token compartan
 *   un único valor exacto de `redirect_uri`.
 */
export const matchRedirectUri = ({
  clientType,
  registeredRedirectUri,
  requestedRedirectUri,
  registeredPolicy = LEGACY_LOOPBACK_POLICY,
  requestedPolicy = { ...LEGACY_LOOPBACK_POLICY, allowLocalhostAlias: true }
}: MatchRedirectUriInput): string | null => {
  if (clientType === 'confidential') {
    return registeredRedirectUri === requestedRedirectUri ? requestedRedirectUri : null
  }

  if (
    !isLoopbackRedirectUri(registeredRedirectUri, registeredPolicy) ||
    !isLoopbackRedirectUri(requestedRedirectUri, requestedPolicy)
  ) {
    return null
  }

  const registered = new URL(registeredRedirectUri)
  const requested = new URL(requestedRedirectUri)

  const matches =
    registered.protocol === requested.protocol &&
    (registered.hostname === requested.hostname ||
      (isLoopbackHostname(registered.hostname, requestedPolicy) &&
        isLoopbackHostname(requested.hostname, requestedPolicy))) &&
    registered.pathname === requested.pathname &&
    registered.search === requested.search

  if (!matches) return null

  requested.hostname = registered.hostname

  return requested.toString()
}

// ─── Generadores opacos ─────────────────────────────────────────────────────

/** Token opaco `${prefix}_<base64url(bytes)>`; sólo su sha256 se persiste. */
export const generateOpaqueToken = (prefix: string, bytes: number): string =>
  `${prefix}_${randomBytes(bytes).toString('base64url')}`

/** Identificador aleatorio para `jti`, `grant_id`, `consent_id` (URL-safe, sin prefijo). */
export const generateOpaqueId = (bytes = 16): string => randomBytes(bytes).toString('base64url')

// ─── Correlación ────────────────────────────────────────────────────────────

export const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

export const isValidCorrelationId = (value: string | null | undefined): value is string =>
  typeof value === 'string' && CORRELATION_ID_PATTERN.test(value)

// ─── Tiempo ─────────────────────────────────────────────────────────────────

export const toIsoString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value

  return value.toISOString()
}

export const secondsFromNow = (now: Date, seconds: number): Date => new Date(now.getTime() + seconds * 1000)
