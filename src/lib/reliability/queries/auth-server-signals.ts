import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1828 — Señales del authorization server propio (`auth.efeonce.org`).
 *
 * 1. `auth.issuer.jwks_unreachable` (kind `runtime`): el JWKS público responde y publica
 *    exactamente los `kid` que `greenhouse_auth.signing_keys` tiene en `active`/`retiring`.
 *    `not_configured` mientras `AUTH_SERVER_JWKS_URL` no esté declarada (el host aún no
 *    está publicado en el front door). Steady = `ok`.
 * 2. `auth.signing_keys.lifecycle` (kind `data_quality`): existe exactamente una llave
 *    `active` y ninguna `retiring` lleva más de 7 días sin retirarse. Steady = `ok`.
 *
 * `auth.kms.sign_failures` NO tiene reader propio: se observa por el incidente por dominio
 * (`captureWithDomain(err, 'identity', { tags: { component: 'auth-server', check: 'kms' } })`).
 */

export const AUTH_ISSUER_JWKS_UNREACHABLE_SIGNAL_ID = 'auth.issuer.jwks_unreachable'
export const AUTH_SIGNING_KEYS_LIFECYCLE_SIGNAL_ID = 'auth.signing_keys.lifecycle'

const JWKS_FETCH_TIMEOUT_MS = 5_000
const RETIRING_MAX_AGE_DAYS = 7

type SigningKeyStateRow = { kid: string; state: 'active' | 'retiring' | 'retired'; retiring_at: Date | string | null }

const STATE_SQL = `
  SELECT kid, state, retiring_at
  FROM greenhouse_auth.signing_keys
  WHERE state IN ('active', 'retiring')
  ORDER BY (state = 'active') DESC, activated_at DESC
`

export type AuthServerSignalDeps = Readonly<{
  fetchJwks?: (url: string) => Promise<{ status: number; body: unknown }>
  loadKeys?: () => Promise<SigningKeyStateRow[]>
  jwksUrl?: string | null
  now?: () => Date
}>

const defaultFetchJwks = async (url: string) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), JWKS_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    const body: unknown = await response.json().catch(() => null)

    return { status: response.status, body }
  } finally {
    clearTimeout(timer)
  }
}

const defaultLoadKeys = () => query<SigningKeyStateRow>(STATE_SQL)

const resolveJwksUrl = (): string | null => process.env.AUTH_SERVER_JWKS_URL?.trim() || null

const extractKids = (body: unknown): string[] => {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { keys?: unknown }).keys)) return []

  return (body as { keys: Array<{ kid?: unknown }> }).keys
    .map(key => (typeof key?.kid === 'string' ? key.kid : null))
    .filter((kid): kid is string => Boolean(kid))
}

