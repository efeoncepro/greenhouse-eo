import 'server-only'

import { materializeServiceAttributionForPeriod } from '@/lib/service-attribution/materialize'
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

const toInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)

    return Number.isInteger(parsed) ? parsed : null
  }

  return null
}

export const getServiceAttributionPeriodFromPayload = (payload: Record<string, unknown>) => {
  const explicitYear = toInteger(payload.periodYear) ?? toInteger(payload.year)
  const explicitMonth = toInteger(payload.periodMonth) ?? toInteger(payload.month)

  if (explicitYear && explicitMonth && explicitMonth >= 1 && explicitMonth <= 12) {
    return { year: explicitYear, month: explicitMonth }
  }

  return (
    parsePeriodId(payload.periodId) ??
    parseDateLike(payload.invoiceDate) ??
    parseDateLike(payload.documentDate) ??
    parseDateLike(payload.paymentDate) ??
    parseDateLike(payload.rateDate) ??
    parseDateLike(payload.transactionDate) ??
    null
  )
}

export const getServiceAttributionScopeFromPayload = (payload: Record<string, unknown>) => {
  const period = getServiceAttributionPeriodFromPayload(payload)

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

export const SERVICE_ATTRIBUTION_TRIGGER_EVENTS = [
  'finance.income.created',
  'finance.income.updated',
  'finance.expense.created',
  'finance.expense.updated',
  'finance.cost_allocation.created',
  'finance.cost_allocation.deleted',
  'finance.purchase_order.created',
  'finance.purchase_order.consumed',
  'finance.hes.submitted',
  'finance.hes.approved',
  'finance.hes.rejected',
  'service.created',
  'service.updated',
  'service.deactivated',
  'commercial.quotation.updated',
  'commercial.quotation.po_linked',
  'commercial.quotation.hes_linked',
  'commercial.contract.created',
  'commercial.contract.activated',
  'commercial.contract.modified',
  'commercial.deal.created',
  'commercial.deal.synced',
  'commercial.deal.stage_changed',
  'commercial.deal.won',
  'commercial.deal.lost',
  'payroll_period.calculated',
  'payroll_period.approved',
  'payroll_period.exported',
  'payroll_entry.upserted',
  'payroll_entry.reliquidated',
  'compensation_version.created',
  'compensation_version.updated',
  'assignment.created',
  'assignment.updated',
  'assignment.removed',
  'membership.created',
  'membership.updated',
  'membership.deactivated'
] as const

export const serviceAttributionProjection: ProjectionDefinition = {
  name: 'service_attribution',
  description: 'Materialize canonical service-level attribution facts by period',
  domain: 'cost_intelligence',
  triggerEvents: [...SERVICE_ATTRIBUTION_TRIGGER_EVENTS],
  extractScope: getServiceAttributionScopeFromPayload,
  refresh: async (scope, payload) => {
    const [yearStr, monthStr] = scope.entityId.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return null
    }

    const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'

    const result = await materializeServiceAttributionForPeriod(
      year,
      month,
      `reactive-refresh:${eventType}:${scope.entityId}`
    )

    await publishPeriodMaterializedEvent({
      aggregateType: AGGREGATE_TYPES.serviceAttribution,
      eventType: EVENT_TYPES.accountingServiceAttributionPeriodMaterialized,
      periodId: scope.entityId,
      snapshotCount: result.factsWritten,
      payload: {
        periodYear: year,
        periodMonth: month,
        factsWritten: result.factsWritten,
        unresolvedWritten: result.unresolvedWritten
      }
    })

    return `materialized service_attribution: ${result.factsWritten} facts and ${result.unresolvedWritten} unresolved for ${scope.entityId} via ${eventType}`
  },
  maxRetries: 1
}
