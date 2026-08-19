import { describe, expect, it } from 'vitest'

import {
  ASSESSMENT_ACCESS_RECOVERY_COOLDOWN_SECONDS,
  ASSESSMENT_ACCESS_RECOVERY_EMAIL_TTL_HOURS,
  ASSESSMENT_ACCESS_RECOVERY_MAX_PER_24_HOURS,
  ASSESSMENT_ACCESS_RECOVERY_SECURE_LINK_TTL_HOURS,
  decideAssessmentAccessRecoveryEligibility,
  digestAssessmentRecoveryIdempotencyKey,
  fingerprintAssessmentRecoveryRequest,
  isAssessmentAccessRecoveryChannel,
  isAssessmentAccessRecoveryReason,
} from './contracts'

describe('assessment access recovery contracts', () => {
  it('fixes the accepted TTL and abuse policy', () => {
    expect(ASSESSMENT_ACCESS_RECOVERY_EMAIL_TTL_HOURS).toBe(336)
    expect(ASSESSMENT_ACCESS_RECOVERY_SECURE_LINK_TTL_HOURS).toBe(24)
    expect(ASSESSMENT_ACCESS_RECOVERY_COOLDOWN_SECONDS).toBe(60)
    expect(ASSESSMENT_ACCESS_RECOVERY_MAX_PER_24_HOURS).toBe(3)
  })

  it('accepts only enumerated channels and non-narrative reasons', () => {
    expect(isAssessmentAccessRecoveryChannel('email')).toBe(true)
    expect(isAssessmentAccessRecoveryChannel('secure_link')).toBe(true)
    expect(isAssessmentAccessRecoveryChannel('whatsapp')).toBe(false)
    expect(isAssessmentAccessRecoveryReason('candidate_reports_email_not_received')).toBe(true)
    expect(isAssessmentAccessRecoveryReason('candidate has a medical condition')).toBe(false)
  })

  it('persists fixed-length digests instead of raw idempotency values', () => {
    const raw = 'operator-key-that-must-not-be-stored'
    const digest = digestAssessmentRecoveryIdempotencyKey(raw)

    expect(digest).toMatch(/^[a-f0-9]{64}$/)
    expect(digest).not.toContain(raw)
    expect(digestAssessmentRecoveryIdempotencyKey(`${raw}-other`)).not.toBe(digest)
  })

  it('allows assigned/sent and a live in-progress session without changing its state', () => {
    const common = {
      method: 'candidate_test',
      tokenExpiresAt: '2026-08-20T00:00:00.000Z',
      applicationStage: 'screening',
      applicationDecision: null,
      consentStatus: 'granted',
      reasonCode: 'candidate_reports_email_not_received' as const,
      now: new Date('2026-08-19T12:00:00.000Z'),
    }

    expect(decideAssessmentAccessRecoveryEligibility({ ...common, status: 'sent', startedAt: null, effectiveDeadlineAt: null }))
      .toEqual({ allowed: true, resultingStatus: 'sent' })
    expect(decideAssessmentAccessRecoveryEligibility({
      ...common,
      status: 'in_progress',
      startedAt: '2026-08-19T11:30:00.000Z',
      effectiveDeadlineAt: '2026-08-19T13:30:00.000Z',
    })).toEqual({ allowed: true, resultingStatus: 'in_progress' })
  })

  it('allows expired only when token expiry is proven and the test never started', () => {
    const common = {
      method: 'candidate_test',
      status: 'expired',
      effectiveDeadlineAt: null,
      applicationStage: 'screening',
      applicationDecision: null,
      consentStatus: 'granted',
      reasonCode: 'token_expired_before_start' as const,
      now: new Date('2026-08-19T12:00:00.000Z'),
    }

    expect(decideAssessmentAccessRecoveryEligibility({
      ...common, startedAt: null, tokenExpiresAt: '2026-08-19T11:00:00.000Z',
    })).toEqual({ allowed: true, resultingStatus: 'sent' })
    expect(decideAssessmentAccessRecoveryEligibility({
      ...common, startedAt: '2026-08-19T10:00:00.000Z', tokenExpiresAt: '2026-08-19T11:00:00.000Z',
    })).toEqual({ allowed: false, code: 'assessment_recovery_expired_after_start' })
    expect(decideAssessmentAccessRecoveryEligibility({
      ...common, startedAt: null, tokenExpiresAt: 'no-es-una-fecha',
    })).toEqual({ allowed: false, code: 'assessment_recovery_expiry_not_proven' })
    expect(decideAssessmentAccessRecoveryEligibility({
      ...common,
      startedAt: null,
      tokenExpiresAt: '2026-08-19T11:00:00.000Z',
      reasonCode: 'candidate_reports_link_invalid',
    })).toEqual({ allowed: false, code: 'assessment_recovery_expiry_not_proven' })
  })

  it('blocks elapsed timers, terminal assessment states and decided applications', () => {
    const common = {
      method: 'candidate_test',
      tokenExpiresAt: null,
      applicationStage: 'interview',
      applicationDecision: null,
      consentStatus: 'granted',
      reasonCode: 'candidate_reports_link_invalid' as const,
      now: new Date('2026-08-19T12:00:00.000Z'),
    }

    expect(decideAssessmentAccessRecoveryEligibility({
      ...common, status: 'in_progress', startedAt: '2026-08-19T10:00:00.000Z', effectiveDeadlineAt: '2026-08-19T11:00:00.000Z',
    })).toEqual({ allowed: false, code: 'assessment_recovery_time_elapsed' })
    expect(decideAssessmentAccessRecoveryEligibility({
      ...common, status: 'submitted', startedAt: '2026-08-19T10:00:00.000Z', effectiveDeadlineAt: null,
    })).toEqual({ allowed: false, code: 'assessment_recovery_status_not_allowed' })
    expect(decideAssessmentAccessRecoveryEligibility({
      ...common, status: 'sent', startedAt: null, effectiveDeadlineAt: null, applicationDecision: 'rejected',
    })).toEqual({ allowed: false, code: 'assessment_recovery_application_closed' })
    expect(decideAssessmentAccessRecoveryEligibility({
      ...common, status: 'sent', startedAt: null, effectiveDeadlineAt: null, consentStatus: 'withdrawn',
    })).toEqual({ allowed: false, code: 'assessment_recovery_consent_withdrawn' })
  })

  it('binds idempotency to assessment, channel and reason', () => {
    const base = {
      assessmentId: 'asmt-1',
      channel: 'email' as const,
      reasonCode: 'candidate_reports_email_not_received' as const,
    }

    expect(fingerprintAssessmentRecoveryRequest(base)).not.toBe(
      fingerprintAssessmentRecoveryRequest({ ...base, channel: 'secure_link' }),
    )
    expect(fingerprintAssessmentRecoveryRequest(base)).not.toBe(
      fingerprintAssessmentRecoveryRequest({ ...base, assessmentId: 'asmt-2' }),
    )
  })
})
