import 'server-only'

import { ENTITLEMENT_CAPABILITY_CATALOG } from '@/config/entitlements-catalog'
import { query } from '@/lib/db'

/**
 * TASK-826 Slice 5 — Parity test helpers for client_portal capabilities.
 *
 * **Bi-direccional**:
 *   A) TS catalog ↔ DB `capabilities_registry`:
 *      Compara `ENTITLEMENT_CAPABILITY_CATALOG` filtered por
 *      `module='client_portal'` vs `greenhouse_core.capabilities_registry`
 *      filtered por `module='client_portal' AND deprecated_at IS NULL`.
 *
 *   B) `modules.capabilities[]` seed (TASK-824) ⊆ TS catalog keys:
 *      Cada value en el array `capabilities` del seed `greenhouse_client_portal.modules`
 *      DEBE existir en el TS catalog. Drift = referencia muerta.
 *
 *   **V1.0 forward-looking**: la TS catalog puede declarar capabilities que aún no
 *   aparecen en el seed (futuro), pero el seed NO puede declarar capabilities
 *   que no están en el TS catalog (que las consume el `can()` runtime).
 *
 * Patrón fuente:
 *   - `src/lib/capabilities-registry/parity.ts` (TASK-611) — A canónico
 *   - `src/lib/client-portal/data-sources/parity.ts` (TASK-824) — B canónico
 */

const CLIENT_PORTAL_MODULE = 'client_portal' as const

const sortedUnique = (values: readonly string[]): string[] =>
  Array.from(new Set(values)).sort()

// ─────────────────────────────────────────────────────────────
// A) TS catalog ↔ DB capabilities_registry
// ─────────────────────────────────────────────────────────────

type RegistryRow = {
  capability_key: string
  module: string
  allowed_actions: string[]
} & Record<string, unknown>

let registryCache: { rows: RegistryRow[]; expiresAt: number } | null = null
const REGISTRY_CACHE_TTL_MS = 5 * 60 * 1000

const fetchClientPortalCapabilitiesFromRegistry = async (): Promise<RegistryRow[]> => {
  const now = Date.now()

  if (registryCache && registryCache.expiresAt > now) {
    return registryCache.rows
  }

  const rows = await query<RegistryRow>(`
    SELECT capability_key, module, allowed_actions
    FROM greenhouse_core.capabilities_registry
    WHERE module = $1
      AND deprecated_at IS NULL
    ORDER BY capability_key
  `, [CLIENT_PORTAL_MODULE])

  registryCache = { rows, expiresAt: now + REGISTRY_CACHE_TTL_MS }

  return rows
}

export const __clearClientPortalCapabilitiesParityCache = () => {
  registryCache = null
  seedCache = null
}

export interface CapabilityRegistryParityReport {
  readonly inSync: boolean
  readonly inCatalogNotInRegistry: readonly string[]
  readonly inRegistryNotInCatalog: readonly string[]
  readonly actionsMismatch: ReadonlyArray<{
    capabilityKey: string
    tsActions: readonly string[]
    dbActions: readonly string[]
  }>
}

export const checkClientPortalRegistryParity = async (): Promise<CapabilityRegistryParityReport> => {
  const dbRows = await fetchClientPortalCapabilitiesFromRegistry()
  const dbByKey = new Map(dbRows.map(row => [row.capability_key, row]))

  const tsRows = ENTITLEMENT_CAPABILITY_CATALOG.filter(c => c.module === CLIENT_PORTAL_MODULE)

  const tsByKey = new Map<string, (typeof ENTITLEMENT_CAPABILITY_CATALOG)[number]>(
    tsRows.map(c => [c.key as string, c])
  )

  const inCatalogNotInRegistry = sortedUnique(
    [...tsByKey.keys()].filter(key => !dbByKey.has(key))
  )

  const inRegistryNotInCatalog = sortedUnique(
    [...dbByKey.keys()].filter(key => !tsByKey.has(key))
  )

  const actionsMismatch: Array<{
    capabilityKey: string
    tsActions: readonly string[]
    dbActions: readonly string[]
  }> = []

  for (const tsCap of tsRows) {
    const dbRow = dbByKey.get(tsCap.key)

    if (!dbRow) continue

    const tsActions = sortedUnique(tsCap.actions as readonly string[])
    const dbActions = sortedUnique(dbRow.allowed_actions)

    if (JSON.stringify(tsActions) !== JSON.stringify(dbActions)) {
      actionsMismatch.push({ capabilityKey: tsCap.key, tsActions, dbActions })
    }
  }

  return {
    inSync:
      inCatalogNotInRegistry.length === 0 &&
      inRegistryNotInCatalog.length === 0 &&
      actionsMismatch.length === 0,
    inCatalogNotInRegistry,
    inRegistryNotInCatalog,
    actionsMismatch
  }
}

// ─────────────────────────────────────────────────────────────
// B) Seed modules.capabilities[] ⊆ TS catalog keys
// ─────────────────────────────────────────────────────────────

type SeedCapabilityRow = {
  module_key: string
  capabilities: string[]
} & Record<string, unknown>

let seedCache: { rows: SeedCapabilityRow[]; expiresAt: number } | null = null
const SEED_CACHE_TTL_MS = 5 * 60 * 1000

const fetchModuleCapabilitiesFromSeed = async (): Promise<SeedCapabilityRow[]> => {
  const now = Date.now()

  if (seedCache && seedCache.expiresAt > now) {
    return seedCache.rows
  }

  const rows = await query<SeedCapabilityRow>(`
    SELECT module_key, capabilities
    FROM greenhouse_client_portal.modules
    WHERE effective_to IS NULL
    ORDER BY module_key
  `)

  seedCache = { rows, expiresAt: now + SEED_CACHE_TTL_MS }

  return rows
}

export interface CapabilitySeedParityReport {
  readonly inSync: boolean

  /** Values en `modules.capabilities[]` pero NO en el TS catalog (drift bloqueante). */
  readonly inSeedNotInCatalog: readonly string[]

  /** Total módulos del seed inspeccionados. */
  readonly seedModuleCount: number

  /** Cardinalidad de capability keys únicas en seed. */
  readonly uniqueSeedCapabilityCount: number

  /** Cardinalidad del TS catalog filtered por client_portal module. */
  readonly catalogCapabilityCount: number
}

export const checkClientPortalSeedCapabilitiesParity = async (): Promise<CapabilitySeedParityReport> => {
  const seedRows = await fetchModuleCapabilitiesFromSeed()

  const tsKeys = new Set<string>(
    ENTITLEMENT_CAPABILITY_CATALOG
      .filter(c => c.module === CLIENT_PORTAL_MODULE)
      .map(c => c.key as string)
  )

  const allSeedCapabilities = new Set<string>()

  for (const row of seedRows) {
    for (const cap of row.capabilities ?? []) {
      allSeedCapabilities.add(cap)
    }
  }

  const inSeedNotInCatalog = sortedUnique(
    [...allSeedCapabilities].filter(cap => !tsKeys.has(cap))
  )

  return {
    inSync: inSeedNotInCatalog.length === 0,
    inSeedNotInCatalog,
    seedModuleCount: seedRows.length,
    uniqueSeedCapabilityCount: allSeedCapabilities.size,
    catalogCapabilityCount: tsKeys.size
  }
}
