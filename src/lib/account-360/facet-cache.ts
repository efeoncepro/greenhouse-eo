import 'server-only'

import type { AccountFacetName } from '@/types/account-complete-360'

// ── Cache Entry ──

interface CacheEntry<T = unknown> {
  data: T
  resolvedAt: number
  softExpiresAt: number
}

// ── In-memory store ──
// Singleton Map per process. Shared across invocations in the same Vercel function.
// Prepared for Redis replacement (TASK-276) — same interface, different backend.

const store = new Map<string, CacheEntry>()

const RESOLVER_VERSION = '1.0.0'

// ── Key builder ──

const buildKey = (orgId: string, facet: AccountFacetName): string =>
  `account360:${orgId}:${facet}:${RESOLVER_VERSION}`

// ── Public API ──

export const getCachedAccountFacet = <T>(
  orgId: string,
  facet: AccountFacetName
): { data: T; status: 'hit' | 'stale' } | null => {
  const key = buildKey(orgId, facet)
  const entry = store.get(key) as CacheEntry<T> | undefined

  if (!entry) return null

  const now = Date.now()

  // Hard expiry: 2x soft TTL
  const hardExpiresAt = entry.softExpiresAt + (entry.softExpiresAt - entry.resolvedAt)

  if (now > hardExpiresAt) {
    store.delete(key)

    return null
  }

  const isStale = now > entry.softExpiresAt

  return { data: entry.data, status: isStale ? 'stale' : 'hit' }
}

export const setCachedAccountFacet = <T>(
  orgId: string,
  facet: AccountFacetName,
  data: T,
  ttlSeconds: number
): void => {
  const key = buildKey(orgId, facet)
  const now = Date.now()

  store.set(key, {
    data,
    resolvedAt: now,
    softExpiresAt: now + ttlSeconds * 1000
  })
}

export const invalidateAccountFacetCache = (
  orgId: string,
  facet: AccountFacetName
): void => {
  const key = buildKey(orgId, facet)

  store.delete(key)
}

export const invalidateAllAccountFacets = (orgId: string): void => {
  const prefix = `account360:${orgId}:`

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key)
    }
  }
}

/** Clear the entire account facet cache (for testing or emergency) */
export const clearAccountFacetCache = (): void => {
  store.clear()
}

/** Get cache stats for observability */
export const getAccountFacetCacheStats = (): { size: number; keys: string[] } => ({
  size: store.size,
  keys: [...store.keys()]
})
