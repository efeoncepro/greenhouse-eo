import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ClientPortalReaderMeta } from '../../dto/reader-meta'
import type {
  AssignmentSource,
  ResolvedAssignmentStatus,
  ResolvedClientPortalModule
} from '../../dto/module'

/**
 * TASK-825 Slice 2 — Resolver canónico del Client Portal BFF.
 *
 * **Single source of truth** para qué módulos ve un cliente.
 *
 * Toda surface client-facing (menú dinámico, page guards, API gates, admin
 * listing) consume este resolver — NUNCA lee `tenant_capabilities`,
 * `business_line`, ni `tenant_type` directo para decidir visibilidad.
 *
 * ## Primer reader **native** del BFF
 *
 * Per TASK-822 V1.1 §3.1, los readers del client_portal se clasifican en:
 *
 *   - `curated` — re-export de un reader que vive en un dominio productor
 *     (account-360, agency, ico-engine, ...). El BFF surfacea pero NO posee.
 *   - `native` — nace acá porque no hay dominio productor que lo posea.
 *
 * Este resolver es **native** porque `module_assignments` + `modules` viven
 * en `greenhouse_client_portal` (owned by el BFF mismo, NO un dominio productor).
 *
 * ## Filtros canónicos
 *
 *   - `a.effective_to IS NULL` — assignment activo (no superseded)
 *   - `m.effective_to IS NULL` — módulo NO deprecated (post-assignment); FK
 *     enforce que orphan module_key es imposible — lo que se filtra es
 *     deprecated.
 *   - `status IN ('active','pilot')` por default; `'pending'` opt-in via
 *     `includePending=true` (admin UI).
 *   - `expires_at IS NULL OR expires_at > now()` — pilot NO expirado.
 *
 * ## Read-only — NO side effects
 *
 * El resolver corre en el hot path de page loads del portal cliente.
 * **NO emite reliability signals desde acá** (anti-pattern: read + side
 * effects + signal duplicate + overhead I/O). Los signals dedicados
 * (`assignment.deprecated_module_referenced`, `pilot_expired_not_actioned`,
 * etc.) los implementa TASK-829 con readers cron-paced en
 * `src/lib/reliability/queries/`.
 *
 * ## Cache TTL 60s in-process
 *
 * Pattern mirror de TASK-780 `src/lib/home/rollout-flags.ts`. Map keyed por
 * `organizationId`. Invalidador exportado para uso desde commands TASK-826
 * post mutation (`__clearClientPortalResolverCache(orgId)`).
 *
 * `includePending=true` bypassea el cache porque admin UI requiere data
 * fresca para gestión; cliente requiere data optimizada para lectura. Dos
 * contratos sin acoplar.
 *
 * Spec V1.4 §6 documenta el contract canónico.
 */

// ─────────────────────────────────────────────────────────────
// Meta declaration (TASK-822 §3.1 invariant)
// ─────────────────────────────────────────────────────────────

export const moduleResolverMeta: ClientPortalReaderMeta = {
  key: 'module-resolver',
  classification: 'native',
  ownerDomain: null,
  dataSources: ['identity.organizations'],
  clientFacing: true,
  routeGroup: 'client'
}

// ─────────────────────────────────────────────────────────────
// In-process cache (pattern TASK-780 home_rollout_flags mirror)
// ─────────────────────────────────────────────────────────────

