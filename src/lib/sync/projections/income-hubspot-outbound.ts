import 'server-only'

import { pushIncomeToHubSpot } from '@/lib/finance/income-hubspot/push-income-to-hubspot'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-524: reactive projection that mirrors `greenhouse_finance.income`
 * into HubSpot's native invoice object (non-billable) on every create /
 * update, and prepares the artifact attach step when Nubox publishes the
 * official DTE.
 *
 * `pushIncomeToHubSpot` is fully idempotent and encodes the degraded paths
 * (no anchors, Cloud Run /invoices endpoint not deployed yet, Cloud Run
 * error) into the persisted `hubspot_sync_status` + outbox events. The
 * projection itself rethrows only on unexpected server errors so the
 * reactive consumer applies retry backoff.
 *
 * Domain: `cost_intelligence` — analogous to `quotationHubSpotOutbound`.
 */
export const INCOME_HUBSPOT_OUTBOUND_TRIGGER_EVENTS = [
  EVENT_TYPES.financeIncomeCreated,
  EVENT_TYPES.financeIncomeUpdated,

  // Nubox sync surfaces the DTE folio + SII state; the same projection
  // re-runs the mirror so HubSpot picks up the final invoice_number /
  // document reference. Artifact attach (note with PDF/XML) is a follow-up
  // concern tracked via `finance.income.hubspot_artifact_attached`.
  'finance.income.nubox_synced'
] as const

const extractIncomeId = (payload: Record<string, unknown>): string | null => {
  const candidates = [payload.incomeId, payload.income_id]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  return null
}

export const incomeHubSpotOutboundProjection: ProjectionDefinition = {
  name: 'income_hubspot_outbound',
  description:
    'TASK-524: mirror greenhouse_finance.income into HubSpot invoice (non-billable) on finance.income.created/updated/nubox_synced. Idempotent. Degraded modes persisted as hubspot_sync_status.',
  domain: 'cost_intelligence',
  triggerEvents: [...INCOME_HUBSPOT_OUTBOUND_TRIGGER_EVENTS],

  extractScope: payload => {
    const incomeId = extractIncomeId(payload)

    if (!incomeId) return null

    return { entityType: 'income', entityId: incomeId }
  },

  refresh: async scope => {
    const result = await pushIncomeToHubSpot(scope.entityId)

    return `income_hubspot_outbound ${scope.entityId}: ${result.status}`
  },

  maxRetries: 2
}
