import 'server-only'

import type { OrganizationWorkspaceProjection } from './projection-types'

/**
 * TASK-611 — In-memory cache para projections del Organization Workspace.
 *
 * TTL 30s alineado con TASK-780 (home-rollout-flags) y TASK-672 (Platform Health).
 * Pattern source: cache de la flag de home — single Map keyed por composite identifier.
 *
 * Invalidación reactiva via outbox events (Slice 6) llama
 * `clearProjectionCacheForSubject(subjectUserId)` cuando un grant/revoke se aplica.
 *
 * NO se materializa en BQ/PG (decisión cerrada V1 §4.6 — projection es read-light
 * y cacheable; materialización agregaría drift sin payoff).
 */

const CACHE_TTL_MS = 30 * 1000

type CacheEntry = {
  result: OrganizationWorkspaceProjection
  expiresAt: number
}

const projectionCache = new Map<string, CacheEntry>()

/**
 * Build a stable cache key for a (subject, organization, entrypoint) tuple.
 */
export const buildProjectionCacheKey = (
  subjectUserId: string,
  organizationId: string,
  entrypointContext: string
): string => `${subjectUserId}:${organizationId}:${entrypointContext}`

export const readProjectionFromCache = (cacheKey: string): OrganizationWorkspaceProjection | null => {
  const entry = projectionCache.get(cacheKey)

  if (!entry) return null

  if (entry.expiresAt <= Date.now()) {
    projectionCache.delete(cacheKey)

    return null
  }

  return entry.result
}

export const writeProjectionToCache = (cacheKey: string, result: OrganizationWorkspaceProjection): void => {
  projectionCache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Reactive invalidation: drops every cached projection scoped to a given subject.
 *
 * Invocado por el consumer del outbox (Slice 6) cuando emite uno de los 5 events
 * canónicos de cambio de capability bag (access.entitlement_*, role.assigned/revoked,
 * user.deactivated). Idempotente.
 */
export const clearProjectionCacheForSubject = (subjectUserId: string): number => {
  if (!subjectUserId) return 0

  const prefix = `${subjectUserId}:`
  let cleared = 0

  for (const key of projectionCache.keys()) {
    if (key.startsWith(prefix)) {
      projectionCache.delete(key)
      cleared += 1
    }
  }

  return cleared
}

/**
 * Test helper — fuerza wipe completo del cache. Sólo tests.
 */
export const __clearAllProjectionCache = (): void => {
  projectionCache.clear()
}

/**
 * Test helper — current cache size, útil para verificar TTL o invalidación reactiva.
 */
export const __getProjectionCacheSize = (): number => projectionCache.size

export const PROJECTION_CACHE_TTL_MS = CACHE_TTL_MS
