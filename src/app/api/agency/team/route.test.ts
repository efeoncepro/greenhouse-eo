import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAgencyTenantContext = vi.fn()
const mockGetAgencyTeamCapacity = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAgencyTenantContext: (...args: unknown[]) => mockRequireAgencyTenantContext(...args)
}))

vi.mock('@/lib/agency/team-capacity-store', () => ({
  getAgencyTeamCapacity: (...args: unknown[]) => mockGetAgencyTeamCapacity(...args)
}))

import { GET } from '@/app/api/agency/team/route'

describe('GET /api/agency/team', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['internal'] },
      errorResponse: null
    })
  })

  it('returns the canonical agency team payload', async () => {
    mockGetAgencyTeamCapacity.mockResolvedValue({
      team: {
        contractedHoursMonth: 320,
        assignedHoursMonth: 208,
        usedHoursMonth: null,
        availableHoursMonth: 112,
        commercialAvailabilityHours: 112,
        operationalAvailabilityHours: null,
        usageKind: 'percent',
        usagePercent: 65,
        overcommitted: false
      },
      members: [
        {
          memberId: 'member-1',
          displayName: 'Daniela Ferreira',
          roleTitle: 'Designer',
          roleCategory: 'design',
          assignable: true,
          fteAllocation: 1,
          usageKind: 'percent',
          usagePercent: 65,
          utilizationPercent: 65,
          capacityHealth: 'balanced',
          capacity: {
            contractedHoursMonth: 160,
            assignedHoursMonth: 104,
            usedHoursMonth: null,
            availableHoursMonth: 56,
            commercialAvailabilityHours: 56,
            operationalAvailabilityHours: null,
            overcommitted: false
          },
          intelligence: null,
          assignments: []
        }
      ],
      excludedMembers: [],
      memberCount: 1,
      excludedCount: 0,
      hasOperationalMetrics: true,
      overcommittedCount: 0,
      overcommittedMembers: []
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.memberCount).toBe(1)
    expect(body.members[0].displayName).toBe('Daniela Ferreira')
    expect(response.headers.get('Cache-Control')).toContain('no-store')
  })
})
