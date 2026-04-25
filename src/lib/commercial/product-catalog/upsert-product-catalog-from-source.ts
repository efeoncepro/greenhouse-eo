import 'server-only'

import type { PoolClient } from 'pg'

import { computeGhOwnedFieldsChecksum } from './checksum'
import {
  publishProductCatalogArchived,
  publishProductCatalogCreated,
  publishProductCatalogUnarchived,
  publishProductCatalogUpdated
} from './product-catalog-events'
import type { GhOwnedFieldsSnapshot, ProductSourceKind } from './types'

// TASK-546 Fase B — canonical upsert helper for the source → product_catalog
// materializer.
//
// Responsibilities:
//   1. Lock the target row by (source_kind, source_id, source_variant_key).
//   2. Compute the new checksum.
//   3. Skip no-op events (same checksum + same archival state).
//   4. Upsert the row and return the product_id.
//   5. Emit the correct lifecycle event (created / updated / archived /
//      unarchived) in the SAME transaction.
//
// Pure function: no env reads, no flag checks — callers are responsible for
// guarding with `isProductSyncEnabled(sourceKind)` before invoking. This keeps
// the helper testable without env scaffolding.

export interface UpsertProductCatalogFromSourceInput {
  sourceKind: Exclude<ProductSourceKind, 'manual' | 'hubspot_imported'>
  sourceId: string
  sourceVariantKey?: string | null
  snapshot: GhOwnedFieldsSnapshot
}

export interface UpsertProductCatalogFromSourceResult {
  productId: string
  outcome: 'created' | 'updated' | 'archived' | 'unarchived' | 'noop'
  previousChecksum: string | null
  checksum: string
}

interface ExistingRow {
  product_id: string
  gh_owned_fields_checksum: string | null
  is_archived: boolean
  hubspot_product_id: string | null
  source_variant_key: string | null
}

const findPromotableHubSpotImportedRow = async (
  client: PoolClient,
  productCode: string
): Promise<ExistingRow | null> => {
  const result = await client.query<ExistingRow>(
    `
      SELECT product_id, gh_owned_fields_checksum, is_archived, hubspot_product_id, source_variant_key
      FROM greenhouse_commercial.product_catalog
      WHERE source_kind = 'hubspot_imported'
        AND source_id IS NULL
        AND legacy_sku = $1
      ORDER BY updated_at DESC, product_id ASC
      LIMIT 1
      FOR UPDATE
    `,
    [productCode]
  )

  return result.rows[0] ?? null
}

const diffSnapshotFields = (
  next: GhOwnedFieldsSnapshot,
  prevChecksum: string | null,
  nextChecksum: string
): string[] => {
  if (prevChecksum === nextChecksum) return []

  // We don't persist the previous snapshot fields, so we can't produce a
  // field-level diff without another round trip. Event consumers can fetch
  // the row themselves if they need a finer breakdown; for now the changed
  // list is reported as the full set of tracked fields, so downstream
  // consumers know the checksum rolled.
  return Object.keys(next)
}

const normalizeVariantKey = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()

  return trimmed.length === 0 ? null : trimmed
}

const generateProductId = (): string => {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  return `prd-${random}`
}

/**
 * Upsert a product_catalog row from a source catalog snapshot. Must be called
 * inside an active Postgres transaction so the row lock + event publish stay
 * atomic.
 *
 * Returns `outcome='noop'` (without emitting any event) if the row already
 * exists and the checksum + archival state are unchanged.
 */
