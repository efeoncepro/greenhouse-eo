import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreManageTenantContext = vi.fn()
const mockListApprovalDelegations = vi.fn()
const mockAssignApprovalDelegation = vi.fn()
const mockRevokeApprovalDelegationById = vi.fn()

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
  listApprovalDelegations: (...args: unknown[]) => mockListApprovalDelegations(...args),
  assignApprovalDelegation: (...args: unknown[]) => mockAssignApprovalDelegation(...args),
  revokeApprovalDelegationById: (...args: unknown[]) => mockRevokeApprovalDelegationById(...args)
}))

import { DELETE, GET, POST } from '@/app/api/hr/core/hierarchy/delegations/route'

describe('/api/hr/core/hierarchy/delegations', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreManageTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('lists delegations', async () => {
    mockListApprovalDelegations.mockResolvedValue([])

    const response = await GET(new Request('http://localhost/api/hr/core/hierarchy/delegations'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.delegations).toEqual([])
  })

  it('assigns a delegation', async () => {
    mockAssignApprovalDelegation.mockResolvedValue({ responsibilityId: 'resp-1' })

    const response = await POST(
      new Request('http://localhost/api/hr/core/hierarchy/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisorMemberId: 'member-1',
          delegateMemberId: 'member-2'
        })
      })
    )

    expect(response.status).toBe(201)
    expect(mockAssignApprovalDelegation).toHaveBeenCalledWith(
      expect.objectContaining({
        supervisorMemberId: 'member-1',
        delegateMemberId: 'member-2'
      })
    )
  })

  it('revokes a delegation', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/hr/core/hierarchy/delegations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsibilityId: 'resp-1' })
      })
    )

    expect(response.status).toBe(200)
    expect(mockRevokeApprovalDelegationById).toHaveBeenCalledWith('resp-1')
  })
})
