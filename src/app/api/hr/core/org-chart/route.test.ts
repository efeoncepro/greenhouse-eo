import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreReadTenantContext = vi.fn()
const mockResolveHrOrgChartAccessContext = vi.fn()
const mockGetHrOrgChart = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  requireHrCoreReadTenantContext: (...args: unknown[]) => mockRequireHrCoreReadTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/tenant/authorization', () => ({
  resolveHrOrgChartAccessContext: (...args: unknown[]) => mockResolveHrOrgChartAccessContext(...args)
}))

vi.mock('@/lib/reporting-hierarchy/org-chart', () => ({
  getHrOrgChart: (...args: unknown[]) => mockGetHrOrgChart(...args)
}))

import { GET } from '@/app/api/hr/core/org-chart/route'

describe('GET /api/hr/core/org-chart', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreReadTenantContext.mockResolvedValue({
      tenant: {
        userId: 'user-1',
        memberId: 'member-1',
        roleCodes: ['collaborator'],
        routeGroups: ['my'],
        portalHomePath: '/home'
      },
      errorResponse: null
    })
  })

  it('returns the org chart for a supervisor-scoped user', async () => {
    mockResolveHrOrgChartAccessContext.mockResolvedValue({
      accessMode: 'supervisor',
      supervisorScope: {
        memberId: 'member-1',
        visibleMemberIds: ['member-1', 'member-2']
      }
    })
    mockGetHrOrgChart.mockResolvedValue({
      accessMode: 'supervisor',
      currentMemberId: 'member-1',
      focusMemberId: 'member-1',
      nodes: [],
      edges: [],
      breadcrumbs: [],
      memberOptions: [],
      summary: {
        totalNodes: 2,
        departments: 1,
        members: 1,
        roots: 1,
        maxDepth: 1,
        delegatedApprovals: 0
      }
    })

    const response = await GET(new Request('http://localhost/api/hr/core/org-chart?focusMemberId=member-1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetHrOrgChart).toHaveBeenCalledWith({
      tenant: expect.objectContaining({ userId: 'user-1' }),
      accessContext: expect.objectContaining({ accessMode: 'supervisor' }),
      focusMemberId: 'member-1'
    })
    expect(body.summary.totalNodes).toBe(2)
  })

  it('returns 403 when the user has neither broad nor supervisor access', async () => {
    mockResolveHrOrgChartAccessContext.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost/api/hr/core/org-chart'))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Forbidden')
    expect(mockGetHrOrgChart).not.toHaveBeenCalled()
  })
})
