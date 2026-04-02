import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/account-360/id-generation', () => ({
  generateMembershipId: () => 'membership-test-1',
  nextPublicId: async () => 'EO-MBR-0001'
}))

vi.mock('@/lib/finance/client-economics-presentation', () => ({
  sanitizeSnapshotForPresentation: <T>(value: T) => value
}))

vi.mock('@/lib/finance/postgres-store-intelligence', () => ({
  computeClientEconomicsSnapshots: vi.fn()
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

vi.mock('@/lib/sync/event-catalog', () => ({
  AGGREGATE_TYPES: {},
  EVENT_TYPES: {}
}))

vi.mock('./get-organization-operational-serving', () => ({
  getOrganizationOperationalServing: vi.fn()
}))

const { getOrganizationMemberships } = await import('./organization-store')

describe('getOrganizationMemberships', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('preserves staff augmentation assignment context on top of team_member memberships', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        membership_id: 'membership-1',
        public_id: 'EO-MBR-0001',
        profile_id: 'profile-1',
        organization_id: 'org-1',
        organization_name: 'Sky Airline',
        space_id: 'space-1',
        full_name: 'Ada Lovelace',
        canonical_email: 'ada@efeonce.org',
        membership_type: 'team_member',
        role_label: 'Senior Designer',
        department: 'Design',
        is_primary: false,
        member_id: 'member-1',
        assigned_fte: '1.250',
        assignment_type: 'staff_augmentation',
        job_level: 'senior',
        employment_type: 'full_time'
      },
      {
        membership_id: 'membership-2',
        public_id: 'EO-MBR-0002',
        profile_id: 'profile-2',
        organization_id: 'org-1',
        organization_name: 'Sky Airline',
        space_id: null,
        full_name: 'Grace Hopper',
        canonical_email: 'grace@client.com',
        membership_type: 'contact',
        role_label: 'Client Lead',
        department: null,
        is_primary: true,
        member_id: null,
        assigned_fte: null,
        assignment_type: null,
        job_level: null,
        employment_type: null
      }
    ])

    const result = await getOrganizationMemberships('org-1')

    expect(mockQuery).toHaveBeenCalledOnce()
    expect(String(mockQuery.mock.calls[0][0])).toContain('assignment_summary.assignment_type')
    expect(result).toEqual([
      {
        membershipId: 'membership-1',
        publicId: 'EO-MBR-0001',
        profileId: 'profile-1',
        fullName: 'Ada Lovelace',
        canonicalEmail: 'ada@efeonce.org',
        membershipType: 'team_member',
        roleLabel: 'Senior Designer',
        department: 'Design',
        isPrimary: false,
        spaceId: 'space-1',
        memberId: 'member-1',
        assignedFte: 1.25,
        assignmentType: 'staff_augmentation',
        jobLevel: 'senior',
        employmentType: 'full_time'
      },
      {
        membershipId: 'membership-2',
        publicId: 'EO-MBR-0002',
        profileId: 'profile-2',
        fullName: 'Grace Hopper',
        canonicalEmail: 'grace@client.com',
        membershipType: 'contact',
        roleLabel: 'Client Lead',
        department: null,
        isPrimary: true,
        spaceId: null,
        memberId: null,
        assignedFte: null,
        assignmentType: null,
        jobLevel: null,
        employmentType: null
      }
    ])
  })
})
