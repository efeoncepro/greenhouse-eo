import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequirePeopleTenantContext = vi.fn()
const mockGetPersonHrContext = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requirePeopleTenantContext: (...args: unknown[]) => mockRequirePeopleTenantContext(...args)
}))

vi.mock('@/lib/person-360/get-person-hr', () => ({
  getPersonHrContext: (...args: unknown[]) => mockGetPersonHrContext(...args)
}))

import { GET } from '@/app/api/people/[memberId]/hr/route'

describe('GET /api/people/[memberId]/hr', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 for client tenants because HR context is internal-only', async () => {
    mockRequirePeopleTenantContext.mockResolvedValue({
      tenant: { tenantType: 'client', routeGroups: ['client'] },
      errorResponse: null
    })

    const response = await GET(
      new Request('http://localhost/api/people/member-1/hr'),
      { params: Promise.resolve({ memberId: 'member-1' }) }
    )

    expect(response.status).toBe(403)
    expect(mockGetPersonHrContext).not.toHaveBeenCalled()
  })

  it('returns hr context for internal tenants', async () => {
    mockRequirePeopleTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['people'], roleCodes: ['efeonce_admin'] },
      errorResponse: null
    })
    mockGetPersonHrContext.mockResolvedValue({
      memberId: 'member-1',
      displayName: 'Ana',
      compensation: { payRegime: 'chile', currency: 'CLP', baseSalary: 1000, contractType: 'indefinido' },
      leave: {
        vacationAllowance: 15,
        vacationCarried: 0,
        vacationUsed: 2,
        vacationReserved: 1,
        vacationAvailable: 12,
        personalAllowance: 5,
        personalUsed: 0,
        pendingRequests: 0,
        approvedRequestsThisYear: 1,
        totalApprovedDaysThisYear: 2
      }
    })

    const response = await GET(
      new Request('http://localhost/api/people/member-1/hr'),
      { params: Promise.resolve({ memberId: 'member-1' }) }
    )

    expect(response.status).toBe(200)
    expect(mockGetPersonHrContext).toHaveBeenCalledWith('member-1')
  })
})
