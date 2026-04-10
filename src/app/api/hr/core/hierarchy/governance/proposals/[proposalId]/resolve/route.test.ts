import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreManageTenantContext = vi.fn()
const mockResolveHierarchyGovernanceProposal = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  HrCoreValidationError: class HrCoreValidationError extends Error {},
  requireHrCoreManageTenantContext: (...args: unknown[]) => mockRequireHrCoreManageTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage
    const status = message.includes('required') ? 400 : 500

    return Response.json({ error: message }, { status })
  })
}))

vi.mock('@/lib/reporting-hierarchy/governance', () => ({
  resolveHierarchyGovernanceProposal: (...args: unknown[]) => mockResolveHierarchyGovernanceProposal(...args)
}))

import { POST } from '@/app/api/hr/core/hierarchy/governance/proposals/[proposalId]/resolve/route'

describe('POST /api/hr/core/hierarchy/governance/proposals/[proposalId]/resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreManageTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('resolves a proposal with approve', async () => {
    mockResolveHierarchyGovernanceProposal.mockResolvedValue({
      proposalId: 'proposal-1',
      status: 'approved'
    })

    const request = new Request('http://localhost/api/hr/core/hierarchy/governance/proposals/proposal-1/resolve', {
      method: 'POST',
      body: JSON.stringify({
        resolution: 'approve',
        note: 'Aprobado por RRHH'
      })
    })

    const response = await POST(request, {
      params: Promise.resolve({ proposalId: 'proposal-1' })
    })

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockResolveHierarchyGovernanceProposal).toHaveBeenCalledWith({
      proposalId: 'proposal-1',
      resolution: 'approve',
      actorUserId: 'user-1',
      note: 'Aprobado por RRHH'
    })
    expect(body.status).toBe('approved')
  })
})