export const upsertProductCatalogFromSource = async (
  client: PoolClient,
  input: UpsertProductCatalogFromSourceInput
): Promise<UpsertProductCatalogFromSourceResult> => {
  const variantKey = normalizeVariantKey(input.sourceVariantKey ?? null)
  const nextChecksum = computeGhOwnedFieldsChecksum(input.snapshot)

  const existingResult = await client.query<ExistingRow>(
    `
      SELECT product_id, gh_owned_fields_checksum, is_archived, hubspot_product_id, source_variant_key
      FROM greenhouse_commercial.product_catalog
      WHERE source_kind = $1
        AND source_id = $2
        AND COALESCE(source_variant_key, '') = COALESCE($3, '')
      FOR UPDATE
    `,
    [input.sourceKind, input.sourceId, variantKey]
  )

  const existing =
    existingResult.rows[0] ??
    (await findPromotableHubSpotImportedRow(client, input.snapshot.product_code))

  const previousChecksum = existing?.gh_owned_fields_checksum ?? null

  if (
    existing &&
    previousChecksum === nextChecksum &&
    existing.is_archived === input.snapshot.is_archived
  ) {
    return {
      productId: existing.product_id,
      outcome: 'noop',
      previousChecksum,
      checksum: nextChecksum
    }
  }

  const now = new Date().toISOString()
  const productId = existing?.product_id ?? generateProductId()

  // Determine lifecycle transition BEFORE mutation so downstream event choice
  // stays consistent even if the row gains new flags in the future.
  const isNewRow = !existing
  const wasArchived = existing?.is_archived === true
  const nowArchived = input.snapshot.is_archived === true

  if (isNewRow) {
    await client.query(
      `
        INSERT INTO greenhouse_commercial.product_catalog (
          product_id,
          source_kind,
          source_id,
          source_variant_key,
          product_code,
          product_name,
          product_type,
          pricing_model,
          business_line_code,
          default_currency,
          default_unit_price,
          default_unit,
          description,
          active,
          is_archived,
          archived_at,
          gh_owned_fields_checksum,
          legacy_sku,
          source_system,
          sync_status,
          sync_direction,
          created_by,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, 'task-546-materializer', 'local_only', 'greenhouse_only',
          'task-546-materializer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `,
      [
        productId,
        input.sourceKind,
        input.sourceId,
        variantKey,
        input.snapshot.product_code,
        input.snapshot.product_name,
        input.snapshot.product_type,
        input.snapshot.pricing_model,
        input.snapshot.business_line_code,
        input.snapshot.default_currency,
        input.snapshot.default_unit_price,
        input.snapshot.default_unit,
        input.snapshot.description,
        !nowArchived,
        nowArchived,
        nowArchived ? now : null,
        nextChecksum,
        input.snapshot.product_code
      ]
    )
  } else {
    await client.query(
      `
        UPDATE greenhouse_commercial.product_catalog
        SET
          source_kind = $2,
          source_id = $3,
          source_variant_key = $4,
          legacy_sku = COALESCE(legacy_sku, $5),
          product_code = $6,
          product_name = $7,
          product_type = $8,
          pricing_model = $9,
          business_line_code = $10,
          default_currency = $11,
          default_unit_price = $12,
          default_unit = $13,
          description = $14,
          active = $15,
          is_archived = $16,
          archived_at = CASE
            WHEN $16::boolean AND NOT is_archived THEN CURRENT_TIMESTAMP
            WHEN NOT $16::boolean THEN NULL
            ELSE archived_at
          END,
          gh_owned_fields_checksum = $17,
          source_system = 'task-546-materializer',
          sync_direction = 'greenhouse_only',
          updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $1
      `,
      [
        productId,
        input.sourceKind,
        input.sourceId,
        variantKey,
        input.snapshot.product_code,
        input.snapshot.product_code,
        input.snapshot.product_name,
        input.snapshot.product_type,
        input.snapshot.pricing_model,
        input.snapshot.business_line_code,
        input.snapshot.default_currency,
        input.snapshot.default_unit_price,
        input.snapshot.default_unit,
        input.snapshot.description,
        !nowArchived,
        nowArchived,
        nextChecksum
      ]
    )
  }

  // Emit the appropriate lifecycle event. The transition precedence matters:
  //   - New row → `created` (even if snapshot.is_archived=true; the materializer
  //     treats the created event as the canonical first publish).
  //   - Existing row flipping to archived → `archived`.
  //   - Existing row flipping from archived back to active → `unarchived`.
  //   - Otherwise → `updated` (checksum differs).

  const baseCatalogPayload = {
    productId,
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    sourceVariantKey: variantKey,
    productCode: input.snapshot.product_code,
    productName: input.snapshot.product_name,
    defaultUnitPrice: input.snapshot.default_unit_price,
    defaultCurrency: input.snapshot.default_currency,
    defaultUnit: input.snapshot.default_unit,
    businessLineCode: input.snapshot.business_line_code,
    hubspotProductId: existing?.hubspot_product_id ?? null,
    ghOwnedFieldsChecksum: nextChecksum,
    isArchived: nowArchived
  }

  let outcome: UpsertProductCatalogFromSourceResult['outcome']

  if (isNewRow) {
    outcome = 'created'
    await publishProductCatalogCreated(baseCatalogPayload, client)
  } else if (!wasArchived && nowArchived) {
    outcome = 'archived'
    await publishProductCatalogArchived(
      {
        productId,
        sourceKind: input.sourceKind,
        sourceId: input.sourceId,
        productCode: input.snapshot.product_code,
        archivedAt: now,
        archivedBy: 'task-546-materializer',
        reason: 'source_deactivated'
      },
      client
    )
  } else if (wasArchived && !nowArchived) {
    outcome = 'unarchived'
    await publishProductCatalogUnarchived(
      {
        productId,
        sourceKind: input.sourceKind,
        sourceId: input.sourceId,
        productCode: input.snapshot.product_code,
        unarchivedAt: now,
        unarchivedBy: 'task-546-materializer'
      },
      client
    )
  } else {
    outcome = 'updated'
    await publishProductCatalogUpdated(
      {
        ...baseCatalogPayload,
        changedFields: diffSnapshotFields(input.snapshot, previousChecksum, nextChecksum),
        previousChecksum
      },
      client
    )
  }

  return { productId, outcome, previousChecksum, checksum: nextChecksum }
}