export const getAuthIssuerJwksSignal = async (deps: AuthServerSignalDeps = {}): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const jwksUrl = deps.jwksUrl === undefined ? resolveJwksUrl() : deps.jwksUrl

  const base = {
    signalId: AUTH_ISSUER_JWKS_UNREACHABLE_SIGNAL_ID,
    moduleKey: 'identity' as const,
    kind: 'runtime' as const,
    source: 'getAuthIssuerJwksSignal',
    label: 'JWKS del emisor auth.efeonce.org',
    observedAt
  }

  if (!jwksUrl) {
    return {
      ...base,
      severity: 'not_configured',
      summary: 'AUTH_SERVER_JWKS_URL no declarada: el host del emisor aún no está publicado en el front door (TASK-1828 Slice 2).',
      evidence: [{ kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1828-efeonce-auth-server-runtime-deployable.md' }]
    }
  }

  try {
    const [response, keys] = await Promise.all([(deps.fetchJwks ?? defaultFetchJwks)(jwksUrl), (deps.loadKeys ?? defaultLoadKeys)()])
    const publishedKids = extractKids(response.body)
    const expectedKids = keys.map(key => key.kid)
    const missing = expectedKids.filter(kid => !publishedKids.includes(kid))
    const unexpected = publishedKids.filter(kid => !expectedKids.includes(kid))

    const evidence: ReliabilitySignal['evidence'] = [
      { kind: 'metric', label: 'http_status', value: String(response.status) },
      { kind: 'metric', label: 'published_kids', value: String(publishedKids.length) },
      { kind: 'metric', label: 'expected_kids', value: String(expectedKids.length) },
      { kind: 'doc', label: 'JWKS', value: jwksUrl }
    ]

    if (response.status !== 200) {
      return { ...base, severity: 'error', summary: `El JWKS respondió HTTP ${response.status}; el gateway no puede verificar tokens del emisor.`, evidence }
    }

    if (missing.length > 0 || unexpected.length > 0) {
      return {
        ...base,
        severity: 'error',
        summary: `El JWKS publicado difiere del registry: faltan ${missing.length} kid(s) y sobran ${unexpected.length}.`,
        evidence: [...evidence, { kind: 'metric', label: 'missing_kids', value: missing.join(',') || '—' }, { kind: 'metric', label: 'unexpected_kids', value: unexpected.join(',') || '—' }]
      }
    }

    return { ...base, severity: 'ok', summary: `JWKS alcanzable y consistente con el registry (${publishedKids.length} kid(s) publicados).`, evidence }
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_auth_issuer_jwks', component: 'auth-server' } })

    return {
      ...base,
      severity: 'error',
      summary: 'No se pudo alcanzar el JWKS del emisor o leer el registry de llaves.',
      evidence: [{ kind: 'doc', label: 'JWKS', value: jwksUrl }]
    }
  }
}

export const getAuthSigningKeysLifecycleSignal = async (deps: AuthServerSignalDeps = {}): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const now = (deps.now ?? (() => new Date()))()

  const base = {
    signalId: AUTH_SIGNING_KEYS_LIFECYCLE_SIGNAL_ID,
    moduleKey: 'identity' as const,
    kind: 'data_quality' as const,
    source: 'getAuthSigningKeysLifecycleSignal',
    label: 'Ciclo de vida de llaves de firma del emisor',
    observedAt
  }

  try {
    const keys = await (deps.loadKeys ?? defaultLoadKeys)()
    const active = keys.filter(key => key.state === 'active')
    const retiring = keys.filter(key => key.state === 'retiring')

    const staleRetiring = retiring.filter(key => {
      if (!key.retiring_at) return false

      const ageDays = (now.getTime() - new Date(key.retiring_at).getTime()) / 86_400_000

      return ageDays > RETIRING_MAX_AGE_DAYS
    })

    const evidence: ReliabilitySignal['evidence'] = [
      { kind: 'sql', label: 'Query', value: `greenhouse_auth.signing_keys WHERE state IN ('active','retiring')` },
      { kind: 'metric', label: 'active', value: String(active.length) },
      { kind: 'metric', label: 'retiring', value: String(retiring.length) },
      { kind: 'metric', label: 'retiring_over_7d', value: String(staleRetiring.length) }
    ]

    if (active.length !== 1) {
      return {
        ...base,
        severity: 'error',
        summary: active.length === 0 ? 'No hay llave de firma activa: el emisor no puede firmar tokens.' : `Hay ${active.length} llaves activas; el registry exige exactamente una.`,
        evidence
      }
    }

    if (staleRetiring.length > 0) {
      return {
        ...base,
        severity: 'warning',
        summary: `${staleRetiring.length} llave(s) en retiring desde hace más de ${RETIRING_MAX_AGE_DAYS} días: completar la rotación con pnpm auth-server:rotate-key --retire <kid>.`,
        evidence
      }
    }

    return { ...base, severity: 'ok', summary: 'Una llave activa y ninguna rotación pendiente de cierre.', evidence }
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_auth_signing_keys', component: 'auth-server' } })

    return { ...base, severity: 'error', summary: 'No se pudo leer greenhouse_auth.signing_keys.', evidence: [] }
  }
}

// ─── TASK-1829 — abuso del protocolo OAuth (lectura de greenhouse_auth.oauth_audit_events) ──────

export const AUTH_OAUTH_CODE_REUSE_SIGNAL_ID = 'auth.oauth.code_reuse_detected'
export const AUTH_OAUTH_REFRESH_REUSE_SIGNAL_ID = 'auth.oauth.refresh_reuse_detected'
export const AUTH_OAUTH_CIMD_REJECTED_SIGNAL_ID = 'auth.oauth.cimd_rejected'

const OAUTH_ABUSE_WINDOW_HOURS = 24

type OAuthAbuseRow = { event_type: 'code_reuse' | 'refresh_reuse' | 'cimd_fetch'; events: number; clients: number }

const OAUTH_ABUSE_SQL = `
  SELECT event_type, COUNT(*)::int AS events, COUNT(DISTINCT client_id)::int AS clients
  FROM greenhouse_auth.oauth_audit_events
  WHERE occurred_at >= now() - ($1::int * INTERVAL '1 hour')
    AND (
      event_type IN ('code_reuse', 'refresh_reuse')
      OR (event_type = 'cimd_fetch' AND outcome = 'rejected')
    )
  GROUP BY event_type
`

