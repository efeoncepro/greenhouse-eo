import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

const {
  getCanonicalPersonByUserId,
  getCanonicalPersonsByMemberIds,
  getCanonicalPersonsByIdentityProfileIds
} = await import('./canonical-person')

describe('canonical person resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.__greenhousePerson360ColumnsPromise = undefined
  })

  it('resolves a fully linked person from person_360', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { column_name: 'identity_profile_id' },
        { column_name: 'member_id' },
        { column_name: 'user_id' },
        { column_name: 'eo_id' },
        { column_name: 'resolved_display_name' },
        { column_name: 'canonical_email' },
        { column_name: 'resolved_email' },
        { column_name: 'user_email' },
        { column_name: 'user_full_name' },
        { column_name: 'member_email' },
        { column_name: 'tenant_type' },
        { column_name: 'user_status' },
        { column_name: 'user_active' },
        { column_name: 'has_member_facet' },
        { column_name: 'has_user_facet' },
        { column_name: 'active_role_codes' }
      ])
      .mockResolvedValueOnce([
      {
        identity_profile_id: 'profile-1',
        member_id: 'member-1',
        user_id: 'user-1',
        eo_id: 'EO-ID0001',
        resolved_display_name: 'Person One',
        canonical_email: 'person.one@efeoncepro.com',
        resolved_email: 'person.one@efeoncepro.com',
        user_email: 'user.one@efeoncepro.com',
        user_full_name: 'Portal Person One',
        member_email: 'person.one@efeoncepro.com',
        tenant_type: 'efeonce_internal',
        user_status: 'active',
        user_active: true,
        has_member_facet: true,
        has_user_facet: true,
        active_role_codes: ['collaborator'],
        route_groups: ['my']
      }
    ])

    await expect(getCanonicalPersonsByMemberIds(['member-1'])).resolves.toEqual(
      new Map([
        ['member-1', {
          identityProfileId: 'profile-1',
          memberId: 'member-1',
          userId: 'user-1',
          eoId: 'EO-ID0001',
          displayName: 'Person One',
          canonicalEmail: 'person.one@efeoncepro.com',
          portalEmail: 'user.one@efeoncepro.com',
          portalDisplayName: 'Portal Person One',
          memberEmail: 'person.one@efeoncepro.com',
          tenantType: 'efeonce_internal',
          portalAccessState: 'active',
          resolutionSource: 'person_360',
          roleCodes: ['collaborator'],
          routeGroups: ['my'],
          hasIdentityFacet: true,
          hasMemberFacet: true,
          hasUserFacet: true
        }]
      ])
    )
  })

  it('falls back to direct member resolution when person_360 is missing', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { column_name: 'identity_profile_id' },
        { column_name: 'member_id' },
        { column_name: 'user_id' },
        { column_name: 'eo_id' },
        { column_name: 'resolved_display_name' },
        { column_name: 'canonical_email' },
        { column_name: 'resolved_email' },
        { column_name: 'user_email' },
        { column_name: 'user_full_name' },
        { column_name: 'member_email' },
        { column_name: 'tenant_type' },
        { column_name: 'user_status' },
        { column_name: 'user_active' },
        { column_name: 'has_member_facet' },
        { column_name: 'has_user_facet' },
        { column_name: 'active_role_codes' }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          identity_profile_id: null,
          member_id: 'member-2',
          user_id: null,
          eo_id: null,
          resolved_display_name: 'Member Two',
          canonical_email: null,
          user_email: null,
          user_full_name: null,
          member_email: 'member.two@efeoncepro.com',
          tenant_type: null,
          user_status: null,
          user_active: null,
          has_member_facet: true,
          has_user_facet: false,
          active_role_codes: [],
          route_groups: []
        }
      ])

    const result = await getCanonicalPersonsByMemberIds(['member-2'])

    expect(result.get('member-2')).toEqual({
      identityProfileId: null,
      memberId: 'member-2',
      userId: null,
      eoId: null,
      displayName: 'Member Two',
      canonicalEmail: 'member.two@efeoncepro.com',
      portalEmail: null,
      portalDisplayName: null,
      memberEmail: 'member.two@efeoncepro.com',
      tenantType: null,
      portalAccessState: 'missing_principal',
      resolutionSource: 'direct_member',
      roleCodes: [],
      routeGroups: [],
      hasIdentityFacet: false,
      hasMemberFacet: true,
      hasUserFacet: false
    })
  })

  it('marks active users without canonical profile as degraded_link', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { column_name: 'identity_profile_id' },
        { column_name: 'member_id' },
        { column_name: 'user_id' },
        { column_name: 'eo_id' },
        { column_name: 'resolved_display_name' },
        { column_name: 'canonical_email' },
        { column_name: 'resolved_email' },
        { column_name: 'user_email' },
        { column_name: 'user_full_name' },
        { column_name: 'member_email' },
        { column_name: 'tenant_type' },
        { column_name: 'user_status' },
        { column_name: 'user_active' },
        { column_name: 'has_member_facet' },
        { column_name: 'has_user_facet' },
        { column_name: 'active_role_codes' }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          identity_profile_id: null,
          member_id: null,
          user_id: 'user-3',
          eo_id: null,
          resolved_display_name: 'User Three',
          canonical_email: null,
          user_email: 'user.three@client.com',
          user_full_name: 'User Three',
          member_email: null,
          tenant_type: 'client',
          user_status: 'active',
          user_active: true,
          has_member_facet: false,
          has_user_facet: true,
          active_role_codes: ['client_manager'],
          route_groups: ['client']
        }
      ])

    await expect(getCanonicalPersonByUserId('user-3')).resolves.toMatchObject({
      identityProfileId: null,
      memberId: null,
      userId: 'user-3',
      portalAccessState: 'degraded_link',
      resolutionSource: 'direct_user',
      tenantType: 'client',
      roleCodes: ['client_manager'],
      routeGroups: ['client']
    })
  })

  it('resolves profile ids through the canonical backbone', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { column_name: 'identity_profile_id' },
        { column_name: 'member_id' },
        { column_name: 'user_id' },
        { column_name: 'eo_id' },
        { column_name: 'resolved_display_name' },
        { column_name: 'canonical_email' },
        { column_name: 'resolved_email' },
        { column_name: 'user_email' },
        { column_name: 'user_full_name' },
        { column_name: 'member_email' },
        { column_name: 'tenant_type' },
        { column_name: 'user_status' },
        { column_name: 'user_active' },
        { column_name: 'has_member_facet' },
        { column_name: 'has_user_facet' },
        { column_name: 'active_role_codes' }
      ])
      .mockResolvedValueOnce([
      {
        identity_profile_id: 'profile-9',
        member_id: null,
        user_id: null,
        eo_id: 'EO-ID0009',
        resolved_display_name: 'Person Nine',
        canonical_email: 'person.nine@efeoncepro.com',
        resolved_email: 'person.nine@efeoncepro.com',
        user_email: null,
        user_full_name: null,
        member_email: null,
        tenant_type: null,
        user_status: null,
        user_active: null,
        has_member_facet: false,
        has_user_facet: false,
        active_role_codes: [],
        route_groups: []
      }
    ])

    const result = await getCanonicalPersonsByIdentityProfileIds(['profile-9'])

    expect(result.get('profile-9')).toMatchObject({
      identityProfileId: 'profile-9',
      eoId: 'EO-ID0009',
      displayName: 'Person Nine',
      portalAccessState: 'missing_principal',
      resolutionSource: 'person_360'
    })
  })

  it('supports production-style person_360 columns using primary_user_id aliases', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { column_name: 'identity_profile_id' },
        { column_name: 'identity_profile_public_id' },
        { column_name: 'primary_member_id' },
        { column_name: 'primary_user_id' },
        { column_name: 'display_name' },
        { column_name: 'canonical_email' },
        { column_name: 'primary_user_email' },
        { column_name: 'primary_user_name' },
        { column_name: 'member_email' },
        { column_name: 'has_member_facet' },
        { column_name: 'has_user_facet' },
        { column_name: 'active_user_count' }
      ])
      .mockResolvedValueOnce([
        {
          identity_profile_id: 'profile-prod',
          member_id: 'member-prod',
          user_id: 'user-prod',
          eo_id: 'EO-ID-PROD',
          resolved_display_name: 'Prod Person',
          canonical_email: 'prod.person@efeoncepro.com',
          resolved_email: 'prod.person@efeoncepro.com',
          user_email: 'prod.user@efeoncepro.com',
          user_full_name: 'Prod User',
          member_email: 'prod.person@efeoncepro.com',
          tenant_type: null,
          user_status: 'active',
          user_active: true,
          has_member_facet: true,
          has_user_facet: true,
          active_role_codes: [],
          route_groups: []
        }
      ])

    await expect(getCanonicalPersonByUserId('user-prod')).resolves.toMatchObject({
      identityProfileId: 'profile-prod',
      memberId: 'member-prod',
      userId: 'user-prod',
      eoId: 'EO-ID-PROD',
      displayName: 'Prod Person',
      portalEmail: 'prod.user@efeoncepro.com',
      portalDisplayName: 'Prod User',
      portalAccessState: 'active',
      resolutionSource: 'person_360'
    })
  })
})
