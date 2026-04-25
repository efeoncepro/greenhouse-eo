import 'server-only'

import { getDb, query } from '@/lib/db'
import { pushProductToHubSpot } from '@/lib/hubspot/push-product-to-hubspot'
import { archiveHubSpotGreenhouseProduct } from '@/lib/integrations/hubspot-greenhouse-service'

import { recordPricingCatalogAudit } from '@/lib/commercial/pricing-catalog-audit-store'

import { computeGhOwnedFieldsChecksum } from './checksum'
import {
  getProductSyncConflictDetail,
  updateProductSyncConflictResolution
} from './product-sync-conflicts-store'
import type {
  GhOwnedFieldsSnapshot,
  ProductSourceKind,
  ProductSyncConflictAction,
  ProductSyncConflictActor,
  ProductSyncConflictDetail,
  ProductSyncConflictField,
  ProductSyncConflictRow
} from './types'
import { ProductCatalogError } from './types'

type ConflictHubSpotSnapshot = {
  hubspotProductId?: string | null
  gh_product_code?: string | null
  gh_source_kind?: string | null
  gh_last_write_at?: string | null
  name?: string | null
  sku?: string | null
  price?: number | null
  description?: string | null
  isArchived?: boolean
}

type ProductCatalogMutableRow = {
  product_id: string
  product_code: string
  product_name: string
  description: string | null
  default_unit_price: string | number | null
  default_currency: string
  default_unit: string
  product_type: string
  pricing_model: string | null
  business_line_code: string | null
  source_kind: string | null
  is_archived: boolean
  hubspot_product_id: string | null
}

export interface ResolveProductSyncConflictInput {
  conflictId: string
  action: ProductSyncConflictAction
  actor: ProductSyncConflictActor
  field?: ProductSyncConflictField | null
}

export interface ResolveProductSyncConflictResult {
  conflict: ProductSyncConflictRow
  action: ProductSyncConflictAction
  field?: ProductSyncConflictField | null
  pushStatus?: string
  adoptedProductId?: string | null
}

const ACCEPTABLE_SOURCE_KINDS: readonly ProductSourceKind[] = ['manual', 'hubspot_imported'] as const

const normalizeOptionalString = (value: unknown): string | null => {
  if (value == null) return null
  const trimmed = String(value).trim()

  return trimmed.length > 0 ? trimmed : null
}

const normalizeOptionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const requireConflict = async (conflictId: string): Promise<ProductSyncConflictDetail> => {
  const conflict = await getProductSyncConflictDetail(conflictId)

  if (!conflict) {
    throw new ProductCatalogError(
      'PRODUCT_SYNC_CONFLICT_NOT_FOUND',
      `Product sync conflict ${conflictId} was not found.`,
      404,
      { conflictId }
    )
  }

  return conflict
}

const readMutableProduct = async (productId: string): Promise<ProductCatalogMutableRow> => {
  const rows = await query<ProductCatalogMutableRow>(
    `SELECT product_id, product_code, product_name, description, default_unit_price,
            default_currency, default_unit, product_type, pricing_model, business_line_code,
            source_kind, is_archived, hubspot_product_id
       FROM greenhouse_commercial.product_catalog
      WHERE product_id = $1
      LIMIT 1`,
    [productId]
  )

  if (!rows[0]) {
    throw new ProductCatalogError(
      'PRODUCT_NOT_FOUND',
      `Product ${productId} was not found.`,
      404,
      { productId }
    )
  }

  return rows[0]
}

const buildSnapshotFromRow = (row: ProductCatalogMutableRow): GhOwnedFieldsSnapshot => ({
  product_code: row.product_code,
  product_name: row.product_name,
  description: row.description,
  default_unit_price: normalizeOptionalNumber(row.default_unit_price),
  default_currency: row.default_currency,
  default_unit: row.default_unit,
  product_type: row.product_type,
  pricing_model: row.pricing_model,
  business_line_code: row.business_line_code,
  is_archived: row.is_archived
})

const getHubSpotSnapshot = (conflict: ProductSyncConflictDetail): ConflictHubSpotSnapshot => {
  const candidate = conflict.metadata.hubspotSnapshot

  if (candidate && typeof candidate === 'object') {
    return candidate as ConflictHubSpotSnapshot
  }

  throw new ProductCatalogError(
    'PRODUCT_SYNC_CONFLICT_MISSING_HUBSPOT_SNAPSHOT',
    `Conflict ${conflict.conflictId} does not carry a HubSpot snapshot.`,
    422,
    { conflictId: conflict.conflictId }
  )
}

