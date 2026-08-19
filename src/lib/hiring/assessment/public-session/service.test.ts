import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  exchange: vi.fn(),
  resolve: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: mocks.transaction,
}))
vi.mock('./store', () => ({
  exchangePublicAssessmentAccessWithClient: mocks.exchange,
  resolvePublicAssessmentSessionWithClient: mocks.resolve,
  revokePublicAssessmentSessionWithClient: mocks.revoke,
}))

import {
  exchangePublicAssessmentAccess,
  resolvePublicAssessmentSession,
  revokePublicAssessmentSession,
  withPublicAssessmentSession,
} from './service'

const session = {
  publicSessionId: 'haps-1',
  assessmentId: 'asmt-1',
  accessTokenVersionId: '11111111-1111-4111-8111-111111111111',
  status: 'active' as const,
  expiresAt: '2026-08-20T00:00:00.000Z',
}

describe('public assessment session service', () => {
  const client = { query: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXTAUTH_SECRET', 'test-only-public-session-budget-key')
    mocks.transaction.mockImplementation(async callback => callback(client))
  })
  afterEach(() => vi.unstubAllEnvs())

  it('rejects malformed access credentials before opening a transaction', async () => {
    await expect(exchangePublicAssessmentAccess('short')).resolves.toBeNull()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('passes only digests to persistence and returns the raw session once', async () => {
    const rawAccessToken = 'a'.repeat(32)

    mocks.exchange.mockResolvedValue({ outcome: 'issued', session })
    const result = await exchangePublicAssessmentAccess(rawAccessToken)

    expect(result?.session).toEqual(session)
    expect(result?.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const persistedInput = mocks.exchange.mock.calls[0]?.[1]

    expect(persistedInput.accessTokenDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(persistedInput.sessionTokenDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(persistedInput.requestBudget).toMatchObject({ surface: 'exchange_credential', limit: 10 })
    expect(JSON.stringify(mocks.exchange.mock.calls)).not.toContain(rawAccessToken)
    expect(JSON.stringify(mocks.exchange.mock.calls)).not.toContain(result?.sessionToken)
  })

  it('keeps the validated session lock and callback in the same transaction', async () => {
    mocks.resolve.mockResolvedValue(session)
    const callback = vi.fn(async (_client, resolved) => resolved.assessmentId)

    await expect(withPublicAssessmentSession('s'.repeat(43), callback)).resolves.toBe('asmt-1')
    expect(callback).toHaveBeenCalledWith(client, session)
    expect(mocks.resolve.mock.calls[0]?.[1]).toMatchObject({
      requestBudget: { surface: 'session_read_credential', limit: 120 },
    })
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
  })

  it('commits the valid-session budget before rethrowing a callback failure', async () => {
    const transactionCompleted = vi.fn()

    mocks.resolve.mockResolvedValue(session)
    mocks.transaction.mockImplementationOnce(async callback => {
      const result = await callback(client)

      transactionCompleted()

      return result
    })

    const failure = new Error('invalid action')

    await expect(withPublicAssessmentSession('s'.repeat(43), async () => {
      throw failure
    }, 'session_write')).rejects.toBe(failure)
    expect(transactionCompleted).toHaveBeenCalledOnce()
    expect(client.query.mock.calls.map(call => call[0])).toEqual([
      'SAVEPOINT assessment_public_session_action',
      'ROLLBACK TO SAVEPOINT assessment_public_session_action',
      'RELEASE SAVEPOINT assessment_public_session_action',
    ])
    expect(mocks.resolve.mock.calls[0]?.[1]).toMatchObject({
      requestBudget: { surface: 'session_write_credential', limit: 60 },
    })
  })

  it('releases the action savepoint only after a successful callback', async () => {
    mocks.resolve.mockResolvedValue(session)

    await expect(withPublicAssessmentSession('s'.repeat(43), async () => 'ok', 'session_write'))
      .resolves.toBe('ok')
    expect(client.query.mock.calls.map(call => call[0])).toEqual([
      'SAVEPOINT assessment_public_session_action',
      'RELEASE SAVEPOINT assessment_public_session_action',
    ])
  })

  it('reports issuance failure only after the transaction commits its credential claim', async () => {
    const transactionCompleted = vi.fn()

    mocks.exchange.mockResolvedValue({ outcome: 'issuance_failed' })
    mocks.transaction.mockImplementationOnce(async callback => {
      const result = await callback(client)

      transactionCompleted()

      return result
    })

    await expect(exchangePublicAssessmentAccess('a'.repeat(32)))
      .rejects.toThrow('Public assessment session issuance failed.')
    expect(transactionCompleted).toHaveBeenCalledOnce()
  })

  it('resolves and revokes only well-formed session credentials', async () => {
    mocks.resolve.mockResolvedValue(session)
    mocks.revoke.mockResolvedValue(true)

    await expect(resolvePublicAssessmentSession('s'.repeat(43))).resolves.toEqual(session)
    await expect(revokePublicAssessmentSession('s'.repeat(43))).resolves.toBe(true)
    await expect(revokePublicAssessmentSession('bad')).resolves.toBe(false)
    expect(mocks.revoke).toHaveBeenCalledTimes(1)
  })
})
