import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockGetMemberNotificationRecipients = vi.fn()
const mockGetCanonicalPersonByUserId = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/notifications/person-recipient-resolver', () => ({
  getMemberNotificationRecipients: (...args: unknown[]) => mockGetMemberNotificationRecipients(...args)
}))

vi.mock('@/lib/identity/canonical-person', () => ({
  getCanonicalPersonByUserId: (...args: unknown[]) => mockGetCanonicalPersonByUserId(...args)
}))

const {
  getMemberRecipient,
  getPayrollPeriodRecipients,
  getHrAdminRecipients,
  getUserRecipient
} = await import('./notification-recipients')

describe('notification recipient helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves a member recipient when a linked user exists', async () => {
    mockGetMemberNotificationRecipients.mockResolvedValueOnce(
      new Map([
        ['member-1', {
          identityProfileId: 'profile-1',
          memberId: 'member-1',
          userId: 'user-1',
          email: 'member@example.com',
          fullName: 'Member One'
        }]
      ])
    )

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
    mockGetMemberNotificationRecipients.mockResolvedValueOnce(
      new Map([
        ['member-2', {
          identityProfileId: 'profile-2',
          memberId: 'member-2',
          email: 'member.two@efeonce.org',
          fullName: 'Member Two Canonical'
        }]
      ])
    )

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
    mockGetMemberNotificationRecipients.mockResolvedValueOnce(
      new Map([
        ['member-1', {
          identityProfileId: 'profile-1',
          memberId: 'member-1',
          userId: 'user-1',
          email: 'user1@example.com',
          fullName: 'User One'
        }],
        ['member-2', {
          identityProfileId: 'profile-2',
          memberId: 'member-2',
          email: 'user.two@efeonce.org',
          fullName: 'User Two Canonical'
        }]
      ])
    )

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

  it('resolves a user recipient through the canonical person graph', async () => {
    mockGetCanonicalPersonByUserId.mockResolvedValueOnce({
      identityProfileId: 'profile-user',
      memberId: 'member-user',
      userId: 'user-42',
      canonicalEmail: 'person@efeoncepro.com',
      portalEmail: 'user@efeoncepro.com',
      memberEmail: 'person@efeoncepro.com',
      displayName: 'Canonical User',
      portalDisplayName: 'Portal User'
    })

    await expect(getUserRecipient('user-42')).resolves.toEqual({
      recipients: [{
        identityProfileId: 'profile-user',
        memberId: 'member-user',
        userId: 'user-42',
        email: 'user@efeoncepro.com',
        fullName: 'Portal User'
      }],
      unresolvedRecipients: 0
    })
  })
})
