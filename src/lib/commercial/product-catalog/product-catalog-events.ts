import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type {
  ProductSourceKind,
  ProductSyncConflictResolution,
  ProductSyncConflictType
} from './types'

// TASK-545 Fase A: typed publishers for the commercial product catalog
// lifecycle and the drift-detection conflict flow. The emit points are
// enabled in Fase B (TASK-546) for catalog events and TASK-548 for conflict
// events; this module supplies the canonical payload shapes today so both
// the source-to-catalog materializer and the drift cron can import from a
// single place.

interface QueryableClient {
  query: (text: string, values?: unknown[]) => Promise<unknown>
}

// ── Catalog lifecycle payloads ─────────────────────────────────────────────

export interface ProductCatalogCreatedPayload {
  productId: string
  sourceKind: ProductSourceKind
  sourceId: string | null
  sourceVariantKey?: string | null
  productCode: string
  productName: string
  defaultUnitPrice: number | null
  defaultCurrency: string
  defaultUnit: string
  businessLineCode: string | null
  hubspotProductId: string | null
  ghOwnedFieldsChecksum: string
  isArchived: boolean
}

export interface ProductCatalogUpdatedPayload extends ProductCatalogCreatedPayload {
  changedFields: string[]
  previousChecksum: string | null
}

export interface ProductCatalogArchivedPayload {
  productId: string
  sourceKind: ProductSourceKind
  sourceId: string | null
  productCode: string
  archivedAt: string
  archivedBy: string | null
  reason?: string | null
}

export interface ProductCatalogUnarchivedPayload {
  productId: string
  sourceKind: ProductSourceKind
  sourceId: string | null
  productCode: string
  unarchivedAt: string
  unarchivedBy: string | null
}

const publishProductCatalogEvent = async <T extends { productId: string }>(
  eventType: string,
  payload: T,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.productCatalog,
      aggregateId: payload.productId,
      eventType,
      payload: { ...payload } as Record<string, unknown>
    },
    client
  )
}

export const publishProductCatalogCreated = async (
  payload: ProductCatalogCreatedPayload,
  client?: QueryableClient
) => publishProductCatalogEvent(EVENT_TYPES.productCatalogCreated, payload, client)

export const publishProductCatalogUpdated = async (
  payload: ProductCatalogUpdatedPayload,
  client?: QueryableClient
) => publishProductCatalogEvent(EVENT_TYPES.productCatalogUpdated, payload, client)

export const publishProductCatalogArchived = async (
  payload: ProductCatalogArchivedPayload,
  client?: QueryableClient
) => publishProductCatalogEvent(EVENT_TYPES.productCatalogArchived, payload, client)

export const publishProductCatalogUnarchived = async (
  payload: ProductCatalogUnarchivedPayload,
  client?: QueryableClient
) => publishProductCatalogEvent(EVENT_TYPES.productCatalogUnarchived, payload, client)

// ── Sync conflict payloads ─────────────────────────────────────────────────

export interface ProductSyncConflictDetectedPayload {
  conflictId: string
  productId: string | null
  hubspotProductId: string | null
  conflictType: ProductSyncConflictType
  detectedAt: string
  conflictingFields: Record<string, unknown> | null
  metadata?: Record<string, unknown>
}

export interface ProductSyncConflictResolvedPayload {
  conflictId: string
  productId: string | null
  hubspotProductId: string | null
  conflictType: ProductSyncConflictType
  resolutionStatus: Exclude<ProductSyncConflictResolution, 'pending'>
  resolvedBy: string | null
  resolutionAppliedAt: string
}

export const publishProductSyncConflictDetected = async (
  payload: ProductSyncConflictDetectedPayload,
  client?: QueryableClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.productSyncConflict,
      aggregateId: payload.conflictId,
      eventType: EVENT_TYPES.productSyncConflictDetected,
      payload: { ...payload } as Record<string, unknown>
    },
    client
  )

export const publishProductSyncConflictResolved = async (
  payload: ProductSyncConflictResolvedPayload,
  client?: QueryableClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.productSyncConflict,
      aggregateId: payload.conflictId,
      eventType: EVENT_TYPES.productSyncConflictResolved,
      payload: { ...payload } as Record<string, unknown>
    },
    client
  )
