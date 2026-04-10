import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreManageTenantContext = vi.fn()
const mockGetHierarchyGovernanceOverview = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  requireHrCoreManageTenantContext: (...args: unknown[]) => mockRequireHrCoreManageTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/reporting-hierarchy/governance', () => ({
  getHierarchyGovernanceOverview: (...args: unknown[]) => mockGetHierarchyGovernanceOverview(...args)
}))

import { GET } from '@/app/api/hr/core/hierarchy/governance/route'

describe('GET /api/hr/core/hierarchy/governance', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreManageTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('returns the governance overview', async () => {
    mockGetHierarchyGovernanceOverview.mockResolvedValue({
      policy: {
        canonicalSource: 'greenhouse_manual',
        externalSource: 'azure-ad',
        precedence: ['manual gana']
      },
      lastRun: null,
      summary: {
        pending: 2,
        approved: 0,
        rejected: 0,
        dismissed: 0,
        autoApplied: 0
      },
      proposals: []
    })

    const response = await GET(new Request('http://localhost/api/hr/core/hierarchy/governance?limit=12'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetHierarchyGovernanceOverview).toHaveBeenCalledWith(12)
    expect(body.summary.pending).toBe(2)
  })
})
