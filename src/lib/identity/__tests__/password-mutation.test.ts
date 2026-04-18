import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPublishOutboxEvent = vi.fn()
const mockWithTransaction = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('@/lib/db', () => ({
  withTransaction: (cb: (client: unknown) => Promise<unknown>) => mockWithTransaction(cb)
}))

import { withPasswordChangeAuthorization } from '../password-mutation'

beforeEach(() => {
  mockPublishOutboxEvent.mockReset()
  mockWithTransaction.mockReset()
})

const createClientMock = () => {
  const query = vi.fn().mockResolvedValue({ rows: [] })

  return { query }
}

describe('withPasswordChangeAuthorization', () => {
  it('sets the session variable before the callback runs', async () => {
    const client = createClientMock()

    mockWithTransaction.mockImplementation(async cb => cb(client))

    await withPasswordChangeAuthorization(
      { userId: 'user-1', source: 'user_reset' },
      async c => {
        await c.query('UPDATE foo SET bar = 1')
      }
    )

    const calls = client.query.mock.calls

    expect(calls[0][0]).toMatch(/SET LOCAL app\.password_change_authorized = 'true'/)
    expect(calls[1][0]).toBe('UPDATE foo SET bar = 1')
  })

  it('publishes identity.password_hash.rotated with the correct aggregate + payload', async () => {
    const client = createClientMock()

    mockWithTransaction.mockImplementation(async cb => cb(client))

    await withPasswordChangeAuthorization(
      { userId: 'user-42', source: 'accept_invite', actorUserId: 'admin-1' },
      async c => {
        await c.query('UPDATE foo SET bar = 2')
      }
    )

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(1)
    const [event, passedClient] = mockPublishOutboxEvent.mock.calls[0]

    expect(event).toMatchObject({
      aggregateType: 'identity_credential',
      aggregateId: 'user-42',
      eventType: 'identity.password_hash.rotated'
    })
    expect(event.payload).toMatchObject({
      userId: 'user-42',
      source: 'accept_invite',
      actorUserId: 'admin-1'
    })
    expect(typeof event.payload.rotatedAt).toBe('string')
    expect(passedClient).toBe(client)
  })

  it('falls back actorUserId to userId when not provided', async () => {
    const client = createClientMock()

    mockWithTransaction.mockImplementation(async cb => cb(client))

    await withPasswordChangeAuthorization(
      { userId: 'user-self', source: 'user_reset' },
      async () => {
        /* noop */
      }
    )

    expect(mockPublishOutboxEvent.mock.calls[0][0].payload).toMatchObject({
      userId: 'user-self',
      actorUserId: 'user-self',
      source: 'user_reset'
    })
  })

  it('returns the callback result', async () => {
    const client = createClientMock()

    mockWithTransaction.mockImplementation(async cb => cb(client))

    const result = await withPasswordChangeAuthorization(
      { userId: 'user-x', source: 'test_fixture' },
      async () => ({ ok: true, rows: 7 })
    )

    expect(result).toEqual({ ok: true, rows: 7 })
  })

  it('runs the entire flow inside withTransaction', async () => {
    const client = createClientMock()

    mockWithTransaction.mockImplementation(async cb => cb(client))

    await withPasswordChangeAuthorization(
      { userId: 'user-1', source: 'user_reset' },
      async () => undefined
    )

    expect(mockWithTransaction).toHaveBeenCalledTimes(1)
  })
})
