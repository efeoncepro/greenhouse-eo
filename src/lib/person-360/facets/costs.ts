import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { PersonCostFacet, FacetFetchContext } from '@/types/person-complete-360'

type CostSnapshotRow = {
  period_year: string | number
  period_month: string | number
  loaded_cost_target: string | number | null
  total_labor_cost_target: string | number | null
  direct_overhead_target: string | number | null
  shared_overhead_target: string | number | null
  cost_per_hour_target: string | number | null
  utilization_pct: string | number | null
  capacity_health: string | null
  contracted_hours: string | number | null
  assigned_hours: string | number | null
  used_hours: string | number | null
  closure_status: string | null
  period_closed: boolean | null
}

type AllocationRow = {
  client_id: string
  client_name: string
  organization_name: string | null
  fte_contribution: string | number
  commercial_labor_cost_target: string | number
  period_year: string | number
  period_month: string | number
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = toNum(v)

  
return Number.isFinite(n) ? n : null
}

export const fetchCostsFacet = async (ctx: FacetFetchContext): Promise<PersonCostFacet | null> => {
  if (!ctx.memberId) return null

  // Build temporal filter
  let periodFilter = ''
  const snapshotParams: unknown[] = [ctx.memberId]

  if (ctx.asOf) {
    const d = new Date(ctx.asOf)

    periodFilter = 'AND mce.period_year = $2 AND mce.period_month = $3'
    snapshotParams.push(d.getFullYear(), d.getMonth() + 1)
  }

  const allocationLimit = ctx.limit ?? 20

  const [snapshotRows, allocationRows] = await Promise.all([
    runGreenhousePostgresQuery<CostSnapshotRow>(
      `SELECT
        mce.period_year,
        mce.period_month,
        mce.loaded_cost_target,
        mce.total_labor_cost_target,
        mce.direct_overhead_target,
        mce.shared_overhead_target,
        mce.cost_per_hour_target,
        mce.utilization_pct,
        mce.capacity_health,
        mce.contracted_hours,
        mce.assigned_hours,
        mce.used_hours,
        pcs.closure_status,
        COALESCE(pcs.closure_status = 'closed', FALSE) AS period_closed
      FROM greenhouse_serving.member_capacity_economics mce
      LEFT JOIN greenhouse_serving.period_closure_status pcs
        ON pcs.period_year = mce.period_year
        AND pcs.period_month = mce.period_month
      WHERE mce.member_id = $1
        ${periodFilter}
      ORDER BY mce.period_year DESC, mce.period_month DESC
      LIMIT 1`,
      snapshotParams
    ).catch(() => [] as CostSnapshotRow[]),

    runGreenhousePostgresQuery<AllocationRow>(
      `SELECT
        cca.client_id,
        cca.client_name,
        o.organization_name,
        cca.fte_contribution,
        cca.commercial_labor_cost_target,
        cca.period_year,
        cca.period_month
      FROM greenhouse_serving.commercial_cost_attribution cca
      LEFT JOIN greenhouse_core.spaces sp ON sp.client_id = cca.client_id AND sp.active = TRUE
      LEFT JOIN greenhouse_core.organizations o ON o.organization_id = sp.organization_id
      WHERE cca.member_id = $1
        AND ($2::text IS NULL OR COALESCE(cca.organization_id, sp.organization_id) = $2)
      ORDER BY cca.period_year DESC, cca.period_month DESC, cca.commercial_labor_cost_target DESC
      LIMIT $3`,
      [ctx.memberId, ctx.organizationId, allocationLimit]
    ).catch(() => [] as AllocationRow[])
  ])

  const snapshot = snapshotRows[0]

  return {
    currentPeriod: snapshot
      ? {
          year: toNum(snapshot.period_year),
          month: toNum(snapshot.period_month),
          loadedCostTarget: toNum(snapshot.loaded_cost_target),
          laborCostTarget: toNum(snapshot.total_labor_cost_target),
          directOverhead: toNum(snapshot.direct_overhead_target),
          sharedOverhead: toNum(snapshot.shared_overhead_target),
          costPerHour: toNullNum(snapshot.cost_per_hour_target),
          utilizationPct: toNullNum(snapshot.utilization_pct),
          capacityHealth: snapshot.capacity_health,
          contractedHours: toNullNum(snapshot.contracted_hours),
          assignedHours: toNullNum(snapshot.assigned_hours),
          usedHours: toNullNum(snapshot.used_hours),
          periodClosed: snapshot.period_closed === true
        }
      : null,
    allocationsBySpace: allocationRows.map(r => ({
      clientId: r.client_id,
      clientName: r.client_name,
      organizationName: r.organization_name,
      fteContribution: toNum(r.fte_contribution),
      commercialLoadedCost: toNum(r.commercial_labor_cost_target),
      periodYear: toNum(r.period_year),
      periodMonth: toNum(r.period_month)
    }))
  }
}
