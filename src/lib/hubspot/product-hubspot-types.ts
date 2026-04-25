import 'server-only'

// TASK-547 Fase C — canonical types for the Product Catalog → HubSpot
// outbound bridge.
//
// `ProductHubSpotSyncStatus` mirrors the CHECK constraint on
// `greenhouse_commercial.product_catalog.hubspot_sync_status` (migration
// 20260421180531865). Drift between TS and SQL breaks the build — add new
// values to both places or to neither.

export const PRODUCT_HUBSPOT_SYNC_STATUSES = [
  'pending',
  'synced',
  'failed',
  'endpoint_not_deployed',
  'skipped_no_anchors'
] as const

export type ProductHubSpotSyncStatus = (typeof PRODUCT_HUBSPOT_SYNC_STATUSES)[number]

export type ProductHubSpotPushAction =
  | 'created'
  | 'updated'
  | 'archived'
  | 'unarchived'

export type ProductHubSpotTriggerEventType =
  | 'commercial.product_catalog.created'
  | 'commercial.product_catalog.updated'
  | 'commercial.product_catalog.archived'
  | 'commercial.product_catalog.unarchived'

export interface ProductHubSpotPushInput {
  productId: string
  eventType?: ProductHubSpotTriggerEventType | null
  actorId?: string | null
}

export interface ProductHubSpotPushResult {
  status: ProductHubSpotSyncStatus
  action: ProductHubSpotPushAction | 'noop'
  productId: string
  hubspotProductId: string | null
  reason?: string
}

export class ProductNotFoundError extends Error {
  public readonly productId: string

  constructor(productId: string) {
    super(`product_catalog row not found: ${productId}`)
    this.name = 'ProductNotFoundError'
    this.productId = productId
  }
}
