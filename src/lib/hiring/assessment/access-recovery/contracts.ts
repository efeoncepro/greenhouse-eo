import 'server-only'

import { createHash } from 'crypto'

export const ASSESSMENT_ACCESS_RECOVERY_CHANNELS = ['email', 'secure_link'] as const
export type AssessmentAccessRecoveryChannel = (typeof ASSESSMENT_ACCESS_RECOVERY_CHANNELS)[number]

export const ASSESSMENT_ACCESS_RECOVERY_REASONS = [
  'candidate_reports_email_not_received',
  'candidate_reports_link_invalid',
  'alternate_channel_requested',
  'provider_delivery_failed',
  'token_expired_before_start',
] as const
export type AssessmentAccessRecoveryReason = (typeof ASSESSMENT_ACCESS_RECOVERY_REASONS)[number]

export const ASSESSMENT_ACCESS_RECOVERY_OUTCOMES = [
  'pending_dispatch',
  'dispatch_accepted',
  'dispatch_failed',
  'dispatch_unknown',
  'link_issued',
] as const
export type AssessmentAccessRecoveryOutcome = (typeof ASSESSMENT_ACCESS_RECOVERY_OUTCOMES)[number]

export const ASSESSMENT_ACCESS_RECOVERY_ELIGIBLE_STATUSES = [
  'assigned',
  'sent',
  'in_progress',
  'expired',
] as const

export const ASSESSMENT_ACCESS_RECOVERY_EMAIL_TTL_HOURS = 14 * 24
export const ASSESSMENT_ACCESS_RECOVERY_SECURE_LINK_TTL_HOURS = 24
export const ASSESSMENT_ACCESS_RECOVERY_STARTED_GRACE_MINUTES = 30
export const ASSESSMENT_ACCESS_RECOVERY_COOLDOWN_SECONDS = 60
export const ASSESSMENT_ACCESS_RECOVERY_MAX_PER_24_HOURS = 3

export const isAssessmentAccessRecoveryChannel = (
  value: unknown,
): value is AssessmentAccessRecoveryChannel =>
  ASSESSMENT_ACCESS_RECOVERY_CHANNELS.includes(value as AssessmentAccessRecoveryChannel)

export const isAssessmentAccessRecoveryReason = (
  value: unknown,
): value is AssessmentAccessRecoveryReason =>
  ASSESSMENT_ACCESS_RECOVERY_REASONS.includes(value as AssessmentAccessRecoveryReason)

/** Hash-only idempotency evidence. The caller's key is never persisted or logged. */
export const digestAssessmentRecoveryIdempotencyKey = (idempotencyKey: string): string =>
  createHash('sha256').update(`assessment-access-recovery:v1:${idempotencyKey}`).digest('hex')

/** Fingerprint binds a key to its immutable semantic request without storing sensitive input. */
export const fingerprintAssessmentRecoveryRequest = (input: {
  assessmentId: string
  channel: AssessmentAccessRecoveryChannel
  reasonCode: AssessmentAccessRecoveryReason
}): string =>
  createHash('sha256')
    .update(`assessment-access-recovery-request:v1:${input.assessmentId}:${input.channel}:${input.reasonCode}`)
    .digest('hex')

export interface AssessmentAccessRecoveryReceipt {
  recoveryId: string
  assessmentId: string
  applicationId: string
  openingId: string
  channel: AssessmentAccessRecoveryChannel
  reasonCode: AssessmentAccessRecoveryReason
  previousStatus: string
  resultingStatus: string
  tokenVersionId: string
  issuedAt: string
  expiresAt: string
  outcome: AssessmentAccessRecoveryOutcome
  deliveryId: string | null
}

export type AssessmentAccessRecoveryEligibilityCode =
  | 'assessment_recovery_method_not_supported'
  | 'assessment_recovery_consent_withdrawn'
  | 'assessment_recovery_application_closed'
  | 'assessment_recovery_invalid_state'
  | 'assessment_recovery_time_elapsed'
  | 'assessment_recovery_expired_after_start'
  | 'assessment_recovery_expiry_not_proven'
  | 'assessment_recovery_status_not_allowed'

export type AssessmentAccessRecoveryEligibility =
  | { allowed: true; resultingStatus: 'sent' | 'in_progress' }
  | { allowed: false; code: AssessmentAccessRecoveryEligibilityCode }

const TERMINAL_APPLICATION_STAGES = new Set(['selected', 'rejected', 'withdrawn', 'handoff_ready', 'closed'])

/** Pure state decision; the command supplies values read under the assessment row lock. */
export const decideAssessmentAccessRecoveryEligibility = (input: {
  method: string
  status: string
  startedAt: Date | string | null
  tokenExpiresAt: Date | string | null
  effectiveDeadlineAt: Date | string | null
  applicationStage: string
  applicationDecision: string | null
  consentStatus: string
  reasonCode: AssessmentAccessRecoveryReason
  now?: Date
}): AssessmentAccessRecoveryEligibility => {
  if (input.method !== 'candidate_test') {
    return { allowed: false, code: 'assessment_recovery_method_not_supported' }
  }

  if (input.applicationDecision || TERMINAL_APPLICATION_STAGES.has(input.applicationStage)) {
    return { allowed: false, code: 'assessment_recovery_application_closed' }
  }

  if (input.consentStatus === 'withdrawn') {
    return { allowed: false, code: 'assessment_recovery_consent_withdrawn' }
  }

  if (input.status === 'assigned' || input.status === 'sent') {
    return input.startedAt
      ? { allowed: false, code: 'assessment_recovery_invalid_state' }
      : { allowed: true, resultingStatus: 'sent' }
  }

  if (input.status === 'in_progress') {
    if (!input.startedAt || !input.effectiveDeadlineAt) {
      return { allowed: false, code: 'assessment_recovery_invalid_state' }
    }

    return new Date(input.effectiveDeadlineAt).getTime() > (input.now ?? new Date()).getTime()
      ? { allowed: true, resultingStatus: 'in_progress' }
      : { allowed: false, code: 'assessment_recovery_time_elapsed' }
  }

  if (input.status === 'expired') {
    if (input.startedAt) {
      return { allowed: false, code: 'assessment_recovery_expired_after_start' }
    }

    const tokenExpiresAt = input.tokenExpiresAt ? new Date(input.tokenExpiresAt).getTime() : Number.NaN

    if (!Number.isFinite(tokenExpiresAt) || tokenExpiresAt > (input.now ?? new Date()).getTime()
      || input.reasonCode !== 'token_expired_before_start') {
      return { allowed: false, code: 'assessment_recovery_expiry_not_proven' }
    }

    return { allowed: true, resultingStatus: 'sent' }
  }

  return { allowed: false, code: 'assessment_recovery_status_not_allowed' }
}

export type AssessmentAccessRecoveryResult =
  | {
      receipt: AssessmentAccessRecoveryReceipt
      replayed: boolean
      linkRevealed: false
      accessUrl?: never
    }
  | {
      receipt: AssessmentAccessRecoveryReceipt & { channel: 'secure_link'; outcome: 'link_issued' }
      replayed: false
      linkRevealed: true
      /** Bearer URL. Response-only and never accepted by persistence/audit helpers. */
      accessUrl: string
    }