export type AuthOAuthAbuseSignalDeps = Readonly<{ loadRows?: () => Promise<OAuthAbuseRow[]> }>

const defaultLoadAbuseRows = () => query<OAuthAbuseRow>(OAUTH_ABUSE_SQL, [OAUTH_ABUSE_WINDOW_HOURS])

const buildAbuseSignal = (
  signalId: string,
  label: string,
  row: OAuthAbuseRow | undefined,
  copy: { steady: string; alert: (events: number, clients: number) => string; severity: ReliabilitySignal['severity'] },
  observedAt: string
): ReliabilitySignal => {
  const events = row?.events ?? 0
  const clients = row?.clients ?? 0

  return {
    signalId,
    moduleKey: 'identity' as const,
    kind: 'incident' as const,
    source: 'getAuthOAuthAbuseSignals',
    label,
    observedAt,
    severity: events > 0 ? copy.severity : 'ok',
    summary: events > 0 ? copy.alert(events, clients) : copy.steady,
    evidence: [
      { kind: 'sql', label: 'Query', value: `greenhouse_auth.oauth_audit_events últimas ${OAUTH_ABUSE_WINDOW_HOURS} h` },
      { kind: 'metric', label: 'events_24h', value: String(events) },
      { kind: 'metric', label: 'clients_24h', value: String(clients) }
    ]
  }
}

/**
 * Tres señales steady = 0: un code reutilizado o un refresh reutilizado es un token filtrado o un
 * cliente roto (el emisor ya revocó la familia; la señal existe para que alguien mire); un CIMD
 * rechazado es un cliente mal formado o un intento de SSRF/spoof.
 */
export const getAuthOAuthAbuseSignals = async (deps: AuthOAuthAbuseSignalDeps = {}): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await (deps.loadRows ?? defaultLoadAbuseRows)()
    const byType = new Map(rows.map(row => [row.event_type, row]))

    return [
      buildAbuseSignal(AUTH_OAUTH_CODE_REUSE_SIGNAL_ID, 'Reuso de authorization code (OAuth)', byType.get('code_reuse'), {
        steady: 'Ningún authorization code reutilizado en 24 h.',
        alert: (events, clients) => `${events} intento(s) de reuso de code en 24 h (${clients} cliente(s)); las familias afectadas ya quedaron revocadas.`,
        severity: 'error'
      }, observedAt),
      buildAbuseSignal(AUTH_OAUTH_REFRESH_REUSE_SIGNAL_ID, 'Reuso de refresh token (OAuth)', byType.get('refresh_reuse'), {
        steady: 'Ningún refresh token reutilizado en 24 h.',
        alert: (events, clients) => `${events} reuso(s) de refresh token en 24 h (${clients} cliente(s)); las familias afectadas ya quedaron revocadas.`,
        severity: 'error'
      }, observedAt),
      buildAbuseSignal(AUTH_OAUTH_CIMD_REJECTED_SIGNAL_ID, 'Documentos CIMD rechazados', byType.get('cimd_fetch'), {
        steady: 'Ningún client_id metadata document rechazado en 24 h.',
        alert: (events, clients) => `${events} documento(s) CIMD rechazado(s) en 24 h (${clients} client_id distintos): revisar razones en oauth_audit_events.`,
        severity: 'warning'
      }, observedAt)
    ]
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_auth_oauth_abuse', component: 'auth-server' } })

    return [AUTH_OAUTH_CODE_REUSE_SIGNAL_ID, AUTH_OAUTH_REFRESH_REUSE_SIGNAL_ID, AUTH_OAUTH_CIMD_REJECTED_SIGNAL_ID].map(signalId => ({
      signalId,
      moduleKey: 'identity' as const,
      kind: 'incident' as const,
      source: 'getAuthOAuthAbuseSignals',
      label: signalId,
      observedAt,
      severity: 'error' as const,
      summary: 'No se pudo leer greenhouse_auth.oauth_audit_events.',
      evidence: []
    }))
  }
}

export const getAuthServerSignals = async (): Promise<ReliabilitySignal[]> => {
  const [jwks, lifecycle, abuse] = await Promise.all([getAuthIssuerJwksSignal(), getAuthSigningKeysLifecycleSignal(), getAuthOAuthAbuseSignals()])

  return [jwks, lifecycle, ...abuse]
}
