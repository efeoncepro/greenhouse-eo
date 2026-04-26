import 'server-only'

import type { PlatformHealthAudience, PlatformHealthV1 } from '@/types/platform-health'

/**
 * In-process TTL cache for the composed Platform Health payload.
 *
 * Why bother: agents and MCP can poll this contract aggressively. Each
 * composer call fans out 7 source readers; without a cheap front-door
 * cache the readers (Postgres, Sentry, integration health) become a
 * bottleneck.
 *
 * Why per-instance and not Redis: V1 is a snapshot contract — staleness
 * is bounded by `CACHE_TTL_MS` and clearly disclosed in `meta.freshness`.
 * Distributed cache is overkill until we observe real cross-instance
 * thundering herd.
 *
 * Spec: docs/tasks/in-progress/TASK-672-platform-health-api-contract.md
 */

const CACHE_TTL_MS = 30_000

interface CacheEntry {
  expiresAt: number
  payload: PlatformHealthV1
}

const cache = new Map<PlatformHealthAudience, CacheEntry>()

export const readPlatformHealthCache = (
  audience: PlatformHealthAudience
): PlatformHealthV1 | null => {
  const entry = cache.get(audience)

  if (!entry) return null

  if (entry.expiresAt <= Date.now()) {
    cache.delete(audience)

    return null
  }

  return entry.payload
}

export const writePlatformHealthCache = (
  audience: PlatformHealthAudience,
  payload: PlatformHealthV1,
  ttlMs: number = CACHE_TTL_MS
): void => {
  cache.set(audience, {
    expiresAt: Date.now() + ttlMs,
    payload
  })
}

/**
 * Test-only helper: clears the cache between runs so cache state never
 * bleeds across vitest cases. NEVER call from runtime.
 */
export const __resetPlatformHealthCacheForTesting = (): void => {
  cache.clear()
}

export const PLATFORM_HEALTH_CACHE_TTL_MS = CACHE_TTL_MS
