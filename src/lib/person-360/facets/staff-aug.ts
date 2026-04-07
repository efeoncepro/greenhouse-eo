import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { PersonStaffAugFacet, FacetFetchContext } from '@/types/person-complete-360'

type StaffAugRow = {
  placement_id: string
  client_name: string
  organization_name: string | null
  status: string
  billing_rate: string | number | null
  billing_currency: string | null
  contract_start: string | null
  contract_end: string | null
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : null }
  
return null
}

export const fetchStaffAugFacet = async (ctx: FacetFetchContext): Promise<PersonStaffAugFacet | null> => {
  if (!ctx.memberId) return null

  // Staff augmentation placements come from assignments with specific type
  const rows = await runGreenhousePostgresQuery<StaffAugRow>(
    `SELECT
      a.assignment_id AS placement_id,
      COALESCE(c.client_name, a.client_id) AS client_name,
      o.organization_name,
      CASE WHEN a.active THEN 'active' ELSE 'inactive' END AS status,
      a.billing_rate::text,
      a.billing_currency,
      a.start_date::text AS contract_start,
      a.end_date::text AS contract_end
    FROM greenhouse_core.client_team_assignments a
    LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
    LEFT JOIN greenhouse_core.spaces s ON s.client_id = a.client_id AND s.active = TRUE
    LEFT JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id
    WHERE a.member_id = $1
      AND a.assignment_type = 'staff_augmentation'
      AND ($2::text IS NULL OR s.organization_id = $2)
    ORDER BY a.active DESC, a.start_date DESC`,
    [ctx.memberId, ctx.organizationId]
  ).catch(() => [] as StaffAugRow[])

  return {
    placements: rows.map(r => ({
      placementId: r.placement_id,
      clientName: r.client_name,
      organizationName: r.organization_name,
      status: r.status,
      billingRate: toNullNum(r.billing_rate),
      billingCurrency: r.billing_currency,
      contractStart: r.contract_start ? r.contract_start.slice(0, 10) : null,
      contractEnd: r.contract_end ? r.contract_end.slice(0, 10) : null
    })),
    activePlacementCount: rows.filter(r => r.status === 'active').length
  }
}
