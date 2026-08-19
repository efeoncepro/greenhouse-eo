import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as RecoverEmailModule from './recover-email'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  publish: vi.fn(),
  rotate: vi.fn(),
  loadState: vi.fn(),
  rateLimit: vi.fn(),
  resolveOrigin: vi.fn(),
}))

vi.mock('@/lib/postgres/client', () => ({ withGreenhousePostgresTransaction: mocks.transaction }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: mocks.publish }))
vi.mock('../instances', () => ({ rotateCandidateTestTokenForAccessRecoveryWithClient: mocks.rotate }))
vi.mock('./recover-email', async importOriginal => {
  const actual = await importOriginal<typeof RecoverEmailModule>()

  return {
    ...actual,
    loadRecoveryState: mocks.loadState,
    assertRecoveryRateLimit: mocks.rateLimit,
    resolveHiringCandidateAccessOrigin: mocks.resolveOrigin,
  }
})

import { fingerprintAssessmentRecoveryRequest } from './contracts'
import { recoverCandidateTestAccessBySecureLink } from './recover-secure-link'

const assessmentId = 'asmt-11111111-1111-4111-8111-111111111111'
const actorUserId = 'user-operator'

const input = {
  assessmentId,
  reasonCode: 'alternate_channel_requested' as const,
  idempotencyKey: 'manual-link-idempotency-0001',
}

const receipt = {
  recovery_id: 'harc-11111111-1111-4111-8111-111111111111',
  assessment_id: assessmentId,
  application_id: 'happ-11111111-1111-4111-8111-111111111111',
  opening_id: 'hopn-11111111-1111-4111-8111-111111111111',
  actor_user_id: actorUserId,
  channel: 'secure_link',
  reason_code: input.reasonCode,
  previous_status: 'sent',
  resulting_status: 'sent',
  token_version_id: '11111111-1111-4111-8111-111111111112',
  issued_at: new Date('2026-08-19T12:00:00Z'),
  expires_at: new Date('2026-08-20T12:00:00Z'),
  outcome: 'link_issued',
  delivery_id: null,
}

describe('recoverCandidateTestAccessBySecureLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveOrigin.mockReturnValue('https://greenhouse.example')
    mocks.loadState.mockResolvedValue({
      assessment_id: assessmentId,
      application_id: receipt.application_id,
      opening_id: receipt.opening_id,
      method: 'candidate_test',
      status: 'sent',
      started_at: null,
      token_expires_at: new Date('2026-08-30T00:00:00Z'),
      time_limit_minutes: 45,
      accommodations_json: {},
      application_stage: 'screening',
      application_decision: null,
      consent_status: 'granted',
      now_at: new Date('2026-08-19T12:00:00Z'),
      effective_deadline_at: null,
    })
    mocks.rotate.mockResolvedValue({ token: 'poisoned-bearer-sentinel', timeLimitMinutes: 45 })
    mocks.publish.mockResolvedValue('outbox-id')
    mocks.transaction.mockImplementation(async callback => callback({
      query: vi.fn(async (sql: string) => {
        if (sql.includes('INSERT INTO greenhouse_hiring.hiring_assessment_access_recovery')) {
          return { rows: [receipt] }
        }

        return { rows: [] }
      }),
    }))
  })

  it('serializa, rota y revela el bearer una sola vez sin publicarlo', async () => {
    const result = await recoverCandidateTestAccessBySecureLink(input, actorUserId)
    const client = mocks.rotate.mock.calls[0]?.[0]

    expect(result).toMatchObject({ replayed: false, linkRevealed: true })
    expect(result.linkRevealed && result.accessUrl).toBe(
      'https://greenhouse.example/public/assessment/access#access=poisoned-bearer-sentinel',
    )
    expect(client.query.mock.calls[0][0]).toContain('pg_advisory_xact_lock')
    expect(JSON.stringify(mocks.publish.mock.calls)).not.toContain('poisoned-bearer-sentinel')
    expect(JSON.stringify(client.query.mock.calls)).not.toContain('poisoned-bearer-sentinel')
  })

  it('un replay devuelve receipt pero nunca vuelve a revelar ni rota', async () => {
    mocks.transaction.mockImplementation(async callback => callback({
      query: vi.fn(async (sql: string) => sql.includes("channel='secure_link'")
        ? { rows: [{
            ...receipt,
            request_fingerprint: fingerprintAssessmentRecoveryRequest({
              assessmentId,
              channel: 'secure_link',
              reasonCode: input.reasonCode,
            }),
          }] }
        : { rows: [] }),
    }))

    const result = await recoverCandidateTestAccessBySecureLink(input, actorUserId)

    expect(result).toMatchObject({ replayed: true, linkRevealed: false })
    expect(mocks.rotate).not.toHaveBeenCalled()
  })

  it('valida el origin antes de entrar a la transacción de rotación', async () => {
    mocks.resolveOrigin.mockImplementation(() => { throw new Error('unsafe-origin') })

    await expect(recoverCandidateTestAccessBySecureLink(input, actorUserId)).rejects.toThrow('unsafe-origin')
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('para in_progress conserva el deadline existente y nunca extiende el timer', async () => {
    const deadline = new Date('2026-08-19T12:25:00Z')

    mocks.loadState.mockResolvedValue({
      ...(await mocks.loadState()),
      status: 'in_progress',
      started_at: new Date('2026-08-19T11:40:00Z'),
      effective_deadline_at: deadline,
    })

    const inProgressReceipt = {
      ...receipt,
      previous_status: 'in_progress',
      resulting_status: 'in_progress',
      expires_at: deadline,
    }

    mocks.transaction.mockImplementation(async callback => callback({
      query: vi.fn(async (sql: string) => sql.includes('INSERT INTO greenhouse_hiring.hiring_assessment_access_recovery')
        ? { rows: [inProgressReceipt] }
        : { rows: [] }),
    }))

    await recoverCandidateTestAccessBySecureLink(input, actorUserId)

    expect(mocks.rotate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ expiresAt: deadline }))
  })
})
