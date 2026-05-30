import 'server-only'

import { query } from '@/lib/db'

import type {
  ContractorWorkSubmission,
  ContractorWorkSubmissionStatus
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
