import type { WebhookEnvelope } from './types'

export const ENVELOPE_VERSION = 1
export const ENVELOPE_SOURCE = 'greenhouse-eo'

interface OutboxEventInput {
  event_id: string
  event_type: string
  aggregate_type: string
  aggregate_id: string
  occurred_at: string | Date
  payload_json: unknown
}

/**
 * Build a canonical webhook envelope from an outbox event row.
 */
export const buildWebhookEnvelope = (event: OutboxEventInput): WebhookEnvelope => {
  const occurredAt = event.occurred_at instanceof Date
    ? event.occurred_at.toISOString()
    : String(event.occurred_at)

  const data = typeof event.payload_json === 'string'
    ? JSON.parse(event.payload_json) as Record<string, unknown>
    : (event.payload_json as Record<string, unknown>) || {}

  return {
    eventId: event.event_id,
    eventType: event.event_type,
    aggregateType: event.aggregate_type,
    aggregateId: event.aggregate_id,
    occurredAt,
    version: ENVELOPE_VERSION,
    source: ENVELOPE_SOURCE,
    data
  }
}
