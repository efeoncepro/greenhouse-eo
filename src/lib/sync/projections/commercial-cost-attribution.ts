import 'server-only'

import {
  materializeCommercialCostAttributionForPeriod,
  readCommercialCostAttributionByClientForPeriod
} from '@/lib/commercial-cost-attribution/member-period-attribution'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishPeriodMaterializedEvent } from '@/lib/sync/publish-event'

import type { ProjectionDefinition } from '../projection-registry'

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

const parseStatementRowPeriod = (value: unknown): { year: number; month: number } | null => {
  if (typeof value !== 'string') return null

  const match = value.match(/^(.*)_[0-9a-f]{12}$/i)

  if (!match) return null

  const periodId = match[1]
  const parts = periodId.split('_')

  if (parts.length < 3) return null

  const year = Number(parts[parts.length - 2])
  const month = Number(parts[parts.length - 1])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

const toInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isInteger(parsed) ? parsed : null
  }

  return null
}

export const getCommercialCostAttributionPeriodFromPayload = (payload: Record<string, unknown>) => {
  const explicitYear = toInteger(payload.periodYear) ?? toInteger(payload.year)
  const explicitMonth = toInteger(payload.periodMonth) ?? toInteger(payload.month)

  if (explicitYear && explicitMonth && explicitMonth >= 1 && explicitMonth <= 12) {
    return { year: explicitYear, month: explicitMonth }
  }

  return (
    parsePeriodId(payload.periodId) ??
    parsePeriodId(payload.payrollPeriodId) ??
    parseDateLike(payload.invoiceDate) ??
    parseDateLike(payload.documentDate) ??
    parseDateLike(payload.paymentDate) ??
    parseDateLike(payload.rateDate) ??
    parseDateLike(payload.transactionDate) ??
    parseDateLike(payload.reconciledAt) ??
    parseStatementRowPeriod(payload.reconciliationRowId) ??
    parseStatementRowPeriod(payload.rowId) ??
    null
  )
}

export const getCommercialCostAttributionScopeFromPayload = (payload: Record<string, unknown>) => {
  const period = getCommercialCostAttributionPeriodFromPayload(payload)

  if (!period) {
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

export const COMMERCIAL_COST_ATTRIBUTION_TRIGGER_EVENTS = [
  'finance.income.created',
  'finance.income.updated',
  'finance.expense.created',
  'finance.expense.updated',
  'finance.expense_payment.recorded',
  'finance.expense_payment.reconciled',
  'finance.expense_payment.unreconciled',
  'finance.settlement_leg.recorded',
  'finance.settlement_leg.reconciled',
  'finance.settlement_leg.unreconciled',
  'finance.internal_transfer.recorded',
  'finance.fx_conversion.recorded',
  'finance.reconciliation_period.reconciled',
  'finance.reconciliation_period.closed',
  'finance.cost_allocation.created',
  'finance.cost_allocation.deleted',
  'finance.exchange_rate.upserted',
  'finance.overhead.updated',
  'finance.license_cost.updated',
  'finance.tooling_cost.updated',
  'assignment.created',
  'assignment.updated',
  'assignment.removed',
  'membership.created',
  'membership.updated',
  'membership.deactivated',
  'payroll_period.calculated',
  'payroll_period.approved',
  'payroll_period.exported',
  'payroll_entry.upserted',
  'payroll_entry.reliquidated',
  'compensation_version.created',
  'compensation_version.updated'
] as const

export const commercialCostAttributionProjection: ProjectionDefinition = {
  name: 'commercial_cost_attribution',
  description: 'Materialize canonical commercial cost attribution by period',
  domain: 'cost_intelligence',
  triggerEvents: [...COMMERCIAL_COST_ATTRIBUTION_TRIGGER_EVENTS],
  extractScope: getCommercialCostAttributionScopeFromPayload,
  refresh: async (scope, payload) => {
    const [yearStr, monthStr] = scope.entityId.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return null
    }

    const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'

    const { rows, replaced } = await materializeCommercialCostAttributionForPeriod(
      year,
      month,
      `reactive-refresh:${eventType}:${scope.entityId}`
    )

    const clientSummary = await readCommercialCostAttributionByClientForPeriod(year, month)

    // TASK-379 Slice 2: publish ONE coarse-grained period-materialized event.
    // The legacy `accounting.commercial_cost_attribution.materialized` event remains
    // registered in the catalog for backwards compatibility; consumers must accept both.
    await publishPeriodMaterializedEvent({
      aggregateType: AGGREGATE_TYPES.commercialCostAttribution,
      eventType: EVENT_TYPES.accountingCommercialCostAttributionPeriodMaterialized,
      periodId: `${year}-${String(month).padStart(2, '0')}`,
      snapshotCount: rows.length,
      payload: {
        periodYear: year,
        periodMonth: month,
        memberCount: rows.length,
        allocationCount: replaced,
        clientCount: clientSummary.length
      }
    })

    return `materialized commercial_cost_attribution: ${rows.length} members for ${scope.entityId} via ${eventType}`
  },
  maxRetries: 1
}
