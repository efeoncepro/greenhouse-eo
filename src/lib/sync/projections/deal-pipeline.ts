import 'server-only'

import {
  materializeDealPipelineSnapshot,
  materializeDealPipelineSnapshotForHubSpotDeal,
  materializeDealPipelineSnapshotForQuotation
} from '@/lib/commercial-intelligence/deal-pipeline-materializer'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

export const DEAL_PIPELINE_TRIGGER_EVENTS = [
  EVENT_TYPES.dealCreated,
  EVENT_TYPES.dealSynced,
  EVENT_TYPES.dealStageChanged,
  EVENT_TYPES.dealWon,
  EVENT_TYPES.dealLost,
  EVENT_TYPES.quotationCreated,
  EVENT_TYPES.quotationSynced,
  EVENT_TYPES.quotationSent,
  EVENT_TYPES.quotationApproved,
  EVENT_TYPES.quotationRejected,
  EVENT_TYPES.quotationConverted,
  EVENT_TYPES.quotationVersionCreated,
  EVENT_TYPES.quotationPurchaseOrderLinked,
  EVENT_TYPES.quotationServiceEntryLinked,
  EVENT_TYPES.quotationInvoiceEmitted
] as const

export const extractDealPipelineScope = (
  payload: Record<string, unknown>
): { entityType: string; entityId: string } | null => {
  const dealId = payload.dealId ?? payload.deal_id

  if (typeof dealId === 'string' && dealId.trim()) {
    return { entityType: 'deal', entityId: dealId.trim() }
  }

  const quotationId = payload.quotationId ?? payload.quotation_id

  if (typeof quotationId === 'string' && quotationId.trim()) {
    return { entityType: 'quotation', entityId: quotationId.trim() }
  }

  const hubspotDealId = payload.hubspotDealId ?? payload.hubspot_deal_id

  if (typeof hubspotDealId === 'string' && hubspotDealId.trim()) {
    return { entityType: 'hubspot_deal', entityId: hubspotDealId.trim() }
  }

  return null
}

export const dealPipelineProjection: ProjectionDefinition = {
  name: 'deal_pipeline',
  description: 'TASK-456: deal-grain pipeline projection for forecasting using canonical deals plus quote rollups.',
  domain: 'cost_intelligence',
  triggerEvents: [...DEAL_PIPELINE_TRIGGER_EVENTS],

  extractScope: payload => extractDealPipelineScope(payload),

  refresh: async (scope, payload) => {
    const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'

    if (scope.entityType === 'deal') {
      const row = await materializeDealPipelineSnapshot({
        dealId: scope.entityId,
        sourceEvent: eventType
      })

      return row ? `materialized deal_pipeline ${row.dealId}` : null
    }

    if (scope.entityType === 'quotation') {
      const row = await materializeDealPipelineSnapshotForQuotation({
        quotationId: scope.entityId,
        sourceEvent: eventType
      })

      return row ? `materialized deal_pipeline from quotation ${scope.entityId}` : null
    }

    if (scope.entityType === 'hubspot_deal') {
      const row = await materializeDealPipelineSnapshotForHubSpotDeal({
        hubspotDealId: scope.entityId,
        sourceEvent: eventType
      })

      return row ? `materialized deal_pipeline from hubspot deal ${scope.entityId}` : null
    }

    return null
  },

  maxRetries: 1
}
