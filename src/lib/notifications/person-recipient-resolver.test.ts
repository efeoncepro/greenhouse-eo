import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetCanonicalPersonsByMemberIds = vi.fn()
const mockGetCanonicalPersonsByIdentityProfileIds = vi.fn()
const mockGetCanonicalPersonByUserId = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/identity/canonical-person', () => ({
  getCanonicalPersonsByMemberIds: (...args: unknown[]) => mockGetCanonicalPersonsByMemberIds(...args),
  getCanonicalPersonsByIdentityProfileIds: (...args: unknown[]) => mockGetCanonicalPersonsByIdentityProfileIds(...args),
  getCanonicalPersonByUserId: (...args: unknown[]) => mockGetCanonicalPersonByUserId(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

const {
  getIdentityProfileNotificationRecipients,
  getMemberNotificationRecipients,
  getRoleCodeNotificationRecipients,
  getUserNotificationRecipient,
  resolveNotificationRecipients
} = await import('./person-recipient-resolver')

describe('person recipient resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers a linked portal user but keeps person context when resolving a member', async () => {
    mockGetCanonicalPersonsByMemberIds.mockResolvedValueOnce(
      new Map([
        ['member-1', {
          identityProfileId: 'profile-1',
          memberId: 'member-1',
          userId: 'user-1',
          displayName: 'Member One Canonical',
          canonicalEmail: 'member.one@efeonce.org',
          portalEmail: 'member.one@login.efeonce.org',
          portalDisplayName: 'Member One Login',
          memberEmail: 'member.one@efeonce.org'
        }]
      ])
    )

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
    mockGetCanonicalPersonsByMemberIds.mockResolvedValueOnce(
      new Map([
        ['member-2', {
          identityProfileId: 'profile-2',
          memberId: 'member-2',
          userId: null,
          displayName: 'Member Two Canonical',
          canonicalEmail: 'member.two@efeonce.org',
          portalEmail: null,
          portalDisplayName: null,
          memberEmail: 'member.two@efeonce.org'
        }]
      ])
    )

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
    mockGetCanonicalPersonsByIdentityProfileIds.mockResolvedValueOnce(
      new Map([
        ['profile-3', {
          identityProfileId: 'profile-3',
          memberId: 'member-3',
          userId: 'user-3',
          displayName: 'Person Three',
          canonicalEmail: 'canonical.three@efeonce.org',
          portalEmail: 'member.three@login.efeonce.org',
          portalDisplayName: 'Member Three Login',
          memberEmail: 'member.three@efeonce.org'
        }]
      ])
    )

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
    mockGetCanonicalPersonByUserId.mockResolvedValueOnce({
      identityProfileId: 'profile-4',
      memberId: 'member-4',
      userId: 'user-4',
      displayName: 'Person Four',
      canonicalEmail: 'canonical.four@efeonce.org',
      portalEmail: 'member.four@login.efeonce.org',
      portalDisplayName: 'Member Four Login',
      memberEmail: 'member.four@efeonce.org'
    })

    await expect(getUserNotificationRecipient('user-4')).resolves.toEqual({
      identityProfileId: 'profile-4',
      memberId: 'member-4',
      userId: 'user-4',
      email: 'member.four@login.efeonce.org',
      fullName: 'Member Four Login'
    })
  })

  it('resolves a mixed recipient list through person-first lookups', async () => {
    mockGetCanonicalPersonsByMemberIds.mockResolvedValueOnce(
      new Map([
        ['member-5', {
          identityProfileId: 'profile-5',
          memberId: 'member-5',
          userId: 'user-5',
          displayName: 'Person Five',
          canonicalEmail: 'canonical.five@efeonce.org',
          portalEmail: 'member.five@login.efeonce.org',
          portalDisplayName: 'Member Five Login',
          memberEmail: 'member.five@efeonce.org'
        }]
      ])
    )
    mockGetCanonicalPersonsByIdentityProfileIds.mockResolvedValueOnce(
      new Map([
        ['profile-6', {
          identityProfileId: 'profile-6',
          memberId: null,
          userId: null,
          displayName: 'Person Six',
          canonicalEmail: 'person.six@efeonce.org',
          portalEmail: null,
          portalDisplayName: null,
          memberEmail: null
        }]
      ])
    )

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

  it('resolves active role-based recipients through the shared person-first notification shape', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        identity_profile_id: 'profile-admin',
        member_id: 'member-admin',
        user_id: 'user-admin',
        email: 'admin@efeoncepro.com',
        full_name: 'Admin One'
      },
      {
        identity_profile_id: 'profile-fallback',
        member_id: 'member-fallback',
        user_id: null,
        email: 'fallback@efeonce.org',
        full_name: 'Fallback Person'
      },
      {
        identity_profile_id: 'profile-admin',
        member_id: 'member-admin',
        user_id: 'user-admin',
        email: 'admin@efeoncepro.com',
        full_name: 'Admin One'
      }
    ])

    await expect(getRoleCodeNotificationRecipients(['efeonce_admin', 'finance_manager'])).resolves.toEqual([
      {
        identityProfileId: 'profile-admin',
        memberId: 'member-admin',
        userId: 'user-admin',
        email: 'admin@efeoncepro.com',
        fullName: 'Admin One'
      },
      {
        identityProfileId: 'profile-fallback',
        memberId: 'member-fallback',
        email: 'fallback@efeonce.org',
        fullName: 'Fallback Person'
      }
    ])
  })
})
