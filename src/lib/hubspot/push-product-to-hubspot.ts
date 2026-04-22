import 'server-only'

import { query, withTransaction } from '@/lib/db'
import {
  archiveHubSpotGreenhouseProduct,
  createHubSpotGreenhouseProduct,
  updateHubSpotGreenhouseProduct
} from '@/lib/integrations/hubspot-greenhouse-service'
import { wasWrittenByHubSpotRecently } from '@/lib/sync/anti-ping-pong'
import { findExistingHubSpotProductBinding } from '@/lib/hubspot/find-existing-hubspot-product-binding'

import {
  adaptProductCatalogToHubSpotCreatePayload,
  adaptProductCatalogToHubSpotUpdatePayload,
  type ProductCatalogSyncSnapshot
} from './hubspot-product-payload-adapter'
import {
  publishProductHubSpotSyncFailed,
  publishProductHubSpotSynced,
  type ProductHubSpotSyncAction
} from './product-hubspot-events'
import {
  ProductNotFoundError,
  type ProductHubSpotPushAction,
  type ProductHubSpotPushInput,
  type ProductHubSpotPushResult,
  type ProductHubSpotSyncStatus,
  type ProductHubSpotTriggerEventType
} from './product-hubspot-types'

// TASK-547 Fase C — canonical outbound bridge from
// `greenhouse_commercial.product_catalog` → HubSpot product object.
//
// Contract (mirrors TASK-524 invoice bridge):
//   1. Idempotent by `product_id` — calling twice with the same state is a no-op
//      on HubSpot and refreshes the trace row.
//   2. Never throws on missing id → skip (nothing actionable).
//   3. Never throws on `endpoint_not_deployed` — persists the trace so the
//      retry worker picks it up when the Cloud Run route ships.
//   4. Rethrows on network / 5xx so the reactive consumer retries with backoff.
//   5. Respects anti-ping-pong guard via `hubspot_last_write_at`: if the row
//      was written by Greenhouse within the last 60s, skip to avoid echoing
//      HubSpot webhook inbound writes.

