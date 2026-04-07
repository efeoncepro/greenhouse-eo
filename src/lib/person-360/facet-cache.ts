import 'server-only'

import type { PersonFacetName } from '@/types/person-complete-360'

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

const buildKey = (profileId: string, facet: PersonFacetName): string =>
  `person360:${profileId}:${facet}:${RESOLVER_VERSION}`

// ── Public API ──

export const getCachedFacet = <T>(
  profileId: string,
  facet: PersonFacetName
): { data: T; status: 'hit' | 'stale' } | null => {
  const key = buildKey(profileId, facet)
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

export const setCachedFacet = <T>(
  profileId: string,
  facet: PersonFacetName,
  data: T,
  ttlSeconds: number
): void => {
  const key = buildKey(profileId, facet)
  const now = Date.now()

  store.set(key, {
    data,
    resolvedAt: now,
    softExpiresAt: now + ttlSeconds * 1000
  })
}

export const invalidateFacetCache = (
  profileId: string,
  facet: PersonFacetName
): void => {
  const key = buildKey(profileId, facet)

  store.delete(key)
}

export const invalidateAllFacetsForProfile = (profileId: string): void => {
  const prefix = `person360:${profileId}:`

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key)
    }
  }
}

/** Clear the entire cache (for testing or emergency) */
export const clearFacetCache = (): void => {
  store.clear()
}

/** Get cache stats for observability */
export const getFacetCacheStats = (): { size: number; keys: string[] } => ({
  size: store.size,
  keys: [...store.keys()]
})
