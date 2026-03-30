import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

const {
  getIdentityProfileNotificationRecipients,
  getMemberNotificationRecipients,
  getUserNotificationRecipient,
  resolveNotificationRecipients
} = await import('./person-recipient-resolver')

describe('person recipient resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers a linked portal user but keeps person context when resolving a member', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        member_id: 'member-1',
        identity_profile_id: 'profile-1',
        display_name: 'Member One',
        primary_email: 'member.one@efeonce.org',
        canonical_email: 'member.one@efeonce.org',
        profile_full_name: 'Member One Canonical',
        user_id: 'user-1',
        client_user_email: 'member.one@login.efeonce.org',
        client_user_full_name: 'Member One Login'
      }
    ])

    await expect(getMemberNotificationRecipients(['member-1'])).resolves.toEqual(
      new Map([
        ['member-1', {
          identityProfileId: 'profile-1',
          memberId: 'member-1',
          userId: 'user-1',
          email: 'member.one@login.efeonce.org',
          fullName: 'Member One Login'
        }]
      ])
    )
  })

  it('falls back to canonical person contact when there is no portal user', async () => {
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

    await expect(getMemberNotificationRecipients(['member-2'])).resolves.toEqual(
      new Map([
        ['member-2', {
          identityProfileId: 'profile-2',
          memberId: 'member-2',
          email: 'member.two@efeonce.org',
          fullName: 'Member Two Canonical'
        }]
      ])
    )
  })

  it('can resolve a person directly from identity_profile_id', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        profile_id: 'profile-3',
        member_id: 'member-3',
        display_name: 'Member Three',
        primary_email: 'member.three@efeonce.org',
        canonical_email: 'canonical.three@efeonce.org',
        profile_full_name: 'Person Three',
        user_id: 'user-3',
        client_user_email: 'member.three@login.efeonce.org',
        client_user_full_name: 'Member Three Login'
      }
    ])

    await expect(getIdentityProfileNotificationRecipients(['profile-3'])).resolves.toEqual(
      new Map([
        ['profile-3', {
          identityProfileId: 'profile-3',
          memberId: 'member-3',
          userId: 'user-3',
          email: 'member.three@login.efeonce.org',
          fullName: 'Member Three Login'
        }]
      ])
    )
  })

  it('can resolve a person starting from userId and recover member/profile context', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        profile_id: 'profile-4',
        member_id: 'member-4',
        display_name: 'Member Four',
        primary_email: 'member.four@efeonce.org',
        canonical_email: 'canonical.four@efeonce.org',
        profile_full_name: 'Person Four',
        user_id: 'user-4',
        client_user_email: 'member.four@login.efeonce.org',
        client_user_full_name: 'Member Four Login'
      }
    ])

    await expect(getUserNotificationRecipient('user-4')).resolves.toEqual({
      identityProfileId: 'profile-4',
      memberId: 'member-4',
      userId: 'user-4',
      email: 'member.four@login.efeonce.org',
      fullName: 'Member Four Login'
    })
  })

  it('resolves a mixed recipient list through person-first lookups', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          member_id: 'member-5',
          identity_profile_id: 'profile-5',
          display_name: 'Member Five',
          primary_email: 'member.five@efeonce.org',
          canonical_email: 'canonical.five@efeonce.org',
          profile_full_name: 'Person Five',
          user_id: 'user-5',
          client_user_email: 'member.five@login.efeonce.org',
          client_user_full_name: 'Member Five Login'
        }
      ])
      .mockResolvedValueOnce([
        {
          profile_id: 'profile-6',
          member_id: null,
          display_name: null,
          primary_email: null,
          canonical_email: 'person.six@efeonce.org',
          profile_full_name: 'Person Six',
          user_id: null,
          client_user_email: null,
          client_user_full_name: null
        }
      ])

    await expect(resolveNotificationRecipients([
      { memberId: 'member-5' },
      { identityProfileId: 'profile-6' },
      { email: 'external@example.com', fullName: 'External Ops' }
    ])).resolves.toEqual([
      {
        identityProfileId: 'profile-5',
        memberId: 'member-5',
        userId: 'user-5',
        email: 'member.five@login.efeonce.org',
        fullName: 'Member Five Login'
      },
      {
        identityProfileId: 'profile-6',
        email: 'person.six@efeonce.org',
        fullName: 'Person Six'
      },
      {
        email: 'external@example.com',
        fullName: 'External Ops'
      }
    ])
  })
})
