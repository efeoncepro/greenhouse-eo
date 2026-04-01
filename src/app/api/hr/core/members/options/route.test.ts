import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreManageTenantContext = vi.fn()
const mockListDepartmentHeadOptions = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  requireHrCoreManageTenantContext: (...args: unknown[]) => mockRequireHrCoreManageTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/hr-core/service', () => ({
  listDepartmentHeadOptions: (...args: unknown[]) => mockListDepartmentHeadOptions(...args)
}))

import { GET } from '@/app/api/hr/core/members/options/route'

describe('GET /api/hr/core/members/options', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreManageTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('returns active members from the HR member options reader', async () => {
    mockListDepartmentHeadOptions.mockResolvedValue([
      {
        memberId: 'member-1',
        displayName: 'Daniela Ferreira',
        roleTitle: 'Operations Lead'
      }
    ])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.members).toEqual([
      {
        memberId: 'member-1',
        displayName: 'Daniela Ferreira',
        roleTitle: 'Operations Lead'
      }
    ])
  })
})
