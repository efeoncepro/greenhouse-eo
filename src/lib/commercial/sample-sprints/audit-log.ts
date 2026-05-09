import 'server-only'

import { query } from '@/lib/db'

export const ENGAGEMENT_AUDIT_EVENT_KINDS = [
  'declared',
  'approved',
  'rejected',
  'capacity_overridden',
  'phase_completed',
  'progress_snapshot_recorded',
  'outcome_recorded',
  'lineage_added',
  'converted',
  'cancelled',
  // TASK-837 Slice 5 — outbound projection lifecycle events.
  'outbound_failed',
  'outbound_retry_attempted',
  'outbound_dead_lettered',
  'outbound_skipped'
] as const

export type EngagementAuditEventKind = typeof ENGAGEMENT_AUDIT_EVENT_KINDS[number]

interface QueryResultLike<T> {
  rows: T[]
}

export interface QueryableClient {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResultLike<T>>
}

export interface RecordEngagementAuditEventInput {
  serviceId: string
  eventKind: EngagementAuditEventKind
  actorUserId?: string | null
  payload?: Record<string, unknown> | null
  reason?: string | null
}

export interface EngagementAuditEvent {
  auditId: string
  serviceId: string
  eventKind: EngagementAuditEventKind
}

export class EngagementAuditValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementAuditValidationError'
  }
}

const isAuditEventKind = (value: string): value is EngagementAuditEventKind =>
  (ENGAGEMENT_AUDIT_EVENT_KINDS as readonly string[]).includes(value)

const normalizeAuditInput = (input: RecordEngagementAuditEventInput) => {
  const serviceId = input.serviceId.trim()
  const actorUserId = input.actorUserId?.trim() || null
  const reason = input.reason?.trim() || null

  if (!serviceId) throw new EngagementAuditValidationError('serviceId is required.')
  if (!isAuditEventKind(input.eventKind)) throw new EngagementAuditValidationError('eventKind is not supported.')

  if (reason != null && reason.length < 10) {
    throw new EngagementAuditValidationError('reason must contain at least 10 characters when provided.')
  }

  if (input.payload != null && (typeof input.payload !== 'object' || Array.isArray(input.payload))) {
    throw new EngagementAuditValidationError('payload must be an object when provided.')
  }

  return {
    serviceId,
    eventKind: input.eventKind,
    actorUserId,
    payload: input.payload ?? {},
    reason
  }
}

export const recordEngagementAuditEvent = async (
  input: RecordEngagementAuditEventInput,
  client?: QueryableClient
): Promise<EngagementAuditEvent> => {
  const normalized = normalizeAuditInput(input)

  const runner = client ?? {
    query: async <T extends Record<string, unknown>>(text: string, values?: unknown[]) => ({
      rows: await query<T>(text, values)
    })
  }

  const result = await runner.query<{ audit_id: string }>(
    `INSERT INTO greenhouse_commercial.engagement_audit_log (
       service_id, event_kind, actor_user_id, payload_json, reason
     ) VALUES (
       $1, $2, $3, $4::jsonb, $5
     )
     RETURNING audit_id`,
    [
      normalized.serviceId,
      normalized.eventKind,
      normalized.actorUserId,
      JSON.stringify(normalized.payload),
      normalized.reason
    ]
  )

  const auditId = result.rows[0]?.audit_id

  if (!auditId) throw new Error('Failed to record engagement audit event.')

  return {
    auditId,
    serviceId: normalized.serviceId,
    eventKind: normalized.eventKind
  }
}
