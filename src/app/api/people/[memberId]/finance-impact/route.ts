import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface CapacityRow extends Record<string, unknown> {
  member_id: string
  period_year: string | number
  period_month: string | number
  closure_status: string | null
  period_closed: boolean | null
  base_salary_clp: string | number
  total_bonus_clp: string | number
  total_allowance_clp: string | number
  loaded_cost_target: string | number
  total_labor_cost_target: string | number | null
  direct_overhead_target: string | number
  shared_overhead_target: string | number
  total_fte: string | number
}

interface AssignmentRevenueRow extends Record<string, unknown> {
  client_id: string
  client_name: string | null
  fte_weight: string | number
  revenue_clp: string | number
}

/**
 * GET /api/people/[memberId]/finance-impact
 *
 * Returns the financial impact of a team member:
 * - Monthly cost breakdown (salary, bonus, allowance, overhead)
 * - Loaded cost target
 * - Revenue attributed via FTE-weighted client assignments
 * - Cost/revenue ratio
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { memberId } = await params

  // Get latest capacity economics for this member
  let costData: {
    baseSalaryClp: number
    totalBonusClp: number
    totalAllowanceClp: number
    loadedCostTarget: number
    laborCostTarget: number
    directOverheadClp: number
    sharedOverheadClp: number
    totalFte: number
    periodYear: number
    periodMonth: number
    closureStatus: string | null
    periodClosed: boolean
  } | null = null

  try {
    const rows = await runGreenhousePostgresQuery<CapacityRow>(
      `SELECT
         mce.member_id,
         mce.period_year,
         mce.period_month,
         pcs.closure_status,
         COALESCE(pcs.closure_status = 'closed', FALSE) AS period_closed,
         mce.base_salary_clp,
         mce.total_bonus_clp,
         mce.total_allowance_clp,
         mce.loaded_cost_target,
         mce.total_labor_cost_target,
         mce.direct_overhead_target,
         mce.shared_overhead_target,
         mce.total_fte
       FROM greenhouse_serving.member_capacity_economics mce
       LEFT JOIN greenhouse_serving.period_closure_status pcs
         ON pcs.period_year = mce.period_year
        AND pcs.period_month = mce.period_month
       WHERE mce.member_id = $1
       ORDER BY mce.period_year DESC, mce.period_month DESC
       LIMIT 1`,
      [memberId]
    )

    if (rows[0]) {
      const r = rows[0]

      costData = {
        baseSalaryClp: roundCurrency(toNumber(r.base_salary_clp)),
        totalBonusClp: roundCurrency(toNumber(r.total_bonus_clp)),
        totalAllowanceClp: roundCurrency(toNumber(r.total_allowance_clp)),
        loadedCostTarget: roundCurrency(toNumber(r.loaded_cost_target)),
        laborCostTarget: roundCurrency(toNumber(r.total_labor_cost_target)),
        directOverheadClp: roundCurrency(toNumber(r.direct_overhead_target)),
        sharedOverheadClp: roundCurrency(toNumber(r.shared_overhead_target)),
        totalFte: toNumber(r.total_fte),
        periodYear: toNumber(r.period_year),
        periodMonth: toNumber(r.period_month),
        closureStatus: r.closure_status ? String(r.closure_status) : null,
        periodClosed: r.period_closed === true
      }
    }
  } catch {
    // member_capacity_economics may not exist or member may not have data
  }

  // Get revenue attributed via FTE-weighted assignments
  let assignmentRevenue: Array<{
    clientId: string
    clientName: string | null
    fteWeight: number
    revenueClp: number
  }> = []

  try {
    const now = new Date()
    const year = costData?.periodYear ?? now.getFullYear()
    const month = costData?.periodMonth ?? (now.getMonth() + 1)

    const rows = await runGreenhousePostgresQuery<AssignmentRevenueRow>(
      `WITH latest_client_snapshots AS (
         SELECT
           ops.scope_id AS client_id,
           ops.revenue_clp,
           ROW_NUMBER() OVER (
             PARTITION BY ops.scope_id, ops.period_year, ops.period_month
             ORDER BY ops.snapshot_revision DESC, ops.materialized_at DESC NULLS LAST
           ) AS revision_rank
         FROM greenhouse_serving.operational_pl_snapshots ops
         WHERE ops.scope_type = 'client'
           AND ops.period_year = $2
           AND ops.period_month = $3
       )
       SELECT
         a.client_id,
         c.client_name,
         a.fte_allocation AS fte_weight,
         COALESCE(s.revenue_clp, 0) * COALESCE(a.fte_allocation, 0) AS revenue_clp
       FROM greenhouse_core.client_team_assignments a
       LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
       LEFT JOIN latest_client_snapshots s
         ON s.client_id = a.client_id
        AND s.revision_rank = 1
       WHERE a.member_id = $1
         AND a.active = TRUE
       ORDER BY revenue_clp DESC`,
      [memberId, year, month]
    )

    assignmentRevenue = rows.map(r => ({
      clientId: String(r.client_id),
      clientName: r.client_name ? String(r.client_name) : null,
      fteWeight: toNumber(r.fte_weight),
      revenueClp: roundCurrency(toNumber(r.revenue_clp))
    }))
  } catch {
    // Assignments or income tables may not be available
  }

  const totalRevenueAttributed = roundCurrency(assignmentRevenue.reduce((sum, a) => sum + a.revenueClp, 0))
  const totalCost = costData?.loadedCostTarget ?? 0

  const costRevenueRatio = totalRevenueAttributed > 0
    ? Math.round((totalCost / totalRevenueAttributed) * 1000) / 10
    : null

  return NextResponse.json({
    memberId,
    cost: costData,
    assignments: {
      count: assignmentRevenue.length,
      items: assignmentRevenue,
      totalRevenueAttributed
    },
    costRevenueRatio,
    costRevenueStatus: costRevenueRatio === null
      ? 'no_data'
      : costRevenueRatio <= 40 ? 'optimal'
        : costRevenueRatio <= 70 ? 'attention'
          : 'critical'
  })
}
