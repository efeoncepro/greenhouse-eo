import 'server-only'

import { getPreferredMemberActualCostBasis } from '@/lib/commercial-cost-basis/people-role-cost-basis'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { PersonCostFacet, FacetFetchContext } from '@/types/person-complete-360'

type AllocationRow = {
  client_id: string
  client_name: string
  organization_name: string | null
  fte_contribution: string | number
  commercial_labor_cost_target: string | number
  period_year: string | number
  period_month: string | number
}

const toNum = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullNum = (value: unknown): number | null => {
  if (value == null) return null

  const parsed = toNum(value)

  return Number.isFinite(parsed) ? parsed : null
}

export const fetchCostsFacet = async (ctx: FacetFetchContext): Promise<PersonCostFacet | null> => {
  if (!ctx.memberId) return null

  const allocationLimit = ctx.limit ?? 20
  const asOfDate = ctx.asOf ? new Date(ctx.asOf) : null

  const actualCost = await getPreferredMemberActualCostBasis(ctx.memberId, {
    year: asOfDate ? asOfDate.getFullYear() : null,
    month: asOfDate ? asOfDate.getMonth() + 1 : null
  }).catch(() => null)

  const allocationRows = await runGreenhousePostgresQuery<AllocationRow>(
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

  return {
    currentPeriod: actualCost
      ? {
          year: actualCost.periodYear,
          month: actualCost.periodMonth,
          loadedCostTarget: toNum(actualCost.loadedCostAmount),
          laborCostTarget: toNum(actualCost.totalLaborCostAmount),
          directOverhead: toNum(actualCost.directOverheadAmount),
          sharedOverhead: toNum(actualCost.sharedOverheadAmount),
          costPerHour: toNullNum(actualCost.costPerHourAmount),
          utilizationPct: null,
          capacityHealth: null,
          contractedHours: toNullNum(actualCost.contractedHours),
          assignedHours: null,
          usedHours: null,
          periodClosed: false
        }
      : null,
    allocationsBySpace: allocationRows.map(row => ({
      clientId: row.client_id,
      clientName: row.client_name,
      organizationName: row.organization_name,
      fteContribution: toNum(row.fte_contribution),
      commercialLoadedCost: toNum(row.commercial_labor_cost_target),
      periodYear: toNum(row.period_year),
      periodMonth: toNum(row.period_month)
    }))
  }
}
