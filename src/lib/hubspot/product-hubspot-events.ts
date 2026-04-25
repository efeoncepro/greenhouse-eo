import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

// TASK-547 Fase C — outbound event publishers for the Product Catalog →
// HubSpot bridge. The projection `productHubSpotOutbound` invokes
// `pushProductToHubSpot`, which then publishes one of these two events
// to close the loop and let downstream consumers (Admin Center monitoring,
// TASK-548 drift detector, retry worker) observe the outcome.
//
// Aggregate type: `product_catalog` (same as the materializer lifecycle
// events, so a single aggregate carries create/update/archive/unarchive
// AND the resulting sync outcome — auditable history lives on one stream).

type PublishClient = Parameters<typeof publishOutboxEvent>[1]

export type ProductHubSpotSyncAction =
  | 'created'
  | 'updated'
  | 'archived'
  | 'unarchived'

export interface ProductHubSpotSyncedPayload {
  productId: string
  hubspotProductId: string | null
  sourceKind: string
  sourceId: string | null
  productCode: string
  action: ProductHubSpotSyncAction | 'noop'
  syncedAt: string
  ghOwnedFieldsChecksum: string | null

  /** Set to true when the Cloud Run endpoint is not deployed — the trace
   * is persisted but HubSpot hasn't ACK-ed yet. The retry worker consumes
   * this to requeue when the endpoint ships. */
  endpointNotDeployed?: boolean
}

export interface ProductHubSpotSyncFailedPayload {
  productId: string
  hubspotProductId: string | null
  sourceKind: string
  sourceId: string | null
  productCode: string
  action: ProductHubSpotSyncAction
  errorMessage: string
  attemptCount: number
  failedAt: string
}

export const publishProductHubSpotSynced = async (
  payload: ProductHubSpotSyncedPayload,
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.productCatalog,
      aggregateId: payload.productId,
      eventType: EVENT_TYPES.productHubSpotSynced,
      payload: { ...payload } as Record<string, unknown>
    },
    client
  )

export const publishProductHubSpotSyncFailed = async (
  payload: ProductHubSpotSyncFailedPayload,
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.productCatalog,
      aggregateId: payload.productId,
      eventType: EVENT_TYPES.productHubSpotSyncFailed,
      payload: { ...payload } as Record<string, unknown>
    },
    client
  )
