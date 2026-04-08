import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const parsePeriodId = (value: unknown): { year: number; month: number } | null => {
  if (typeof value !== 'string') return null

  const match = value.match(/^(\d{4})-(\d{2})$/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

const toFiniteInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isInteger(parsed) ? parsed : null
  }

  return null
}

const parseDateLike = (value: unknown): { year: number; month: number } | null => {
  if (typeof value !== 'string') return null

  const match = value.match(/^(\d{4})-(\d{2})-\d{2}/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

export const getClientEconomicsPeriodFromPayload = (payload: Record<string, unknown>): { year: number; month: number } | null => {
  const explicitYear = toFiniteInteger(payload.periodYear) ?? toFiniteInteger(payload.year)
  const explicitMonth = toFiniteInteger(payload.periodMonth) ?? toFiniteInteger(payload.month)

  if (explicitYear && explicitMonth && explicitMonth >= 1 && explicitMonth <= 12) {
    return { year: explicitYear, month: explicitMonth }
  }

  const periodIdPeriod = parsePeriodId(payload.periodId)

  if (periodIdPeriod) return periodIdPeriod

  const payrollPeriod = parsePeriodId(payload.payrollPeriodId)

  if (payrollPeriod) return payrollPeriod

  const datePeriod =
    parseDateLike(payload.invoiceDate) ??
    parseDateLike(payload.documentDate) ??
    parseDateLike(payload.paymentDate) ??
    parseDateLike(payload.dueDate)

  if (datePeriod) return datePeriod

  return null
}

export const getClientEconomicsScopeFromPayload = (
  payload: Record<string, unknown>
): { entityType: string; entityId: string } | null => {
  const period = getClientEconomicsPeriodFromPayload(payload)

  if (!period) {
    const clientId = typeof payload.clientId === 'string' ? payload.clientId : null
    const memberId = typeof payload.memberId === 'string' ? payload.memberId : null

    if (!clientId && !memberId) return null

    const now = new Date()

    return {
      entityType: 'finance_period',
      entityId: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }
  }

  return {
    entityType: 'finance_period',
    entityId: `${period.year}-${String(period.month).padStart(2, '0')}`
  }
}

const shouldSkipPayrollRefresh = async (payload: Record<string, unknown>) => {
  if (payload._eventType !== 'payroll_entry.upserted' || typeof payload.periodId !== 'string') {
    return null
  }

  const rows = await runGreenhousePostgresQuery<{ status: string }>(
    `
      SELECT status
      FROM greenhouse_payroll.payroll_periods
      WHERE period_id = $1
      LIMIT 1
    `,
    [payload.periodId]
  ).catch(() => [])

  const status = rows[0]?.status ?? null

  if (status === 'approved' || status === 'exported') {
    return null
  }

  return status ?? 'missing'
}

export const CLIENT_ECONOMICS_TRIGGER_EVENTS = [
  'membership.created',
  'membership.updated',
  'membership.deactivated',
  'assignment.created',
  'assignment.updated',
  'assignment.removed',
  'finance.income.created',
  'finance.income.updated',
  'finance.expense.created',
  'finance.expense.updated',
  'finance.income_payment.created',
  'finance.income_payment.recorded',
  'finance.expense_payment.recorded',
  'finance.cost_allocation.created',
  'finance.cost_allocation.deleted',
  'payroll_period.created',
  'payroll_period.updated',
  'payroll_entry.upserted',
  'payroll_period.calculated',
  'payroll_period.approved',
  'payroll_period.exported'
] as const

export const clientEconomicsProjection: ProjectionDefinition = {
  name: 'client_economics',
  description: 'Recompute client economics when financial data changes',
  domain: 'finance',

  triggerEvents: [...CLIENT_ECONOMICS_TRIGGER_EVENTS],

  extractScope: getClientEconomicsScopeFromPayload,

  refresh: async (scope, payload) => {
    try {
      const [yearStr, monthStr] = scope.entityId.split('-')
      const year = Number(yearStr)
      const month = Number(monthStr)

      if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return null
      }

      const skippedPayrollStatus = await shouldSkipPayrollRefresh(payload)

      if (skippedPayrollStatus) {
        return `skipped client_economics recompute for ${payload.periodId} (payroll period ${skippedPayrollStatus})`
      }

      const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'

      const results = await computeClientEconomicsSnapshots(
        year,
        month,
        `reactive-refresh:${eventType}:${scope.entityId}`
      )

      return `recomputed client_economics: ${results.length} snapshots for ${year}-${String(month).padStart(2, '0')}`
    } catch {
      return 'client_economics recompute skipped (dependency not ready)'
    }
  },

  maxRetries: 1
}
