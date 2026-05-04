import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-780 — Smart Home rollout flag resolver.
 *
 * Replaces the binary `process.env.HOME_V2_ENABLED` env var with a PG-backed
 * flags table that supports:
 *
 *   - Scope precedence:  user > role > tenant > global
 *   - Rollback in seconds (UPDATE row, no redeploy)
 *   - Gradual rollout per tenant / role / user
 *   - Per-user opt-out preserved at the page layer (`client_users.home_v2_opt_out`)
 *
 * Resilience contract (read this if you change the resolver):
 *
 *   1. **PG unreachable → env fallback → conservative default.**
 *      If the table query throws (table missing during pre-migration window,
 *      PG down, runtime cold start), we fall back to `HOME_V2_ENABLED` env
 *      var so the rollout state is preserved. If that's also absent, we
 *      default to `enabled=false` (legacy shell). Render NEVER crashes.
 *
 *   2. **In-memory cache (TTL 30s).** Resolution is hot-path on every home
 *      render. The cache key includes subject scope so per-user/per-tenant
 *      decisions stay isolated. Cache is per-instance — a Vercel cold start
 *      misses, which is fine.
 *
 *   3. **Single PG round-trip per uncached call.** Same shape as
 *      `resolveHomeBlockFlags`: one query, batch all matching rows, project
 *      to scope-precedence winner.
 *
 * NEVER call this from a client component. Server-only by construction.
 */

export type HomeRolloutFlagKey = 'home_v2_shell'

export interface HomeRolloutSubject {
  userId: string
  tenantId: string | null
  roleCodes: string[]
}

type FlagRow = {
  flag_key: string
  scope_type: 'global' | 'tenant' | 'role' | 'user'
  scope_id: string | null
  enabled: boolean
} & Record<string, unknown>

interface ResolvedFlag {
  enabled: boolean
  source: 'pg' | 'env_fallback' | 'default'
  scopeType: FlagRow['scope_type'] | null
}

const SCOPE_PRECEDENCE: Record<FlagRow['scope_type'], number> = {
  user: 4,
  role: 3,
  tenant: 2,
  global: 1
}

const matchesSubject = (row: FlagRow, subject: HomeRolloutSubject): boolean => {
  switch (row.scope_type) {
    case 'global':
      return true
    case 'tenant':
      return subject.tenantId !== null && row.scope_id === subject.tenantId
    case 'role':
      return row.scope_id !== null && subject.roleCodes.includes(row.scope_id)
    case 'user':
      return row.scope_id === subject.userId
    default:
      return false
  }
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 30_000

interface CacheEntry {
  resolved: ResolvedFlag
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

const cacheKey = (flagKey: HomeRolloutFlagKey, subject: HomeRolloutSubject): string =>
  `${flagKey}|${subject.userId}|${subject.tenantId ?? '_'}|${subject.roleCodes.slice().sort().join(',')}`

/** Test-only — never call from runtime. */
export const __clearHomeRolloutFlagCache = (): void => {
  cache.clear()
}

// ---------------------------------------------------------------------------
// Env fallback (graceful degradation)
// ---------------------------------------------------------------------------

const readEnvFallback = (flagKey: HomeRolloutFlagKey): boolean | null => {
  if (flagKey !== 'home_v2_shell') return null

  const raw = (process.env.HOME_V2_ENABLED ?? '').trim().toLowerCase()

  if (raw === 'true' || raw === '1' || raw === 'on') return true
  if (raw === 'false' || raw === '0' || raw === 'off') return false

  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a single rollout flag for a subject. Returns the winning value,
 * the source it came from, and the scope that resolved it (for logging).
 *
 * Cache TTL: 30s per (flag_key, subject) tuple.
 */
export const resolveHomeRolloutFlag = async (
  flagKey: HomeRolloutFlagKey,
  subject: HomeRolloutSubject
): Promise<ResolvedFlag> => {
  const key = cacheKey(flagKey, subject)
  const cached = cache.get(key)
  const now = Date.now()

  if (cached && cached.expiresAt > now) {
    return cached.resolved
  }

  let rows: FlagRow[] = []
  let pgFailed = false

  try {
    rows = await runGreenhousePostgresQuery<FlagRow>(
      `SELECT flag_key, scope_type, scope_id, enabled
         FROM greenhouse_serving.home_rollout_flags
        WHERE flag_key = $1
          AND (scope_type = 'global'
               OR (scope_type = 'tenant' AND scope_id = $2)
               OR (scope_type = 'role'   AND scope_id = ANY($3::text[]))
               OR (scope_type = 'user'   AND scope_id = $4))`,
      [flagKey, subject.tenantId, subject.roleCodes, subject.userId]
    )
  } catch (error) {
    pgFailed = true

    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[home-rollout-flags] PG lookup failed, falling back:',
        error instanceof Error ? error.message : error
      )
    }
  }

  let winner: FlagRow | null = null

  for (const row of rows) {
    if (row.flag_key !== flagKey) continue
    if (!matchesSubject(row, subject)) continue

    if (!winner || SCOPE_PRECEDENCE[row.scope_type] > SCOPE_PRECEDENCE[winner.scope_type]) {
      winner = row
    }
  }

  let resolved: ResolvedFlag

  if (winner) {
    resolved = { enabled: winner.enabled, source: 'pg', scopeType: winner.scope_type }
  } else if (pgFailed) {
    const envValue = readEnvFallback(flagKey)

    if (envValue !== null) {
      resolved = { enabled: envValue, source: 'env_fallback', scopeType: null }
    } else {
      // PG unreachable AND no env fallback → conservative default = disabled.
      // Reason: a flagged feature should fail closed when its rollout substrate
      // is unobservable. Operators see legacy shell, not a crash.
      resolved = { enabled: false, source: 'default', scopeType: null }
    }
  } else {
    // PG reachable but no row matched → default = disabled.
    // Operators must explicitly INSERT a row to enable a variant.
    resolved = { enabled: false, source: 'default', scopeType: null }
  }

  cache.set(key, { resolved, expiresAt: now + CACHE_TTL_MS })

  return resolved
}

/** Convenience wrapper that returns just the boolean. */
export const isHomeV2EnabledForSubject = async (subject: HomeRolloutSubject): Promise<boolean> => {
  const resolved = await resolveHomeRolloutFlag('home_v2_shell', subject)

  return resolved.enabled
}
