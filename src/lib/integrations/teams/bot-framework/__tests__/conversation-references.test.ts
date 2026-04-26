import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pgQueryMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => pgQueryMock(...args)
}))

const {
  buildReferenceKey,
  resolveConversationReference,
  recordReferenceSuccess,
  markReferenceFailure,
  __resetConversationReferenceCache
} = await import('@/lib/integrations/teams/bot-framework/conversation-references')

beforeEach(() => {
  pgQueryMock.mockReset()
  __resetConversationReferenceCache()
})

afterEach(() => {
  __resetConversationReferenceCache()
})

describe('buildReferenceKey', () => {
  it('builds stable channel keys', () => {
    expect(buildReferenceKey('channel', { teamId: 't1', channelId: 'c1' })).toBe('channel:t1:c1')
  })

  it('builds stable 1:1 keys', () => {
    expect(buildReferenceKey('chat_1on1', { aadObjectId: 'aad-1' })).toBe('user:aad-1')
  })

  it('builds stable group chat keys', () => {
    expect(buildReferenceKey('chat_group', { chatId: 'chat-x' })).toBe('chat:chat-x')
  })
})

describe('resolveConversationReference', () => {
  it('returns null when no row exists', async () => {
    pgQueryMock.mockResolvedValueOnce([])

    expect(await resolveConversationReference('app-1', 'channel:t:c')).toBeNull()
  })

  it('returns the row when failure_count < threshold', async () => {
    pgQueryMock.mockResolvedValueOnce([
      {
        reference_key: 'channel:t:c',
        service_url: 'https://smba.trafficmanager.net/teams',
        conversation_id: '19:abc;messageid=42',
        failure_count: 1,
        last_failure_reason: 'transient'
      }
    ])

    const r = await resolveConversationReference('app-1', 'channel:t:c')

    expect(r?.serviceUrl).toBe('https://smba.trafficmanager.net/teams')
    expect(r?.failureCount).toBe(1)
  })

  it('treats tripped circuit breaker as null', async () => {
    pgQueryMock.mockResolvedValueOnce([
      {
        reference_key: 'channel:t:c',
        service_url: 'https://smba.trafficmanager.net/teams',
        conversation_id: null,
        failure_count: 3,
        last_failure_reason: 'too many'
      }
    ])

    expect(await resolveConversationReference('app-1', 'channel:t:c')).toBeNull()
  })

  it('caches the row in memory until TTL elapses', async () => {
    pgQueryMock.mockResolvedValueOnce([
      {
        reference_key: 'channel:t:c',
        service_url: 'https://smba.trafficmanager.net/teams',
        conversation_id: null,
        failure_count: 0,
        last_failure_reason: null
      }
    ])

    const now = 1_000_000

    await resolveConversationReference('app-1', 'channel:t:c', { now: () => now })
    await resolveConversationReference('app-1', 'channel:t:c', { now: () => now + 1_000 })

    expect(pgQueryMock).toHaveBeenCalledTimes(1)
  })
})

describe('recordReferenceSuccess', () => {
  it('upserts and warms the in-memory cache', async () => {
    pgQueryMock.mockResolvedValueOnce([])

    await recordReferenceSuccess({
      botAppId: 'app-1',
      azureTenantId: 'tenant-a',
      referenceKey: 'channel:t:c',
      serviceUrl: 'https://smba.trafficmanager.net/teams',
      conversationId: '19:abc;messageid=42'
    })

    expect(pgQueryMock).toHaveBeenCalledTimes(1)
    const sql = pgQueryMock.mock.calls[0][0] as string

    expect(sql).toContain('INSERT INTO greenhouse_core.teams_bot_conversation_references')
    expect(sql).toContain('failure_count   = 0')

    // Subsequent resolve should hit memory cache (no extra PG query)
    pgQueryMock.mockReset()
    const r = await resolveConversationReference('app-1', 'channel:t:c')

    expect(pgQueryMock).not.toHaveBeenCalled()
    expect(r?.serviceUrl).toBe('https://smba.trafficmanager.net/teams')
  })
})

describe('markReferenceFailure', () => {
  it('increments the counter with redacted reason and drops in-memory cache', async () => {
    pgQueryMock.mockResolvedValueOnce([])

    await markReferenceFailure({
      botAppId: 'app-1',
      referenceKey: 'channel:t:c',
      redactedReason: 'http_error 500'
    })

    expect(pgQueryMock).toHaveBeenCalledTimes(1)
    const sql = pgQueryMock.mock.calls[0][0] as string

    expect(sql).toContain('failure_count       = failure_count + 1')
  })
})