interface CacheEntry {
  readonly data: readonly ResolvedClientPortalModule[]
  readonly expiresAt: number
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

const getCachedResolver = (orgId: string): readonly ResolvedClientPortalModule[] | null => {
  const entry = cache.get(orgId)

  if (!entry) return null

  if (entry.expiresAt < Date.now()) {
    cache.delete(orgId)

    return null
  }

  return entry.data
}

const setCachedResolver = (orgId: string, data: readonly ResolvedClientPortalModule[]): void => {
  cache.set(orgId, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Invalida el cache scoped por organizationId (o full si se omite).
 *
 * Usado por:
 *   - Commands TASK-826 (`enable/pause/resume/expire/churn`) post-mutation
 *   - Cascade consumer TASK-828 al materializar/churn assignments
 *   - Tests para forzar re-fetch
 *
 * Pattern mirror de `__clearHomeRolloutFlagCache` (TASK-780).
 */
export const __clearClientPortalResolverCache = (orgId?: string): void => {
  if (orgId) cache.delete(orgId)
  else cache.clear()
}

// ─────────────────────────────────────────────────────────────
// Resolver core
// ─────────────────────────────────────────────────────────────

type RawRow = {
  assignment_id: string
  module_key: string
  status: string
  source: string
  expires_at: Date | null
  display_label: string
  display_label_client: string
  applicability_scope: string
  tier: string
  view_codes: string[]
  capabilities: string[]
  data_sources: string[]
} & Record<string, unknown>

const SQL_BASE = `
  SELECT
    a.assignment_id, a.module_key, a.status, a.source, a.expires_at,
    m.display_label, m.display_label_client, m.applicability_scope, m.tier,
    m.view_codes, m.capabilities, m.data_sources
  FROM greenhouse_client_portal.module_assignments a
  JOIN greenhouse_client_portal.modules m ON m.module_key = a.module_key
  WHERE a.organization_id = $1
    AND a.effective_to IS NULL
    AND m.effective_to IS NULL
    AND (a.expires_at IS NULL OR a.expires_at > now())
`

const SQL_ACTIVE_ONLY = `${SQL_BASE} AND a.status IN ('active','pilot') ORDER BY m.tier, m.display_label`
const SQL_INCLUDING_PENDING = `${SQL_BASE} AND a.status IN ('active','pilot','pending') ORDER BY m.tier, m.display_label`

const toResolvedModule = (row: RawRow): ResolvedClientPortalModule => ({
  assignmentId: row.assignment_id,
  moduleKey: row.module_key,
  status: row.status as ResolvedAssignmentStatus,
  source: row.source as AssignmentSource,
  expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
  displayLabel: row.display_label,
  displayLabelClient: row.display_label_client,
  applicabilityScope: row.applicability_scope,
  tier: row.tier,
  viewCodes: row.view_codes,
  capabilities: row.capabilities,
  dataSources: row.data_sources
})

export interface ResolveModulesOptions {
  /**
   * Si `true`, incluye assignments con `status='pending'`. Bypassea el cache
   * porque admin UI requiere data fresca. Default `false` (vista cliente).
   */
  readonly includePending?: boolean

  /**
   * Si `true`, salta el cache hit incluso sin `includePending`. Útil en tests
   * o cuando un command quiere refrescar inmediato post-write sin esperar
   * al invalidador.
   */
  readonly bypassCache?: boolean
}

/**
 * Resolver canónico. Devuelve la lista de módulos visibles para una
 * organización en orden estable `(tier, display_label)`.
 *
 * Cache hit cuando `!options.bypassCache && !options.includePending`.
 */
export const resolveClientPortalModulesForOrganization = async (
  organizationId: string,
  options: ResolveModulesOptions = {}
): Promise<readonly ResolvedClientPortalModule[]> => {
  if (!options.bypassCache && !options.includePending) {
    const cached = getCachedResolver(organizationId)

    if (cached) return cached
  }

  try {
    const sql = options.includePending ? SQL_INCLUDING_PENDING : SQL_ACTIVE_ONLY
    const rows = await query<RawRow>(sql, [organizationId])
    const result: readonly ResolvedClientPortalModule[] = rows.map(toResolvedModule)

    // includePending NO se cachea (vista admin, data fresca por contract).
    if (!options.includePending) {
      setCachedResolver(organizationId, result)
    }

    return result
  } catch (err) {
    captureWithDomain(err, 'client_portal', {
      tags: { source: 'module_resolver', endpoint: 'resolve' },
      extra: { organizationId }
    })

    throw err
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers derivados (3 funciones triviales — reusan el resolver)
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve `true` si el cliente tiene un assignment activo para el módulo.
 * Cache hit warm cuando el resolver ya se llamó recientemente.
 */
export const hasModuleAccess = async (orgId: string, moduleKey: string): Promise<boolean> => {
  const modules = await resolveClientPortalModulesForOrganization(orgId)

  return modules.some(m => m.moduleKey === moduleKey)
}

/**
 * Devuelve `true` si algún módulo asignado al cliente expone el view_code.
 * Usado por page guards client-facing (TASK-827).
 */
export const hasViewCodeAccess = async (orgId: string, viewCode: string): Promise<boolean> => {
  const modules = await resolveClientPortalModulesForOrganization(orgId)

  return modules.some(m => m.viewCodes.includes(viewCode))
}

/**
 * Devuelve `true` si algún módulo asignado al cliente declara la capability.
 * Usado por API gates client-facing.
 */
export const hasCapabilityViaModule = async (orgId: string, capability: string): Promise<boolean> => {
  const modules = await resolveClientPortalModulesForOrganization(orgId)

  return modules.some(m => m.capabilities.includes(capability))
}
