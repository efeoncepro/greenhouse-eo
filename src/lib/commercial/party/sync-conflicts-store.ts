import 'server-only'

import { getDb } from '@/lib/db'

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

interface DbConflictRow {
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
