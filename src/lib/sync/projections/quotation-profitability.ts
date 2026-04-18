import 'server-only'

import {
  materializeProfitabilityForPeriod,
  materializeProfitabilitySnapshots
} from '@/lib/commercial-intelligence/profitability-materializer'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishQuotationProfitabilityMaterialized } from '@/lib/commercial/quotation-events'

import type { ProjectionDefinition } from '../projection-registry'

export const QUOTATION_PROFITABILITY_TRIGGER_EVENTS = [
  EVENT_TYPES.quotationApproved,
  EVENT_TYPES.quotationConverted,
  EVENT_TYPES.quotationPurchaseOrderLinked,
  EVENT_TYPES.quotationServiceEntryLinked,
  EVENT_TYPES.quotationInvoiceEmitted,
  EVENT_TYPES.quotationVersionCreated,
  EVENT_TYPES.financeIncomeCreated,
  EVENT_TYPES.financeIncomeUpdated,
  EVENT_TYPES.accountingCommercialCostAttributionPeriodMaterialized
] as const

const extractQuotationId = (payload: Record<string, unknown>): string | null => {
  const raw = payload.quotationId ?? payload.quotation_id

  if (typeof raw === 'string' && raw.trim()) return raw.trim()

  return null
}

const parsePeriodIdScalar = (value: unknown): { year: number; month: number } | null => {
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

const extractPeriod = (payload: Record<string, unknown>): { year: number; month: number } | null => {
  const year = typeof payload.periodYear === 'number'
    ? payload.periodYear
    : Number(payload.periodYear ?? payload.period_year ?? NaN)

  const month = typeof payload.periodMonth === 'number'
    ? payload.periodMonth
    : Number(payload.periodMonth ?? payload.period_month ?? NaN)

  if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
    return { year, month }
  }

  return parsePeriodIdScalar(payload.periodId)
}

export const quotationProfitabilityProjection: ProjectionDefinition = {
  name: 'quotation_profitability',
  description: 'TASK-351: serving projection of quote profitability vs executed cost/revenue per period.',
  domain: 'cost_intelligence',
  triggerEvents: [...QUOTATION_PROFITABILITY_TRIGGER_EVENTS],

  extractScope: payload => {
    const quotationId = extractQuotationId(payload)

    if (quotationId) return { entityType: 'quotation', entityId: quotationId }

    const period = extractPeriod(payload)

    if (period) {
      return {
        entityType: 'finance_period',
        entityId: `${period.year}-${String(period.month).padStart(2, '0')}`
      }
    }

    return null
  },

  refresh: async (scope, payload) => {
    if (scope.entityType === 'quotation') {
      const rows = await materializeProfitabilitySnapshots({ quotationId: scope.entityId })

      for (const row of rows) {
        await publishQuotationProfitabilityMaterialized({
          quotationId: row.quotationId,
          periodYear: row.periodYear,
          periodMonth: row.periodMonth,
          effectiveMarginPct: row.effectiveMarginPct,
          quotedMarginPct: row.quotedMarginPct,
          marginDriftPct: row.marginDriftPct,
          driftSeverity: row.driftSeverity
        })
      }

      return `materialized quotation_profitability ${scope.entityId}: ${rows.length} period(s)`
    }

    if (scope.entityType === 'finance_period') {
      const period = parsePeriodIdScalar(scope.entityId)

      if (!period) return null

      const { quotationCount } = await materializeProfitabilityForPeriod({
        year: period.year,
        month: period.month
      })

      const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'

      return `materialized quotation_profitability for period ${scope.entityId}: ${quotationCount} quote(s) via ${eventType}`
    }

    return null
  },

  maxRetries: 1
}
