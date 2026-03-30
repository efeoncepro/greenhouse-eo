import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

// ── Types ──

export interface ClientLaborCost {
  clientId: string
  clientName: string
  allocatedLaborClp: number
  headcountFte: number
  memberCount: number
}

type LaborCostRow = {
  client_id: string
  client_name: string
  allocated_labor_clp: string | number
  headcount_fte: string | number
  headcount_members: string | number
}

// ── Engine ──

/**
 * Computes FTE-weighted payroll cost allocation per client for a given period.
 *
 * Uses approved/exported payroll entries and active commercial
 * client_team_assignments to proportionally distribute each member's gross
 * payroll across their assigned clients by fte_allocation weight.
 *
 * Internal operational workspaces like `space-efeonce` are excluded from this
 * bridge so they do not compete as commercial clients in Finance / Cost
 * Intelligence. Members with no active commercial assignments are excluded
 * (their cost is unallocated overhead).
 */
export const computeClientLaborCosts = async (
  year: number,
  month: number
): Promise<ClientLaborCost[]> => {
  const rows = await runGreenhousePostgresQuery<LaborCostRow>(
    `SELECT
       client_id,
       client_name,
       SUM(allocated_labor_clp) AS allocated_labor_clp,
       SUM(fte_contribution) AS headcount_fte,
       COUNT(DISTINCT member_id) AS headcount_members
     FROM greenhouse_serving.client_labor_cost_allocation
     WHERE period_year = $1 AND period_month = $2
       AND allocated_labor_clp IS NOT NULL
     GROUP BY client_id, client_name
     ORDER BY SUM(allocated_labor_clp) DESC`,
    [year, month]
  )

  return rows.map(row => ({
    clientId: row.client_id,
    clientName: row.client_name,
    allocatedLaborClp: roundCurrency(toNumber(row.allocated_labor_clp)),
    headcountFte: Math.round(toNumber(row.headcount_fte) * 100) / 100,
    memberCount: toNumber(row.headcount_members)
  }))
}
