import 'server-only'

import { pushProductToHubSpot } from '@/lib/hubspot/push-product-to-hubspot'
import type { ProductHubSpotTriggerEventType } from '@/lib/hubspot/product-hubspot-types'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-547 Fase C — reactive projection that mirrors `product_catalog` into
 * HubSpot Products on every lifecycle event emitted by the TASK-546
 * materializer. Invokes `pushProductToHubSpot`, which is idempotent and
 * encodes degraded paths (endpoint_not_deployed, anti-ping-pong window) as
 * persisted `hubspot_sync_status` + outbox events rather than throws.
 *
 * Domain: `cost_intelligence` — same carrier as `quotationHubSpotOutbound`,
 * `incomeHubSpotOutbound`, and the materializer that feeds this projection.
 */
export const PRODUCT_HUBSPOT_OUTBOUND_TRIGGER_EVENTS = [
  EVENT_TYPES.productCatalogCreated,
  EVENT_TYPES.productCatalogUpdated,
  EVENT_TYPES.productCatalogArchived,
  EVENT_TYPES.productCatalogUnarchived
] as const

const extractProductId = (payload: Record<string, unknown>): string | null => {
  const candidates = [payload.productId, payload.product_id]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  return null
}

const extractActorId = (payload: Record<string, unknown>): string | null => {
  const candidates = [
    payload.actorId,
    payload.actor_id,
    payload.createdBy,
    payload.created_by,
    payload.archivedBy,
    payload.archived_by,
    payload.unarchivedBy,
    payload.unarchived_by
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  return null
}

const TRIGGER_SET: ReadonlySet<string> = new Set(PRODUCT_HUBSPOT_OUTBOUND_TRIGGER_EVENTS)

const extractEventType = (
  payload: Record<string, unknown>
): ProductHubSpotTriggerEventType | null => {
  const raw = payload.eventType

  if (typeof raw === 'string' && TRIGGER_SET.has(raw)) {
    return raw as ProductHubSpotTriggerEventType
  }

  return null
}

export const productHubSpotOutboundProjection: ProjectionDefinition = {
  name: 'product_hubspot_outbound',
  description:
    'TASK-547: mirror greenhouse_commercial.product_catalog rows into HubSpot Products on lifecycle events (created/updated/archived/unarchived). Idempotent. Degraded modes persisted as hubspot_sync_status.',
  domain: 'cost_intelligence',
  triggerEvents: [...PRODUCT_HUBSPOT_OUTBOUND_TRIGGER_EVENTS],

  extractScope: payload => {
    const productId = extractProductId(payload)

    if (!productId) return null

    return { entityType: 'product_catalog', entityId: productId }
  },

  refresh: async (scope, payload) => {
    const eventType = extractEventType(payload)
    const actorId = extractActorId(payload)

    const result = await pushProductToHubSpot({
      productId: scope.entityId,
      eventType,
      actorId
    })

    const suffix = result.reason ? ` (${result.reason})` : ''

    return `product_hubspot_outbound ${scope.entityId}: ${result.status}:${result.action}${suffix}`
  },

  maxRetries: 2
}
