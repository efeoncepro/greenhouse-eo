import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAgencyTenantContext = vi.fn()
const mockGetAgencyTeamCapacity = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAgencyTenantContext: (...args: unknown[]) => mockRequireAgencyTenantContext(...args)
}))

vi.mock('@/lib/agency/team-capacity-store', () => ({
  getAgencyTeamCapacity: (...args: unknown[]) => mockGetAgencyTeamCapacity(...args)
}))

import { GET } from '@/app/api/team/capacity-breakdown/route'

describe('GET /api/team/capacity-breakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['internal'] },
      errorResponse: null
    })
  })

  it('delegates to the canonical agency team store', async () => {
    mockGetAgencyTeamCapacity.mockResolvedValue({
      team: {
        contractedHoursMonth: 160,
        assignedHoursMonth: 80,
        usedHoursMonth: null,
        availableHoursMonth: 80,
        commercialAvailabilityHours: 80,
        operationalAvailabilityHours: null,
        usageKind: 'percent',
        usagePercent: 50,
        overcommitted: false
      },
      members: [],
      excludedMembers: [],
      memberCount: 0,
      excludedCount: 0,
      hasOperationalMetrics: false,
      overcommittedCount: 0,
      overcommittedMembers: []
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetAgencyTeamCapacity).toHaveBeenCalledTimes(1)
    expect(body.team.assignedHoursMonth).toBe(80)
  })

  it('returns auth failure unchanged when tenant access is missing', async () => {
    mockRequireAgencyTenantContext.mockResolvedValueOnce({
      tenant: null,
      errorResponse: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    })
    const response = await GET()

    expect(response.status).toBe(403)
    expect(mockGetAgencyTeamCapacity).not.toHaveBeenCalled()
  })
})
