import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreReadTenantContext = vi.fn()
const mockHasBroadHrLeaveAccess = vi.fn()
const mockResolveHrLeaveAccessContext = vi.fn()
const mockGetSupervisorWorkspace = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  requireHrCoreReadTenantContext: (...args: unknown[]) => mockRequireHrCoreReadTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/tenant/authorization', () => ({
  hasBroadHrLeaveAccess: (...args: unknown[]) => mockHasBroadHrLeaveAccess(...args),
  resolveHrLeaveAccessContext: (...args: unknown[]) => mockResolveHrLeaveAccessContext(...args)
}))

vi.mock('@/lib/hr-core/supervisor-workspace', () => ({
  getSupervisorWorkspace: (...args: unknown[]) => mockGetSupervisorWorkspace(...args)
}))

import { GET } from '@/app/api/hr/core/supervisor-workspace/route'

describe('GET /api/hr/core/supervisor-workspace', () => {
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

  it('returns the aggregated workspace for a supervisor-scoped user', async () => {
    mockHasBroadHrLeaveAccess.mockReturnValue(false)
    mockResolveHrLeaveAccessContext.mockResolvedValue({
      accessMode: 'supervisor',
      supervisorScope: { visibleMemberIds: ['member-1', 'member-2'] }
    })
    mockGetSupervisorWorkspace.mockResolvedValue({
      currentMemberId: 'member-1',
      hasBroadAccess: false,
      hasDirectReports: true,
      hasDelegatedAuthority: false,
      summary: {
        directReports: 1,
        totalVisibleReports: 1,
        pendingApprovals: 2,
        upcomingAbsences: 1
      },
      team: [],
      approvals: [],
      calendar: { from: '2026-04-10', to: '2026-05-10', holidaySource: 'none', events: [] }
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetSupervisorWorkspace).toHaveBeenCalledWith({
      tenant: expect.objectContaining({ userId: 'user-1' }),
      hasBroadAccess: false
    })
    expect(body.summary.pendingApprovals).toBe(2)
  })

  it('returns 403 when the user has no broad access and no supervisor scope', async () => {
    mockHasBroadHrLeaveAccess.mockReturnValue(false)
    mockResolveHrLeaveAccessContext.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Forbidden')
    expect(mockGetSupervisorWorkspace).not.toHaveBeenCalled()
  })
})
