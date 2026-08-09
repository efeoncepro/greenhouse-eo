import 'server-only'

import { query } from '@/lib/db'
import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'
import { CLIENT_PORTAL_BASE_VIEW_CODES } from '@/lib/client-portal/readers/native/module-resolver'

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
 *   - VIEW_REGISTRY declara una surface module-gated que NO aparece en ningún
 *     seed activo → DRIFT BLOQUEANTE. Solo las superficies transversales
 *     allowlisted pueden existir fuera de un módulo.
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
  /** `true` si DB seed y registry module-gated están alineados. */
  inSync: boolean

  /** ViewCodes que aparecen en seed DB pero NO en VIEW_REGISTRY — DRIFT BLOQUEANTE. */
  inSeedNotInRegistry: string[]

  /** ViewCodes del registry que NO aparecen en ningún seed activo. */
  inRegistryNotInSeed: string[]

  /** Registry entries que requieren seed de módulo y no lo tienen — drift bloqueante. */
  unseededModuleViewCodes: string[]

  /** Cardinalidad: cuántos seed modules y cuántos values únicos en seed. */
  seedModuleCount: number
  uniqueSeedViewCodeCount: number
  registryViewCodeCount: number
}

/**
 * Surfaces del route group cliente que el parity test exime de pertenecer a un módulo
 * vendible. Toda surface nueva debe entrar al seed del módulo.
 *
 * TASK-1679 — el set era plano y eso escondía tres situaciones muy distintas bajo la misma
 * exención. Un viewCode acá adentro no es "está bien": es "el parity test no lo va a
 * marcar". Separarlas hace legible qué es diseño y qué es deuda.
 */

/**
 * **Base del portal**: alcanzables sin módulo, por diseño. Un cliente no contrata ver sus
 * notificaciones ni entrar a su propia configuración.
 *
 * Es el mismo set que `CLIENT_PORTAL_BASE_VIEW_CODES` del resolver, importado en vez de
 * duplicado: si se desincronizaran, la allowlist de runtime y la de governance dirían cosas
 * distintas sobre la misma vista.
 */
const BASE_VIEW_CODES = CLIENT_PORTAL_BASE_VIEW_CODES

/**
 * 🔴 **Deuda, no diseño.** Son superficies de delivery que **deberían** estar gobernadas por
 * módulo y hoy ningún módulo las declara, así que están **inalcanzables**: el guard pregunta
 * si algún módulo las expone y nadie lo hace.
 *
 * Están exentas del parity test sólo para no dejar el gate rojo por deuda preexistente. La
 * salida correcta es declararlas en el módulo que corresponda —`creative_hub_globe_v1` es el
 * candidato natural— y sacarlas de acá. Decisión del operador 2026-08-09: NO son base,
 * porque Creative pertenece a un solo cliente y dejarlas base le daría a los demás páginas
 * permanentemente vacías.
 */
const PENDING_MODULE_DECLARATION_VIEW_CODES = ['cliente.ciclos', 'cliente.analytics']

/**
 * **Retirados**: superseded por otro viewCode. El registry es append-only, así que la entrada
 * se marca y no se borra — pero ya no la gatea ninguna ruta.
 *
 * `cliente.revisiones` quedó superseded por `cliente.reviews`, que es el que declara
 * `creative_hub_globe_v1`. Eran dos strings distintos para `/reviews`: el guard pedía el
 * primero y el módulo declaraba el segundo, así que la página no podía abrir ni con la llave
 * correcta.
 */
const RETIRED_VIEW_CODES = ['cliente.revisiones']

export const CLIENT_PORTAL_TRANSVERSAL_VIEW_CODES = new Set([
  ...BASE_VIEW_CODES,
  ...PENDING_MODULE_DECLARATION_VIEW_CODES,
  ...RETIRED_VIEW_CODES,

  // El listado de módulos del propio cliente: es meta-superficie del portal, no un producto.
  'cliente.modulos'
])

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
 * `inSync = true` significa: cada `cliente.*` seeded existe en el registry y
 * cada registry entry module-gated está seeded. Las excepciones están
 * centralizadas en `CLIENT_PORTAL_TRANSVERSAL_VIEW_CODES`.
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
  const unseededModuleViewCodes: string[] = []

  for (const viewCode of seedClientViewCodes) {
    if (!registrySet.has(viewCode)) {
      inSeedNotInRegistry.push(viewCode)
    }
  }

  for (const viewCode of registrySet) {
    if (!seedClientViewCodes.has(viewCode)) {
      inRegistryNotInSeed.push(viewCode)

      if (!CLIENT_PORTAL_TRANSVERSAL_VIEW_CODES.has(viewCode)) {
        unseededModuleViewCodes.push(viewCode)
      }
    }
  }

  return {
    inSync: inSeedNotInRegistry.length === 0 && unseededModuleViewCodes.length === 0,
    inSeedNotInRegistry: inSeedNotInRegistry.sort(),
    inRegistryNotInSeed: inRegistryNotInSeed.sort(),
    unseededModuleViewCodes: unseededModuleViewCodes.sort(),
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
