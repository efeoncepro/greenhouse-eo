import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface CapacityRow extends Record<string, unknown> {
  member_id: string
  period_key: string
  base_salary_clp: string | number
  total_bonus_clp: string | number
  total_allowance_clp: string | number
  loaded_cost_target: string | number
  direct_overhead_clp: string | number
  shared_overhead_clp: string | number
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
    directOverheadClp: number
    sharedOverheadClp: number
    totalFte: number
    periodKey: string
  } | null = null

  try {
    const rows = await runGreenhousePostgresQuery<CapacityRow>(
      `SELECT member_id, period_key, base_salary_clp, total_bonus_clp, total_allowance_clp,
              loaded_cost_target, direct_overhead_clp, shared_overhead_clp, total_fte
       FROM greenhouse_serving.member_capacity_economics
       WHERE member_id = $1
       ORDER BY period_key DESC
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
        directOverheadClp: roundCurrency(toNumber(r.direct_overhead_clp)),
        sharedOverheadClp: roundCurrency(toNumber(r.shared_overhead_clp)),
        totalFte: toNumber(r.total_fte),
        periodKey: String(r.period_key)
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
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const rows = await runGreenhousePostgresQuery<AssignmentRevenueRow>(
      `SELECT
         a.client_id,
         c.client_name,
         a.fte_allocation AS fte_weight,
         COALESCE(
           (SELECT SUM(i.total_amount_clp)
            FROM greenhouse_finance.income i
            WHERE i.client_id = a.client_id
              AND EXTRACT(YEAR FROM i.invoice_date) = $2
              AND EXTRACT(MONTH FROM i.invoice_date) = $3
           ), 0
         ) * COALESCE(a.fte_allocation, 0) AS revenue_clp
       FROM greenhouse_core.client_team_assignments a
       LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
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
