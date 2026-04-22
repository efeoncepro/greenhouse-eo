import 'server-only'

import { getDb, query } from '@/lib/db'

import {
  publishProductSyncConflictDetected,
  publishProductSyncConflictResolved
} from './product-catalog-events'
import type {
  ProductSourceKind,
  ProductSyncConflictDetail,
  ProductSyncConflictListItem,
  ProductSyncConflictResolution,
  ProductSyncConflictRow,
  ProductSyncConflictSummary,
  ProductSyncConflictType
} from './types'

interface DbConflictRow extends Record<string, unknown> {
  conflict_id: string
  product_id: string | null
  hubspot_product_id: string | null
  conflict_type: string
  detected_at: Date
  conflicting_fields: Record<string, unknown> | null
  resolution_status: string
  resolution_applied_at: Date | null
  resolved_by: string | null
  metadata: Record<string, unknown> | null
}

interface DbConflictListRow extends DbConflictRow {
  product_code: string | null
  product_name: string | null
  source_kind: string | null
  hubspot_sync_status: string | null
  is_archived: boolean | null
}

interface DbConflictDetailRow extends DbConflictListRow {
  finance_product_id: string | null
  source_id: string | null
  source_variant_key: string | null
  last_outbound_sync_at: Date | null
  last_drift_check_at: Date | null
}

const toIso = (value: Date | null): string | null => value?.toISOString() ?? null

const normalizeRow = (row: DbConflictRow): ProductSyncConflictRow => ({
  conflictId: row.conflict_id,
  productId: row.product_id,
  hubspotProductId: row.hubspot_product_id,
  conflictType: row.conflict_type as ProductSyncConflictType,
  detectedAt: row.detected_at.toISOString(),
  conflictingFields: row.conflicting_fields,
  resolutionStatus: row.resolution_status as ProductSyncConflictResolution,
  resolutionAppliedAt: toIso(row.resolution_applied_at),
  resolvedBy: row.resolved_by,
  metadata: row.metadata ?? {}
})

const normalizeListRow = (row: DbConflictListRow): ProductSyncConflictListItem => {
  const base = normalizeRow(row)

  return {
    ...base,
    productCode: row.product_code,
    productName: row.product_name,
    sourceKind: (row.source_kind as ProductSourceKind | null) ?? null,
    hubspotSyncStatus: row.hubspot_sync_status,
    isArchived: typeof row.is_archived === 'boolean' ? row.is_archived : null,
    autoHealEligible: row.metadata?.autoHealEligible === true
  }
}

const normalizeDetailRow = (row: DbConflictDetailRow): ProductSyncConflictDetail => ({
  ...normalizeListRow(row),
  financeProductId: row.finance_product_id,
  sourceId: row.source_id,
  sourceVariantKey: row.source_variant_key,
  lastOutboundSyncAt: toIso(row.last_outbound_sync_at),
  lastDriftCheckAt: toIso(row.last_drift_check_at)
})

export interface InsertConflictInput {
  productId: string | null
  hubspotProductId: string | null
  conflictType: ProductSyncConflictType
  conflictingFields?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
}

export interface UpsertConflictInput extends InsertConflictInput {
  resolutionStatus?: ProductSyncConflictResolution
  resolvedBy?: string | null
}

