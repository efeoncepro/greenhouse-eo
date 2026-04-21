import 'server-only'

import { getDb, query } from '@/lib/db'

export const PARTY_SYNC_CONFLICT_TYPES = [
  'field_authority',
  'anti_ping_pong',
  'operator_override_hold'
] as const

export type PartySyncConflictType = (typeof PARTY_SYNC_CONFLICT_TYPES)[number]

export const PARTY_SYNC_CONFLICT_RESOLUTIONS = [
  'pending',
  'resolved_greenhouse_wins',
  'resolved_hubspot_wins',
  'ignored'
] as const

export type PartySyncConflictResolution = (typeof PARTY_SYNC_CONFLICT_RESOLUTIONS)[number]

export interface PartySyncConflictRow {
  conflictId: string
  organizationId: string | null
  commercialPartyId: string | null
  hubspotCompanyId: string | null
  conflictType: PartySyncConflictType
  detectedAt: string
  conflictingFields: Record<string, unknown> | null
  resolutionStatus: PartySyncConflictResolution
  resolutionAppliedAt: string | null
  resolvedBy: string | null
  metadata: Record<string, unknown>
}

export interface PartySyncConflictListItem extends PartySyncConflictRow {
  organizationName: string | null
  lifecycleStage: string | null
}

interface DbConflictRow extends Record<string, unknown> {
  conflict_id: string
  organization_id: string | null
  commercial_party_id: string | null
  hubspot_company_id: string | null
  conflict_type: string
  detected_at: Date
  conflicting_fields: Record<string, unknown> | null
  resolution_status: string
  resolution_applied_at: Date | null
  resolved_by: string | null
  metadata: Record<string, unknown> | null
}

interface DbConflictListRow extends DbConflictRow {
  organization_name: string | null
  lifecycle_stage: string | null
}

const normalizeRow = (row: DbConflictRow): PartySyncConflictRow => ({
  conflictId: row.conflict_id,
  organizationId: row.organization_id,
  commercialPartyId: row.commercial_party_id,
  hubspotCompanyId: row.hubspot_company_id,
  conflictType: row.conflict_type as PartySyncConflictType,
  detectedAt: row.detected_at.toISOString(),
  conflictingFields: row.conflicting_fields,
  resolutionStatus: row.resolution_status as PartySyncConflictResolution,
  resolutionAppliedAt: row.resolution_applied_at?.toISOString() ?? null,
  resolvedBy: row.resolved_by,
  metadata: row.metadata ?? {}
})

const normalizeListRow = (row: DbConflictListRow): PartySyncConflictListItem => ({
  ...normalizeRow(row),
  organizationName: row.organization_name ?? null,
  lifecycleStage: row.lifecycle_stage ?? null
})

export interface InsertPartySyncConflictInput {
  organizationId?: string | null
  commercialPartyId?: string | null
  hubspotCompanyId?: string | null
  conflictType: PartySyncConflictType
  conflictingFields?: Record<string, unknown> | null
  resolutionStatus?: PartySyncConflictResolution
  resolvedBy?: string | null
  metadata?: Record<string, unknown>
}

export interface ListPartySyncConflictsOptions {
  unresolvedOnly?: boolean
  query?: string | null
  limit?: number
  offset?: number
}

