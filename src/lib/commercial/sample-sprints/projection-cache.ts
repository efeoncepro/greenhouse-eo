import 'server-only'

import type { SampleSprintRuntimeProjection } from './runtime-projection-types'

/**
 * TASK-835 — In-memory cache para la Sample Sprints Runtime Projection.
 *
 * Pattern fuente: `src/lib/organization-workspace/cache.ts` (TASK-611). TTL 30s
 * alineado con TASK-672/780. Single Map keyed por (subjectId, tenantId).
 *
 * Invalidación reactiva (Slice 6) via outbox events `service.engagement.*` llama
 * `clearProjectionCacheForService(serviceId)` cuando cambia un sprint específico.
 * Como un mismo cliente puede ver N sprints, droppeamos TODAS las entries que
 * proyecten ese serviceId — no sólo la del subject que originó la mutación.
 */

const CACHE_TTL_MS = 30 * 1000

type CacheEntry = {
  result: SampleSprintRuntimeProjection
  expiresAt: number
}

const projectionCache = new Map<string, CacheEntry>()

const composeKey = (subjectId: string, tenantId: string): string => `${subjectId}:${tenantId}`

export const buildProjectionCacheKey = (subjectId: string, tenantId: string): string =>
  composeKey(subjectId, tenantId)

export const readProjectionFromCache = (cacheKey: string): SampleSprintRuntimeProjection | null => {
  const entry = projectionCache.get(cacheKey)

  if (!entry) return null

  if (entry.expiresAt <= Date.now()) {
    projectionCache.delete(cacheKey)

    return null
  }

  return entry.result
}

export const writeProjectionToCache = (cacheKey: string, result: SampleSprintRuntimeProjection): void => {
  projectionCache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Reactive invalidation — droppea toda entry de cache cuyo payload mencione el
 * serviceId afectado. Como el cache es scoped por (subject, tenant) y no por
 * service, debemos iterar entries y comparar contra `result.items[].serviceId`
 * y `result.selected?.serviceId`.
 *
 * Idempotente: si nadie tenía cacheado el sprint, retorna 0.
 */
export const clearProjectionCacheForService = (serviceId: string): number => {
  if (!serviceId) return 0

  let cleared = 0

  for (const [key, entry] of projectionCache.entries()) {
    const mentionsService = entry.result.selected?.serviceId === serviceId
      || entry.result.items.some(item => item.serviceId === serviceId)

    if (mentionsService) {
      projectionCache.delete(key)
      cleared += 1
    }
  }

  return cleared
}

/**
 * Reactive invalidation por subject — útil cuando cambia entitlements del subject
 * (no cubierto en V1, pero exportado para futura extensión).
 */
export const clearProjectionCacheForSubject = (subjectId: string): number => {
  if (!subjectId) return 0

  const prefix = `${subjectId}:`
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
 * Test helper — wipe completo. Sólo tests.
 */
export const __clearAllProjectionCache = (): void => {
  projectionCache.clear()
}

/**
 * Test helper — current cache size.
 */
export const __getProjectionCacheSize = (): number => projectionCache.size

export const SAMPLE_SPRINT_PROJECTION_CACHE_TTL_MS = CACHE_TTL_MS
