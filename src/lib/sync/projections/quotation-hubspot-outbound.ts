import 'server-only'

import { pushCanonicalQuoteToHubSpot } from '@/lib/hubspot/push-canonical-quote'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-463 phase B — reactive projection that pushes canonical quotations to HubSpot.
 *
 * Triggers on lifecycle events where the canonical quotation should be mirrored out:
 *   - created / sent / approved / rejected / version_created
 *
 * The underlying `pushCanonicalQuoteToHubSpot` helper is idempotent:
 *   - skips when canonical has no `hubspot_deal_id` (or `organization_id`)
 *   - creates the HubSpot quote the first time (persists returned `hubspot_quote_id`)
 *   - updates the existing HubSpot quote on subsequent events
 *
 * Errors thrown from the helper propagate so the reactive consumer records the run
 * as failed and retries per outbox policy.
 */
export const QUOTATION_HUBSPOT_OUTBOUND_TRIGGER_EVENTS = [
  EVENT_TYPES.quotationCreated,
  EVENT_TYPES.quotationUpdated,
  EVENT_TYPES.quotationIssued,
  EVENT_TYPES.quotationSent,
  EVENT_TYPES.quotationApproved,
  EVENT_TYPES.quotationRejected,
  EVENT_TYPES.quotationVersionCreated
] as const

const extractQuotationId = (payload: Record<string, unknown>): string | null => {
  const raw = payload.quotationId ?? payload.quotation_id

  if (typeof raw === 'string' && raw.trim()) return raw.trim()

  return null
}

const extractActorId = (payload: Record<string, unknown>): string | null => {
  const candidates = [
    payload.actorId,
    payload.actor_id,
    payload.createdBy,
    payload.created_by,
    payload.approvedBy,
    payload.approved_by,
    payload.sentBy,
    payload.sent_by,
    payload.issuedBy,
    payload.issued_by,
    payload.rejectedBy,
    payload.rejected_by
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  return null
}

export const quotationHubSpotOutboundProjection: ProjectionDefinition = {
  name: 'quotation_hubspot_outbound',
  description: 'TASK-463: mirror canonical quotations to HubSpot on lifecycle events (create/sent/approved/rejected/version).',
  domain: 'cost_intelligence',
  triggerEvents: [...QUOTATION_HUBSPOT_OUTBOUND_TRIGGER_EVENTS],

  extractScope: payload => {
    const quotationId = extractQuotationId(payload)

    if (!quotationId) return null

    return { entityType: 'quotation', entityId: quotationId }
  },

  refresh: async (scope, payload) => {
    const actorId = extractActorId(payload)

    const result = await pushCanonicalQuoteToHubSpot({
      quotationId: scope.entityId,
      actorId
    })

    const suffix = result.reason ? ` (${result.reason})` : ''

    return `hubspot_outbound ${scope.entityId}: ${result.result}${suffix}`
  },

  maxRetries: 2
}
