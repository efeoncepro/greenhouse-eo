import 'server-only'

import { randomUUID } from 'crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  ReliabilityApiRef,
  ReliabilityModuleDefinition,
  ReliabilityModuleDomain,
  ReliabilityModuleKey,
  ReliabilityRouteRef,
  ReliabilitySignalKind
} from '@/types/reliability'

import { STATIC_RELIABILITY_REGISTRY } from './registry'

/**
 * TASK-635 — Reliability Registry DB persistence + tenant overrides.
 *
 * Diseño dual-source:
 *   1) `STATIC_RELIABILITY_REGISTRY` (código) es la fuente canónica de
 *      defaults. Sembrar la DB es lazy: la primera lectura dispara
 *      `ensureReliabilityRegistrySeed()` con `INSERT ... ON CONFLICT DO UPDATE`.
 *   2) `greenhouse_core.reliability_module_overrides` guarda diffs
 *      per-tenant (hidden, extraSignalKinds, sloOverrides).
 *
 * Reader resolución: defaults DB + overlay overrides → array final consumido
 * por `buildReliabilityOverview`. Cuando `spaceId` es null/undefined, retorna
 * defaults sin overlay — comportamiento idéntico al registry estático actual.
 *
 * Si la DB falla, fallback honesto al `STATIC_RELIABILITY_REGISTRY` para que
 * el portal nunca se rompa por un problema en la layer de overrides.
 */

const CACHE_TTL_MS = 60_000

interface CacheEntry {
  fetchedAt: number
  modules: ReliabilityModuleDefinition[]
}

const overridesCache = new Map<string, CacheEntry>()

let seedPromise: Promise<void> | null = null

const shortUuid = () => randomUUID().replace(/-/g, '').slice(0, 8)

const generateOverrideId = () => `EO-RMO-${shortUuid()}`

const stableJson = (value: unknown): string => JSON.stringify(value ?? null)

interface RegistryRow extends Record<string, unknown> {
  module_key: string
  label: string
  description: string
  domain: string
  routes: unknown
  apis: unknown
  dependencies: unknown
  smoke_tests: unknown
  files_owned: unknown
  expected_signal_kinds: unknown
  slo_thresholds: unknown
  incident_domain_tag: string | null
}

interface OverrideRow extends Record<string, unknown> {
  module_key: string
  hidden: boolean
  extra_signal_kinds: unknown
  slo_overrides: unknown
}

const parseJsonArray = <T>(value: unknown, fallback: T[]): T[] => {
  if (Array.isArray(value)) return value as T[]

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      return Array.isArray(parsed) ? (parsed as T[]) : fallback
    } catch {
      return fallback
    }
  }

  return fallback
}

const parseJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // fallthrough
    }
  }

  return {}
}

const rowToDefinition = (row: RegistryRow): ReliabilityModuleDefinition => ({
  moduleKey: row.module_key as ReliabilityModuleKey,
  label: row.label,
  description: row.description,
  domain: row.domain as ReliabilityModuleDomain,
  routes: parseJsonArray<ReliabilityRouteRef>(row.routes, []),
  apis: parseJsonArray<ReliabilityApiRef>(row.apis, []),
  dependencies: parseJsonArray<string>(row.dependencies, []),
  smokeTests: parseJsonArray<string>(row.smoke_tests, []),
  filesOwned: parseJsonArray<string>(row.files_owned, []),
  expectedSignalKinds: parseJsonArray<ReliabilitySignalKind>(row.expected_signal_kinds, []),
  sloThresholds: parseJsonObject(row.slo_thresholds),
  incidentDomainTag: row.incident_domain_tag ?? undefined
})

/**
 * Idempotent boot: sincroniza `STATIC_RELIABILITY_REGISTRY` con la tabla
 * `reliability_module_registry`. Se invoca lazy desde el reader. Single
 * promise pattern evita race conditions en serverless warm starts.
 *
 * El INSERT ... ON CONFLICT DO UPDATE garantiza que si alguien edita la DB
 * y olvida actualizar el código, el próximo deploy reescribe los defaults.
 * Source of truth: código.
 */
