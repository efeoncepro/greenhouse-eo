import 'server-only'

import { query } from '@/lib/db'
import {
  ENTITLEMENT_CAPABILITY_CATALOG,
  type EntitlementCapabilityDefinition
} from '@/config/entitlements-catalog'

/**
 * TASK-611 — Capabilities registry parity helpers.
 *
 * El catálogo TS (`src/config/entitlements-catalog.ts`) es la SSOT runtime;
 * `greenhouse_core.capabilities_registry` es la reflexión declarativa para
 * defense-in-depth Layer 1 (futuro FK enforcement cuando emerja persistencia
 * de grants — hoy bloqueado por TASK-404 pre-up-marker bug, fuera de scope
 * TASK-611).
 *
 * El guardia primario hoy es la **runtime parity test** que compara catalog TS
 * vs registry DB. Drift = test fail.
 *
 * Patrón fuente: TASK-700 paridad TS↔SQL del Luhn algorithm.
 */

export type CapabilitiesRegistryRow = {
  capability_key: string
  module: string
  allowed_actions: string[]
  allowed_scopes: string[]
  description: string
  introduced_at: Date | string
  deprecated_at: Date | string | null
}

/**
 * Lee las capabilities activas desde DB. Memoizado in-process por 5 minutos
 * para evitar roundtrip per request en hot paths (mismo orden de magnitud que
 * el cache TTL de TASK-780 y patrón TASK-672 Platform Health).
 */
let cache: { rows: CapabilitiesRegistryRow[]; expiresAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

export const listActiveCapabilitiesFromRegistry = async (): Promise<CapabilitiesRegistryRow[]> => {
  const now = Date.now()

  if (cache && cache.expiresAt > now) {
    return cache.rows
  }

  const rows = await query<CapabilitiesRegistryRow>(`
    SELECT capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at
    FROM greenhouse_core.capabilities_registry
    WHERE deprecated_at IS NULL
    ORDER BY capability_key
  `)

  cache = { rows, expiresAt: now + CACHE_TTL_MS }

  return rows
}

/**
 * Test helper — fuerza re-fetch en próximo call. Solo para tests + admin endpoints.
 */
export const __clearCapabilitiesRegistryCache = () => {
  cache = null
}

export type CapabilitiesParityReport = {
  inSync: boolean
  inCatalogNotInRegistry: string[]
  inRegistryNotInCatalog: string[]
  modulesMismatch: { capabilityKey: string; tsModule: string; dbModule: string }[]
  actionsMismatch: { capabilityKey: string; tsActions: string[]; dbActions: string[] }[]
}

const sortedUnique = (values: readonly string[]): string[] => Array.from(new Set(values)).sort()

/**
 * Compara catalog TS vs registry DB y devuelve un reporte estructurado.
 * `inSync = true` significa: misma cardinalidad de keys + cada key matchea
 * en module y actions.
 *
 * Casos OK que NO disparan drift (intencional):
 * - DB tiene `allowed_scopes` que es un superset del defaultScope TS — el
 *   catalog TS solo expone `defaultScope` por entry; el registry DB declara
 *   los scopes válidos completos. Por eso esta parity NO compara scopes.
 * - DB tiene `description` que TS no tiene — descripción es texto humano,
 *   no afecta runtime.
 *
 * Casos que SÍ disparan drift:
 * - Una capability nueva en TS sin row correspondiente en DB → migración
 *   pendiente.
 * - Una capability deprecada en TS pero `deprecated_at IS NULL` en DB → DB
 *   stale.
 * - Module distinto entre TS y DB → catalog TS y migración inconsistentes.
 * - Set de actions distinto → catalog TS y migración inconsistentes.
 */
export const compareCapabilitiesParity = (
  catalog: readonly EntitlementCapabilityDefinition[],
  registry: readonly CapabilitiesRegistryRow[]
): CapabilitiesParityReport => {
  const catalogByKey = new Map<string, EntitlementCapabilityDefinition>(
    catalog.map(definition => [definition.key, definition])
  )

  const registryByKey = new Map<string, CapabilitiesRegistryRow>(
    registry.map(row => [row.capability_key, row])
  )

  const inCatalogNotInRegistry: string[] = []
  const inRegistryNotInCatalog: string[] = []
  const modulesMismatch: CapabilitiesParityReport['modulesMismatch'] = []
  const actionsMismatch: CapabilitiesParityReport['actionsMismatch'] = []

  for (const [key, definition] of catalogByKey) {
    const row = registryByKey.get(key)

    if (!row) {
      inCatalogNotInRegistry.push(key)
      continue
    }

    if (definition.module !== row.module) {
      modulesMismatch.push({ capabilityKey: key, tsModule: definition.module, dbModule: row.module })
    }

    const tsActions = sortedUnique(definition.actions as readonly string[])
    const dbActions = sortedUnique(row.allowed_actions)

    if (tsActions.length !== dbActions.length || tsActions.some((action, idx) => action !== dbActions[idx])) {
      actionsMismatch.push({ capabilityKey: key, tsActions, dbActions })
    }
  }

  for (const key of registryByKey.keys()) {
    if (!catalogByKey.has(key)) {
      inRegistryNotInCatalog.push(key)
    }
  }

  return {
    inSync:
      inCatalogNotInRegistry.length === 0 &&
      inRegistryNotInCatalog.length === 0 &&
      modulesMismatch.length === 0 &&
      actionsMismatch.length === 0,
    inCatalogNotInRegistry: inCatalogNotInRegistry.sort(),
    inRegistryNotInCatalog: inRegistryNotInCatalog.sort(),
    modulesMismatch,
    actionsMismatch
  }
}

/**
 * Reads DB + compares against TS catalog. Returns the parity report. Used by
 * the parity test in CI and by the (future) admin readiness endpoint.
 */
export const checkCapabilitiesParity = async (): Promise<CapabilitiesParityReport> => {
  const registry = await listActiveCapabilitiesFromRegistry()

  return compareCapabilitiesParity(ENTITLEMENT_CAPABILITY_CATALOG, registry)
}
