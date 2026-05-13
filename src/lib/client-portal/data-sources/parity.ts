import 'server-only'

import { query } from '@/lib/db'

import type { ClientPortalDataSource } from '../dto/reader-meta'

/**
 * TASK-824 Slice 2 — Client Portal `data_sources[]` parity helpers (TS ↔ DB).
 *
 * El TS type union `ClientPortalDataSource` (`src/lib/client-portal/dto/reader-meta.ts`,
 * TASK-822 Slice 1) es la **single source of truth** del catalog de dominios
 * productores que un módulo del client portal puede consumir. La columna
 * `greenhouse_client_portal.modules.data_sources TEXT[]` es la persistencia
 * declarativa: cada seed module declara qué `ClientPortalDataSource` valores
 * lee.
 *
 * Este parity test compara los dos catalogs y falla loud si emerge drift:
 *
 *   - DB tiene un value en algún `modules.data_sources[]` que NO está en el
 *     TS union → migración stale (TS union se contrajo sin retirar el value
 *     del seed, o emerge un value nuevo en seed sin agregar al TS union).
 *   - TS union declara un value que NO aparece en ningún seed module activo
 *     → soft warning (no drift bloqueante; el value puede ser nuevo en TS
 *     reservado para módulos futuros). En este V1.0 NO bloqueamos por este
 *     caso — la spec V1.4 §5.5 declara que algunos values del union son
 *     forward-looking para módulos V1.1+.
 *
 * Patrón fuente: TASK-611 `src/lib/capabilities-registry/parity.ts`.
 *
 * Cierra OQ-3 de TASK-822 ÚNICAMENTE para `data_sources[]`. Las paridades
 * análogas de `view_codes[]` y `capabilities[]` son responsabilidad downstream
 * de TASK-827 + TASK-826 respectivamente (cada task posee la parity de su
 * catalog cuando lo materialice).
 *
 * Spec arquitectónica V1.4 §5.5 documenta el contract.
 */

export type ModuleDataSourcesRow = {
  module_key: string
  data_sources: string[]
}

/**
 * Lee los `data_sources[]` de los módulos activos del catalog DB. Memoizado
 * in-process por 5 minutos para evitar roundtrip per request en hot paths.
 * Mismo orden de magnitud que TASK-611 capabilities_registry cache.
 */
let cache: { rows: ModuleDataSourcesRow[]; expiresAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

export const listActiveModuleDataSources = async (): Promise<ModuleDataSourcesRow[]> => {
  const now = Date.now()

  if (cache && cache.expiresAt > now) {
    return cache.rows
  }

  const rows = await query<ModuleDataSourcesRow>(`
    SELECT module_key, data_sources
    FROM greenhouse_client_portal.modules
    WHERE effective_to IS NULL
    ORDER BY module_key
  `)

  cache = { rows, expiresAt: now + CACHE_TTL_MS }

  return rows
}

/**
 * Test helper — fuerza re-fetch en próximo call. Solo para tests + admin
 * endpoints.
 */
export const __clearModuleDataSourcesCache = () => {
  cache = null
}

export type DataSourcesParityReport = {
  /** `true` si DB ⊆ TS union (la única condición strict V1.0). */
  inSync: boolean

  /** Values que aparecen en seed DB pero NO en el TS union — DRIFT BLOQUEANTE. */
  inSeedNotInUnion: string[]

  /** Values del TS union que NO aparecen en ningún seed activo — soft warning. */
  inUnionNotInSeed: string[]

  /** Cardinalidad: cuántos seed modules y cuántos values únicos en seed. */
  seedModuleCount: number
  uniqueSeedValueCount: number
  unionValueCount: number
}

/**
 * Compara los `data_sources[]` declarados en el seed DB contra el TS union.
 * Devuelve un reporte estructurado.
 *
 * `inSync = true` significa: cada value que aparece en algún seed module
 * activo está en el TS union. `inUnionNotInSeed` es un set informativo
 * (soft warning) — values del union reservados para módulos futuros.
 */
export const compareDataSourcesParity = (
  seedRows: readonly ModuleDataSourcesRow[],
  unionValues: readonly ClientPortalDataSource[]
): DataSourcesParityReport => {
  const unionSet = new Set<string>(unionValues)
  const seedValuesSet = new Set<string>()

  for (const row of seedRows) {
    for (const value of row.data_sources) {
      seedValuesSet.add(value)
    }
  }

  const inSeedNotInUnion: string[] = []
  const inUnionNotInSeed: string[] = []

  for (const value of seedValuesSet) {
    if (!unionSet.has(value)) {
      inSeedNotInUnion.push(value)
    }
  }

  for (const value of unionSet) {
    if (!seedValuesSet.has(value)) {
      inUnionNotInSeed.push(value)
    }
  }

  return {
    inSync: inSeedNotInUnion.length === 0,
    inSeedNotInUnion: inSeedNotInUnion.sort(),
    inUnionNotInSeed: inUnionNotInSeed.sort(),
    seedModuleCount: seedRows.length,
    uniqueSeedValueCount: seedValuesSet.size,
    unionValueCount: unionSet.size
  }
}

/**
 * Lista canónica del TS union. Importar el type directo no es posible en
 * runtime (las type unions se borran a JS), así que mantenemos esta lista
 * en sincronía manual con `reader-meta.ts`. Si el union cambia, el test
 * `parity.test.ts` con fixture inline detecta el drift en unit-time.
 *
 * **NUNCA** divergir esta lista de `ClientPortalDataSource` del TS union.
 * El parity test live verifica que DB seed ⊆ esta lista; pero la lista
 * misma DEBE ser idéntica al TS union.
 */
export const CLIENT_PORTAL_DATA_SOURCE_VALUES = [
  'commercial.engagements',
  'commercial.deals',
  'commercial.quotes',
  'finance.invoices',
  'finance.payments',
  'agency.ico',
  'agency.csc',
  'agency.brand_intelligence',
  'agency.creative_hub',
  'agency.revenue_enabled',
  'agency.pulse',
  'account_360.summary',
  'account_360.economics',
  'delivery.tasks',
  'delivery.projects',
  'assigned_team.assignments',
  'identity.organizations'
] as const satisfies readonly ClientPortalDataSource[]

/**
 * Lee DB + compara contra el TS union. Devuelve el parity report.
 * Usado por el live test en CI y por el (futuro) admin readiness endpoint.
 */
export const checkDataSourcesParity = async (): Promise<DataSourcesParityReport> => {
  const seedRows = await listActiveModuleDataSources()

  return compareDataSourcesParity(seedRows, CLIENT_PORTAL_DATA_SOURCE_VALUES)
}
