import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

interface QueryableClient {
  query: (text: string, values?: unknown[]) => Promise<unknown>
}

export type QuotationLineCostOverrideCategory =
  | 'competitive_pressure'
  | 'strategic_investment'
  | 'roi_correction'
  | 'error_correction'
  | 'client_negotiation'
  | 'other'

export const QUOTATION_LINE_COST_OVERRIDE_CATEGORIES: readonly QuotationLineCostOverrideCategory[] = [
  'competitive_pressure',
  'strategic_investment',
  'roi_correction',
  'error_correction',
  'client_negotiation',
  'other'
]

export interface QuotationLineCostOverriddenPayload {
  quotationId: string
  lineItemId: string
  category: QuotationLineCostOverrideCategory
  reason: string
  suggestedUnitCostUsd: number | null
  overrideUnitCostUsd: number
  deltaPct: number | null
  overriddenByUserId: string | null
  overriddenAt: string
  historyId: string | null
  metadata?: Record<string, unknown>
}

/**
 * Publishes `commercial.quotation_line.cost_overridden` when a user applies a
 * governed manual cost override on a quotation line (TASK-481).
 *
 * The event payload includes both the suggested and override unit costs (USD)
 * plus the governance trio (category, reason, actor), so downstream consumers
 * (audit dashboards, TASK-482 quoted-vs-actual margin feedback) do not need
 * to re-query the line to reconstruct context.
 */
export const publishQuotationLineCostOverridden = async (
  payload: QuotationLineCostOverriddenPayload,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotationLineCostOverride,
      aggregateId: payload.lineItemId,
      eventType: EVENT_TYPES.quotationLineCostOverridden,
      payload: {
        quotationId: payload.quotationId,
        lineItemId: payload.lineItemId,
        category: payload.category,
        reason: payload.reason,
        suggestedUnitCostUsd: payload.suggestedUnitCostUsd,
        overrideUnitCostUsd: payload.overrideUnitCostUsd,
        deltaPct: payload.deltaPct,
        overriddenByUserId: payload.overriddenByUserId,
        overriddenAt: payload.overriddenAt,
        historyId: payload.historyId,
        metadata: payload.metadata ?? {}
      }
    },
    client
  )
}
