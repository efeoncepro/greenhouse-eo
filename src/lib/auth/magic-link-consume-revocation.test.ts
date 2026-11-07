import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn(), tenant: vi.fn(), attempt: vi.fn(), compare: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: mocks.query }))
vi.mock('@/lib/auth/attempt-tracker', () => ({ recordAuthAttempt: mocks.attempt }))
vi.mock('bcryptjs', () => ({ compare: mocks.compare, hash: vi.fn() }))
vi.mock('@/lib/tenant/access', () => ({ getTenantAccessRecordByUserId: mocks.tenant, getTenantAccessRecordByEmail: vi.fn() }))

import { consumeMagicLink } from './magic-link'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.query.mockImplementation(async (sql: string) =>
    sql.includes('SELECT user_id')
      ? [{ user_id: 'client-user', token_hash_bcrypt: 'hash', expires_at: new Date(Date.now() + 60_000), used_at: null }]
      : [])
  mocks.compare.mockResolvedValue(true)
})

describe('TASK-2096 H2b — consuming a magic link re-checks that the person is still active', () => {
  it('a link requested before the person was disabled does not mint a session', async () => {
    mocks.tenant.mockResolvedValue({ userId: 'client-user', email: 'persona@cliente.test', active: false, status: 'disabled' })

    const result = await consumeMagicLink({ tokenId: 'tok', rawToken: 'raw', ip: null })

    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(mocks.attempt).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'magic_link_consume', outcome: 'rejected', reasonCode: 'account_disabled', userIdResolved: 'client-user'
    }))
  })

  it('an active person still gets the session', async () => {
    mocks.tenant.mockResolvedValue({ userId: 'client-user', email: 'persona@cliente.test', active: true, status: 'active' })

    const result = await consumeMagicLink({ tokenId: 'tok', rawToken: 'raw', ip: null })

    expect(result.ok).toBe(true)
    expect(mocks.attempt).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'success' }))
  })
})
