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

/**
 * TASK-1830 — Señales de la autenticación de PERSONAS (`greenhouse_auth.person_auth_attempts` y
 * `sessions`). Las tres tienen steady = 0 y describen cosas que no deberían pasar nunca:
 *
 * 1. `auth.person.magic_link_rate_limited`: alguien está pidiendo enlaces en volumen. Warning, no
 *    error — un cliente torpe también dispara esto, y confundirlo con un ataque gasta atención.
 * 2. `auth.person.passkey_counter_regression`: un contador que retrocede significa DOS
 *    autenticadores con la misma clave. La credencial ya quedó revocada; la señal existe para que
 *    alguien mire, porque el sistema no puede decidir cuál de los dos es la persona.
 * 3. `auth.person.session_without_link`: una sesión cuyo source link murió. El resolver la revoca
 *    en el mismo request, así que un valor > 0 sostenido significa que la revocación de acceso NO
 *    está llegando — el fallo silencioso más caro de este dominio.
 */

export const AUTH_PERSON_MAGIC_LINK_RATE_LIMITED_SIGNAL_ID = 'auth.person.magic_link_rate_limited'
export const AUTH_PERSON_PASSKEY_COUNTER_REGRESSION_SIGNAL_ID = 'auth.person.passkey_counter_regression'
export const AUTH_PERSON_SESSION_WITHOUT_LINK_SIGNAL_ID = 'auth.person.session_without_link'

const PERSON_AUTH_WINDOW_HOURS = 24

type PersonAttemptRow = { reason_code: string | null; method: string; outcome: string; events: number }
type OrphanSessionRow = { sessions: number }

const PERSON_ATTEMPTS_SQL = `
  SELECT method, outcome, reason_code, COUNT(*)::int AS events
    FROM greenhouse_auth.person_auth_attempts
   WHERE occurred_at >= now() - INTERVAL '${PERSON_AUTH_WINDOW_HOURS} hours'
     AND (outcome = 'rate_limited' OR reason_code IN ('counter_regression', 'source_link_revoked'))
   GROUP BY method, outcome, reason_code
`

/**
 * Sesiones vivas cuyo link ya no está activo. El resolver las mata en el siguiente request, así que
 * lo que esta consulta encuentra son sesiones que NADIE ha vuelto a usar desde la revocación — o,
 * si el número no baja, una revocación que no está llegando.
 */
const ORPHAN_SESSIONS_SQL = `
  SELECT COUNT(*)::int AS sessions
    FROM greenhouse_auth.sessions s
    JOIN greenhouse_core.identity_profile_source_links l ON l.link_id = s.link_id
   WHERE s.revoked_at IS NULL
     AND s.absolute_expires_at > now()
     AND NOT l.active
`

export type AuthPersonSignalDeps = Readonly<{
  loadAttempts?: () => Promise<PersonAttemptRow[]>
  loadOrphanSessions?: () => Promise<OrphanSessionRow[]>
}>

const defaultLoadPersonAttempts = () => query<PersonAttemptRow>(PERSON_ATTEMPTS_SQL)
const defaultLoadOrphanSessions = () => query<OrphanSessionRow>(ORPHAN_SESSIONS_SQL)

export const getAuthPersonSignals = async (deps: AuthPersonSignalDeps = {}): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    const [attempts, orphans] = await Promise.all([
      (deps.loadAttempts ?? defaultLoadPersonAttempts)(),
      (deps.loadOrphanSessions ?? defaultLoadOrphanSessions)()
    ])

    const sum = (predicate: (row: PersonAttemptRow) => boolean) =>
      attempts.filter(predicate).reduce((total, row) => total + Number(row.events), 0)

    const rateLimited = sum(row => row.method === 'magic_link' && row.outcome === 'rate_limited')
    const counterRegressions = sum(row => row.reason_code === 'counter_regression')
    const orphanSessions = Number(orphans[0]?.sessions ?? 0)

    return [
      {
        signalId: AUTH_PERSON_MAGIC_LINK_RATE_LIMITED_SIGNAL_ID,
        moduleKey: 'identity' as const,
        kind: 'incident' as const,
        source: 'getAuthPersonSignals',
        label: 'Magic links limitados por abuso',
        observedAt,
        severity: rateLimited > 0 ? ('warning' as const) : ('ok' as const),
        summary:
          rateLimited > 0
            ? `${rateLimited} solicitud(es) de magic link bloqueadas por límite en ${PERSON_AUTH_WINDOW_HOURS} h.`
            : 'Ninguna solicitud de magic link bloqueada por límite en 24 h.',
        evidence: [
          { kind: 'sql', label: 'Query', value: `greenhouse_auth.person_auth_attempts últimas ${PERSON_AUTH_WINDOW_HOURS} h` },
          { kind: 'metric', label: 'rate_limited_24h', value: String(rateLimited) }
        ]
      },
      {
        signalId: AUTH_PERSON_PASSKEY_COUNTER_REGRESSION_SIGNAL_ID,
        moduleKey: 'identity' as const,
        kind: 'incident' as const,
        source: 'getAuthPersonSignals',
        label: 'Contador de passkey retrocedido',
        observedAt,
        severity: counterRegressions > 0 ? ('error' as const) : ('ok' as const),
        summary:
          counterRegressions > 0
            ? `${counterRegressions} passkey(s) con contador retrocedido en 24 h: credencial revocada, revisar si hay clonación.`
            : 'Ningún contador de passkey retrocedido en 24 h.',
        evidence: [
          { kind: 'metric', label: 'counter_regressions_24h', value: String(counterRegressions) }
        ]
      },
      {
        signalId: AUTH_PERSON_SESSION_WITHOUT_LINK_SIGNAL_ID,
        moduleKey: 'identity' as const,
        kind: 'data_quality' as const,
        source: 'getAuthPersonSignals',
        label: 'Sesiones sin source link activo',
        observedAt,
        severity: orphanSessions > 0 ? ('error' as const) : ('ok' as const),
        summary:
          orphanSessions > 0
            ? `${orphanSessions} sesión(es) viva(s) con su source link revocado: el resolver las mata al próximo request, pero un valor sostenido significa que la revocación no está llegando.`
            : 'Ninguna sesión viva con su source link revocado.',
        evidence: [
          { kind: 'sql', label: 'Query', value: 'greenhouse_auth.sessions JOIN identity_profile_source_links' },
          { kind: 'metric', label: 'orphan_sessions', value: String(orphanSessions) }
        ]
      }
    ]
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_auth_person', component: 'auth-server' } })

    return [
      AUTH_PERSON_MAGIC_LINK_RATE_LIMITED_SIGNAL_ID,
      AUTH_PERSON_PASSKEY_COUNTER_REGRESSION_SIGNAL_ID,
      AUTH_PERSON_SESSION_WITHOUT_LINK_SIGNAL_ID
    ].map(signalId => ({
      signalId,
      moduleKey: 'identity' as const,
      kind: 'incident' as const,
      source: 'getAuthPersonSignals',
      label: signalId,
      observedAt,
      severity: 'error' as const,
      summary: 'No se pudieron leer las señales de autenticación de personas.',
      evidence: []
    }))
  }
}

export const getAuthServerSignals = async (): Promise<ReliabilitySignal[]> => {
  const [jwks, lifecycle, abuse, person] = await Promise.all([
    getAuthIssuerJwksSignal(),
    getAuthSigningKeysLifecycleSignal(),
    getAuthOAuthAbuseSignals(),
    getAuthPersonSignals()
  ])

  return [jwks, lifecycle, ...abuse, ...person]
}
