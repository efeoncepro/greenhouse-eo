import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreReadTenantContext = vi.fn()
const mockRequireHrCoreManageTenantContext = vi.fn()
const mockGetDepartmentById = vi.fn()
const mockUpdateDepartment = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  requireHrCoreReadTenantContext: (...args: unknown[]) => mockRequireHrCoreReadTenantContext(...args),
  requireHrCoreManageTenantContext: (...args: unknown[]) => mockRequireHrCoreManageTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/hr-core/service', () => ({
  getDepartmentById: (...args: unknown[]) => mockGetDepartmentById(...args),
  updateDepartment: (...args: unknown[]) => mockUpdateDepartment(...args)
}))

import { GET, PATCH } from '@/app/api/hr/core/departments/[departmentId]/route'

describe('GET /api/hr/core/departments/[departmentId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreReadTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('returns 404 when the department does not exist', async () => {
    mockGetDepartmentById.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost/api/hr/core/departments/unknown'), {
      params: Promise.resolve({ departmentId: 'unknown' })
    })

    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Department not found.')
  })
})

describe('PATCH /api/hr/core/departments/[departmentId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreManageTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('updates a department and returns the updated payload', async () => {
    mockUpdateDepartment.mockResolvedValue({
      departmentId: 'creative-team',
      name: 'Creative Team',
      description: 'Equipo creativo actualizado',
      parentDepartmentId: null,
      headMemberId: 'member-2',
      headMemberName: 'Felipe Rojas',
      businessUnit: 'globe',
      active: true,
      sortOrder: 2
    })

    const response = await PATCH(
      new Request('http://localhost/api/hr/core/departments/creative-team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Equipo creativo actualizado',
          headMemberId: 'member-2',
          sortOrder: 2
        })
      }),
      {
        params: Promise.resolve({ departmentId: 'creative-team' })
      }
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.headMemberId).toBe('member-2')
    expect(body.sortOrder).toBe(2)
  })
})