const recordConflictAudit = async ({
  conflict,
  actor,
  action,
  entityId,
  entitySku,
  changeSummary
}: {
  conflict: ProductSyncConflictDetail
  actor: ProductSyncConflictActor
  action: ProductSyncConflictAction
  entityId: string
  entitySku?: string | null
  changeSummary: Record<string, unknown>
}) => {
  await recordPricingCatalogAudit({
    entityType: 'product_catalog',
    entityId,
    entitySku: entitySku ?? null,
    action: 'updated',
    actorUserId: actor.userId ?? 'system',
    actorName: actor.actorName || actor.userId || 'system',
    changeSummary: {
      conflictId: conflict.conflictId,
      resolutionAction: action,
      ...changeSummary
    },
    notes: actor.reason?.trim() || null
  })
}

const finalizeResolution = async ({
  conflict,
  resolutionStatus,
  actor,
  action,
  metadataPatch
}: {
  conflict: ProductSyncConflictDetail
  resolutionStatus: 'resolved_greenhouse_wins' | 'resolved_hubspot_wins' | 'ignored'
  actor: ProductSyncConflictActor
  action: ProductSyncConflictAction
  metadataPatch?: Record<string, unknown>
}) => {
  const updated = await updateProductSyncConflictResolution({
    conflictId: conflict.conflictId,
    resolutionStatus,
    resolvedBy: actor.userId,
    metadataPatch: {
      resolutionAction: action,
      ...(actor.reason?.trim() ? { resolutionReason: actor.reason.trim() } : {}),
      ...(metadataPatch ?? {})
    }
  })

  if (!updated) {
    throw new ProductCatalogError(
      'PRODUCT_SYNC_CONFLICT_RESOLUTION_FAILED',
      `Conflict ${conflict.conflictId} could not be updated.`,
      500,
      { conflictId: conflict.conflictId }
    )
  }

  return updated
}

