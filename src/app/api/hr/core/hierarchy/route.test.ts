import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreManageTenantContext = vi.fn()
const mockListHierarchy = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  requireHrCoreManageTenantContext: (...args: unknown[]) => mockRequireHrCoreManageTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/reporting-hierarchy/admin', () => ({
  listHierarchy: (...args: unknown[]) => mockListHierarchy(...args)
}))

import { GET } from '@/app/api/hr/core/hierarchy/route'

describe('GET /api/hr/core/hierarchy', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreManageTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('returns hierarchy rows with computed summary', async () => {
    mockListHierarchy.mockResolvedValue([
      {
        reportingLineId: 'rpt-1',
        memberId: 'member-1',
        memberName: 'Ana Perez',
        memberActive: true,
        roleTitle: 'Lead',
        departmentId: 'dept-1',
        departmentName: 'Delivery',
        supervisorMemberId: null,
        supervisorName: null,
        supervisorActive: null,
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        sourceSystem: 'greenhouse_manual',
        changeReason: 'initial_setup',
        changedByUserId: 'user-1',
        directReportsCount: 2,
        subtreeSize: 4,
        depth: 0,
        isRoot: true,
        delegation: null
      }
    ])

    const response = await GET(new Request('http://localhost/api/hr/core/hierarchy'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.summary).toEqual({
      total: 1,
      active: 1,
      roots: 1,
      withoutSupervisor: 1,
      delegatedApprovals: 0
    })
  })
})
