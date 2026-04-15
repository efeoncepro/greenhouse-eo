import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreReadTenantContext = vi.fn()
const mockGetHrCoreMetadata = vi.fn()
const mockResolveCurrentHrMemberId = vi.fn()
const mockIsHrAdminTenant = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  requireHrCoreReadTenantContext: (...args: unknown[]) => mockRequireHrCoreReadTenantContext(...args),
  isHrAdminTenant: (...args: unknown[]) => mockIsHrAdminTenant(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/hr-core/service', () => ({
  getHrCoreMetadata: (...args: unknown[]) => mockGetHrCoreMetadata(...args),
  resolveCurrentHrMemberId: (...args: unknown[]) => mockResolveCurrentHrMemberId(...args)
}))

import { GET } from '@/app/api/hr/core/meta/route'

describe('GET /api/hr/core/meta', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreReadTenantContext.mockResolvedValue({
      tenant: {
        userId: 'user-1',
        memberId: null,
        routeGroups: ['hr']
      },
      errorResponse: null
    })
    mockGetHrCoreMetadata.mockResolvedValue({
      departments: [],
      leaveTypes: [],
      jobLevels: [],
      employmentTypes: [],
      healthSystems: [],
      bankAccountTypes: [],
      leaveRequestStatuses: [],
      attendanceStatuses: []
    })
    mockIsHrAdminTenant.mockReturnValue(false)
  })

  it('returns currentMemberId when the session needs collaborator resolution', async () => {
    mockResolveCurrentHrMemberId.mockResolvedValue('member-123')

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.currentMemberId).toBe('member-123')
    expect(body.hasHrAdminAccess).toBe(false)
    expect(body.leaveTypes).toEqual([])
  })

  it('falls back to null currentMemberId when collaborator resolution fails', async () => {
    mockResolveCurrentHrMemberId.mockRejectedValue(new Error('Unable to resolve current collaborator.'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.currentMemberId).toBeNull()
  })

  it('returns hasHrAdminAccess when the tenant has broad HR admin authority', async () => {
    mockIsHrAdminTenant.mockReturnValue(true)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.hasHrAdminAccess).toBe(true)
  })
})