interface ProductCatalogRow extends Record<string, unknown> {
  product_id: string
  product_code: string
  product_name: string
  description: string | null
  default_unit_price: string | number | null
  default_currency: string
  default_unit: string
  hubspot_product_id: string | null
  source_kind: string | null
  source_id: string | null
  business_line_code: string | null
  is_archived: boolean
  gh_owned_fields_checksum: string | null
  hubspot_sync_attempt_count: number | string | null
  hubspot_last_write_at: string | Date | null
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toAttemptCount = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const readProductCatalogRow = async (productId: string): Promise<ProductCatalogRow | null> => {
  const rows = await query<ProductCatalogRow>(
    `SELECT product_id, product_code, product_name, description,
            default_unit_price, default_currency, default_unit,
            hubspot_product_id, source_kind, source_id, business_line_code,
            is_archived, gh_owned_fields_checksum,
            hubspot_sync_attempt_count, hubspot_last_write_at
       FROM greenhouse_commercial.product_catalog
       WHERE product_id = $1
       LIMIT 1`,
    [productId]
  )

  return rows[0] ?? null
}

const buildSnapshot = (row: ProductCatalogRow, ghLastWriteAt: string): ProductCatalogSyncSnapshot => ({
  productId: row.product_id,
  productCode: row.product_code,
  productName: row.product_name,
  description: row.description,
  defaultUnitPrice: toNumberOrNull(row.default_unit_price),
  defaultCurrency: row.default_currency,
  defaultUnit: row.default_unit,
  isArchived: row.is_archived,
  sourceKind: row.source_kind ?? 'manual',
  sourceId: row.source_id,
  businessLineCode: row.business_line_code,
  ghLastWriteAt
})

const persistTrace = async (
  productId: string,
  updates: {
    hubspotSyncStatus: ProductHubSpotSyncStatus
    hubspotSyncError: string | null
    hubspotLastWriteAt?: string | null
    hubspotProductId?: string | null

    /** true → set attempt count to 0; false → increment */
    resetAttemptCount: boolean
  }
): Promise<void> => {
  const sets: string[] = [
    `hubspot_sync_status = $2`,
    `hubspot_sync_error = $3`,
    `hubspot_sync_attempt_count = CASE WHEN $4::boolean THEN 0 ELSE hubspot_sync_attempt_count + 1 END`,
    `updated_at = CURRENT_TIMESTAMP`
  ]

  const values: unknown[] = [productId, updates.hubspotSyncStatus, updates.hubspotSyncError, updates.resetAttemptCount]

  if (updates.hubspotLastWriteAt !== undefined) {
    sets.push(`hubspot_last_write_at = $${values.length + 1}`)
    values.push(updates.hubspotLastWriteAt)
    sets.push(`last_outbound_sync_at = $${values.length + 1}`)
    values.push(updates.hubspotLastWriteAt)
  }

  if (updates.hubspotProductId !== undefined) {
    sets.push(`hubspot_product_id = $${values.length + 1}`)
    values.push(updates.hubspotProductId)
  }

  await query(
    `UPDATE greenhouse_commercial.product_catalog
       SET ${sets.join(', ')}
     WHERE product_id = $1`,
    values
  )
}

const deriveAction = (
  row: ProductCatalogRow,
  eventType: ProductHubSpotTriggerEventType | null | undefined
): ProductHubSpotPushAction | 'noop' => {
  if (eventType === 'commercial.product_catalog.archived' || row.is_archived) {
    return row.hubspot_product_id ? 'archived' : 'noop'
  }

  if (eventType === 'commercial.product_catalog.unarchived') {
    return row.hubspot_product_id ? 'unarchived' : 'created'
  }

  return row.hubspot_product_id ? 'updated' : 'created'
}

const hitsAntiPingPong = (row: ProductCatalogRow): boolean => {
  return wasWrittenByHubSpotRecently(row.hubspot_last_write_at)
}

const bindExistingHubSpotProductId = async (
  productId: string,
  hubspotProductId: string
): Promise<void> => {
  await query(
    `UPDATE greenhouse_commercial.product_catalog
        SET hubspot_product_id = $2,
            updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $1`,
    [productId, hubspotProductId]
  )
}

export const pushProductToHubSpot = async (
  input: ProductHubSpotPushInput
): Promise<ProductHubSpotPushResult> => {
  const { productId, eventType = null, actorId = null } = input

  const existing = await readProductCatalogRow(productId)

  if (!existing) {
    throw new ProductNotFoundError(productId)
  }

  // ── Anti-ping-pong guard ──
  if (hitsAntiPingPong(existing)) {
    await publishProductHubSpotSynced({
      productId,
      hubspotProductId: existing.hubspot_product_id,
      sourceKind: existing.source_kind ?? 'manual',
      sourceId: existing.source_id,
      productCode: existing.product_code,
      action: 'noop',
      syncedAt: new Date().toISOString(),
      ghOwnedFieldsChecksum: existing.gh_owned_fields_checksum
    })

    return {
      status: 'skipped_no_anchors',
      action: 'noop',
      productId,
      hubspotProductId: existing.hubspot_product_id,
      reason: 'anti_ping_pong_window'
    }
  }

  if (!existing.hubspot_product_id && !existing.is_archived) {
    const binding = await findExistingHubSpotProductBinding(existing.product_code)

    if (binding.status === 'matched') {
      await bindExistingHubSpotProductId(productId, binding.item.hubspotProductId)
      existing.hubspot_product_id = binding.item.hubspotProductId
    }
  }

  const action = deriveAction(existing, eventType)

  if (action === 'noop') {
    // Archive event received but no hubspot_product_id → nothing actionable.
    await publishProductHubSpotSynced({
      productId,
      hubspotProductId: null,
      sourceKind: existing.source_kind ?? 'manual',
      sourceId: existing.source_id,
      productCode: existing.product_code,
      action: 'noop',
      syncedAt: new Date().toISOString(),
      ghOwnedFieldsChecksum: existing.gh_owned_fields_checksum
    })

    return {
      status: 'skipped_no_anchors',
      action: 'noop',
      productId,
      hubspotProductId: null,
      reason: 'archive_without_hubspot_id'
    }
  }

  const writeStamp = new Date().toISOString()
  const snapshot = buildSnapshot(existing, writeStamp)

  try {
    if (action === 'created') {
      const createPayload = adaptProductCatalogToHubSpotCreatePayload(snapshot)
      const createResponse = await createHubSpotGreenhouseProduct(createPayload)
      const hubspotProductId = createResponse.hubspotProductId

      if (!hubspotProductId) {
        throw new Error('HubSpot service returned empty hubspotProductId on create')
      }

      await withTransaction(async client => {
        await client.query(
          `UPDATE greenhouse_commercial.product_catalog
             SET hubspot_product_id = $2,
                 last_outbound_sync_at = $3,
                 hubspot_last_write_at = $3,
                 hubspot_sync_status = 'synced',
                 hubspot_sync_error = NULL,
                 hubspot_sync_attempt_count = 0,
                 updated_at = CURRENT_TIMESTAMP
           WHERE product_id = $1`,
          [productId, hubspotProductId, writeStamp]
        )
        await publishProductHubSpotSynced(
          {
            productId,
            hubspotProductId,
            sourceKind: snapshot.sourceKind,
            sourceId: snapshot.sourceId,
            productCode: snapshot.productCode,
            action: 'created',
            syncedAt: writeStamp,
            ghOwnedFieldsChecksum: existing.gh_owned_fields_checksum
          },
          client
        )
      })

      void actorId // reserved for future audit enrichment

      return { status: 'synced', action: 'created', productId, hubspotProductId }
    }

    if (action === 'archived') {
      const response = await archiveHubSpotGreenhouseProduct(existing.hubspot_product_id!)

      if (response.status === 'endpoint_not_deployed') {
        await persistTrace(productId, {
          hubspotSyncStatus: 'endpoint_not_deployed',
          hubspotSyncError: response.message ?? null,
          resetAttemptCount: false
        })
        await publishProductHubSpotSynced({
          productId,
          hubspotProductId: existing.hubspot_product_id,
          sourceKind: snapshot.sourceKind,
          sourceId: snapshot.sourceId,
          productCode: snapshot.productCode,
          action: 'archived',
          syncedAt: writeStamp,
          ghOwnedFieldsChecksum: existing.gh_owned_fields_checksum,
          endpointNotDeployed: true
        })

        return {
          status: 'endpoint_not_deployed',
          action: 'archived',
          productId,
          hubspotProductId: existing.hubspot_product_id,
          reason: response.message
        }
      }

      await persistTrace(productId, {
        hubspotSyncStatus: 'synced',
        hubspotSyncError: null,
        hubspotLastWriteAt: writeStamp,
        resetAttemptCount: true
      })
      await publishProductHubSpotSynced({
        productId,
        hubspotProductId: existing.hubspot_product_id,
        sourceKind: snapshot.sourceKind,
        sourceId: snapshot.sourceId,
        productCode: snapshot.productCode,
        action: 'archived',
        syncedAt: writeStamp,
        ghOwnedFieldsChecksum: existing.gh_owned_fields_checksum
      })

      return {
        status: 'synced',
        action: 'archived',
        productId,
        hubspotProductId: existing.hubspot_product_id
      }
    }

    // update OR unarchive → PATCH /products/:id
    const updatePayload = adaptProductCatalogToHubSpotUpdatePayload(snapshot)
    const updateResponse = await updateHubSpotGreenhouseProduct(existing.hubspot_product_id!, updatePayload)

    if (updateResponse.status === 'endpoint_not_deployed') {
      await persistTrace(productId, {
        hubspotSyncStatus: 'endpoint_not_deployed',
        hubspotSyncError: updateResponse.message ?? null,
        resetAttemptCount: false
      })
      await publishProductHubSpotSynced({
        productId,
        hubspotProductId: existing.hubspot_product_id,
        sourceKind: snapshot.sourceKind,
        sourceId: snapshot.sourceId,
        productCode: snapshot.productCode,
        action,
        syncedAt: writeStamp,
        ghOwnedFieldsChecksum: existing.gh_owned_fields_checksum,
        endpointNotDeployed: true
      })

      return {
        status: 'endpoint_not_deployed',
        action,
        productId,
        hubspotProductId: existing.hubspot_product_id,
        reason: updateResponse.message
      }
    }

    await persistTrace(productId, {
      hubspotSyncStatus: 'synced',
      hubspotSyncError: null,
      hubspotLastWriteAt: writeStamp,
      resetAttemptCount: true
    })
    await publishProductHubSpotSynced({
      productId,
      hubspotProductId: existing.hubspot_product_id,
      sourceKind: snapshot.sourceKind,
      sourceId: snapshot.sourceId,
      productCode: snapshot.productCode,
      action,
      syncedAt: writeStamp,
      ghOwnedFieldsChecksum: existing.gh_owned_fields_checksum
    })

    return {
      status: 'synced',
      action,
      productId,
      hubspotProductId: existing.hubspot_product_id
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'HubSpot product sync failed'
    const attemptCount = toAttemptCount(existing.hubspot_sync_attempt_count) + 1

    await persistTrace(productId, {
      hubspotSyncStatus: 'failed',
      hubspotSyncError: errMsg.slice(0, 500),
      resetAttemptCount: false
    })

    // Only emit the failure event for actions that actually touched HubSpot.
    const failureAction: ProductHubSpotSyncAction =
      action === 'created' || action === 'updated' || action === 'archived' || action === 'unarchived'
        ? action
        : 'updated'

    await publishProductHubSpotSyncFailed({
      productId,
      hubspotProductId: existing.hubspot_product_id,
      sourceKind: snapshot.sourceKind,
      sourceId: snapshot.sourceId,
      productCode: snapshot.productCode,
      action: failureAction,
      errorMessage: errMsg,
      attemptCount,
      failedAt: new Date().toISOString()
    })

    throw error
  }
}
