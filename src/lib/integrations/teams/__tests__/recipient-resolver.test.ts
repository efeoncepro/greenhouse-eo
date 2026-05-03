import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pgQueryMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => pgQueryMock(...args)
}))

const {
  resolveTeamsUserForMember,
  extractMemberIdFromPayload,
  __resetTeamsRecipientResolverCache
} = await import('@/lib/integrations/teams/recipient-resolver')

beforeEach(() => {
  pgQueryMock.mockReset()
  __resetTeamsRecipientResolverCache()
})

afterEach(() => {
  __resetTeamsRecipientResolverCache()
})

describe('resolveTeamsUserForMember', () => {
  it('returns members.teams_user_id path 1 when populated', async () => {
    pgQueryMock.mockResolvedValueOnce([
      {
        member_id: 'mem-1',
        teams_user_id: 'aad-direct',
        microsoft_oid: 'aad-from-oid',
        microsoft_email: null,
        client_user_email: 'mem1@efe.com'
      }
    ])

    const result = await resolveTeamsUserForMember('mem-1')

    expect(result).toEqual({
      source: 'members.teams_user_id',
      aadObjectId: 'aad-direct',
      email: 'mem1@efe.com',
      memberId: 'mem-1'
    })
  })

  it('falls back to microsoft_oid when teams_user_id is null', async () => {
    pgQueryMock.mockResolvedValueOnce([
      {
        member_id: 'mem-2',
        teams_user_id: null,
        microsoft_oid: 'aad-via-sso',
        microsoft_email: 'sso@efe.com',
        client_user_email: 'sso@efe.com'
      }
    ])

    const result = await resolveTeamsUserForMember('mem-2')

    expect(result).toEqual({
      source: 'client_users.microsoft_oid',
      aadObjectId: 'aad-via-sso',
      email: 'sso@efe.com',
      memberId: 'mem-2'
    })
  })

  it('falls back to email when no aad identity is recorded', async () => {
    pgQueryMock.mockResolvedValueOnce([
      {
        member_id: 'mem-3',
        teams_user_id: null,
        microsoft_oid: null,
        microsoft_email: null,
        client_user_email: 'pre-sso@efe.com'
      }
    ])

    const result = await resolveTeamsUserForMember('mem-3')

    expect(result).toEqual({
      source: 'client_users.email',
      aadObjectId: null,
      email: 'pre-sso@efe.com',
      memberId: 'mem-3'
    })
  })

  it('returns null when member is unknown', async () => {
    pgQueryMock.mockResolvedValueOnce([])

    expect(await resolveTeamsUserForMember('mem-missing')).toBeNull()
  })

  it('caches results for subsequent calls within TTL', async () => {
    pgQueryMock.mockResolvedValueOnce([
      {
        member_id: 'mem-cached',
        teams_user_id: 'aad-cached',
        microsoft_oid: null,
        microsoft_email: null,
        client_user_email: null
      }
    ])

    const now = 1_000_000

    await resolveTeamsUserForMember('mem-cached', { now: () => now })
    await resolveTeamsUserForMember('mem-cached', { now: () => now + 1_000 })

    expect(pgQueryMock).toHaveBeenCalledTimes(1)
  })
})

describe('extractMemberIdFromPayload', () => {
  it('walks dot-paths starting with `payload.`', () => {
    const id = extractMemberIdFromPayload(
      { assigneeMemberId: 'mem-x' },
      { from: 'payload.assigneeMemberId' }
    )

    expect(id).toBe('mem-x')
  })

  it('walks nested paths', () => {
    const id = extractMemberIdFromPayload(
      { incident: { responsible: { memberId: 'mem-deep' } } },
      { from: 'payload.incident.responsible.memberId' }
    )

    expect(id).toBe('mem-deep')
  })

  it('returns null when path is missing', () => {
    expect(
      extractMemberIdFromPayload({ a: { b: 'x' } }, { from: 'payload.a.c' })
    ).toBeNull()
  })

  it('returns null for empty/missing values', () => {
    expect(
      extractMemberIdFromPayload({ assigneeMemberId: '   ' }, { from: 'payload.assigneeMemberId' })
    ).toBeNull()
    expect(extractMemberIdFromPayload({}, null)).toBeNull()
  })
})
