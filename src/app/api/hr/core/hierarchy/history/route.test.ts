import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreManageTenantContext = vi.fn()
const mockListHierarchyHistory = vi.fn()
const mockListApprovalDelegations = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  requireHrCoreManageTenantContext: (...args: unknown[]) => mockRequireHrCoreManageTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/reporting-hierarchy/admin', () => ({
  listHierarchyHistory: (...args: unknown[]) => mockListHierarchyHistory(...args),
  listApprovalDelegations: (...args: unknown[]) => mockListApprovalDelegations(...args)
}))

import { GET } from '@/app/api/hr/core/hierarchy/history/route'

describe('GET /api/hr/core/hierarchy/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreManageTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('returns reporting history and approval delegations', async () => {
    mockListHierarchyHistory.mockResolvedValue([
      {
        reportingLineId: 'rpt-1',
        memberId: 'member-1',
        memberName: 'Ana Perez',
        supervisorMemberId: 'member-2',
        supervisorName: 'Carlos Diaz',
        previousSupervisorMemberId: null,
        previousSupervisorName: null,
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        effectiveTo: null,
        sourceSystem: 'greenhouse_manual',
        changeReason: 'team_update',
        changedByUserId: 'user-1',
        changedByName: 'HR Admin',
        createdAt: '2026-04-10T12:00:00.000Z'
      }
    ])
    mockListApprovalDelegations.mockResolvedValue([
      {
        responsibilityId: 'resp-1',
        supervisorMemberId: 'member-2',
        supervisorName: 'Carlos Diaz',
        delegateMemberId: 'member-3',
        delegateMemberName: 'Marta Silva',
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        effectiveTo: null,
        active: true,
        isPrimary: true,
        createdAt: '2026-04-10T12:00:00.000Z',
        updatedAt: '2026-04-10T12:00:00.000Z'
      }
    ])

    const response = await GET(new Request('http://localhost/api/hr/core/hierarchy/history?memberId=member-1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.history).toHaveLength(1)
    expect(body.delegations).toHaveLength(1)
  })

  it('dedupes delegations even when timestamps arrive as Date-like values', async () => {
    mockListHierarchyHistory.mockResolvedValue([])
    mockListApprovalDelegations
      .mockResolvedValueOnce([
        {
          responsibilityId: 'resp-1',
          supervisorMemberId: 'member-1',
          supervisorName: 'Ana Perez',
          delegateMemberId: 'member-3',
          delegateMemberName: 'Marta Silva',
          effectiveFrom: '2026-04-10T12:00:00.000Z',
          effectiveTo: null,
          active: true,
          isPrimary: true,
          createdAt: new Date('2026-04-10T12:00:00.000Z') as unknown as string,
          updatedAt: new Date('2026-04-10T12:30:00.000Z') as unknown as string
        }
      ])
      .mockResolvedValueOnce([
        {
          responsibilityId: 'resp-1',
          supervisorMemberId: 'member-1',
          supervisorName: 'Ana Perez',
          delegateMemberId: 'member-3',
          delegateMemberName: 'Marta Silva',
          effectiveFrom: '2026-04-10T12:00:00.000Z',
          effectiveTo: null,
          active: true,
          isPrimary: true,
          createdAt: new Date('2026-04-10T12:00:00.000Z') as unknown as string,
          updatedAt: new Date('2026-04-10T12:30:00.000Z') as unknown as string
        }
      ])

    const response = await GET(new Request('http://localhost/api/hr/core/hierarchy/history?memberId=member-1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.history).toEqual([])
    expect(body.delegations).toHaveLength(1)
  })
})