export const insertProductSyncConflict = async (
  input: InsertConflictInput
): Promise<ProductSyncConflictRow> => {
  const db = await getDb()

  const inserted = await db
    .insertInto('greenhouse_commercial.product_sync_conflicts')
    .values({
      product_id: input.productId,
      hubspot_product_id: input.hubspotProductId,
      conflict_type: input.conflictType,
      conflicting_fields: (input.conflictingFields ?? null) as never,
      metadata: (input.metadata ?? {}) as never
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  const normalized = normalizeRow(inserted as unknown as DbConflictRow)

  await publishProductSyncConflictDetected({
    conflictId: normalized.conflictId,
    productId: normalized.productId,
    hubspotProductId: normalized.hubspotProductId,
    conflictType: normalized.conflictType,
    detectedAt: normalized.detectedAt,
    conflictingFields: normalized.conflictingFields,
    metadata: normalized.metadata
  })

  return normalized
}

export const upsertProductSyncConflict = async (
  input: UpsertConflictInput
): Promise<{ conflict: ProductSyncConflictRow; inserted: boolean }> => {
  const existingRows = await query<DbConflictRow>(
    `SELECT conflict_id, product_id, hubspot_product_id, conflict_type, detected_at,
            conflicting_fields, resolution_status, resolution_applied_at, resolved_by, metadata
       FROM greenhouse_commercial.product_sync_conflicts
      WHERE resolution_status = 'pending'
        AND conflict_type = $1
        AND (
          ($2::text IS NOT NULL AND product_id = $2)
          OR ($3::text IS NOT NULL AND hubspot_product_id = $3)
        )
      ORDER BY detected_at DESC
      LIMIT 1`,
    [input.conflictType, input.productId, input.hubspotProductId]
  )

  if (!existingRows[0]) {
    return {
      conflict: await insertProductSyncConflict(input),
      inserted: true
    }
  }

  const rows = await query<DbConflictRow>(
    `UPDATE greenhouse_commercial.product_sync_conflicts
        SET detected_at = NOW(),
            conflicting_fields = $2::jsonb,
            metadata = $3::jsonb
      WHERE conflict_id = $1
      RETURNING conflict_id, product_id, hubspot_product_id, conflict_type, detected_at,
                conflicting_fields, resolution_status, resolution_applied_at, resolved_by, metadata`,
    [
      existingRows[0].conflict_id,
      JSON.stringify(input.conflictingFields ?? null),
      JSON.stringify(input.metadata ?? {})
    ]
  )

  return {
    conflict: normalizeRow(rows[0]),
    inserted: false
  }
}

export interface ListUnresolvedConflictsInput {
  conflictType?: ProductSyncConflictType
  productId?: string
  hubspotProductId?: string
  limit?: number
}

export const listUnresolvedProductSyncConflicts = async (
  input: ListUnresolvedConflictsInput = {}
): Promise<ProductSyncConflictRow[]> => {
  const db = await getDb()

  let statement = db
    .selectFrom('greenhouse_commercial.product_sync_conflicts')
    .selectAll()
    .where('resolution_status', '=', 'pending')

  if (input.conflictType) statement = statement.where('conflict_type', '=', input.conflictType)
  if (input.productId) statement = statement.where('product_id', '=', input.productId)
  if (input.hubspotProductId) statement = statement.where('hubspot_product_id', '=', input.hubspotProductId)

  const rows = await statement
    .orderBy('detected_at', 'desc')
    .limit(Math.min(Math.max(input.limit ?? 100, 1), 500))
    .execute()

  return rows.map(row => normalizeRow(row as unknown as DbConflictRow))
}

export interface ListProductSyncConflictsInput {
  query?: string | null
  conflictType?: ProductSyncConflictType | null
  resolutionStatus?: ProductSyncConflictResolution | null
  limit?: number
  offset?: number
}

export const countUnresolvedProductSyncConflictsByType = async (): Promise<
  Record<ProductSyncConflictType, number>
> => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_commercial.product_sync_conflicts')
    .select(eb => ['conflict_type', eb.fn.countAll<number>().as('count')])
    .where('resolution_status', '=', 'pending')
    .groupBy('conflict_type')
    .execute()

  const result: Record<ProductSyncConflictType, number> = {
    orphan_in_hubspot: 0,
    orphan_in_greenhouse: 0,
    field_drift: 0,
    sku_collision: 0,
    archive_mismatch: 0
  }

  for (const row of rows) {
    const type = row.conflict_type as ProductSyncConflictType

    result[type] = Number(row.count)
  }

  return result
}

export const listProductSyncConflicts = async (
  input: ListProductSyncConflictsInput = {}
): Promise<{ items: ProductSyncConflictListItem[]; total: number; summary: ProductSyncConflictSummary }> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (fragment: string, value: unknown) => {
    idx += 1
    conditions.push(fragment.replaceAll('?', String(idx)))
    values.push(value)
  }

  const q = input.query?.trim()

  if (q) {
    const search = `%${q}%`

    push(
      `(COALESCE(p.product_name, '') ILIKE $? OR COALESCE(p.product_code, '') ILIKE $? OR COALESCE(c.hubspot_product_id, '') ILIKE $? OR c.conflict_type ILIKE $?)`,
      search
    )
    values.push(search, search, search)
    idx += 3
  }

  if (input.conflictType) push(`c.conflict_type = $?`, input.conflictType)
  if (input.resolutionStatus) push(`c.resolution_status = $?`, input.resolutionStatus)

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200))
  const offset = Math.max(0, input.offset ?? 0)

  const countRows = await query<{ total: string | number }>(
    `SELECT COUNT(*)::bigint AS total
       FROM greenhouse_commercial.product_sync_conflicts c
       LEFT JOIN greenhouse_commercial.product_catalog p
         ON p.product_id = c.product_id
       ${whereClause}`,
    values
  )

  const rows = await query<DbConflictListRow>(
    `SELECT
       c.conflict_id,
       c.product_id,
       c.hubspot_product_id,
       c.conflict_type,
       c.detected_at,
       c.conflicting_fields,
       c.resolution_status,
       c.resolution_applied_at,
       c.resolved_by,
       c.metadata,
       p.product_code,
       p.product_name,
       p.source_kind,
       p.hubspot_sync_status,
       p.is_archived
     FROM greenhouse_commercial.product_sync_conflicts c
     LEFT JOIN greenhouse_commercial.product_catalog p
       ON p.product_id = c.product_id
     ${whereClause}
     ORDER BY
       CASE WHEN c.resolution_status = 'pending' THEN 0 ELSE 1 END,
       c.detected_at DESC,
       c.conflict_id DESC
     LIMIT $${idx + 1}
     OFFSET $${idx + 2}`,
    [...values, limit, offset]
  )

  const byType = await countUnresolvedProductSyncConflictsByType()

  return {
    items: rows.map(normalizeListRow),
    total: Number(countRows[0]?.total ?? 0),
    summary: {
      totalUnresolved: Object.values(byType).reduce((acc, value) => acc + value, 0),
      byType
    }
  }
}

