import 'server-only'

import { readCommercialCostAttributionByClientForPeriod } from '@/lib/commercial-cost-attribution/member-period-attribution'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

// ── Types ──

export interface ClientLaborCost {
  clientId: string
  clientName: string
  allocatedLaborClp: number
  headcountFte: number
  memberCount: number
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
  const rows = await readCommercialCostAttributionByClientForPeriod(year, month)

  return rows.map(row => ({
    clientId: row.clientId,
    clientName: row.clientName,
    allocatedLaborClp: roundCurrency(toNumber(row.laborCostClp)),
    headcountFte: Math.round(toNumber(row.headcountFte) * 100) / 100,
    memberCount: toNumber(row.memberCount)
  }))
}
