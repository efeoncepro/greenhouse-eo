import 'server-only'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'
import { recordEngagementAuditEvent } from './audit-log'
import { assertEngagementServiceEligible, buildEligibleServicePredicate } from './eligibility'
import { publishEngagementEvent } from './engagement-events'
import { isUniqueConstraintError, toDateString, toIsoDateKey, toTimestampString, trimRequired } from './shared'

export interface EngagementProgressSnapshot {
  snapshotId: string
  serviceId: string
  snapshotDate: string
  metrics: Record<string, unknown>
  qualitativeNotes: string | null
  recordedBy: string | null
  recordedAt: string
}

export interface RecordProgressSnapshotInput {
  serviceId: string
  snapshotDate: Date | string
  metricsJson: Record<string, unknown>
  qualitativeNotes?: string | null
  recordedBy: string
}

interface ProgressSnapshotRow extends Record<string, unknown> {
  snapshot_id: string
  service_id: string
  snapshot_date: Date | string
  metrics_json: Record<string, unknown>
  qualitative_notes: string | null
  recorded_by: string | null
  recorded_at: Date | string
}

interface EngagementKindRow extends Record<string, unknown> {
  engagement_kind: string
}

export class EngagementProgressValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementProgressValidationError'
  }
}

export class EngagementProgressConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementProgressConflictError'
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const normalizeSnapshot = (row: ProgressSnapshotRow): EngagementProgressSnapshot => ({
  snapshotId: row.snapshot_id,
  serviceId: row.service_id,
  snapshotDate: toDateString(row.snapshot_date) ?? '',
  metrics: row.metrics_json,
  qualitativeNotes: row.qualitative_notes,
  recordedBy: row.recorded_by,
  recordedAt: toTimestampString(row.recorded_at) ?? ''
})

const assertRecordProgressSnapshotInput = (input: RecordProgressSnapshotInput) => {
  const serviceId = trimRequired(input.serviceId, 'serviceId')
  const recordedBy = trimRequired(input.recordedBy, 'recordedBy')
  const snapshotDate = toIsoDateKey(input.snapshotDate, 'snapshotDate')
  const qualitativeNotes = input.qualitativeNotes?.trim() || null

  if (!isPlainObject(input.metricsJson) || Object.keys(input.metricsJson).length === 0) {
    throw new EngagementProgressValidationError('metricsJson must be a non-empty object.')
  }

  if (qualitativeNotes != null && qualitativeNotes.length < 3) {
    throw new EngagementProgressValidationError('qualitativeNotes must have at least 3 characters when provided.')
  }

  return {
    serviceId,
    snapshotDate,
    metricsJson: input.metricsJson,
    qualitativeNotes,
    recordedBy
  }
}

const assertNonRegularEngagementService = async (
  client: PoolClient,
  serviceId: string
): Promise<void> => {
  const result = await client.query<EngagementKindRow>(
    `SELECT engagement_kind
     FROM greenhouse_core.services
     WHERE service_id = $1
     LIMIT 1`,
    [serviceId]
  )

  const engagementKind = result.rows[0]?.engagement_kind

  if (engagementKind === 'regular') {
    throw new EngagementProgressValidationError('Regular services cannot receive engagement progress snapshots.')
  }

  if (!engagementKind) {
    throw new EngagementProgressValidationError(`Service ${serviceId} does not exist.`)
  }
}

export const recordProgressSnapshot = async (
  input: RecordProgressSnapshotInput
): Promise<{ snapshotId: string }> => {
  const normalized = assertRecordProgressSnapshotInput(input)

  try {
    return await withTransaction(async client => {
      await assertEngagementServiceEligible(client, normalized.serviceId)
      await assertNonRegularEngagementService(client, normalized.serviceId)

      const result = await client.query<{ snapshot_id: string }>(
        `INSERT INTO greenhouse_commercial.engagement_progress_snapshots (
           service_id, snapshot_date, metrics_json, qualitative_notes, recorded_by
         ) VALUES (
           $1, $2::date, $3::jsonb, $4, $5
         )
         RETURNING snapshot_id`,
        [
          normalized.serviceId,
          normalized.snapshotDate,
          JSON.stringify(normalized.metricsJson),
          normalized.qualitativeNotes,
          normalized.recordedBy
        ]
      )

      const snapshotId = result.rows[0]?.snapshot_id

      if (!snapshotId) throw new Error('Failed to record engagement progress snapshot.')

      await recordEngagementAuditEvent(
        {
          serviceId: normalized.serviceId,
          eventKind: 'progress_snapshot_recorded',
          actorUserId: normalized.recordedBy,
          payload: {
            snapshotId,
            snapshotDate: normalized.snapshotDate,
            metricsKeys: Object.keys(normalized.metricsJson)
          }
        },
        client
      )

      await publishEngagementEvent(
        {
          serviceId: normalized.serviceId,
          eventType: EVENT_TYPES.serviceEngagementProgressSnapshotRecorded,
          actorUserId: normalized.recordedBy,
          payload: {
            snapshotId,
            snapshotDate: normalized.snapshotDate
          }
        },
        client
      )

      return { snapshotId }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EngagementProgressConflictError(
        `Service ${normalized.serviceId} already has a progress snapshot for ${normalized.snapshotDate}.`
      )
    }

    throw error
  }
}

export const listSnapshotsForService = async (
  serviceId: string
): Promise<EngagementProgressSnapshot[]> => {
  const normalizedServiceId = trimRequired(serviceId, 'serviceId')

  const rows = await query<ProgressSnapshotRow>(
    `SELECT ps.*
     FROM greenhouse_commercial.engagement_progress_snapshots ps
     JOIN greenhouse_core.services s ON s.service_id = ps.service_id
     WHERE ps.service_id = $1
       AND s.engagement_kind != 'regular'
       AND ${buildEligibleServicePredicate('s')}
     ORDER BY ps.snapshot_date DESC, ps.recorded_at DESC`,
    [normalizedServiceId]
  )

  return rows.map(normalizeSnapshot)
}

export const getLatestSnapshot = async (
  serviceId: string
): Promise<EngagementProgressSnapshot | null> => {
  const normalizedServiceId = trimRequired(serviceId, 'serviceId')

  const rows = await query<ProgressSnapshotRow>(
    `SELECT ps.*
     FROM greenhouse_commercial.engagement_progress_snapshots ps
     JOIN greenhouse_core.services s ON s.service_id = ps.service_id
     WHERE ps.service_id = $1
       AND s.engagement_kind != 'regular'
       AND ${buildEligibleServicePredicate('s')}
     ORDER BY ps.snapshot_date DESC, ps.recorded_at DESC
     LIMIT 1`,
    [normalizedServiceId]
  )

  return rows[0] ? normalizeSnapshot(rows[0]) : null
}