export const insertPartySyncConflict = async (
  input: InsertPartySyncConflictInput
): Promise<PartySyncConflictRow> => {
  const db = await getDb()

  const resolved =
    input.resolutionStatus && input.resolutionStatus !== 'pending'
      ? new Date()
      : null

  const inserted = await db
    .insertInto('greenhouse_commercial.party_sync_conflicts')
    .values({
      organization_id: input.organizationId ?? null,
      commercial_party_id: input.commercialPartyId ?? null,
      hubspot_company_id: input.hubspotCompanyId ?? null,
      conflict_type: input.conflictType,
      conflicting_fields: (input.conflictingFields ?? null) as never,
      resolution_status: input.resolutionStatus ?? 'pending',
      resolution_applied_at: resolved,
      resolved_by: resolved ? (input.resolvedBy ?? 'system') : null,
      metadata: (input.metadata ?? {}) as never
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return normalizeRow(inserted as unknown as DbConflictRow)
}

export const getPartySyncConflictById = async (
  conflictId: string
): Promise<PartySyncConflictRow | null> => {
  const rows = await query<DbConflictRow>(
    `SELECT
       conflict_id,
       organization_id,
       commercial_party_id,
       hubspot_company_id,
       conflict_type,
       detected_at,
       conflicting_fields,
       resolution_status,
       resolution_applied_at,
       resolved_by,
       metadata
     FROM greenhouse_commercial.party_sync_conflicts
     WHERE conflict_id = $1
     LIMIT 1`,
    [conflictId]
  )

  return rows[0] ? normalizeRow(rows[0]) : null
}

export const listPartySyncConflicts = async (
  options: ListPartySyncConflictsOptions = {}
): Promise<{ items: PartySyncConflictListItem[]; total: number }> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (fragment: string, value: unknown) => {
    idx += 1
    conditions.push(fragment.replaceAll('?', String(idx)))
    values.push(value)
  }

  if (options.unresolvedOnly !== false) {
    conditions.push(`c.resolution_status = 'pending'`)
  }

  const q = options.query?.trim()

  if (q) {
    push(
      `(COALESCE(s.organization_name, o.organization_name, '') ILIKE $? OR COALESCE(c.hubspot_company_id, '') ILIKE $? OR COALESCE(c.commercial_party_id, '') ILIKE $? OR COALESCE(c.organization_id, '') ILIKE $?)`,
      `%${q}%`
    )
    values.push(`%${q}%`, `%${q}%`, `%${q}%`)
    idx += 3
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.max(1, Math.min(options.limit ?? 50, 200))
  const offset = Math.max(0, options.offset ?? 0)

  const countRows = await query<{ total: string | number }>(
    `SELECT COUNT(*)::bigint AS total
       FROM greenhouse_commercial.party_sync_conflicts c
       LEFT JOIN greenhouse_serving.party_lifecycle_snapshots s
         ON s.organization_id = c.organization_id
       LEFT JOIN greenhouse_core.organizations o
         ON o.organization_id = c.organization_id
       ${whereClause}`,
    values
  )

  const rows = await query<DbConflictListRow>(
    `SELECT
       c.conflict_id,
       c.organization_id,
       c.commercial_party_id,
       c.hubspot_company_id,
       c.conflict_type,
       c.detected_at,
       c.conflicting_fields,
       c.resolution_status,
       c.resolution_applied_at,
       c.resolved_by,
       c.metadata,
       COALESCE(s.organization_name, o.organization_name) AS organization_name,
       s.lifecycle_stage
     FROM greenhouse_commercial.party_sync_conflicts c
     LEFT JOIN greenhouse_serving.party_lifecycle_snapshots s
       ON s.organization_id = c.organization_id
     LEFT JOIN greenhouse_core.organizations o
       ON o.organization_id = c.organization_id
     ${whereClause}
     ORDER BY c.detected_at DESC, c.conflict_id DESC
     LIMIT $${idx + 1}
     OFFSET $${idx + 2}`,
    [...values, limit, offset]
  )

  return {
    items: rows.map(normalizeListRow),
    total: Number(countRows[0]?.total ?? 0)
  }
}

export const updatePartySyncConflictResolution = async ({
  conflictId,
  resolutionStatus,
  resolvedBy,
  metadataPatch
}: {
  conflictId: string
  resolutionStatus: PartySyncConflictResolution
  resolvedBy: string | null
  metadataPatch?: Record<string, unknown>
}): Promise<PartySyncConflictRow | null> => {
  const rows = await query<DbConflictRow>(
    `UPDATE greenhouse_commercial.party_sync_conflicts
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
      RETURNING
        conflict_id,
        organization_id,
        commercial_party_id,
        hubspot_company_id,
        conflict_type,
        detected_at,
        conflicting_fields,
        resolution_status,
        resolution_applied_at,
        resolved_by,
        metadata`,
    [
      conflictId,
      resolutionStatus,
      resolvedBy,
      metadataPatch ? JSON.stringify(metadataPatch) : null
    ]
  )

  return rows[0] ? normalizeRow(rows[0]) : null
}
