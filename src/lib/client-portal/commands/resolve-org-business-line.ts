import 'server-only'

import type { Kysely, Transaction } from 'kysely'

import type { DB } from '@/types/db'

/**
 * TASK-826 Slice 1 — Resolve an organization's canonical business_lines.
 *
 * Bridge canónica (verificada live 2026-05-12):
 *
 *   organizations
 *     ↳ spaces.organization_id (greenhouse_core.spaces)
 *         ↳ spaces.client_id
 *             ↳ client_service_modules.client_id (greenhouse_core.client_service_modules)
 *                 ↳ service_modules.module_id (greenhouse_core.service_modules)
 *                     WHERE service_modules.module_kind = 'business_line'
 *
 * Filtros canónicos:
 *   - `spaces.active = true` — solo spaces vivos
 *   - `client_service_modules.active = true` — solo assignments activos
 *   - `service_modules.module_kind = 'business_line'` — excluye service_modules
 *     que son "service_module" (subordinados de un business_line)
 *
 * TASK-1852: FK verified 2026-09-09: csm.module_id -> sm.module_id.
 * The module code is the returned business-line value, not the join key.
 * An empty result signals missing canonical data; it does not authorize a
 * new service-enablement proposal.
 *
 * Multi-BL canonization (Open Question V1.1): cuando una org tenga >1
 * business_line activo, el resolver retorna el array completo y el caller
 * decide. V1.0 NO throws en multi-BL — la realidad live demuestra que es
 * posible/legítimo.
 *
 * Pattern source: queries similares en `src/lib/tenant/access.ts:302` +
 * `src/lib/agency/space-360.ts:272` + `src/lib/admin/get-admin-tenant-detail.ts:134`
 * (estos extraen business_lines inline al JOIN; este helper los centraliza
 * canónicamente).
 */

type DbLike = Kysely<DB> | Transaction<DB>

interface BusinessLineRow {
  module_code: string
}

/**
 * Returns the array of active canonical business_lines for an organization.
 *
 * Empty array means either:
 *   - The org has NO spaces with active clients linked to active business_line
 *     service modules.
 *   - The data is still in legacy `tenant_capabilities.businessLines[]` and
 *     hasn't been migrated to `client_service_modules` yet.
 *
 * Callers must tolerate the empty case (skip check + log honest).
 */
export const resolveOrganizationCanonicalBusinessLines = async (
  organizationId: string,
  tx: DbLike
): Promise<readonly string[]> => {
  const rows = await tx
    .selectFrom('greenhouse_core.spaces as s')
    .innerJoin('greenhouse_core.client_service_modules as csm', join =>
      join.onRef('csm.client_id', '=', 's.client_id').on('csm.active', '=', true)
    )
    .innerJoin('greenhouse_core.service_modules as sm', join =>
      join.onRef('sm.module_id', '=', 'csm.module_id').on('sm.module_kind', '=', 'business_line')
    )
    .select('sm.module_code')
    .where('s.organization_id', '=', organizationId)
    .where('s.active', '=', true)
    .distinct()
    .execute()

  return rows.map((row: BusinessLineRow) => row.module_code).sort()
}
