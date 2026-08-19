import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claimTokenSensitiveEmailIntent: vi.fn(),
  sendEmail: vi.fn(),
  runGreenhousePostgresQuery: vi.fn(),
  withGreenhousePostgresTransaction: vi.fn(),
  publishOutboxEvent: vi.fn(),
  rotateToken: vi.fn(),
  hiringPublicBaseUrl: vi.fn(),
}))

vi.mock('@/lib/email/delivery', () => ({
  claimTokenSensitiveEmailIntent: mocks.claimTokenSensitiveEmailIntent,
  sendEmail: mocks.sendEmail,
}))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction: mocks.withGreenhousePostgresTransaction,
}))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: mocks.publishOutboxEvent }))
vi.mock('../instances', () => ({
  rotateCandidateTestTokenForAccessRecoveryWithClient: mocks.rotateToken,
}))
vi.mock('../../notifications/config', () => ({
  hiringPublicBaseUrl: mocks.hiringPublicBaseUrl,
}))

import {
  reconcileCandidateTestAccessRecoveryEmailReceipt,
  recoverCandidateTestAccessByEmail,
  resolveHiringCandidateAccessOrigin,
} from './recover-email'
import { fingerprintAssessmentRecoveryRequest } from './contracts'

const ASSESSMENT_ID = 'asmt-11111111-1111-4111-8111-111111111111'
const APPLICATION_ID = 'happ-11111111-1111-4111-8111-111111111111'
const OPENING_ID = 'hopn-11111111-1111-4111-8111-111111111111'
const ACTOR_ID = 'user-123'
const DELIVERY_ID = '11111111-1111-4111-8111-111111111112'
const RECOVERY_ID = 'harc-11111111-1111-4111-8111-111111111113'

const stateRow = {
  assessment_id: ASSESSMENT_ID,
  application_id: APPLICATION_ID,
  opening_id: OPENING_ID,
  method: 'candidate_test',
  status: 'sent',
  started_at: null,
  token_expires_at: new Date('2026-08-30T00:00:00Z'),
  time_limit_minutes: 45,
  accommodations_json: {},
  application_stage: 'screening',
  application_decision: null,
  consent_status: 'granted',
  candidate_email: 'candidate@example.com',
  candidate_name: 'María Example',
  opening_title: 'Content Creator',
  now_at: new Date('2026-08-19T12:00:00Z'),
  effective_deadline_at: null,
}

const receiptRow = (outcome = 'pending_dispatch', deliveryId: string | null = DELIVERY_ID) => ({
  recovery_id: RECOVERY_ID,
  assessment_id: ASSESSMENT_ID,
  application_id: APPLICATION_ID,
  opening_id: OPENING_ID,
  actor_user_id: ACTOR_ID,
  channel: 'email',
  reason_code: 'candidate_reports_email_not_received',
  previous_status: 'sent',
  resulting_status: 'sent',
  token_version_id: '11111111-1111-4111-8111-111111111114',
  issued_at: new Date('2026-08-19T12:00:00Z'),
  expires_at: new Date('2026-09-02T12:00:00Z'),
  outcome,
  delivery_id: deliveryId,
})

const input = {
  assessmentId: ASSESSMENT_ID,
  reasonCode: 'candidate_reports_email_not_received' as const,
  idempotencyKey: 'request-key-with-enough-entropy',
}

let issueClientQuery: ReturnType<typeof vi.fn>

describe('recoverCandidateTestAccessByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hiringPublicBaseUrl.mockReturnValue('https://greenhouse.example')
    mocks.publishOutboxEvent.mockResolvedValue('outbox-11111111-1111-4111-8111-111111111115')
    mocks.rotateToken.mockResolvedValue({ token: 'secret-token-sentinel', timeLimitMinutes: 45 })
    mocks.sendEmail.mockResolvedValue({
      deliveryId: DELIVERY_ID,
      resendId: 'provider-id',
      status: 'sent',
      dispatchOutcome: 'accepted',
    })
    mocks.withGreenhousePostgresTransaction.mockImplementation(async callback => callback({
      query: vi.fn(async (_sql: string, params: unknown[]) => ({
        rows: [receiptRow(params[1] as string, params[2] as string)],
      })),
    }))

    mocks.runGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT profile.canonical_email AS candidate_email')) {
        return [{ candidate_email: 'candidate@example.com' }]
      }

      return []
    })

    mocks.claimTokenSensitiveEmailIntent.mockImplementation(async (claim: {
      issueCredential: (client: { query: ReturnType<typeof vi.fn> }, deliveryId: string) => Promise<unknown>
    }) => {
      issueClientQuery = vi.fn(async (sql: string) => {
        if (sql.includes('FROM greenhouse_hiring.hiring_assessment assessment')) return { rows: [stateRow] }
        if (sql.includes('FROM greenhouse_notifications.email_deliveries')) return { rows: [] }
        if (sql.includes('COUNT(*) FILTER')) return { rows: [{ total_24h: 0, cooldown_active: false }] }

        if (sql.includes('INSERT INTO greenhouse_hiring.hiring_assessment_access_recovery')) {
          return { rows: [receiptRow()] }
        }

        return { rows: [] }
      })
      const client = { query: issueClientQuery }

      const value = await claim.issueCredential(client, DELIVERY_ID)

      return { claimed: true, deliveryId: DELIVERY_ID, value }
    })
  })

  it('rotates once, dispatches through a redacted intent and closes accepted', async () => {
    const result = await recoverCandidateTestAccessByEmail(input, ACTOR_ID)

    expect(result.receipt.outcome).toBe('dispatch_accepted')
    expect(result.replayed).toBe(false)
    expect(mocks.rotateToken).toHaveBeenCalledTimes(1)
    expect(mocks.rotateToken).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tokenVersionId: '11111111-1111-4111-8111-111111111114' }),
    )
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      emailType: 'hiring_assessment_access_recovery',
      sourceEntity: ASSESSMENT_ID,
      persistence: expect.objectContaining({
        mode: 'token_sensitive',
        deliveryIntentId: DELIVERY_ID,
      }),
      context: expect.objectContaining({
        assessmentUrl: 'https://greenhouse.example/public/assessment/access#access=secret-token-sentinel',
      }),
    }))
    expect(JSON.stringify(mocks.publishOutboxEvent.mock.calls)).not.toContain('secret-token-sentinel')
    expect(JSON.stringify(mocks.runGreenhousePostgresQuery.mock.calls)).not.toContain('secret-token-sentinel')

    const receiptInsert = issueClientQuery.mock.calls.find(call => String(call[0]).includes(
      'INSERT INTO greenhouse_hiring.hiring_assessment_access_recovery',
    ))

    expect(receiptInsert?.[1]).toContain(DELIVERY_ID)
  })

  it('returns an existing receipt without claiming or rotating again', async () => {
    mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{
      ...receiptRow('dispatch_accepted', DELIVERY_ID),
      request_fingerprint: fingerprintAssessmentRecoveryRequest({
        assessmentId: ASSESSMENT_ID,
        channel: 'email',
        reasonCode: input.reasonCode,
      }),
    }])

    const result = await recoverCandidateTestAccessByEmail(input, ACTOR_ID)

    expect(result.replayed).toBe(true)
    expect(result.receipt.outcome).toBe('dispatch_accepted')
    expect(mocks.claimTokenSensitiveEmailIntent).not.toHaveBeenCalled()
    expect(mocks.rotateToken).not.toHaveBeenCalled()
  })

  it('reconciles an accepted delivery whose receipt remained pending after a crash', async () => {
    const pending = {
      ...receiptRow('pending_dispatch', DELIVERY_ID),
      request_fingerprint: fingerprintAssessmentRecoveryRequest({
        assessmentId: ASSESSMENT_ID,
        channel: 'email',
        reasonCode: input.reasonCode,
      }),
    }

    mocks.runGreenhousePostgresQuery
      .mockResolvedValueOnce([pending])
      .mockResolvedValueOnce([{
        ...pending,
        delivery_status: 'sent',
        resend_id: 'provider-id',
      }])

    const result = await recoverCandidateTestAccessByEmail(input, ACTOR_ID)

    expect(result.replayed).toBe(true)
    expect(result.receipt.outcome).toBe('dispatch_accepted')
    expect(mocks.withGreenhousePostgresTransaction).toHaveBeenCalledTimes(1)
    expect(mocks.claimTokenSensitiveEmailIntent).not.toHaveBeenCalled()
    expect(mocks.rotateToken).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('preserves pending when sent evidence has no provider id', async () => {
    mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{
      ...receiptRow('pending_dispatch', DELIVERY_ID),
      delivery_status: 'sent',
      resend_id: null,
    }])

    const result = await reconcileCandidateTestAccessRecoveryEmailReceipt(RECOVERY_ID)

    expect(result?.outcome).toBe('pending_dispatch')
    expect(mocks.withGreenhousePostgresTransaction).not.toHaveBeenCalled()
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('reconciles explicit terminal delivery failure without sending again', async () => {
    mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{
      ...receiptRow('dispatch_unknown', DELIVERY_ID),
      delivery_status: 'failed',
      resend_id: null,
    }])

    const result = await reconcileCandidateTestAccessRecoveryEmailReceipt(RECOVERY_ID)

    expect(result?.outcome).toBe('dispatch_failed')
    expect(mocks.claimTokenSensitiveEmailIntent).not.toHaveBeenCalled()
    expect(mocks.rotateToken).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('does not mutate a terminal receipt during reconciliation', async () => {
    mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{
      ...receiptRow('dispatch_accepted', DELIVERY_ID),
      delivery_status: 'delivered',
      resend_id: 'provider-id',
    }])

    const result = await reconcileCandidateTestAccessRecoveryEmailReceipt(RECOVERY_ID)

    expect(result?.outcome).toBe('dispatch_accepted')
    expect(mocks.withGreenhousePostgresTransaction).not.toHaveBeenCalled()
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('rereads the winner when a concurrent reconciler closes the receipt first', async () => {
    const evidence = {
      ...receiptRow('pending_dispatch', DELIVERY_ID),
      delivery_status: 'sent',
      resend_id: 'provider-id',
    }

    mocks.runGreenhousePostgresQuery
      .mockResolvedValueOnce([evidence])
      .mockResolvedValueOnce([receiptRow('dispatch_accepted', DELIVERY_ID)])
    mocks.withGreenhousePostgresTransaction.mockImplementationOnce(async callback => callback({
      query: vi.fn().mockResolvedValue({ rows: [] }),
    }))

    const result = await reconcileCandidateTestAccessRecoveryEmailReceipt(RECOVERY_ID)

    expect(result?.outcome).toBe('dispatch_accepted')
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('rejects reusing an idempotency key for a different semantic request', async () => {
    mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{
      ...receiptRow('dispatch_accepted', DELIVERY_ID),
      request_fingerprint: 'different-request-fingerprint',
    }])

    await expect(recoverCandidateTestAccessByEmail(input, ACTOR_ID)).rejects.toMatchObject({
      code: 'assessment_recovery_idempotency_conflict',
    })
    expect(mocks.claimTokenSensitiveEmailIntent).not.toHaveBeenCalled()
  })

  it('blocks email when the provider lifecycle says the address complained', async () => {
    mocks.claimTokenSensitiveEmailIntent.mockImplementationOnce(async (claim: {
      issueCredential: (client: { query: ReturnType<typeof vi.fn> }, deliveryId: string) => Promise<unknown>
    }) => claim.issueCredential({
      query: vi.fn(async (sql: string) => {
        if (sql.includes('FROM greenhouse_hiring.hiring_assessment assessment')) return { rows: [stateRow] }

        if (sql.includes('FROM greenhouse_notifications.email_deliveries')) {
          return { rows: [{ blocked: true, provider_status: 'complained' }] }
        }

        return { rows: [] }
      }),
    }, DELIVERY_ID))

    await expect(recoverCandidateTestAccessByEmail(input, ACTOR_ID)).rejects.toMatchObject({
      code: 'assessment_recovery_email_provider_blocked',
      details: { providerStatus: 'complained' },
    })
    expect(mocks.rotateToken).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('marks dispatch unknown when the provider boundary throws after rotation', async () => {
    mocks.sendEmail.mockRejectedValueOnce(new Error('ambiguous transport failure'))
    mocks.runGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT profile.canonical_email AS candidate_email')) {
        return [{ candidate_email: 'candidate@example.com' }]
      }

      return []
    })

    const result = await recoverCandidateTestAccessByEmail(input, ACTOR_ID)

    expect(result.receipt.outcome).toBe('dispatch_unknown')
    expect(mocks.rotateToken).toHaveBeenCalledTimes(1)
  })

  it('does not relabel accepted delivery when closing the receipt fails', async () => {
    mocks.withGreenhousePostgresTransaction.mockRejectedValueOnce(new Error('database unavailable after acceptance'))

    await expect(recoverCandidateTestAccessByEmail(input, ACTOR_ID)).rejects.toThrow('database unavailable')
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(mocks.withGreenhousePostgresTransaction).toHaveBeenCalledTimes(1)
  })

  it('fails closed for non-canonical candidate access origins', () => {
    expect(resolveHiringCandidateAccessOrigin('https://greenhouse.efeoncepro.com')).toBe(
      'https://greenhouse.efeoncepro.com',
    )
    expect(() => resolveHiringCandidateAccessOrigin('http://greenhouse.efeoncepro.com')).toThrow()
    expect(() => resolveHiringCandidateAccessOrigin('https://greenhouse.efeoncepro.com.evil.test')).toThrow()
    expect(() => resolveHiringCandidateAccessOrigin('https://user:pass@greenhouse.efeoncepro.com')).toThrow()
  })

  it('rejects an unsafe origin before claiming or rotating a credential', async () => {
    mocks.hiringPublicBaseUrl.mockReturnValueOnce('https://greenhouse.efeoncepro.com.evil.test')

    await expect(recoverCandidateTestAccessByEmail(input, ACTOR_ID)).rejects.toMatchObject({
      code: 'assessment_recovery_access_origin_invalid',
    })
    expect(mocks.claimTokenSensitiveEmailIntent).not.toHaveBeenCalled()
    expect(mocks.rotateToken).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('fails closed before any claim for malformed idempotency', async () => {
    await expect(recoverCandidateTestAccessByEmail({ ...input, idempotencyKey: 'short' }, ACTOR_ID))
      .rejects.toMatchObject({ code: 'assessment_recovery_invalid_idempotency_key' })
    expect(mocks.claimTokenSensitiveEmailIntent).not.toHaveBeenCalled()
  })
})
