import 'server-only'

import { randomUUID } from 'crypto'

import type { PoolClient } from 'pg'

import { query, withGreenhousePostgresTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { ContractorEngagementValidationError } from '../errors'
import { isPostClosureLockedEngagementStatus } from '../state-machine'
import { getContractorEngagementById } from '../store'

import {
  REVIEW_ACTION_TARGET,
  assertValidWorkSubmissionTransition
} from './state-machine'
import type {
  CancelContractorWorkSubmissionInput,
  ContractorWorkSubmission,
  ContractorWorkSubmissionStatus,
  CreateContractorWorkSubmissionInput,
  MarkContractorWorkSubmissionConsumedInput,
  ReviewContractorWorkSubmissionInput,
  SubmitContractorWorkSubmissionInput,
  UpdateContractorWorkSubmissionDraftInput
} from './types'

interface ContractorWorkSubmissionRow {
  contractor_work_submission_id: string
  public_id: string
  contractor_engagement_id: string
  submission_type: string
  title: string | null
  service_period_start: string | Date | null
  service_period_end: string | Date | null
  quantity: string | number | null
  unit: string | null
  rate_amount_snapshot: string | number | null
  gross_amount: string | number | null
  currency: string | null
  status: string
  submitted_by_user_id: string | null
  submitted_at: string | Date | null
  reviewed_by_user_id: string | null
  reviewed_at: string | Date | null
  review_reason: string | null
  consumed_by_payable_id: string | null
  consumed_at: string | Date | null
  metadata_json: unknown
  created_by_user_id: string | null
  created_at: string | Date
  updated_at: string | Date
  [column: string]: unknown
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const toNullableNumber = (value: string | number | null): number | null => {
  if (value === null) return null
  const n = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(n) ? n : null
}

const toDateString = (value: string | Date | null): string | null => {
  if (value === null) return null

  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
}

const toTimestamp = (value: string | Date | null): string | null => {
  if (value === null) return null

  return value instanceof Date ? value.toISOString() : String(value)
}

export const mapContractorWorkSubmission = (
  row: ContractorWorkSubmissionRow
): ContractorWorkSubmission => ({
  contractorWorkSubmissionId: row.contractor_work_submission_id,
  publicId: row.public_id,
  contractorEngagementId: row.contractor_engagement_id,
  submissionType: row.submission_type as ContractorWorkSubmission['submissionType'],
  title: row.title,
  servicePeriodStart: toDateString(row.service_period_start),
  servicePeriodEnd: toDateString(row.service_period_end),
  quantity: toNullableNumber(row.quantity),
  unit: (row.unit as ContractorWorkSubmission['unit']) ?? null,
  rateAmountSnapshot: toNullableNumber(row.rate_amount_snapshot),
  grossAmount: toNullableNumber(row.gross_amount),
  currency: row.currency,
  status: row.status as ContractorWorkSubmissionStatus,
  submittedByUserId: row.submitted_by_user_id,
  submittedAt: toTimestamp(row.submitted_at),
  reviewedByUserId: row.reviewed_by_user_id,
  reviewedAt: toTimestamp(row.reviewed_at),
  reviewReason: row.review_reason,
  consumedByPayableId: row.consumed_by_payable_id,
  consumedAt: toTimestamp(row.consumed_at),
  metadata: toRecord(row.metadata_json),
  createdByUserId: row.created_by_user_id,
  createdAt: toTimestamp(row.created_at) ?? '',
  updatedAt: toTimestamp(row.updated_at) ?? ''
})

export const WORK_SUBMISSION_SELECT_COLUMNS = `
  contractor_work_submission_id, public_id, contractor_engagement_id, submission_type,
  title, service_period_start, service_period_end, quantity, unit, rate_amount_snapshot,
  gross_amount, currency, status, submitted_by_user_id, submitted_at, reviewed_by_user_id,
  reviewed_at, review_reason, consumed_by_payable_id, consumed_at, metadata_json,
  created_by_user_id, created_at, updated_at
`

// ── Readers ─────────────────────────────────────────────────────────────────

export const getContractorWorkSubmissionById = async (
  contractorWorkSubmissionId: string
): Promise<ContractorWorkSubmission | null> => {
  const rows = await query<ContractorWorkSubmissionRow>(
    `SELECT ${WORK_SUBMISSION_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_work_submissions
     WHERE contractor_work_submission_id = $1`,
    [contractorWorkSubmissionId]
  )

  return rows[0] ? mapContractorWorkSubmission(rows[0]) : null
}

export const listContractorWorkSubmissionsByEngagement = async (
  contractorEngagementId: string
): Promise<ContractorWorkSubmission[]> => {
  const rows = await query<ContractorWorkSubmissionRow>(
    `SELECT ${WORK_SUBMISSION_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_work_submissions
     WHERE contractor_engagement_id = $1
     ORDER BY created_at DESC`,
    [contractorEngagementId]
  )

  return rows.map(mapContractorWorkSubmission)
}

export interface ListContractorWorkSubmissionsFilters {
  contractorEngagementId?: string
  status?: ContractorWorkSubmissionStatus
  limit?: number
  offset?: number
}

export const listContractorWorkSubmissions = async (
  filters: ListContractorWorkSubmissionsFilters = {}
): Promise<ContractorWorkSubmission[]> => {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters.contractorEngagementId) {
    params.push(filters.contractorEngagementId)
    conditions.push(`contractor_engagement_id = $${params.length}`)
  }

  if (filters.status) {
    params.push(filters.status)
    conditions.push(`status = $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.min(200, Math.max(1, filters.limit ?? 50))
  const offset = Math.max(0, filters.offset ?? 0)

  params.push(limit)
  params.push(offset)

  const rows = await query<ContractorWorkSubmissionRow>(
    `SELECT ${WORK_SUBMISSION_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_work_submissions
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  return rows.map(mapContractorWorkSubmission)
}

/**
 * TASK-792 Slice 3 — Readiness reader: approved submissions not yet consumed by
 * a payable. Input to contractor payable readiness (TASK-793). The partial index
 * `idx_contractor_work_submissions_ready` backs this query.
 */
export const listWorkSubmissionsReadyForPayable = async (
  contractorEngagementId: string
): Promise<ContractorWorkSubmission[]> => {
  const rows = await query<ContractorWorkSubmissionRow>(
    `SELECT ${WORK_SUBMISSION_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_work_submissions
     WHERE contractor_engagement_id = $1
       AND status = 'approved'
       AND consumed_by_payable_id IS NULL
     ORDER BY created_at ASC`,
    [contractorEngagementId]
  )

  return rows.map(mapContractorWorkSubmission)
}

export const listWorkSubmissionsReadyForPayableQueue = async (
  filters: { limit?: number; offset?: number } = {}
): Promise<ContractorWorkSubmission[]> => {
  const limit = Math.min(200, Math.max(1, filters.limit ?? 100))
  const offset = Math.max(0, filters.offset ?? 0)

  const rows = await query<ContractorWorkSubmissionRow>(
    `SELECT ${WORK_SUBMISSION_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_work_submissions
     WHERE status = 'approved'
       AND consumed_by_payable_id IS NULL
     ORDER BY created_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )

  return rows.map(mapContractorWorkSubmission)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const MIN_REASON_LENGTH = 10

const appendWorkSubmissionEvent = async (
  client: PoolClient,
  params: {
    contractorWorkSubmissionId: string
    eventType:
      | 'created'
      | 'submitted'
      | 'approved'
      | 'disputed'
      | 'rejected'
      | 'cancelled'
      | 'consumed'
      | 'updated'
    fromStatus?: string | null
    toStatus?: string | null
    actorUserId: string
    reason?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> => {
  await client.query(
    `INSERT INTO greenhouse_hr.contractor_work_submission_events (
       event_id, contractor_work_submission_id, event_type, from_status, to_status,
       actor_user_id, reason, metadata_json
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      `cwse-${randomUUID()}`,
      params.contractorWorkSubmissionId,
      params.eventType,
      params.fromStatus ?? null,
      params.toStatus ?? null,
      params.actorUserId,
      params.reason ?? null,
      JSON.stringify(params.metadata ?? {})
    ]
  )
}

const publishWorkSubmissionEvent = async (
  client: PoolClient,
  submission: ContractorWorkSubmission,
  eventType: string,
  extra: Record<string, unknown> = {}
): Promise<void> => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.contractorWorkSubmission,
      aggregateId: submission.contractorWorkSubmissionId,
      eventType,
      payload: {
        schemaVersion: 1,
        contractorWorkSubmissionId: submission.contractorWorkSubmissionId,
        publicId: submission.publicId,
        contractorEngagementId: submission.contractorEngagementId,
        submissionType: submission.submissionType,
        status: submission.status,
        grossAmount: submission.grossAmount,
        currency: submission.currency,
        ...extra
      }
    },
    client
  )
}

const lockWorkSubmission = async (
  client: PoolClient,
  contractorWorkSubmissionId: string
): Promise<ContractorWorkSubmission> => {
  const result = await client.query<ContractorWorkSubmissionRow>(
    `SELECT ${WORK_SUBMISSION_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_work_submissions
     WHERE contractor_work_submission_id = $1
     FOR UPDATE`,
    [contractorWorkSubmissionId]
  )

  if (!result.rows[0]) {
    throw new ContractorEngagementValidationError(
      'La work submission no existe.',
      'work_submission_not_found',
      404
    )
  }

  return mapContractorWorkSubmission(result.rows[0])
}

// ── Commands ──────────────────────────────────────────────────────────────────

export const createContractorWorkSubmission = async (
  input: CreateContractorWorkSubmissionInput
): Promise<ContractorWorkSubmission> => {
  const engagement = await getContractorEngagementById(input.contractorEngagementId)

  if (!engagement) {
    throw new ContractorEngagementValidationError(
      'El engagement contractor no existe.',
      'engagement_not_found',
      404
    )
  }

  // TASK-797 — bloquea nuevas work submissions una vez que el cierre arranca
  // (`ending` winding-down) o el engagement es terminal (`ended`/`cancelled`).
  if (isPostClosureLockedEngagementStatus(engagement.status)) {
    throw new ContractorEngagementValidationError(
      'No se pueden crear nuevas work submissions: el engagement está en cierre o cerrado.',
      'engagement_closed_or_closing',
      409
    )
  }

  // Snapshot del rate del engagement; el bruto se DERIVA del monto acordado — el
  // contractor nunca lo tipea (TASK-968 SoD: HR fija el monto, no el contractor).
  // timesheet → cantidad × tarifa; resto (fijo/deliverable/milestone) → la tarifa.
  const rateAmountSnapshot = engagement.rateAmount
  const currency = input.currency ?? engagement.currency
  let grossAmount = input.grossAmount ?? null

  if (grossAmount === null && typeof rateAmountSnapshot === 'number') {
    if (input.submissionType === 'timesheet') {
      if (typeof input.quantity === 'number') {
        grossAmount = Math.round(input.quantity * rateAmountSnapshot * 100) / 100
      }
    } else {
      grossAmount = rateAmountSnapshot
    }
  }

  return withGreenhousePostgresTransaction(async (client) => {
    const result = await client.query<ContractorWorkSubmissionRow>(
      `INSERT INTO greenhouse_hr.contractor_work_submissions (
         contractor_work_submission_id, public_id, contractor_engagement_id, submission_type,
         title, service_period_start, service_period_end, quantity, unit, rate_amount_snapshot,
         gross_amount, currency, status, metadata_json, created_by_user_id
       ) VALUES (
         $1,
         'EO-CWS-' || LPAD(nextval('greenhouse_hr.seq_contractor_work_submission_public_id')::text, 4, '0'),
         $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10, $11, 'draft', $12::jsonb, $13
       )
       RETURNING ${WORK_SUBMISSION_SELECT_COLUMNS}`,
      [
        `cws-${randomUUID()}`,
        input.contractorEngagementId,
        input.submissionType,
        input.title ?? null,
        input.servicePeriodStart ?? null,
        input.servicePeriodEnd ?? null,
        input.quantity ?? null,
        input.unit ?? null,
        rateAmountSnapshot,
        grossAmount,
        currency,
        JSON.stringify(input.metadata ?? {}),
        input.actorUserId
      ]
    )

    const submission = mapContractorWorkSubmission(result.rows[0])

    await appendWorkSubmissionEvent(client, {
      contractorWorkSubmissionId: submission.contractorWorkSubmissionId,
      eventType: 'created',
      toStatus: submission.status,
      actorUserId: input.actorUserId,
      metadata: { submissionType: submission.submissionType }
    })

    return submission
  })
}

export const updateContractorWorkSubmissionDraft = async (
  input: UpdateContractorWorkSubmissionDraftInput
): Promise<ContractorWorkSubmission> =>
  withGreenhousePostgresTransaction(async (client) => {
    const current = await lockWorkSubmission(client, input.contractorWorkSubmissionId)

    if (current.status !== 'draft') {
      throw new ContractorEngagementValidationError(
        'Solo se puede editar una work submission en estado borrador.',
        'work_submission_not_draft',
        409
      )
    }

    const sets: string[] = []
    const params: unknown[] = [input.contractorWorkSubmissionId]

    const push = (column: string, value: unknown) => {
      params.push(value)
      sets.push(`${column} = $${params.length}`)
    }

    if (input.title !== undefined) push('title', input.title)
    if (input.servicePeriodStart !== undefined) push('service_period_start', input.servicePeriodStart)
    if (input.servicePeriodEnd !== undefined) push('service_period_end', input.servicePeriodEnd)
    if (input.quantity !== undefined) push('quantity', input.quantity)
    if (input.unit !== undefined) push('unit', input.unit)
    if (input.grossAmount !== undefined) push('gross_amount', input.grossAmount)
    if (input.currency !== undefined) push('currency', input.currency)

    if (input.metadataPatch !== undefined) {
      params.push(JSON.stringify(input.metadataPatch))
      sets.push(`metadata_json = metadata_json || $${params.length}::jsonb`)
    }

    if (sets.length === 0) {
      return current
    }

    const result = await client.query<ContractorWorkSubmissionRow>(
      `UPDATE greenhouse_hr.contractor_work_submissions
       SET ${sets.join(', ')}
       WHERE contractor_work_submission_id = $1
       RETURNING ${WORK_SUBMISSION_SELECT_COLUMNS}`,
      params
    )

    const updated = mapContractorWorkSubmission(result.rows[0])

    await appendWorkSubmissionEvent(client, {
      contractorWorkSubmissionId: updated.contractorWorkSubmissionId,
      eventType: 'updated',
      actorUserId: input.actorUserId
    })

    return updated
  })

export const submitContractorWorkSubmission = async (
  input: SubmitContractorWorkSubmissionInput
): Promise<ContractorWorkSubmission> =>
  withGreenhousePostgresTransaction(async (client) => {
    const current = await lockWorkSubmission(client, input.contractorWorkSubmissionId)

    if (current.status === 'submitted') {
      return current
    }

    assertValidWorkSubmissionTransition(current.status, 'submitted')

    const result = await client.query<ContractorWorkSubmissionRow>(
      `UPDATE greenhouse_hr.contractor_work_submissions
       SET status = 'submitted', submitted_by_user_id = $2, submitted_at = NOW()
       WHERE contractor_work_submission_id = $1
       RETURNING ${WORK_SUBMISSION_SELECT_COLUMNS}`,
      [input.contractorWorkSubmissionId, input.actorUserId]
    )

    const updated = mapContractorWorkSubmission(result.rows[0])

    await appendWorkSubmissionEvent(client, {
      contractorWorkSubmissionId: updated.contractorWorkSubmissionId,
      eventType: 'submitted',
      fromStatus: current.status,
      toStatus: updated.status,
      actorUserId: input.actorUserId
    })

    await publishWorkSubmissionEvent(
      client,
      updated,
      EVENT_TYPES.contractorWorkSubmissionSubmitted,
      { fromStatus: current.status }
    )

    return updated
  })

const REVIEW_EVENT_BY_ACTION = {
  approve: EVENT_TYPES.contractorWorkSubmissionApproved,
  dispute: EVENT_TYPES.contractorWorkSubmissionDisputed,
  reject: EVENT_TYPES.contractorWorkSubmissionRejected
} as const

export const reviewContractorWorkSubmission = async (
  input: ReviewContractorWorkSubmissionInput
): Promise<ContractorWorkSubmission> =>
  withGreenhousePostgresTransaction(async (client) => {
    const current = await lockWorkSubmission(client, input.contractorWorkSubmissionId)
    const targetStatus = REVIEW_ACTION_TARGET[input.action]

    assertValidWorkSubmissionTransition(current.status, targetStatus)

    if (input.action === 'dispute' || input.action === 'reject') {
      const reason = (input.reason ?? '').trim()

      if (reason.length < MIN_REASON_LENGTH) {
        throw new ContractorEngagementValidationError(
          `La razón es obligatoria (mínimo ${MIN_REASON_LENGTH} caracteres) para disputar o rechazar.`,
          'review_reason_required',
          400
        )
      }
    }

    // Approve requires a gross amount (also enforced by DB CHECK).
    if (input.action === 'approve' && current.grossAmount === null) {
      throw new ContractorEngagementValidationError(
        'No se puede aprobar una work submission sin monto bruto. Declara el monto primero.',
        'approve_requires_gross_amount',
        409
      )
    }

    const reason = input.action === 'approve' ? null : (input.reason ?? '').trim()

    const result = await client.query<ContractorWorkSubmissionRow>(
      `UPDATE greenhouse_hr.contractor_work_submissions
       SET status = $2, reviewed_by_user_id = $3, reviewed_at = NOW(), review_reason = $4
       WHERE contractor_work_submission_id = $1
       RETURNING ${WORK_SUBMISSION_SELECT_COLUMNS}`,
      [input.contractorWorkSubmissionId, targetStatus, input.actorUserId, reason]
    )

    const updated = mapContractorWorkSubmission(result.rows[0])

    await appendWorkSubmissionEvent(client, {
      contractorWorkSubmissionId: updated.contractorWorkSubmissionId,
      eventType:
        input.action === 'approve'
          ? 'approved'
          : input.action === 'dispute'
            ? 'disputed'
            : 'rejected',
      fromStatus: current.status,
      toStatus: updated.status,
      actorUserId: input.actorUserId,
      reason
    })

    await publishWorkSubmissionEvent(client, updated, REVIEW_EVENT_BY_ACTION[input.action], {
      fromStatus: current.status,
      ...(reason ? { reason } : {})
    })

    return updated
  })

export const cancelContractorWorkSubmission = async (
  input: CancelContractorWorkSubmissionInput
): Promise<ContractorWorkSubmission> =>
  withGreenhousePostgresTransaction(async (client) => {
    const current = await lockWorkSubmission(client, input.contractorWorkSubmissionId)

    if (current.status === 'cancelled') {
      return current
    }

    assertValidWorkSubmissionTransition(current.status, 'cancelled')

    if (current.consumedByPayableId !== null) {
      throw new ContractorEngagementValidationError(
        'No se puede cancelar una work submission ya consumida por un payable.',
        'work_submission_already_consumed',
        409
      )
    }

    const result = await client.query<ContractorWorkSubmissionRow>(
      `UPDATE greenhouse_hr.contractor_work_submissions
       SET status = 'cancelled', review_reason = COALESCE($2, review_reason)
       WHERE contractor_work_submission_id = $1
       RETURNING ${WORK_SUBMISSION_SELECT_COLUMNS}`,
      [input.contractorWorkSubmissionId, input.reason ? input.reason.trim() : null]
    )

    const updated = mapContractorWorkSubmission(result.rows[0])

    await appendWorkSubmissionEvent(client, {
      contractorWorkSubmissionId: updated.contractorWorkSubmissionId,
      eventType: 'cancelled',
      fromStatus: current.status,
      toStatus: updated.status,
      actorUserId: input.actorUserId,
      reason: input.reason ?? null
    })

    await publishWorkSubmissionEvent(
      client,
      updated,
      EVENT_TYPES.contractorWorkSubmissionCancelled,
      { fromStatus: current.status }
    )

    return updated
  })

/**
 * TASK-792 Slice 3 — Mark an approved submission as consumed by a payable.
 * Exposed as the canonical, idempotent consumption primitive for TASK-793.
 * Enforces the dup-payable guard: only approved + unconsumed submissions can be
 * consumed.
 */
export const markContractorWorkSubmissionConsumed = async (
  input: MarkContractorWorkSubmissionConsumedInput
): Promise<ContractorWorkSubmission> =>
  withGreenhousePostgresTransaction(async (client) => {
    const current = await lockWorkSubmission(client, input.contractorWorkSubmissionId)

    if (current.consumedByPayableId === input.payableId) {
      return current
    }

    if (current.status !== 'approved') {
      throw new ContractorEngagementValidationError(
        'Solo se puede consumir una work submission aprobada.',
        'work_submission_not_approved',
        409
      )
    }

    if (current.consumedByPayableId !== null) {
      throw new ContractorEngagementValidationError(
        'La work submission ya fue consumida por otro payable.',
        'work_submission_already_consumed',
        409
      )
    }

    const result = await client.query<ContractorWorkSubmissionRow>(
      `UPDATE greenhouse_hr.contractor_work_submissions
       SET consumed_by_payable_id = $2, consumed_at = NOW()
       WHERE contractor_work_submission_id = $1
       RETURNING ${WORK_SUBMISSION_SELECT_COLUMNS}`,
      [input.contractorWorkSubmissionId, input.payableId]
    )

    const updated = mapContractorWorkSubmission(result.rows[0])

    await appendWorkSubmissionEvent(client, {
      contractorWorkSubmissionId: updated.contractorWorkSubmissionId,
      eventType: 'consumed',
      actorUserId: input.actorUserId,
      metadata: { payableId: input.payableId }
    })

    return updated
  })
