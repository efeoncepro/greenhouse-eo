import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetCanonicalPersonsByUserIds = vi.fn()

vi.mock('@/lib/identity/canonical-person', () => ({
  getCanonicalPersonsByUserIds: (...args: unknown[]) => mockGetCanonicalPersonsByUserIds(...args)
}))

const { enrichGovernancePreviewUsers } = await import('./admin-preview-persons')

describe('admin preview persons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('groups multiple portal principals under the same canonical person', async () => {
    mockGetCanonicalPersonsByUserIds.mockResolvedValueOnce(
      new Map([
        ['user-a', {
          identityProfileId: 'profile-1',
          memberId: 'member-1',
          userId: 'user-a',
          displayName: 'Ada Lovelace',
          canonicalEmail: 'ada@efeoncepro.com',
          tenantType: 'efeonce_internal',
          portalAccessState: 'active',
          resolutionSource: 'person_360'
        }],
        ['user-b', {
          identityProfileId: 'profile-1',
          memberId: 'member-1',
          userId: 'user-b',
          displayName: 'Ada Lovelace',
          canonicalEmail: 'ada@efeoncepro.com',
          tenantType: 'efeonce_internal',
          portalAccessState: 'inactive',
          resolutionSource: 'direct_user'
        }]
      ])
    )

    const result = await enrichGovernancePreviewUsers([
      {
        userId: 'user-a',
        fullName: 'Ada Portal A',
        email: 'ada.a@efeoncepro.com',
        tenantType: 'efeonce_internal',
        roleCodes: ['efeonce_admin'],
        routeGroups: ['admin']
      },
      {
        userId: 'user-b',
        fullName: 'Ada Portal B',
        email: 'ada.b@efeoncepro.com',
        tenantType: 'efeonce_internal',
        roleCodes: ['finance_manager'],
        routeGroups: ['finance']
      }
    ])

    expect(result).toEqual([
      {
        previewKey: 'person:profile-1',
        previewMode: 'person',
        userId: 'user-a',
        linkedUserIds: ['user-a', 'user-b'],
        portalPrincipalCount: 2,
        canManageOverrides: true,
        fullName: 'Ada Lovelace',
        email: 'ada@efeoncepro.com',
        tenantType: 'efeonce_internal',
        roleCodes: ['efeonce_admin', 'finance_manager'],
        routeGroups: ['admin', 'finance'],
        identityProfileId: 'profile-1',
        memberId: 'member-1',
        portalAccessState: 'active',
        resolutionSource: 'person_360'
      }
    ])
  })

  it('falls back to a portal principal preview when no canonical person exists', async () => {
    mockGetCanonicalPersonsByUserIds.mockResolvedValueOnce(new Map())

    const result = await enrichGovernancePreviewUsers([
      {
        userId: 'user-z',
        fullName: 'Portal Only',
        email: 'portal.only@client.com',
        tenantType: 'client',
        roleCodes: ['client_manager'],
        routeGroups: ['client']
      }
    ])

    expect(result).toEqual([
      {
        previewKey: 'user:user-z',
        previewMode: 'portal_principal',
        userId: 'user-z',
        linkedUserIds: ['user-z'],
        portalPrincipalCount: 1,
        canManageOverrides: true,
        fullName: 'Portal Only',
        email: 'portal.only@client.com',
        tenantType: 'client',
        roleCodes: ['client_manager'],
        routeGroups: ['client'],
        identityProfileId: null,
        memberId: null,
        portalAccessState: 'degraded_link',
        resolutionSource: 'fallback'
      }
    ])
  })
})
