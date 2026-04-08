import 'server-only'

import { materializeOperationalPl } from '@/lib/cost-intelligence/compute-operational-pl'
import { toInteger } from '@/lib/cost-intelligence/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { ProjectionDefinition } from '../projection-registry'

type ThresholdRow = {
  margin_alert_threshold_pct: number | string | null
}

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

export const getOperationalPlPeriodFromPayload = (payload: Record<string, unknown>) => {
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

export const getOperationalPlScopeFromPayload = (payload: Record<string, unknown>) => {
  const period = getOperationalPlPeriodFromPayload(payload)

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

const getMarginThresholdPct = async () => {
  const rows = await runGreenhousePostgresQuery<ThresholdRow>(
    `
      SELECT margin_alert_threshold_pct
      FROM greenhouse_cost_intelligence.period_closure_config
      WHERE config_id = 'default'
      LIMIT 1
    `
  ).catch(() => [])

  return Math.max(0, Number(rows[0]?.margin_alert_threshold_pct ?? 15))
}

export const OPERATIONAL_PL_TRIGGER_EVENTS = [
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
  'compensation_version.created',
  'compensation_version.updated',
  'ico.materialization.completed',
  'accounting.period_closed',
  'accounting.period_reopened'
] as const

export const operationalPlProjection: ProjectionDefinition = {
  name: 'operational_pl',
  description: 'Materialize operational P&L snapshots by client, space, and organization',
  domain: 'cost_intelligence',
  triggerEvents: [...OPERATIONAL_PL_TRIGGER_EVENTS],
  extractScope: getOperationalPlScopeFromPayload,
  refresh: async (scope, payload) => {
    const [yearStr, monthStr] = scope.entityId.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return null
    }

    const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'
    const result = await materializeOperationalPl(year, month, `reactive-refresh:${eventType}:${scope.entityId}`)
    const marginThresholdPct = await getMarginThresholdPct()

    for (const snapshot of result.snapshots) {
      await publishOutboxEvent({
        aggregateType: 'operational_pl',
        aggregateId: snapshot.snapshotId,
        eventType: 'accounting.pl_snapshot.materialized',
        payload: {
          scopeType: snapshot.scopeType,
          scopeId: snapshot.scopeId,
          scopeName: snapshot.scopeName,
          periodYear: snapshot.periodYear,
          periodMonth: snapshot.periodMonth,
          periodId: `${snapshot.periodYear}-${String(snapshot.periodMonth).padStart(2, '0')}`,
          snapshotRevision: snapshot.snapshotRevision,
          periodClosed: snapshot.periodClosed,
          grossMarginPct: snapshot.grossMarginPct,
          totalCostClp: snapshot.totalCostClp
        }
      })

      if (
        snapshot.grossMarginPct != null &&
        snapshot.revenueClp > 0 &&
        snapshot.grossMarginPct < marginThresholdPct
      ) {
        await publishOutboxEvent({
          aggregateType: 'margin_alert',
          aggregateId: snapshot.snapshotId,
          eventType: 'accounting.margin_alert.triggered',
          payload: {
            scopeType: snapshot.scopeType,
            scopeId: snapshot.scopeId,
            scopeName: snapshot.scopeName,
            periodYear: snapshot.periodYear,
            periodMonth: snapshot.periodMonth,
            periodId: `${snapshot.periodYear}-${String(snapshot.periodMonth).padStart(2, '0')}`,
            thresholdPct: marginThresholdPct,
            actualPct: snapshot.grossMarginPct
          }
        })
      }
    }

    return `materialized operational_pl: ${result.snapshots.length} snapshots for ${scope.entityId} via ${eventType}`
  },
  maxRetries: 1
}
