/**
 * TASK-792 — Contractor Work Submissions canonical types (NOT server-only).
 *
 * Pure types shared by the server store + API DTOs + tests. Mirrors the CHECK
 * enums of `greenhouse_hr.contractor_work_submissions` (migration 20260530113022609).
 *
 * Approval ≠ payment. An approved submission is an INPUT to contractor payable
 * readiness (TASK-793); it NEVER writes payroll_entries/adjustments/compensation.
 */

export const CONTRACTOR_WORK_SUBMISSION_TYPES = [
  'timesheet',
  'milestone',
  'deliverable',
  'project_fee',
  'expense',
  'off_cycle_adjustment'
] as const
export type ContractorWorkSubmissionType = (typeof CONTRACTOR_WORK_SUBMISSION_TYPES)[number]

export const CONTRACTOR_WORK_SUBMISSION_UNITS = [
  'hours',
  'days',
  'milestone',
  'deliverable',
  'fixed'
] as const
export type ContractorWorkSubmissionUnit = (typeof CONTRACTOR_WORK_SUBMISSION_UNITS)[number]

export const CONTRACTOR_WORK_SUBMISSION_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'disputed',
  'rejected',
  'cancelled'
] as const
export type ContractorWorkSubmissionStatus = (typeof CONTRACTOR_WORK_SUBMISSION_STATUSES)[number]

export interface ContractorWorkSubmission {
  contractorWorkSubmissionId: string
  publicId: string
  contractorEngagementId: string
  submissionType: ContractorWorkSubmissionType
  title: string | null
  servicePeriodStart: string | null
  servicePeriodEnd: string | null
  quantity: number | null
  unit: ContractorWorkSubmissionUnit | null
  rateAmountSnapshot: number | null
  grossAmount: number | null
  currency: string | null
  status: ContractorWorkSubmissionStatus
  submittedByUserId: string | null
  submittedAt: string | null
  reviewedByUserId: string | null
  reviewedAt: string | null
  reviewReason: string | null
  consumedByPayableId: string | null
  consumedAt: string | null
  metadata: Record<string, unknown>
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateContractorWorkSubmissionInput {
  contractorEngagementId: string
  submissionType: ContractorWorkSubmissionType
  title?: string | null
  servicePeriodStart?: string | null
  servicePeriodEnd?: string | null
  quantity?: number | null
  unit?: ContractorWorkSubmissionUnit | null
  /** Gross amount; when omitted for a timesheet, derived from quantity × engagement rate. */
  grossAmount?: number | null
  currency?: string | null
  metadata?: Record<string, unknown>
  actorUserId: string
}

export interface UpdateContractorWorkSubmissionDraftInput {
  contractorWorkSubmissionId: string
  title?: string | null
  servicePeriodStart?: string | null
  servicePeriodEnd?: string | null
  quantity?: number | null
  unit?: ContractorWorkSubmissionUnit | null
  grossAmount?: number | null
  currency?: string | null
  metadataPatch?: Record<string, unknown>
  actorUserId: string
}

/** submit | approve | dispute | reject | cancel. dispute/reject require reason. */
export type ContractorWorkSubmissionReviewAction = 'approve' | 'dispute' | 'reject'

export interface SubmitContractorWorkSubmissionInput {
  contractorWorkSubmissionId: string
  actorUserId: string
}

export interface ReviewContractorWorkSubmissionInput {
  contractorWorkSubmissionId: string
  action: ContractorWorkSubmissionReviewAction
  /** Required for dispute/reject (>= 10 chars). */
  reason?: string | null
  actorUserId: string
}

export interface CancelContractorWorkSubmissionInput {
  contractorWorkSubmissionId: string
  reason?: string | null
  actorUserId: string
}

export interface MarkContractorWorkSubmissionConsumedInput {
  contractorWorkSubmissionId: string
  payableId: string
  actorUserId: string
}
