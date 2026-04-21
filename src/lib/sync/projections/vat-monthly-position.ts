import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishPeriodMaterializedEvent } from '@/lib/sync/publish-event'
import {
  buildVatPeriodId,
  getVatLedgerPeriodFromPayload,
  getVatLedgerScopeFromPayload,
  materializeVatLedgerForPeriod
} from '@/lib/finance/vat-ledger'

import type { ProjectionDefinition } from '../projection-registry'

export const VAT_MONTHLY_POSITION_TRIGGER_EVENTS = [
  'finance.income.created',
  'finance.income.updated',
  'finance.income.nubox_synced',
  'finance.expense.created',
  'finance.expense.updated',
  'finance.expense.nubox_synced'
] as const

export const vatMonthlyPositionProjection: ProjectionDefinition = {
  name: 'vat_monthly_position',
  description: 'Materialize Chile VAT ledger entries and monthly position by tenant space',
  domain: 'finance',
  triggerEvents: [...VAT_MONTHLY_POSITION_TRIGGER_EVENTS],
  extractScope: getVatLedgerScopeFromPayload,
  refresh: async (scope, payload) => {
    const period = getVatLedgerPeriodFromPayload(payload) ?? (() => {
      const [yearStr, monthStr] = scope.entityId.split('-')
      const year = Number(yearStr)
      const month = Number(monthStr)

      if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return null
      }

      return { year, month }
    })()

    if (!period) {
      return null
    }

    const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'

    const summary = await materializeVatLedgerForPeriod(
      period.year,
      period.month,
      `reactive-refresh:${eventType}:${buildVatPeriodId(period.year, period.month)}`
    )

    await publishPeriodMaterializedEvent({
      aggregateType: AGGREGATE_TYPES.vatPosition,
      eventType: EVENT_TYPES.financeVatPositionPeriodMaterialized,
      periodId: summary.periodId,
      snapshotCount: summary.positionsMaterialized,
      payload: {
        periodYear: period.year,
        periodMonth: period.month,
        ledgerEntriesMaterialized: summary.ledgerEntriesMaterialized,
        debitFiscalAmountClp: summary.debitFiscalAmountClp,
        creditFiscalAmountClp: summary.creditFiscalAmountClp,
        nonRecoverableVatAmountClp: summary.nonRecoverableVatAmountClp
      }
    })

    return `materialized vat_monthly_position: ${summary.positionsMaterialized} positions and ${summary.ledgerEntriesMaterialized} ledger rows for ${summary.periodId} via ${eventType}`
  },
  maxRetries: 1
}
