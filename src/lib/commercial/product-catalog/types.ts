import 'server-only'

// TASK-545 Fase A: canonical types for the commercial product catalog sync.
//
// These mirror the CHECK constraints on `greenhouse_commercial.product_catalog`
// (DDL migration 20260421122806370) and `product_sync_conflicts` (migration
// 20260421122812484). Drift between the TS union and SQL CHECK will break the
// build — add new values to both places or to neither.

export const PRODUCT_SOURCE_KINDS = [
  'sellable_role',
  'sellable_role_variant',
  'tool',
  'overhead_addon',
  'service',
  'manual',
  'hubspot_imported'
] as const

export type ProductSourceKind = (typeof PRODUCT_SOURCE_KINDS)[number]

export const PRODUCT_SYNC_CONFLICT_TYPES = [
  'orphan_in_hubspot',
  'orphan_in_greenhouse',
  'field_drift',
  'sku_collision',
  'archive_mismatch'
] as const

export type ProductSyncConflictType = (typeof PRODUCT_SYNC_CONFLICT_TYPES)[number]

export const PRODUCT_SYNC_CONFLICT_RESOLUTIONS = [
  'pending',
  'resolved_greenhouse_wins',
  'resolved_hubspot_wins',
  'ignored'
] as const

export type ProductSyncConflictResolution = (typeof PRODUCT_SYNC_CONFLICT_RESOLUTIONS)[number]

// ── Shape of the fields used to compute gh_owned_fields_checksum ───────────
// Order is load-bearing — changing it invalidates every existing checksum.
// See GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1 §5.1 and
// src/lib/commercial/product-catalog/checksum.ts.
export interface GhOwnedFieldsSnapshot {
  product_code: string
  product_name: string
  description: string | null
  default_unit_price: number | null
  default_currency: string
  default_unit: string
  product_type: string
  pricing_model: string | null
  business_line_code: string | null
  is_archived: boolean
}

// ── Conflict row (read model) ──────────────────────────────────────────────
export interface ProductSyncConflictRow {
  conflictId: string
  productId: string | null
  hubspotProductId: string | null
  conflictType: ProductSyncConflictType
  detectedAt: string
  conflictingFields: Record<string, unknown> | null
  resolutionStatus: ProductSyncConflictResolution
  resolutionAppliedAt: string | null
  resolvedBy: string | null
  metadata: Record<string, unknown>
}

// ── Error classes ──────────────────────────────────────────────────────────

export class ProductCatalogError extends Error {
  code: string
  statusCode: number
  details?: unknown

  constructor(code: string, message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'ProductCatalogError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class ProductSourceKindMismatchError extends ProductCatalogError {
  constructor(productId: string, expected: ProductSourceKind, actual: ProductSourceKind) {
    super(
      'PRODUCT_SOURCE_KIND_MISMATCH',
      `Product ${productId} has source_kind=${actual}; command requires ${expected}.`,
      409,
      { productId, expected, actual }
    )
    this.name = 'ProductSourceKindMismatchError'
  }
}

export class ProductAlreadyArchivedError extends ProductCatalogError {
  constructor(productId: string) {
    super(
      'PRODUCT_ALREADY_ARCHIVED',
      `Product ${productId} is already archived; refuse to double-archive.`,
      409,
      { productId }
    )
    this.name = 'ProductAlreadyArchivedError'
  }
}

export class ProductNotArchivedError extends ProductCatalogError {
  constructor(productId: string) {
    super(
      'PRODUCT_NOT_ARCHIVED',
      `Product ${productId} is not archived; nothing to unarchive.`,
      409,
      { productId }
    )
    this.name = 'ProductNotArchivedError'
  }
}
