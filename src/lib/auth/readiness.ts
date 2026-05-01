import 'server-only'

import { SignJWT, jwtVerify } from 'jose'

import { captureWithDomain } from '@/lib/observability/capture'
import { isKnownSecretFormat, validateSecretFormat } from '@/lib/secrets/format-validators'

/**
 * TASK-742 Capa 2 — Auth provider readiness contract.
 *
 * Boots a self-test of auth secrets and external dependencies WITHOUT making
 * a real OAuth round-trip. Returns a per-provider health snapshot the UI
 * (and downstream consumers like Platform Health V1) can use to render an
 * accurate state instead of letting a user discover the failure during sign-in.
 *
 * Goals:
 *   1. Detect malformed secrets (delegated to Capa 1 validators).
 *   2. Detect unreachable OIDC discovery endpoints (DNS, mTLS, region).
 *   3. Detect a NEXTAUTH_SECRET that cannot sign+verify a JWT round-trip.
 *
 * Non-goals:
 *   - DO NOT call Azure /token endpoint with real client_credentials —
 *     that would require additional API permissions and cumulatively
 *     consumes Azure quota. OIDC discovery is the safe smoke surface.
 *   - DO NOT cache aggressively in Layer 2 itself. The Platform Health
 *     composer already TTL-caches the assembled payload (30s).
 */

const OIDC_DISCOVERY_TIMEOUT_MS = 5_000

const MICROSOFT_OIDC_DISCOVERY_URL =
  'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration'
const GOOGLE_OIDC_DISCOVERY_URL = 'https://accounts.google.com/.well-known/openid-configuration'

export type AuthProviderReadinessStatus = 'ready' | 'degraded' | 'unconfigured'

export interface AuthProviderHealth {
  provider: 'azure-ad' | 'google' | 'credentials'
  status: AuthProviderReadinessStatus
  reason?: string
  /** Stage that failed when status='degraded'. */
  failingStage?:
    | 'secret_missing'
    | 'secret_format_invalid'
    | 'oidc_discovery_failed'
    | 'oidc_discovery_timeout'
    | 'jwt_self_test_failed'
    | 'unconfigured'
  /** ISO timestamp of the most recent self-test. */
  checkedAt: string
}

export interface AuthReadinessSnapshot {
  contractVersion: 'auth-readiness.v1'
  generatedAt: string
  providers: AuthProviderHealth[]
  overallStatus: AuthProviderReadinessStatus
  /** Whether the underlying NEXTAUTH_SECRET passed sign+verify roundtrip. */
  nextAuthSecretReady: boolean
}

const fetchWithTimeout = async (url: string, ms: number) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)

  try {
    return await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'manual' })
  } finally {
    clearTimeout(timer)
  }
}

const probeOidcDiscovery = async (
  url: string
): Promise<{ ok: boolean; failingStage: AuthProviderHealth['failingStage']; reason?: string }> => {
  try {
    const response = await fetchWithTimeout(url, OIDC_DISCOVERY_TIMEOUT_MS)

    if (!response.ok) {
      return {
        ok: false,
        failingStage: 'oidc_discovery_failed',
        reason: `HTTP ${response.status}`
      }
    }

    return { ok: true, failingStage: undefined }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, failingStage: 'oidc_discovery_timeout', reason: 'timeout' }
    }

    return {
      ok: false,
      failingStage: 'oidc_discovery_failed',
      reason: error instanceof Error ? error.message : 'unknown_error'
    }
  }
}

/**
 * Sign+verify a tiny JWT using the provided secret. Returns true if the
 * round-trip succeeds (i.e., the secret can actually be used to sign and
 * the same library reproduces the verification deterministically).
 */
