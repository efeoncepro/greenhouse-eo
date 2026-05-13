import 'server-only'

import { query } from '@/lib/db'
import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'

/**
 * TASK-827 Slice 0 — Client Portal `view_codes[]` parity helpers (TS ↔ DB).
 *
 * El registry TS `VIEW_REGISTRY` (`src/lib/admin/view-access-catalog.ts`,
 * TASK-136 + extended TASK-827) es la **single source of truth** del catalog
 * de view codes que el portal cliente puede declarar. La columna
 * `greenhouse_client_portal.modules.view_codes TEXT[]` (TASK-824 seed) es la
 * persistencia declarativa: cada seed module declara qué `cliente.*` view
 * codes expone al portal.
 *
 * Este parity test compara los dos catalogs y falla loud si emerge drift:
 *
 *   - DB tiene un `cliente.*` viewCode en algún `modules.view_codes[]` que NO
 *     está en `VIEW_REGISTRY` → DRIFT BLOQUEANTE (el seed declara surface no
 *     registrada; TASK-827 Slice 0 materializó los 11 forward-looking que
 *     spec V1.4 §5.5 declaró, así que el steady esperado es seed ⊆ registry).
 *   - VIEW_REGISTRY declara un `cliente.*` que NO aparece en ningún seed
 *     activo → soft warning informativo. Hay entries legacy `cliente.ciclos`,
 *     `cliente.configuracion`, `cliente.analytics`, `cliente.actualizaciones`,
 *     `cliente.modulos`, `cliente.notificaciones`, `cliente.revisiones` que
 *     NO están en ningún seed module porque son surfaces transversales (Mi
 *     Cuenta) o legacy duplicates (revisiones↔reviews) — coexisten
 *     deliberadamente.
 *
 * Patrón fuente: `src/lib/client-portal/data-sources/parity.ts` (TASK-824
 * Slice 2) + `src/lib/capabilities-registry/parity.ts` (TASK-611).
 *
 * Spec arquitectónica V1.4 §5.5 declara este contract; TASK-827 Slice 0 lo
 * cierra implementacionalmente.
 */

export type ModuleViewCodesRow = {
  module_key: string
  view_codes: string[]
}

/**
 * Lee los `view_codes[]` de los módulos activos del catalog DB. Memoizado
 * in-process por 5 minutos para evitar roundtrip per request en hot paths.
 * Mismo orden de magnitud que TASK-824 data_sources cache.
 */
let cache: { rows: ModuleViewCodesRow[]; expiresAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

export const listActiveModuleViewCodes = async (): Promise<ModuleViewCodesRow[]> => {
  const now = Date.now()

  if (cache && cache.expiresAt > now) {
    return cache.rows
  }

  const rows = await query<ModuleViewCodesRow>(`
    SELECT module_key, view_codes
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
export const __clearModuleViewCodesCache = () => {
  cache = null
}

export type ViewCodesParityReport = {
  /** `true` si DB seed `cliente.*` ⊆ VIEW_REGISTRY `cliente.*` (la única condición strict V1.0). */
  inSync: boolean

  /** ViewCodes que aparecen en seed DB pero NO en VIEW_REGISTRY — DRIFT BLOQUEANTE. */
  inSeedNotInRegistry: string[]

  /** ViewCodes del registry que NO aparecen en ningún seed activo — soft warning informativo. */
  inRegistryNotInSeed: string[]

  /** Cardinalidad: cuántos seed modules y cuántos values únicos en seed. */
  seedModuleCount: number
  uniqueSeedViewCodeCount: number
  registryViewCodeCount: number
}

/**
 * Lista canónica de `cliente.*` viewCodes en el TS `VIEW_REGISTRY`.
 *
 * Extraída en runtime de `VIEW_REGISTRY` (filter por `routeGroup === 'client'`)
 * para que cualquier cambio en el registry se refleje automáticamente sin
 * mantener una lista paralela manual. Esto es distinto del pattern TASK-824
 * `CLIENT_PORTAL_DATA_SOURCE_VALUES` (lista paralela) porque aquí el source
 * canonical YA está tipado en el registry — no necesitamos un mirror.
 */
export const getClientPortalViewCodesFromRegistry = (): readonly string[] =>
  VIEW_REGISTRY.filter(entry => entry.routeGroup === 'client').map(entry => entry.viewCode)

/**
 * Compara los `view_codes[]` declarados en el seed DB contra el VIEW_REGISTRY.
 * Devuelve un reporte estructurado.
 *
 * Solo considera viewCodes que empiezan con `cliente.` — los seed pueden
 * declarar otros prefixes (futuros), pero el parity strict V1.0 cubre
 * únicamente client-facing.
 *
 * `inSync = true` significa: cada `cliente.*` viewCode en algún seed module
 * activo está en VIEW_REGISTRY con `routeGroup='client'`. `inRegistryNotInSeed`
 * es un set informativo — viewCodes de surfaces transversales (Mi Cuenta) o
 * coexistencia legacy (revisiones↔reviews) que NO necesitan estar en ningún
 * módulo.
 */
export const compareViewCodesParity = (
  seedRows: readonly ModuleViewCodesRow[],
  registryViewCodes: readonly string[]
): ViewCodesParityReport => {
  const registrySet = new Set<string>(registryViewCodes)
  const seedClientViewCodes = new Set<string>()

  for (const row of seedRows) {
    for (const viewCode of row.view_codes) {
      if (viewCode.startsWith('cliente.')) {
        seedClientViewCodes.add(viewCode)
      }
    }
  }

  const inSeedNotInRegistry: string[] = []
  const inRegistryNotInSeed: string[] = []

  for (const viewCode of seedClientViewCodes) {
    if (!registrySet.has(viewCode)) {
      inSeedNotInRegistry.push(viewCode)
    }
  }

  for (const viewCode of registrySet) {
    if (!seedClientViewCodes.has(viewCode)) {
      inRegistryNotInSeed.push(viewCode)
    }
  }

  return {
    inSync: inSeedNotInRegistry.length === 0,
    inSeedNotInRegistry: inSeedNotInRegistry.sort(),
    inRegistryNotInSeed: inRegistryNotInSeed.sort(),
    seedModuleCount: seedRows.length,
    uniqueSeedViewCodeCount: seedClientViewCodes.size,
    registryViewCodeCount: registrySet.size
  }
}

/**
 * Lee DB + compara contra el TS registry. Devuelve el parity report.
 * Usado por el live test en CI y por (futuros) admin readiness endpoints.
 */
export const checkViewCodesParity = async (): Promise<ViewCodesParityReport> => {
  const seedRows = await listActiveModuleViewCodes()

  return compareViewCodesParity(seedRows, getClientPortalViewCodesFromRegistry())
}
