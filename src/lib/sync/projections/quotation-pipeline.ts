import 'server-only'

import {
  materializePipelineSnapshot
} from '@/lib/commercial-intelligence/pipeline-materializer'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishQuotationPipelineMaterialized } from '@/lib/commercial/quotation-events'

import type { ProjectionDefinition } from '../projection-registry'

export const QUOTATION_PIPELINE_TRIGGER_EVENTS = [
  EVENT_TYPES.quotationCreated,
  EVENT_TYPES.quotationSynced,
  EVENT_TYPES.quotationSent,
  EVENT_TYPES.quotationApproved,
  EVENT_TYPES.quotationRejected,
  EVENT_TYPES.quotationConverted,
  EVENT_TYPES.quotationExpired,
  EVENT_TYPES.quotationRenewalDue,
  EVENT_TYPES.quotationVersionCreated,
  EVENT_TYPES.quotationPurchaseOrderLinked,
  EVENT_TYPES.quotationServiceEntryLinked,
  EVENT_TYPES.quotationInvoiceEmitted
] as const

const extractQuotationId = (payload: Record<string, unknown>): string | null => {
  const raw = payload.quotationId ?? payload.quotation_id

  if (typeof raw === 'string' && raw.trim()) return raw.trim()

  return null
}

export const quotationPipelineProjection: ProjectionDefinition = {
  name: 'quotation_pipeline',
  description: 'TASK-351: serving projection of quotation pipeline (stage, probability, aging, renewal/expiry state).',
  domain: 'cost_intelligence',
  triggerEvents: [...QUOTATION_PIPELINE_TRIGGER_EVENTS],

  extractScope: payload => {
    const quotationId = extractQuotationId(payload)

    if (!quotationId) return null

    return { entityType: 'quotation', entityId: quotationId }
  },

  refresh: async (scope, payload) => {
    const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'

    const row = await materializePipelineSnapshot({
      quotationId: scope.entityId,
      sourceEvent: eventType
    })

    if (!row) return null

    await publishQuotationPipelineMaterialized({
      quotationId: row.quotationId,
      pipelineStage: row.pipelineStage,
      status: row.status,
      totalAmountClp: row.totalAmountClp,
      probabilityPct: row.probabilityPct
    })

    return `materialized quotation_pipeline ${row.quotationId} stage=${row.pipelineStage}`
  },

  maxRetries: 1
}