export const probeNextAuthSecretRoundTrip = async (secret: string): Promise<boolean> => {
  try {
    const key = new TextEncoder().encode(secret)
    const token = await new SignJWT({ probe: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1m')
      .sign(key)

    const result = await jwtVerify(token, key)

    return Boolean(result.payload && result.payload.probe === true)
  } catch (error) {
    captureWithDomain(error, 'identity', {
      extra: { stage: 'jwt_self_test_failed', source: 'auth.readiness.probeNextAuthSecretRoundTrip' }
    })

    return false
  }
}

/**
 * Cached readiness snapshot. TTL is short to keep the UI responsive after
 * an operator fixes a secret, but long enough to avoid fan-out per request.
 */
const READINESS_CACHE_TTL_MS = 30_000

declare global {

  // eslint-disable-next-line no-var
  var __greenhouseAuthReadinessCache:
    | { snapshot: AuthReadinessSnapshot; expiresAt: number }
    | undefined
}

export const clearAuthReadinessCache = () => {
  globalThis.__greenhouseAuthReadinessCache = undefined
}

const probeProvider = async ({
  provider,
  clientIdEnv,
  clientSecretEnv,
  clientSecretValue,
  oidcDiscoveryUrl
}: {
  provider: AuthProviderHealth['provider']
  clientIdEnv: string
  clientSecretEnv: string
  clientSecretValue: string | null
  oidcDiscoveryUrl: string
}): Promise<AuthProviderHealth> => {
  const checkedAt = new Date().toISOString()

  const clientId = process.env[clientIdEnv]?.trim() || null

  if (!clientId || !clientSecretValue) {
    return {
      provider,
      status: 'unconfigured',
      failingStage: 'unconfigured',
      reason: !clientId
        ? `${clientIdEnv} not set`
        : `${clientSecretEnv} resolved to null (Capa 1 may have rejected payload)`,
      checkedAt
    }
  }

  if (isKnownSecretFormat(clientIdEnv)) {
    const idResult = validateSecretFormat(clientIdEnv, clientId)

    if (!idResult.ok) {
      return {
        provider,
        status: 'degraded',
        failingStage: 'secret_format_invalid',
        reason: `${clientIdEnv}: ${idResult.violations.join(',')}`,
        checkedAt
      }
    }
  }

  if (isKnownSecretFormat(clientSecretEnv)) {
    const secretResult = validateSecretFormat(clientSecretEnv, clientSecretValue)

    if (!secretResult.ok) {
      return {
        provider,
        status: 'degraded',
        failingStage: 'secret_format_invalid',
        reason: `${clientSecretEnv}: ${secretResult.violations.join(',')}`,
        checkedAt
      }
    }
  }

  const probe = await probeOidcDiscovery(oidcDiscoveryUrl)

  if (!probe.ok) {
    return {
      provider,
      status: 'degraded',
      failingStage: probe.failingStage,
      reason: probe.reason,
      checkedAt
    }
  }

  return { provider, status: 'ready', checkedAt }
}

interface BuildSnapshotInput {
  azureAdClientSecret: string | null
  googleClientSecret: string | null
  nextAuthSecret: string | null
}

export const buildAuthReadinessSnapshot = async (
  input: BuildSnapshotInput
): Promise<AuthReadinessSnapshot> => {
  const generatedAt = new Date().toISOString()

  const nextAuthSecretReady = input.nextAuthSecret
    ? await probeNextAuthSecretRoundTrip(input.nextAuthSecret)
    : false

  const [azureProbe, googleProbe] = await Promise.all([
    probeProvider({
      provider: 'azure-ad',
      clientIdEnv: 'AZURE_AD_CLIENT_ID',
      clientSecretEnv: 'AZURE_AD_CLIENT_SECRET',
      clientSecretValue: input.azureAdClientSecret,
      oidcDiscoveryUrl: MICROSOFT_OIDC_DISCOVERY_URL
    }),
    probeProvider({
      provider: 'google',
      clientIdEnv: 'GOOGLE_CLIENT_ID',
      clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
      clientSecretValue: input.googleClientSecret,
      oidcDiscoveryUrl: GOOGLE_OIDC_DISCOVERY_URL
    })
  ])

  const credentialsHealth: AuthProviderHealth = {
    provider: 'credentials',
    status: nextAuthSecretReady ? 'ready' : 'degraded',
    failingStage: nextAuthSecretReady ? undefined : 'jwt_self_test_failed',
    reason: nextAuthSecretReady ? undefined : 'NEXTAUTH_SECRET sign+verify roundtrip failed',
    checkedAt: generatedAt
  }

  const providers: AuthProviderHealth[] = [azureProbe, googleProbe, credentialsHealth]

  const anyDegraded = providers.some(p => p.status === 'degraded')
  const allUnconfigured = providers.every(p => p.status === 'unconfigured')
  const anyReady = providers.some(p => p.status === 'ready')

  const overallStatus: AuthProviderReadinessStatus = anyDegraded
    ? 'degraded'
    : allUnconfigured
      ? 'unconfigured'
      : anyReady
        ? 'ready'
        : 'degraded'

  return {
    contractVersion: 'auth-readiness.v1',
    generatedAt,
    providers,
    overallStatus,
    nextAuthSecretReady
  }
}

/**
 * Public API — returns a cached readiness snapshot. Callers (UI, Platform
 * Health composer, smoke lane) should always go through this entry point
 * to share the in-process cache and avoid concurrent OIDC discovery storms.
 */
export const getAuthReadinessSnapshot = async (
  input: BuildSnapshotInput
): Promise<AuthReadinessSnapshot> => {
  const now = Date.now()
  const cached = globalThis.__greenhouseAuthReadinessCache

  if (cached && cached.expiresAt > now) {
    return cached.snapshot
  }

  const snapshot = await buildAuthReadinessSnapshot(input)

  globalThis.__greenhouseAuthReadinessCache = {
    snapshot,
    expiresAt: now + READINESS_CACHE_TTL_MS
  }

  return snapshot
}
