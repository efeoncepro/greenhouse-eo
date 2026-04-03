import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreReadTenantContext = vi.fn()
const mockRequireHrCoreManageTenantContext = vi.fn()
const mockListDepartments = vi.fn()
const mockCreateDepartment = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  requireHrCoreReadTenantContext: (...args: unknown[]) => mockRequireHrCoreReadTenantContext(...args),
  requireHrCoreManageTenantContext: (...args: unknown[]) => mockRequireHrCoreManageTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/hr-core/service', () => ({
  listDepartments: (...args: unknown[]) => mockListDepartments(...args),
  createDepartment: (...args: unknown[]) => mockCreateDepartment(...args)
}))

import { GET, POST } from '@/app/api/hr/core/departments/route'

describe('GET /api/hr/core/departments', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreReadTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('returns the departments payload from the service', async () => {
    mockListDepartments.mockResolvedValue({
      departments: [],
      summary: { total: 0, active: 0 }
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.summary.total).toBe(0)
  })
})

describe('POST /api/hr/core/departments', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreManageTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('creates a department and returns 201', async () => {
    mockCreateDepartment.mockResolvedValue({
      departmentId: 'creative-team',
      name: 'Creative Team',
      description: null,
      parentDepartmentId: null,
      headMemberId: null,
      headMemberName: null,
      businessUnit: 'globe',
      active: true,
      sortOrder: 1
    })

    const response = await POST(
      new Request('http://localhost/api/hr/core/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Creative Team',
          businessUnit: 'globe',
          sortOrder: 1
        })
      })
    )

    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.departmentId).toBe('creative-team')
  })
})
