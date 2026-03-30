import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

const {
  getMemberRecipient,
  getPayrollPeriodRecipients,
  getHrAdminRecipients
} = await import('./notification-recipients')

describe('notification recipient helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves a member recipient when a linked user exists', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        member_id: 'member-1',
        identity_profile_id: 'profile-1',
        display_name: 'Member One',
        primary_email: 'member.one@efeonce.org',
        canonical_email: 'member.one@efeonce.org',
        profile_full_name: 'Member One Canonical',
        user_id: 'user-1',
        client_user_email: 'member@example.com',
        client_user_full_name: 'Member One'
      }
    ])

    await expect(getMemberRecipient('member-1')).resolves.toEqual({
      recipients: [{
        identityProfileId: 'profile-1',
        memberId: 'member-1',
        userId: 'user-1',
        email: 'member@example.com',
        fullName: 'Member One'
      }],
      unresolvedRecipients: 0
    })
  })

  it('counts unresolved member recipients when the member has no linked user', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        member_id: 'member-2',
        identity_profile_id: 'profile-2',
        display_name: 'Member Two',
        primary_email: 'member.two@efeonce.org',
        canonical_email: 'member.two@efeonce.org',
        profile_full_name: 'Member Two Canonical',
        user_id: null,
        client_user_email: null,
        client_user_full_name: null
      }
    ])

    await expect(getMemberRecipient('member-2')).resolves.toEqual({
      recipients: [{
        identityProfileId: 'profile-2',
        memberId: 'member-2',
        email: 'member.two@efeonce.org',
        fullName: 'Member Two Canonical'
      }],
      unresolvedRecipients: 0
    })
  })

  it('resolves payroll period recipients and tracks unresolved members', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { member_id: 'member-1' },
        { member_id: 'member-2' }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          identity_profile_id: 'profile-1',
          display_name: 'User One',
          primary_email: 'member.one@efeonce.org',
          canonical_email: 'member.one@efeonce.org',
          profile_full_name: 'User One Canonical',
          user_id: 'user-1',
          client_user_email: 'user1@example.com',
          client_user_full_name: 'User One'
        },
        {
          member_id: 'member-2',
          identity_profile_id: 'profile-2',
          display_name: 'User Two',
          primary_email: 'user.two@efeonce.org',
          canonical_email: 'user.two@efeonce.org',
          profile_full_name: 'User Two Canonical',
          user_id: null,
          client_user_email: null,
          client_user_full_name: null
        }
      ])

    await expect(getPayrollPeriodRecipients('2026-03')).resolves.toEqual({
      recipients: [
        {
          identityProfileId: 'profile-1',
          memberId: 'member-1',
          userId: 'user-1',
          email: 'user1@example.com',
          fullName: 'User One'
        },
        {
          identityProfileId: 'profile-2',
          memberId: 'member-2',
          email: 'user.two@efeonce.org',
          fullName: 'User Two Canonical'
        }
      ],
      unresolvedRecipients: 0
    })
  })

  it('resolves HR/admin recipients from session_360', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        identity_profile_id: 'profile-admin',
        member_id: 'member-admin',
        user_id: 'user-admin',
        email: 'admin@efeoncepro.com',
        full_name: 'Admin One'
      }
    ])

    await expect(getHrAdminRecipients()).resolves.toEqual({
      recipients: [{
        identityProfileId: 'profile-admin',
        memberId: 'member-admin',
        userId: 'user-admin',
        email: 'admin@efeoncepro.com',
        fullName: 'Admin One'
      }],
      unresolvedRecipients: 0
    })
  })
})
