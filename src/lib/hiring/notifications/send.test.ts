import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockSendEmail = vi.fn()
const mockWasEmailAlreadySent = vi.fn()
const mockCapture = vi.fn()
const mockRunQuery = vi.fn()
const mockGetAssessmentById = vi.fn()
const mockReissueToken = vi.fn()

vi.mock('@/lib/email/delivery', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  wasEmailAlreadySent: (...args: unknown[]) => mockWasEmailAlreadySent(...args),
}))
vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCapture(...args),
}))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunQuery(...args),
}))
vi.mock('../assessment/instances', () => ({
  getAssessmentById: (...args: unknown[]) => mockGetAssessmentById(...args),
  reissueCandidateTestTokenForEmail: (...args: unknown[]) => mockReissueToken(...args),
}))

import {
  sendHiringApplicationCreatedEmails,
  sendHiringAssessmentAssignedEmail,
  sendHiringDecisionEmail,
  sendHiringStageAdvancedEmail,
} from './send'
import {
  hiringApplicationCreatedEmailsProjection,
  hiringApplicationDecidedEmailProjection,
  hiringAssessmentAssignedEmailProjection,
  hiringStageChangedEmailProjection,
} from '@/lib/sync/projections/hiring-lifecycle-emails'

const contextRow = (overrides: Record<string, unknown> = {}) => ({
  application_id: 'happ-1',
  application_public_id: 'EO-APP-0001',
  stage: 'screening',
  source: 'public_careers',
  decision: null,
  candidate_message: 'Me interesa el rol por X e Y.',
  canonical_email: 'maria@ejemplo.com',
  full_name: 'María González',
  phone_e164: '+56912345678',
  residence_country_code: 'CL',
  portfolio_url: 'https://portafolio.ejemplo.com',
  linkedin_url: null,
  opening_id: 'hopn-1',
  opening_public_id: 'EO-OPN-0061',
  internal_title: 'Content Creator (interno)',
  public_title: 'Content Creator',
  opening_status: 'active',
  published_at: '2026-08-01T00:00:00Z',
  ...overrides,
})

