import 'server-only'

import { query } from '@/lib/db'

import type { ProductSourceKind } from './product-catalog/types'

export interface CommercialProductCatalogEntry {
  productId: string
  financeProductId: string | null
  hubspotProductId: string | null
  productCode: string
  productName: string
  productType: string
  pricingModel: string | null
  businessLineCode: string | null
  defaultCurrency: string
  defaultUnitPrice: number | null
  defaultUnit: string
  suggestedRoleCode: string | null
  suggestedHours: number | null
  description: string | null
  active: boolean
  syncStatus: string
  syncDirection: string
  sourceSystem: string
  sourceKind: ProductSourceKind | null
  sourceId: string | null
  sourceVariantKey: string | null
  isArchived: boolean
  archivedAt: string | null
  archivedBy: string | null
  lastOutboundSyncAt: string | null
  lastDriftCheckAt: string | null
  ghOwnedFieldsChecksum: string | null
  legacySku: string | null
  legacyCategory: string | null
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

type CommercialProductCatalogRow = {
  product_id: string
  finance_product_id: string | null
  hubspot_product_id: string | null
  product_code: string
  product_name: string
  product_type: string
  pricing_model: string | null
  business_line_code: string | null
  default_currency: string
  default_unit_price: string | number | null
  default_unit: string
  suggested_role_code: string | null
  suggested_hours: string | number | null
  description: string | null
  active: boolean
  sync_status: string
  sync_direction: string
  source_system: string
  source_kind: string | null
  source_id: string | null
  source_variant_key: string | null
  is_archived: boolean
  archived_at: string | Date | null
  archived_by: string | null
  last_outbound_sync_at: string | Date | null
  last_drift_check_at: string | Date | null
  gh_owned_fields_checksum: string | null
  legacy_sku: string | null
  legacy_category: string | null
  last_synced_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

const toNullableNum = (value: unknown): number | null => {
  if (value == null) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toTimestampString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return value
}

const mapRow = (row: CommercialProductCatalogRow): CommercialProductCatalogEntry => ({
  productId: row.product_id,
  financeProductId: row.finance_product_id,
  hubspotProductId: row.hubspot_product_id,
  productCode: row.product_code,
  productName: row.product_name,
  productType: row.product_type,
  pricingModel: row.pricing_model,
  businessLineCode: row.business_line_code,
  defaultCurrency: row.default_currency,
  defaultUnitPrice: toNullableNum(row.default_unit_price),
  defaultUnit: row.default_unit,
  suggestedRoleCode: row.suggested_role_code,
  suggestedHours: toNullableNum(row.suggested_hours),
  description: row.description,
  active: Boolean(row.active),
  syncStatus: row.sync_status,
  syncDirection: row.sync_direction,
  sourceSystem: row.source_system,
  sourceKind: (row.source_kind as ProductSourceKind | null) ?? null,
  sourceId: row.source_id,
  sourceVariantKey: row.source_variant_key,
  isArchived: Boolean(row.is_archived),
  archivedAt: toTimestampString(row.archived_at),
  archivedBy: row.archived_by,
  lastOutboundSyncAt: toTimestampString(row.last_outbound_sync_at),
  lastDriftCheckAt: toTimestampString(row.last_drift_check_at),
  ghOwnedFieldsChecksum: row.gh_owned_fields_checksum,
  legacySku: row.legacy_sku,
  legacyCategory: row.legacy_category,
  lastSyncedAt: toTimestampString(row.last_synced_at),
  createdAt: toTimestampString(row.created_at) ?? '',
  updatedAt: toTimestampString(row.updated_at) ?? ''
})

export interface ListCommercialProductCatalogInput {
  search?: string | null
  source?: string | null
  active?: boolean | null
  businessLineCode?: string | null
  sourceKind?: ProductSourceKind | null
  includeArchived?: boolean
  limit?: number | null
  offset?: number | null
}

export const listCommercialProductCatalog = async (
  input: ListCommercialProductCatalogInput = {}
): Promise<{ items: CommercialProductCatalogEntry[]; total: number }> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (condition: string, value: unknown) => {
    idx += 1
    conditions.push(condition.replace('$?', `$${idx}`))
    values.push(value)
  }

  if (input.search) {
    const search = input.search.trim()

    if (search) {
      idx += 1
      const searchParam = `%${search}%`

      conditions.push(`(product_name ILIKE $${idx} OR product_code ILIKE $${idx} OR legacy_sku ILIKE $${idx})`)
      values.push(searchParam)
    }
  }

  if (input.source) push('source_system = $?', input.source)
  if (input.active != null) push('active = $?', input.active)
  if (input.businessLineCode) push('business_line_code = $?', input.businessLineCode)
  if (input.sourceKind) push('source_kind = $?', input.sourceKind)

  // Default behavior: hide archived products from selectors and lists.
  // Callers must pass `includeArchived: true` explicitly to surface them
  // (Admin Center, drift reconciler).
  if (!input.includeArchived) {
    conditions.push('is_archived = FALSE')
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.max(1, Math.min(500, input.limit ?? 200))
  const offset = Math.max(0, input.offset ?? 0)

  const rows = await query<CommercialProductCatalogRow>(
    `SELECT product_id, finance_product_id, hubspot_product_id, product_code, product_name,
            product_type, pricing_model, business_line_code, default_currency, default_unit_price,
            default_unit, suggested_role_code, suggested_hours, description, active,
            sync_status, sync_direction, source_system, source_kind, source_id, source_variant_key,
            is_archived, archived_at, archived_by, last_outbound_sync_at, last_drift_check_at,
            gh_owned_fields_checksum, legacy_sku, legacy_category,
            last_synced_at, created_at, updated_at
     FROM greenhouse_commercial.product_catalog
     ${whereClause}
     ORDER BY is_archived ASC, active DESC, product_name ASC
     LIMIT ${limit} OFFSET ${offset}`,
    values
  )

  const countRows = await query<{ total: string | number }>(
    `SELECT COUNT(*)::bigint AS total
     FROM greenhouse_commercial.product_catalog
     ${whereClause}`,
    values
  )

  const total = Number(countRows[0]?.total ?? 0)

  return { items: rows.map(mapRow), total }
}

export const getCommercialProduct = async (
  productIdOrFinanceId: string
): Promise<CommercialProductCatalogEntry | null> => {
  const rows = await query<CommercialProductCatalogRow>(
    `SELECT product_id, finance_product_id, hubspot_product_id, product_code, product_name,
            product_type, pricing_model, business_line_code, default_currency, default_unit_price,
            default_unit, suggested_role_code, suggested_hours, description, active,
            sync_status, sync_direction, source_system, source_kind, source_id, source_variant_key,
            is_archived, archived_at, archived_by, last_outbound_sync_at, last_drift_check_at,
            gh_owned_fields_checksum, legacy_sku, legacy_category,
            last_synced_at, created_at, updated_at
     FROM greenhouse_commercial.product_catalog
     WHERE product_id = $1 OR finance_product_id = $1
     LIMIT 1`,
    [productIdOrFinanceId]
  )

  const row = rows[0]

  return row ? mapRow(row) : null
}
