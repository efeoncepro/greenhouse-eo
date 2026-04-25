import 'server-only'

import { query } from '@/lib/db'
import { convertQuoteToCash } from '@/lib/commercial/party/commands/convert-quote-to-cash'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

// TASK-541 Fase G: reactive auto-promoter.
//
// When `commercial.deal.won` is published (by the HubSpot inbound sync when
// a deal transitions to closedwon) we look for a convertible quotation
// attached to that deal and invoke `convertQuoteToCash` with trigger
// `deal_won_hubspot`. The command is idempotent, so:
//   - If the quote is already `converted`, it returns `idempotent_hit`.
//   - If the quote is not in a convertible state, it throws and the
//     reactive consumer records the failure (re-enters dead-letter after
//     maxRetries).
//   - If the quote exceeds the $100M CLP threshold, the command persists
//     a `pending_approval` row and throws — the operator resolves it via
//     the generic approval workflow (follow-up).
//
// We intentionally do NOT listen to `commercial.contract.created` because
// that event is emitted BY this command, which would create a loop.

export const QUOTE_TO_CASH_AUTOPROMOTER_TRIGGER_EVENTS = [
  EVENT_TYPES.dealWon
] as const

interface DealWonPayload {
  dealId?: string
  hubspotDealId?: string
}

const resolveConvertibleQuotation = async (
  hubspotDealId: string
): Promise<{ quotationId: string } | null> => {
  const rows = await query<{ quotation_id: string }>(
    `SELECT quotation_id
       FROM greenhouse_commercial.quotations
       WHERE hubspot_deal_id = $1
         AND status IN ('issued', 'sent', 'approved')
         AND (converted_to_income_id IS NULL)
       ORDER BY created_at DESC
       LIMIT 1`,
    [hubspotDealId]
  )

  const row = rows[0]

  return row ? { quotationId: row.quotation_id } : null
}

export const quoteToCashAutopromoterProjection: ProjectionDefinition = {
  name: 'quote_to_cash_autopromoter',
  description:
    'TASK-541 Fase G: on commercial.deal.won, find the attached quotation (issued/sent/approved) and invoke convertQuoteToCash with trigger=deal_won_hubspot.',
  domain: 'cost_intelligence',
  triggerEvents: [...QUOTE_TO_CASH_AUTOPROMOTER_TRIGGER_EVENTS],

  extractScope: payload => {
    const typed = payload as DealWonPayload
    const hubspotDealId = typed.hubspotDealId?.trim()

    if (!hubspotDealId) return null

    return { entityType: 'deal', entityId: hubspotDealId }
  },

  refresh: async scope => {
    const hubspotDealId = scope.entityId

    const candidate = await resolveConvertibleQuotation(hubspotDealId)

    if (!candidate) {
      return `quote_to_cash_autopromoter: no convertible quotation for deal ${hubspotDealId}`
    }

    try {
      const result = await convertQuoteToCash({
        quotationId: candidate.quotationId,
        conversionTriggeredBy: 'deal_won_hubspot',
        hubspotDealId,
        actor: {
          userId: 'system:quote_to_cash_autopromoter',
          tenantScope: 'system:reactive',
          name: 'Quote-to-cash auto-promoter'
        }
      })

      return `quote_to_cash_autopromoter: ${candidate.quotationId} → ${result.status} (op ${result.operationId})`
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error && typeof (error as { code?: string }).code === 'string'
          ? (error as { code?: string }).code
          : 'UNKNOWN'

      // Let the reactive consumer retry on generic failures but swallow
      // the expected `QUOTE_TO_CASH_APPROVAL_REQUIRED` so the op stays
      // suspended without burning retries.
      if (code === 'QUOTE_TO_CASH_APPROVAL_REQUIRED') {
        return `quote_to_cash_autopromoter: ${candidate.quotationId} → pending_approval`
      }

      throw error
    }
  },

  maxRetries: 2
}