export const ensureReliabilityRegistrySeed = async (): Promise<void> => {
  if (seedPromise) return seedPromise

  seedPromise = (async () => {
    for (const definition of STATIC_RELIABILITY_REGISTRY) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_core.reliability_module_registry (
           module_key, label, description, domain,
           routes, apis, dependencies, smoke_tests, files_owned,
           expected_signal_kinds, slo_thresholds, incident_domain_tag
         )
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12)
         ON CONFLICT (module_key) DO UPDATE SET
           label = EXCLUDED.label,
           description = EXCLUDED.description,
           domain = EXCLUDED.domain,
           routes = EXCLUDED.routes,
           apis = EXCLUDED.apis,
           dependencies = EXCLUDED.dependencies,
           smoke_tests = EXCLUDED.smoke_tests,
           files_owned = EXCLUDED.files_owned,
           expected_signal_kinds = EXCLUDED.expected_signal_kinds,
           slo_thresholds = EXCLUDED.slo_thresholds,
           incident_domain_tag = EXCLUDED.incident_domain_tag,
           updated_at = NOW()`,
        [
          definition.moduleKey,
          definition.label,
          definition.description,
          definition.domain,
          stableJson(definition.routes),
          stableJson(definition.apis),
          stableJson(definition.dependencies),
          stableJson(definition.smokeTests),
          stableJson(definition.filesOwned),
          stableJson(definition.expectedSignalKinds),
          stableJson(definition.sloThresholds ?? {}),
          definition.incidentDomainTag ?? null
        ]
      )
    }
  })().catch(error => {
    seedPromise = null
    throw error
  })

  return seedPromise
}

const fetchDefaultsFromDb = async (): Promise<ReliabilityModuleDefinition[]> => {
  const rows = await runGreenhousePostgresQuery<RegistryRow>(
    `SELECT module_key, label, description, domain,
            routes, apis, dependencies, smoke_tests, files_owned,
            expected_signal_kinds, slo_thresholds, incident_domain_tag
       FROM greenhouse_core.reliability_module_registry
       ORDER BY module_key`
  )

  return rows.map(rowToDefinition)
}

const fetchOverridesFromDb = async (spaceId: string): Promise<Map<string, OverrideRow>> => {
  const rows = await runGreenhousePostgresQuery<OverrideRow>(
    `SELECT module_key, hidden, extra_signal_kinds, slo_overrides
       FROM greenhouse_core.reliability_module_overrides
      WHERE space_id = $1`,
    [spaceId]
  )

  const map = new Map<string, OverrideRow>()

  for (const row of rows) {
    map.set(row.module_key, row)
  }

  return map
}

const applyOverrides = (
  defaults: ReliabilityModuleDefinition[],
  overrides: Map<string, OverrideRow>
): ReliabilityModuleDefinition[] => {
  const result: ReliabilityModuleDefinition[] = []

  for (const definition of defaults) {
    const override = overrides.get(definition.moduleKey)

    if (!override) {
      result.push(definition)
      continue
    }

    if (override.hidden) {
      // Hidden: drop module entirely from the tenant's view.
      continue
    }

    const extraSignalKinds = parseJsonArray<ReliabilitySignalKind>(override.extra_signal_kinds, [])
    const sloOverrides = parseJsonObject(override.slo_overrides)

    const mergedExpectedSignalKinds = Array.from(
      new Set<ReliabilitySignalKind>([...definition.expectedSignalKinds, ...extraSignalKinds])
    )

    const mergedSloThresholds: Record<string, unknown> = {
      ...(definition.sloThresholds ?? {}),
      ...sloOverrides
    }

    result.push({
      ...definition,
      expectedSignalKinds: mergedExpectedSignalKinds,
      sloThresholds: mergedSloThresholds
    })
  }

  return result
}

const cacheKey = (spaceId: string | null | undefined) => spaceId ?? '__defaults__'

const readCache = (key: string): ReliabilityModuleDefinition[] | null => {
  const entry = overridesCache.get(key)

  if (!entry) return null

  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    overridesCache.delete(key)

    return null
  }

  return entry.modules
}

const writeCache = (key: string, modules: ReliabilityModuleDefinition[]) => {
  overridesCache.set(key, { fetchedAt: Date.now(), modules })
}

/**
 * Reader DB-aware. Resuelve el set efectivo de módulos para un tenant:
 *  - sin spaceId → defaults DB (= STATIC_RELIABILITY_REGISTRY si seed corrió).
 *  - con spaceId → defaults DB + overlay de overrides para ese space.
 *
 * Si la DB falla en cualquier paso, retorna `STATIC_RELIABILITY_REGISTRY`
 * como fallback honesto. NUNCA rompe el portal por un problema en la
 * layer de overrides — la lectura de Reliability Control Plane es resiliente.
 *
 * Cache TTL 60s in-process (mejora warm function reuse, no caché global).
 */
export const getReliabilityRegistry = async (
  spaceId?: string | null
): Promise<ReliabilityModuleDefinition[]> => {
  const key = cacheKey(spaceId)
  const cached = readCache(key)

  if (cached) return cached

  try {
    await ensureReliabilityRegistrySeed()

    const defaults = await fetchDefaultsFromDb()
    const baseDefaults = defaults.length > 0 ? defaults : STATIC_RELIABILITY_REGISTRY

    if (!spaceId) {
      writeCache(key, baseDefaults)

      return baseDefaults
    }

    const overrides = await fetchOverridesFromDb(spaceId)
    const merged = applyOverrides(baseDefaults, overrides)

    writeCache(key, merged)

    return merged
  } catch (error) {
    console.warn('[reliability-registry] DB read failed, falling back to static seed', {
      error: (error as Error).message
    })

    return STATIC_RELIABILITY_REGISTRY
  }
}

/**
 * Upsert override per-tenant. Útil para Slice 4 (Admin Center CRUD).
 * V1 deja el helper listo aunque la surface UI sea follow-up.
 */
export const setReliabilityModuleOverride = async ({
  spaceId,
  moduleKey,
  hidden = false,
  extraSignalKinds = [],
  sloOverrides = {}
}: {
  spaceId: string
  moduleKey: ReliabilityModuleKey
  hidden?: boolean
  extraSignalKinds?: ReliabilitySignalKind[]
  sloOverrides?: Record<string, unknown>
}): Promise<void> => {
  const overrideId = generateOverrideId()

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.reliability_module_overrides (
       override_id, space_id, module_key, hidden, extra_signal_kinds, slo_overrides
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
     ON CONFLICT (space_id, module_key) DO UPDATE SET
       hidden = EXCLUDED.hidden,
       extra_signal_kinds = EXCLUDED.extra_signal_kinds,
       slo_overrides = EXCLUDED.slo_overrides,
       updated_at = NOW()`,
    [overrideId, spaceId, moduleKey, hidden, stableJson(extraSignalKinds), stableJson(sloOverrides)]
  )

  overridesCache.delete(cacheKey(spaceId))
}

export const clearReliabilityModuleOverride = async ({
  spaceId,
  moduleKey
}: {
  spaceId: string
  moduleKey: ReliabilityModuleKey
}): Promise<void> => {
  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_core.reliability_module_overrides
      WHERE space_id = $1 AND module_key = $2`,
    [spaceId, moduleKey]
  )

  overridesCache.delete(cacheKey(spaceId))
}

/**
 * Helper para tests: limpia el cache in-memory entre invocaciones.
 * NO usar en runtime — el cache es por proceso.
 */
export const __resetRegistryStoreCacheForTesting = () => {
  overridesCache.clear()
  seedPromise = null
}