describe('TASK-1689 hiring lifecycle emails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.HIRING_LIFECYCLE_EMAILS_ENABLED = 'true'
    delete process.env.HIRING_INTERNAL_NOTIFICATIONS_EMAIL
    mockWasEmailAlreadySent.mockResolvedValue(false)
    mockSendEmail.mockResolvedValue({ deliveryId: 'd-1', resendId: 'r-1', status: 'sent' })
    mockRunQuery.mockResolvedValue([contextRow()])
  })

  afterEach(() => {
    delete process.env.HIRING_LIFECYCLE_EMAILS_ENABLED
  })

  describe('projections declaration', () => {
    it('declares canonical names, notifications domain and triggers', () => {
      expect(hiringApplicationCreatedEmailsProjection.name).toBe('hiring_application_created_emails')
      expect(hiringApplicationCreatedEmailsProjection.domain).toBe('notifications')
      expect(hiringApplicationCreatedEmailsProjection.triggerEvents).toContain('hiring.application.created')
      expect(hiringAssessmentAssignedEmailProjection.triggerEvents).toContain('hiring.assessment.assigned')
      expect(hiringStageChangedEmailProjection.triggerEvents).toContain('hiring.application.stage_changed')
      expect(hiringApplicationDecidedEmailProjection.triggerEvents).toContain('hiring.application.decided')

      for (const p of [
        hiringApplicationCreatedEmailsProjection,
        hiringAssessmentAssignedEmailProjection,
        hiringStageChangedEmailProjection,
        hiringApplicationDecidedEmailProjection,
      ]) {
        expect(p.domain).toBe('notifications')
        expect(p.maxRetries).toBe(3)
      }
    })
  })

  describe('flag gate', () => {
    it('skips everything when the flag is OFF', async () => {
      delete process.env.HIRING_LIFECYCLE_EMAILS_ENABLED

      const results = await Promise.all([
        sendHiringApplicationCreatedEmails('happ-1', {}),
        sendHiringAssessmentAssignedEmail('hass-1', { method: 'candidate_test' }),
        sendHiringStageAdvancedEmail('happ-1', { stage: 'interview' }),
        sendHiringDecisionEmail('happ-1', { decision: 'selected' }),
      ])

      for (const r of results) expect(r).toContain('flag OFF')
      expect(mockSendEmail).not.toHaveBeenCalled()
      expect(mockRunQuery).not.toHaveBeenCalled()
    })
  })

  describe('application created', () => {
    it('sends internal notice (default people@) + candidate confirmation', async () => {
      const msg = await sendHiringApplicationCreatedEmails('happ-1', { _eventId: 'evt-1' })

      expect(msg).toContain('internal sent')
      expect(msg).toContain('confirmation sent')
      expect(mockSendEmail).toHaveBeenCalledTimes(2)

      const internal = mockSendEmail.mock.calls[0][0]

      expect(internal.emailType).toBe('hiring_application_received_internal')
      expect(internal.recipients[0].email).toBe('people@efeoncepro.com')
      expect(internal.context.candidateEmail).toBe('maria@ejemplo.com')
      // TASK-1688 — el aviso interno lleva el contacto completo (país como NOMBRE, no código).
      expect(internal.context.candidatePhone).toBe('+56912345678')
      expect(internal.context.candidateResidenceCountry).toBe('Chile')
      expect(internal.context.candidateMessage).toBe('Me interesa el rol por X e Y.')
      expect(internal.context.portfolioUrl).toBe('https://portafolio.ejemplo.com')
      expect(internal.context.applicationUrl).toContain('/agency/hiring/applications/happ-1')
      expect(internal.sourceEventId).toBe('evt-1')

      const confirmation = mockSendEmail.mock.calls[1][0]

      expect(confirmation.emailType).toBe('hiring_application_confirmation')
      expect(confirmation.recipients[0].email).toBe('maria@ejemplo.com')
      expect(confirmation.context.openingTitle).toBe('Content Creator')
      expect(confirmation.context.openingUrl).toContain('/public/careers/EO-OPN-0061')
    })

    it('honors HIRING_INTERNAL_NOTIFICATIONS_EMAIL override', async () => {
      process.env.HIRING_INTERNAL_NOTIFICATIONS_EMAIL = 'talent@efeoncepro.com'

      await sendHiringApplicationCreatedEmails('happ-1', {})

      expect(mockSendEmail.mock.calls[0][0].recipients[0].email).toBe('talent@efeoncepro.com')

      delete process.env.HIRING_INTERNAL_NOTIFICATIONS_EMAIL
    })

    it('still sends internal notice when candidate has no email (capture, no throw)', async () => {
      mockRunQuery.mockResolvedValue([contextRow({ canonical_email: null })])

      const msg = await sendHiringApplicationCreatedEmails('happ-1', {})

      expect(msg).toContain('internal sent')
      expect(msg).toContain('confirmation skip: sin email')
      expect(mockSendEmail).toHaveBeenCalledTimes(1)
      expect(mockCapture).toHaveBeenCalledTimes(1)
    })

    it('dedupes both sends on replay', async () => {
      mockWasEmailAlreadySent.mockResolvedValue(true)

      const msg = await sendHiringApplicationCreatedEmails('happ-1', { _eventId: 'evt-1' })

      expect(msg).toContain('internal dedupe')
      expect(msg).toContain('confirmation dedupe')
      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('legacy sin contacto: el interno sale con nulls (el template muestra "No informado")', async () => {
      mockRunQuery.mockResolvedValue([
        contextRow({ phone_e164: null, residence_country_code: null, candidate_message: null, portfolio_url: null }),
      ])

      await sendHiringApplicationCreatedEmails('happ-1', {})

      const internal = mockSendEmail.mock.calls[0][0]

      expect(internal.context.candidatePhone).toBeNull()
      expect(internal.context.candidateResidenceCountry).toBeNull()
      expect(internal.context.candidateMessage).toBeNull()
    })

    it('no-ops when the application does not exist', async () => {
      mockRunQuery.mockResolvedValue([])

      const msg = await sendHiringApplicationCreatedEmails('happ-x', {})

      expect(msg).toContain('no existe')
      expect(mockSendEmail).not.toHaveBeenCalled()
    })
  })

  describe('assessment assigned', () => {
    const assessment = { assessmentId: 'hass-1', applicationId: 'happ-1', method: 'candidate_test', status: 'assigned' }

    it('never emails for interviewer scorecards (payload filter, no reads)', async () => {
      const msg = await sendHiringAssessmentAssignedEmail('hass-1', { method: 'interviewer_scorecard' })

      expect(msg).toContain('no es candidate_test')
      expect(mockGetAssessmentById).not.toHaveBeenCalled()
      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('re-checks method against PG (double gate)', async () => {
      mockGetAssessmentById.mockResolvedValue({ ...assessment, method: 'interviewer_scorecard' })

      const msg = await sendHiringAssessmentAssignedEmail('hass-1', { method: 'candidate_test' })

      expect(msg).toContain('no es candidate_test')
      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('checks dedupe BEFORE rotating the token (never invalidates a delivered link)', async () => {
      mockGetAssessmentById.mockResolvedValue(assessment)
      mockWasEmailAlreadySent.mockResolvedValue(true)

      const msg = await sendHiringAssessmentAssignedEmail('hass-1', { method: 'candidate_test', _eventId: 'evt-2' })

      expect(msg).toContain('dedupe')
      expect(mockReissueToken).not.toHaveBeenCalled()
      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('skips when the assessment is no longer rotable', async () => {
      mockGetAssessmentById.mockResolvedValue(assessment)
      mockReissueToken.mockResolvedValue(null)

      const msg = await sendHiringAssessmentAssignedEmail('hass-1', { method: 'candidate_test' })

      expect(msg).toContain('ya no es rotable')
      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('sends the candidate email with the reissued token URL', async () => {
      mockGetAssessmentById.mockResolvedValue(assessment)
      mockReissueToken.mockResolvedValue({ token: 'tok-abc', timeLimitMinutes: 45, tokenTtlDays: 14 })

      const msg = await sendHiringAssessmentAssignedEmail('hass-1', { method: 'candidate_test', _eventId: 'evt-2' })

      expect(msg).toContain('sent')

      const call = mockSendEmail.mock.calls[0][0]

      expect(call.emailType).toBe('hiring_assessment_assigned')
      expect(call.context.assessmentUrl).toContain('/public/assessment/tok-abc')
      expect(call.context.timeLimitMinutes).toBe(45)
      expect(call.sourceEntity).toBe('hass-1')
    })
  })

  describe('stage advanced', () => {
    it('never emails non-candidate-facing stages', async () => {
      for (const stage of ['screening', 'client_review', 'decision_pending', 'handoff_ready', 'sourced']) {
        const msg = await sendHiringStageAdvancedEmail('happ-1', { stage })

        expect(msg).toContain('no es candidate-facing')
      }

      expect(mockSendEmail).not.toHaveBeenCalled()
      expect(mockRunQuery).not.toHaveBeenCalled()
    })

    it('emails allowlisted stages with the public label, never the internal name', async () => {
      const msg = await sendHiringStageAdvancedEmail('happ-1', { stage: 'interview', _eventId: 'evt-3' })

      expect(msg).toContain('sent')

      const call = mockSendEmail.mock.calls[0][0]

      expect(call.emailType).toBe('hiring_stage_advanced')
      expect(call.context.stageLabel).toBe('Entrevista')
      expect(JSON.stringify(call.context)).not.toContain('interview')
    })
  })

  describe('decision', () => {
    it('only notifies selected/rejected', async () => {
      for (const decision of ['backup_selected', 'on_hold', 'withdrawn', '']) {
        const msg = await sendHiringDecisionEmail('happ-1', { decision })

        expect(msg).toContain('no notifica')
      }

      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('skips stale decisions superseded in PG', async () => {
      mockRunQuery.mockResolvedValue([contextRow({ decision: 'selected' })])

      const msg = await sendHiringDecisionEmail('happ-1', { decision: 'rejected' })

      expect(msg).toContain('superseded')
      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('sends the rejected variant with its own pausable type', async () => {
      mockRunQuery.mockResolvedValue([contextRow({ decision: 'rejected' })])

      const msg = await sendHiringDecisionEmail('happ-1', { decision: 'rejected', decisionId: 'dec-1' })

      expect(msg).toContain('sent')

      const call = mockSendEmail.mock.calls[0][0]

      expect(call.emailType).toBe('hiring_decision_rejected')
      expect(call.recipients[0].email).toBe('maria@ejemplo.com')
    })

    it('sends the selected variant', async () => {
      mockRunQuery.mockResolvedValue([contextRow({ decision: 'selected' })])

      await sendHiringDecisionEmail('happ-1', { decision: 'selected' })

      expect(mockSendEmail.mock.calls[0][0].emailType).toBe('hiring_decision_selected')
    })
  })
})
