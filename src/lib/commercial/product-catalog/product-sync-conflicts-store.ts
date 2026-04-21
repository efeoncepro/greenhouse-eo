import 'server-only'

import { getDb } from '@/lib/db'

import type {
  ProductSyncConflictResolution,
  ProductSyncConflictRow,
  ProductSyncConflictType
} from './types'

// TASK-545 Fase A: minimal read/write helpers over
// `greenhouse_commercial.product_sync_conflicts`. Fase A only wires the
// insert + list-unresolved paths; TASK-548 drift cron becomes the main
// writer, and the Admin Center UI drives resolution via a PATCH route.

interface ConflictRow {
  conflict_id: string
  product_id: string | null
  hubspot_product_id: string | null
  conflict_type: string
  detected_at: Date
  conflicting_fields: Record<string, unknown> | null
  resolution_status: string
  resolution_applied_at: Date | null
  resolved_by: string | null
  metadata: Record<string, unknown>
}

const normalizeRow = (row: ConflictRow): ProductSyncConflictRow => ({
  conflictId: row.conflict_id,
  productId: row.product_id,
  hubspotProductId: row.hubspot_product_id,
  conflictType: row.conflict_type as ProductSyncConflictType,
  detectedAt: row.detected_at.toISOString(),
  conflictingFields: row.conflicting_fields,
  resolutionStatus: row.resolution_status as ProductSyncConflictResolution,
  resolutionAppliedAt: row.resolution_applied_at
    ? row.resolution_applied_at.toISOString()
    : null,
  resolvedBy: row.resolved_by,
  metadata: row.metadata ?? {}
})

export interface InsertConflictInput {
  productId: string | null
  hubspotProductId: string | null
  conflictType: ProductSyncConflictType
  conflictingFields?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
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

  return normalizeRow(inserted as unknown as ConflictRow)
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

  let query = db
    .selectFrom('greenhouse_commercial.product_sync_conflicts')
    .selectAll()
    .where('resolution_status', '=', 'pending')

  if (input.conflictType) {
    query = query.where('conflict_type', '=', input.conflictType)
  }

  if (input.productId) {
    query = query.where('product_id', '=', input.productId)
  }

  if (input.hubspotProductId) {
    query = query.where('hubspot_product_id', '=', input.hubspotProductId)
  }

  const rows = await query
    .orderBy('detected_at', 'desc')
    .limit(Math.min(Math.max(input.limit ?? 100, 1), 500))
    .execute()

  return rows.map(row => normalizeRow(row as unknown as ConflictRow))
}

export const countUnresolvedProductSyncConflictsByType = async (): Promise<
  Record<ProductSyncConflictType, number>
> => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_commercial.product_sync_conflicts')
    .select(eb => [
      'conflict_type',
      eb.fn.countAll<number>().as('count')
    ])
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