export const getProductSyncConflictById = async (
  conflictId: string
): Promise<ProductSyncConflictRow | null> => {
  const rows = await query<DbConflictRow>(
    `SELECT conflict_id, product_id, hubspot_product_id, conflict_type, detected_at,
            conflicting_fields, resolution_status, resolution_applied_at, resolved_by, metadata
       FROM greenhouse_commercial.product_sync_conflicts
      WHERE conflict_id = $1
      LIMIT 1`,
    [conflictId]
  )

  return rows[0] ? normalizeRow(rows[0]) : null
}

export const getProductSyncConflictDetail = async (
  conflictId: string
): Promise<ProductSyncConflictDetail | null> => {
  const rows = await query<DbConflictDetailRow>(
    `SELECT
       c.conflict_id,
       c.product_id,
       c.hubspot_product_id,
       c.conflict_type,
       c.detected_at,
       c.conflicting_fields,
       c.resolution_status,
       c.resolution_applied_at,
       c.resolved_by,
       c.metadata,
       p.finance_product_id,
       p.product_code,
       p.product_name,
       p.source_kind,
       p.source_id,
       p.source_variant_key,
       p.hubspot_sync_status,
       p.is_archived,
       p.last_outbound_sync_at,
       p.last_drift_check_at
      FROM greenhouse_commercial.product_sync_conflicts c
      LEFT JOIN greenhouse_commercial.product_catalog p
        ON p.product_id = c.product_id
     WHERE c.conflict_id = $1
     LIMIT 1`,
    [conflictId]
  )

  return rows[0] ? normalizeDetailRow(rows[0]) : null
}

export const updateProductSyncConflictResolution = async ({
  conflictId,
  resolutionStatus,
  resolvedBy,
  metadataPatch
}: {
  conflictId: string
  resolutionStatus: ProductSyncConflictResolution
  resolvedBy: string | null
  metadataPatch?: Record<string, unknown>
}): Promise<ProductSyncConflictRow | null> => {
  const rows = await query<DbConflictRow>(
    `UPDATE greenhouse_commercial.product_sync_conflicts
        SET resolution_status = $2,
            resolution_applied_at = CASE
              WHEN $2 = 'pending' THEN NULL
              ELSE NOW()
            END,
            resolved_by = CASE
              WHEN $2 = 'pending' THEN NULL
              ELSE $3
            END,
            metadata = CASE
              WHEN $4::jsonb IS NULL THEN metadata
              ELSE COALESCE(metadata, '{}'::jsonb) || $4::jsonb
            END
      WHERE conflict_id = $1
      RETURNING conflict_id, product_id, hubspot_product_id, conflict_type, detected_at,
                conflicting_fields, resolution_status, resolution_applied_at, resolved_by, metadata`,
    [
      conflictId,
      resolutionStatus,
      resolvedBy,
      metadataPatch ? JSON.stringify(metadataPatch) : null
    ]
  )

  const normalized = rows[0] ? normalizeRow(rows[0]) : null

  if (normalized && normalized.resolutionStatus !== 'pending') {
    await publishProductSyncConflictResolved({
      conflictId: normalized.conflictId,
      productId: normalized.productId,
      hubspotProductId: normalized.hubspotProductId,
      conflictType: normalized.conflictType,
      resolutionStatus: normalized.resolutionStatus,
      resolvedBy: normalized.resolvedBy,
      resolutionAppliedAt: normalized.resolutionAppliedAt ?? new Date().toISOString()
    })
  }

  return normalized
}

export const getProductSyncConflictAlertStats = async (windowHours = 24) => {
  const rows = await query<{
    unresolved_total: string | number
    sku_collision_total: string | number
    created_last_window: string | number
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE resolution_status = 'pending')::bigint AS unresolved_total,
       COUNT(*) FILTER (
         WHERE resolution_status = 'pending'
           AND conflict_type = 'sku_collision'
       )::bigint AS sku_collision_total,
       COUNT(*) FILTER (
         WHERE detected_at >= NOW() - ($1::text || ' hours')::interval
       )::bigint AS created_last_window
      FROM greenhouse_commercial.product_sync_conflicts`,
    [windowHours]
  )

  return {
    unresolvedTotal: Number(rows[0]?.unresolved_total ?? 0),
    skuCollisionTotal: Number(rows[0]?.sku_collision_total ?? 0),
    createdLastWindow: Number(rows[0]?.created_last_window ?? 0)
  }
}
