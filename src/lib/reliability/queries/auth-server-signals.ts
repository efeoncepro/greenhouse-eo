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

export const getAuthServerSignals = async (): Promise<ReliabilitySignal[]> =>
  Promise.all([getAuthIssuerJwksSignal(), getAuthSigningKeysLifecycleSignal()])
