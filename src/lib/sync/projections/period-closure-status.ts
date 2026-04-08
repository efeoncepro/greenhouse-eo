import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { materializePeriodClosureStatus } from '@/lib/cost-intelligence/check-period-readiness'
import { toInteger } from '@/lib/cost-intelligence/shared'

export const getPeriodClosureStatusPeriodFromPayload = (value: unknown): { year: number; month: number } | null => {
  if (value && typeof value === 'object') {
    const payload = value as Record<string, unknown>

    return (
      getPeriodClosureStatusPeriodFromPayload(payload.periodId) ??
      getPeriodClosureStatusPeriodFromPayload(payload.payrollPeriodId) ??
      parseDateLike(payload.invoiceDate) ??
      parseDateLike(payload.documentDate) ??
      parseDateLike(payload.paymentDate) ??
      parseDateLike(payload.rateDate) ??
      parseDateLike(payload.rate_date)
    )
  }

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

export const getPeriodClosureStatusScopeFromPayload = (payload: Record<string, unknown>) => {
  const explicitYear = toInteger(payload.periodYear) ?? toInteger(payload.year)
  const explicitMonth = toInteger(payload.periodMonth) ?? toInteger(payload.month)

  if (explicitYear && explicitMonth && explicitMonth >= 1 && explicitMonth <= 12) {
    return {
      entityType: 'finance_period',
      entityId: `${explicitYear}-${String(explicitMonth).padStart(2, '0')}`
    }
  }

  const period =
    getPeriodClosureStatusPeriodFromPayload(payload)

  if (!period) return null

  return {
    entityType: 'finance_period',
    entityId: `${period.year}-${String(period.month).padStart(2, '0')}`
  }
}

export const PERIOD_CLOSURE_STATUS_TRIGGER_EVENTS = [
  'payroll_period.created',
  'payroll_period.updated',
  'payroll_period.calculated',
  'payroll_period.approved',
  'payroll_period.exported',
  'finance.income.created',
  'finance.income.updated',
  'finance.expense.created',
  'finance.expense.updated',
  'finance.expense_payment.recorded',
  'finance.income_payment.reconciled',
  'finance.income_payment.unreconciled',
  'finance.expense_payment.reconciled',
  'finance.expense_payment.unreconciled',
  'finance.reconciliation_period.reconciled',
  'finance.reconciliation_period.closed',
  'finance.exchange_rate.upserted'
] as const

export const periodClosureStatusProjection: ProjectionDefinition = {
  name: 'period_closure_status',
  description: 'Materialize period closure readiness by finance period',
  domain: 'cost_intelligence',
  triggerEvents: [...PERIOD_CLOSURE_STATUS_TRIGGER_EVENTS],
  extractScope: getPeriodClosureStatusScopeFromPayload,
  refresh: async (scope, payload) => {
    const [yearStr, monthStr] = scope.entityId.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return null
    }

    const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'
    const snapshot = await materializePeriodClosureStatus({ year, month })

    return `materialized period_closure_status for ${snapshot.periodId} (${snapshot.closureStatus}, ${snapshot.readinessPct}%) via ${eventType}`
  },
  maxRetries: 1
}
