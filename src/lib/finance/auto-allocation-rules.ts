import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

/**
 * Auto-allocation rules for expenses.
 *
 * These rules determine how to automatically allocate an expense to one
 * or more clients when the expense doesn't have an explicit allocation.
 *
 * Rules are checked in order — first match wins:
 * 1. Payroll expense with member_id → allocate to member's clients by FTE weight
 * 2. Infrastructure expense → distribute across all active clients by revenue weight
 * 3. Direct expense with client_id → already allocated (no-op)
 * 4. Unallocated → leave as overhead (no auto-allocation)
 */

export interface AutoAllocationResult {
  expenseId: string
  ruleApplied: string | null
  allocations: Array<{
    clientId: string
    allocationPercent: number
    allocatedAmountClp: number
    method: string
  }>
}

// ── Rule 1: Payroll by FTE weight ──

const allocatePayrollByFte = async (
  expenseId: string,
  memberId: string,
  totalAmountClp: number
): Promise<AutoAllocationResult | null> => {
  const assignments = await runGreenhousePostgresQuery<{
    client_id: string
    fte_allocation: string | number
  } & Record<string, unknown>>(
    `SELECT client_id, fte_allocation
     FROM greenhouse_core.client_team_assignments
     WHERE member_id = $1 AND active = TRUE AND fte_allocation > 0`,
    [memberId]
  )

  if (assignments.length === 0) return null

  const totalFte = assignments.reduce((sum, a) => sum + toNumber(a.fte_allocation), 0)

  if (totalFte <= 0) return null

  return {
    expenseId,
    ruleApplied: 'payroll_by_fte',
    allocations: assignments.map(a => {
      const fteWeight = toNumber(a.fte_allocation) / totalFte
      const allocatedAmount = roundCurrency(totalAmountClp * fteWeight)

      return {
        clientId: String(a.client_id),
        allocationPercent: Math.round(fteWeight * 1000) / 10,
        allocatedAmountClp: allocatedAmount,
        method: 'fte_weighted'
      }
    })
  }
}

// ── Rule 2: Infrastructure by revenue weight ──

const allocateInfraByRevenue = async (
  expenseId: string,
  totalAmountClp: number
): Promise<AutoAllocationResult | null> => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const clients = await runGreenhousePostgresQuery<{
    client_id: string
    revenue: string | number
  } & Record<string, unknown>>(
    `SELECT c.client_id, COALESCE(SUM(i.total_amount_clp), 0) AS revenue
     FROM greenhouse_core.clients c
     LEFT JOIN greenhouse_finance.income i
       ON i.client_id = c.client_id
       AND EXTRACT(YEAR FROM i.invoice_date) = $1
       AND EXTRACT(MONTH FROM i.invoice_date) = $2
     WHERE c.active = TRUE
     GROUP BY c.client_id
     HAVING COALESCE(SUM(i.total_amount_clp), 0) > 0
     ORDER BY revenue DESC`,
    [year, month]
  )

  if (clients.length === 0) return null

  const totalRevenue = clients.reduce((sum, c) => sum + toNumber(c.revenue), 0)

  if (totalRevenue <= 0) return null

  return {
    expenseId,
    ruleApplied: 'infrastructure_by_revenue',
    allocations: clients.map(c => {
      const revenueWeight = toNumber(c.revenue) / totalRevenue
      const allocatedAmount = roundCurrency(totalAmountClp * revenueWeight)

      return {
        clientId: String(c.client_id),
        allocationPercent: Math.round(revenueWeight * 1000) / 10,
        allocatedAmountClp: allocatedAmount,
        method: 'revenue_weighted'
      }
    })
  }
}

// ── Main resolver ──

export interface AutoAllocationInput {
  expenseId: string
  expenseType: string
  memberId?: string | null
  clientId?: string | null
  costCategory?: string | null
  totalAmountClp: number
}

/**
 * Resolve auto-allocation for an expense based on declarative rules.
 * Returns null if no rule matches (expense stays as unallocated overhead).
 */
export const resolveAutoAllocation = async (input: AutoAllocationInput): Promise<AutoAllocationResult | null> => {
  // Rule 1: Payroll expense with member → allocate by FTE
  if (
    (input.expenseType === 'payroll' || input.expenseType === 'social_security') &&
    input.memberId
  ) {
    return allocatePayrollByFte(input.expenseId, input.memberId, input.totalAmountClp)
  }

  // Rule 2: Infrastructure expense → distribute by revenue
  if (
    input.costCategory === 'infrastructure' &&
    !input.clientId
  ) {
    return allocateInfraByRevenue(input.expenseId, input.totalAmountClp)
  }

  // Rule 3: Already has client_id → no auto-allocation needed
  if (input.clientId) {
    return null
  }

  // Rule 4: No match → leave as unallocated overhead
  return null
}
