import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    mocks.transaction.mockImplementation(async callback => callback(client))
  })

  it('rejects malformed access credentials before opening a transaction', async () => {
    await expect(exchangePublicAssessmentAccess('short')).resolves.toBeNull()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('passes only digests to persistence and returns the raw session once', async () => {
    const rawAccessToken = 'a'.repeat(32)

    mocks.exchange.mockResolvedValue(session)
    const result = await exchangePublicAssessmentAccess(rawAccessToken)

    expect(result?.session).toEqual(session)
    expect(result?.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const persistedInput = mocks.exchange.mock.calls[0]?.[1]

    expect(persistedInput.accessTokenDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(persistedInput.sessionTokenDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(mocks.exchange.mock.calls)).not.toContain(rawAccessToken)
    expect(JSON.stringify(mocks.exchange.mock.calls)).not.toContain(result?.sessionToken)
  })

  it('keeps the validated session lock and callback in the same transaction', async () => {
    mocks.resolve.mockResolvedValue(session)
    const callback = vi.fn(async (_client, resolved) => resolved.assessmentId)

    await expect(withPublicAssessmentSession('s'.repeat(43), callback)).resolves.toBe('asmt-1')
    expect(callback).toHaveBeenCalledWith(client, session)
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
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