const buildAdoptedProductCode = async (snapshot: ConflictHubSpotSnapshot): Promise<string> => {
  const base =
    normalizeOptionalString(snapshot.gh_product_code) ??
    normalizeOptionalString(snapshot.sku) ??
    `PRD-HS-${String(snapshot.hubspotProductId ?? 'unknown').slice(-8).toUpperCase()}`

  const db = await getDb()

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`

    const existing = await db
      .selectFrom('greenhouse_commercial.product_catalog')
      .select('product_id')
      .where('product_code', '=', candidate)
      .executeTakeFirst()

    if (!existing) return candidate
  }

  throw new ProductCatalogError(
    'PRODUCT_CODE_GENERATION_FAILED',
    'Could not generate a unique product_code for the adopted HubSpot product.',
    500,
    { base }
  )
}

const adoptOrphanHubSpotProduct = async (
  conflict: ProductSyncConflictDetail,
  actor: ProductSyncConflictActor
) => {
  const snapshot = getHubSpotSnapshot(conflict)

  if (!conflict.hubspotProductId) {
    throw new ProductCatalogError(
      'PRODUCT_SYNC_CONFLICT_MISSING_HUBSPOT_ID',
      `Conflict ${conflict.conflictId} has no HubSpot product anchor.`,
      422,
      { conflictId: conflict.conflictId }
    )
  }

  const productCode = await buildAdoptedProductCode(snapshot)
  const now = new Date().toISOString()

  const ghSnapshot: GhOwnedFieldsSnapshot = {
    product_code: productCode,
    product_name: normalizeOptionalString(snapshot.name) ?? productCode,
    description: normalizeOptionalString(snapshot.description),
    default_unit_price: normalizeOptionalNumber(snapshot.price),
    default_currency: 'USD',
    default_unit: 'unit',
    product_type: 'service',
    pricing_model: 'fixed',
    business_line_code: null,
    is_archived: snapshot.isArchived === true
  }

  const checksum = computeGhOwnedFieldsChecksum(ghSnapshot)

  const rows = await query<{ product_id: string }>(
    `INSERT INTO greenhouse_commercial.product_catalog (
       hubspot_product_id,
       product_code,
       product_name,
       product_type,
       pricing_model,
       default_currency,
       default_unit_price,
       default_unit,
       description,
       active,
       sync_status,
       sync_direction,
       source_system,
       created_by,
       source_kind,
       source_id,
       source_variant_key,
       is_archived,
       archived_at,
       last_outbound_sync_at,
       last_drift_check_at,
       gh_owned_fields_checksum,
       hubspot_sync_status,
       hubspot_sync_error,
       hubspot_sync_attempt_count,
       hubspot_last_write_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       'synced', 'bidirectional', 'hubspot_import', 'task-548-adopt',
       'hubspot_imported', NULL, NULL, $11, CASE WHEN $11 THEN NOW() ELSE NULL END,
       NOW(), NOW(), $12, 'synced', NULL, 0, $13
     )
     RETURNING product_id`,
    [
      conflict.hubspotProductId,
      ghSnapshot.product_code,
      ghSnapshot.product_name,
      ghSnapshot.product_type,
      ghSnapshot.pricing_model,
      ghSnapshot.default_currency,
      ghSnapshot.default_unit_price,
      ghSnapshot.default_unit,
      ghSnapshot.description,
      !ghSnapshot.is_archived,
      ghSnapshot.is_archived,
      checksum,
      normalizeOptionalString(snapshot.gh_last_write_at) ?? now
    ]
  )

  const adoptedProductId = rows[0]?.product_id

  if (!adoptedProductId) {
    throw new ProductCatalogError(
      'PRODUCT_ADOPTION_FAILED',
      `HubSpot orphan ${conflict.hubspotProductId} could not be adopted into product_catalog.`,
      500
    )
  }

  await recordConflictAudit({
    conflict,
    actor,
    action: 'adopt_hubspot_product',
    entityId: adoptedProductId,
    entitySku: ghSnapshot.product_code,
    changeSummary: {
      adoptedFromHubSpotProductId: conflict.hubspotProductId,
      adoptedSnapshot: snapshot
    }
  })

  return {
    adoptedProductId,
    updatedConflict: await finalizeResolution({
      conflict,
      resolutionStatus: 'resolved_hubspot_wins',
      actor,
      action: 'adopt_hubspot_product',
      metadataPatch: {
        adoptedProductId
      }
    })
  }
}

const archiveOrphanInHubSpot = async (
  conflict: ProductSyncConflictDetail,
  actor: ProductSyncConflictActor
) => {
  if (!conflict.hubspotProductId) {
    throw new ProductCatalogError(
      'PRODUCT_SYNC_CONFLICT_MISSING_HUBSPOT_ID',
      `Conflict ${conflict.conflictId} has no HubSpot product anchor.`,
      422,
      { conflictId: conflict.conflictId }
    )
  }

  await archiveHubSpotGreenhouseProduct(conflict.hubspotProductId)

  await recordConflictAudit({
    conflict,
    actor,
    action: 'archive_hubspot_product',
    entityId: conflict.productId ?? conflict.hubspotProductId,
    entitySku: conflict.productCode,
    changeSummary: {
      archivedHubSpotProductId: conflict.hubspotProductId
    }
  })

  return finalizeResolution({
    conflict,
    resolutionStatus: 'resolved_greenhouse_wins',
    actor,
    action: 'archive_hubspot_product'
  })
}

const replayGreenhouseState = async (
  conflict: ProductSyncConflictDetail,
  actor: ProductSyncConflictActor
) => {
  if (!conflict.productId) {
    throw new ProductCatalogError(
      'PRODUCT_SYNC_CONFLICT_MISSING_PRODUCT_ID',
      `Conflict ${conflict.conflictId} has no local product anchor.`,
      422,
      { conflictId: conflict.conflictId }
    )
  }

  const result = await pushProductToHubSpot({ productId: conflict.productId, actorId: actor.userId })

  if (result.status !== 'synced') {
    throw new ProductCatalogError(
      'PRODUCT_HUBSPOT_REPLAY_NOT_SYNCED',
      `Replay for product ${conflict.productId} did not finish in synced state.`,
      409,
      result
    )
  }

  await recordConflictAudit({
    conflict,
    actor,
    action: 'replay_greenhouse',
    entityId: conflict.productId,
    entitySku: conflict.productCode,
    changeSummary: {
      pushStatus: result.status,
      pushAction: result.action,
      hubspotProductId: result.hubspotProductId
    }
  })

  const updatedConflict = await finalizeResolution({
    conflict,
    resolutionStatus: 'resolved_greenhouse_wins',
    actor,
    action: 'replay_greenhouse',
    metadataPatch: {
      replayResult: result
    }
  })

  return { updatedConflict, pushStatus: result.status }
}

const acceptHubSpotFieldValue = async (
  conflict: ProductSyncConflictDetail,
  actor: ProductSyncConflictActor,
  field: ProductSyncConflictField
) => {
  if (!conflict.productId) {
    throw new ProductCatalogError(
      'PRODUCT_SYNC_CONFLICT_MISSING_PRODUCT_ID',
      `Conflict ${conflict.conflictId} has no local product anchor.`,
      422,
      { conflictId: conflict.conflictId }
    )
  }

  if (!conflict.sourceKind || !ACCEPTABLE_SOURCE_KINDS.includes(conflict.sourceKind)) {
    throw new ProductCatalogError(
      'PRODUCT_SYNC_CONFLICT_UPSTREAM_SOURCE_LOCKED',
      'Accepting a HubSpot value is only supported for manual or hubspot_imported products.',
      409,
      { conflictId: conflict.conflictId, sourceKind: conflict.sourceKind }
    )
  }

  const snapshot = getHubSpotSnapshot(conflict)
  const existing = await readMutableProduct(conflict.productId)
  const next = buildSnapshotFromRow(existing)
  const changedFields: string[] = []

  const targetFields =
    field === 'all'
      ? ['productName', 'description', 'defaultUnitPrice', 'isArchived']
      : [field]

  for (const currentField of targetFields) {
    switch (currentField) {
      case 'productName': {
        const value = normalizeOptionalString(snapshot.name)

        if (value && value !== next.product_name) {
          next.product_name = value
          changedFields.push(currentField)
        }

        break
      }

      case 'description': {
        const value = normalizeOptionalString(snapshot.description)

        if (value !== next.description) {
          next.description = value
          changedFields.push(currentField)
        }

        break
      }

      case 'defaultUnitPrice': {
        const value = normalizeOptionalNumber(snapshot.price)

        if (value !== next.default_unit_price) {
          next.default_unit_price = value
          changedFields.push(currentField)
        }

        break
      }

      case 'isArchived': {
        const value = snapshot.isArchived === true

        if (value !== next.is_archived) {
          next.is_archived = value
          changedFields.push(currentField)
        }

        break
      }
    }
  }

  if (changedFields.length === 0) {
    throw new ProductCatalogError(
      'PRODUCT_SYNC_CONFLICT_NO_ACCEPTABLE_DIFF',
      'No HubSpot field delta was available to apply on the local product.',
      409,
      { conflictId: conflict.conflictId, field }
    )
  }

  const checksum = computeGhOwnedFieldsChecksum(next)

  await query(
    `UPDATE greenhouse_commercial.product_catalog
        SET product_name = $2,
            description = $3,
            default_unit_price = $4,
            is_archived = $5,
            active = $6,
            archived_at = CASE
              WHEN $5::boolean THEN COALESCE(archived_at, NOW())
              ELSE NULL
            END,
            gh_owned_fields_checksum = $7,
            updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $1`,
    [
      conflict.productId,
      next.product_name,
      next.description,
      next.default_unit_price,
      next.is_archived,
      !next.is_archived,
      checksum
    ]
  )

  await recordConflictAudit({
    conflict,
    actor,
    action: 'accept_hubspot_field',
    entityId: conflict.productId,
    entitySku: conflict.productCode,
    changeSummary: {
      acceptedField: field,
      changedFields,
      hubspotSnapshot: snapshot
    }
  })

  return finalizeResolution({
    conflict,
    resolutionStatus: 'resolved_hubspot_wins',
    actor,
    action: 'accept_hubspot_field',
    metadataPatch: {
      acceptedField: field,
      changedFields
    }
  })
}

const ignoreConflict = async (
  conflict: ProductSyncConflictDetail,
  actor: ProductSyncConflictActor
) => {
  await recordConflictAudit({
    conflict,
    actor,
    action: 'ignore',
    entityId: conflict.productId ?? conflict.hubspotProductId ?? conflict.conflictId,
    entitySku: conflict.productCode,
    changeSummary: {
      ignored: true
    }
  })

  return finalizeResolution({
    conflict,
    resolutionStatus: 'ignored',
    actor,
    action: 'ignore'
  })
}

export const resolveProductSyncConflict = async (
  input: ResolveProductSyncConflictInput
): Promise<ResolveProductSyncConflictResult> => {
  const conflict = await requireConflict(input.conflictId)

  const actor: ProductSyncConflictActor = {
    userId: input.actor.userId,
    actorName: input.actor.actorName || input.actor.userId || 'system',
    reason: input.actor.reason
  }

  switch (input.action) {
    case 'adopt_hubspot_product': {
      const { adoptedProductId, updatedConflict } = await adoptOrphanHubSpotProduct(conflict, actor)

      return {
        conflict: updatedConflict,
        action: input.action,
        adoptedProductId
      }
    }

    case 'archive_hubspot_product': {
      return {
        conflict: await archiveOrphanInHubSpot(conflict, actor),
        action: input.action
      }
    }

    case 'replay_greenhouse': {
      const { updatedConflict, pushStatus } = await replayGreenhouseState(conflict, actor)

      return {
        conflict: updatedConflict,
        action: input.action,
        pushStatus
      }
    }

    case 'accept_hubspot_field': {
      const field = input.field ?? 'all'

      return {
        conflict: await acceptHubSpotFieldValue(conflict, actor, field),
        action: input.action,
        field
      }
    }

    case 'ignore':
      return {
        conflict: await ignoreConflict(conflict, actor),
        action: input.action
      }
  }
}
