import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreManageTenantContext = vi.fn()
const mockChangeHierarchySupervisor = vi.fn()
const mockBulkReassignDirectReports = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  HrCoreValidationError: class HrCoreValidationError extends Error {
    statusCode: number

    constructor(message: string, statusCode = 400) {
      super(message)
      this.statusCode = statusCode
    }
  },
  requireHrCoreManageTenantContext: (...args: unknown[]) => mockRequireHrCoreManageTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/reporting-hierarchy/admin', () => ({
  changeHierarchySupervisor: (...args: unknown[]) => mockChangeHierarchySupervisor(...args),
  bulkReassignDirectReports: (...args: unknown[]) => mockBulkReassignDirectReports(...args)
}))

import { POST } from '@/app/api/hr/core/hierarchy/reassign/route'

describe('POST /api/hr/core/hierarchy/reassign', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreManageTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('routes single supervisor changes through the hierarchy admin helper', async () => {
    mockChangeHierarchySupervisor.mockResolvedValue({ memberId: 'member-1', supervisorMemberId: 'member-2' })

    const response = await POST(
      new Request('http://localhost/api/hr/core/hierarchy/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: 'member-1',
          supervisorMemberId: 'member-2',
          reason: 'team_refresh'
        })
      })
    )

    expect(response.status).toBe(200)
    expect(mockChangeHierarchySupervisor).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'member-1',
        supervisorMemberId: 'member-2',
        actorUserId: 'user-1',
        reason: 'team_refresh'
      })
    )
  })

  it('routes bulk direct report reassignments through the bulk helper', async () => {
    mockBulkReassignDirectReports.mockResolvedValue({ updatedCount: 3, memberIds: ['m1', 'm2', 'm3'] })

    const response = await POST(
      new Request('http://localhost/api/hr/core/hierarchy/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'direct_reports',
          currentSupervisorMemberId: 'member-1',
          supervisorMemberId: 'member-4',
          reason: 'lead_transition'
        })
      })
    )

    expect(response.status).toBe(200)
    expect(mockBulkReassignDirectReports).toHaveBeenCalledWith(
      expect.objectContaining({
        currentSupervisorMemberId: 'member-1',
        nextSupervisorMemberId: 'member-4',
        actorUserId: 'user-1',
        reason: 'lead_transition'
      })
    )
  })
})
