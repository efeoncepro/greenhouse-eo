import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreManageTenantContext = vi.fn()
const mockRunEntraHierarchyGovernanceScan = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  requireHrCoreManageTenantContext: (...args: unknown[]) => mockRequireHrCoreManageTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/reporting-hierarchy/governance', () => ({
  runEntraHierarchyGovernanceScan: (...args: unknown[]) => mockRunEntraHierarchyGovernanceScan(...args)
}))

import { POST } from '@/app/api/hr/core/hierarchy/governance/run/route'

describe('POST /api/hr/core/hierarchy/governance/run', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreManageTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('runs a manual governance scan', async () => {
    mockRunEntraHierarchyGovernanceScan.mockResolvedValue({
      syncRunId: 'rh-sync-1',
      status: 'succeeded',
      syncMode: 'manual',
      recordsRead: 7,
      proposalsDetected: 2,
      notes: 'ok',
      startedAt: '2026-04-10T13:00:00.000Z',
      finishedAt: '2026-04-10T13:01:00.000Z'
    })

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockRunEntraHierarchyGovernanceScan).toHaveBeenCalledWith({
      triggeredBy: 'manual:user-1',
      syncMode: 'manual'
    })
    expect(body.proposalsDetected).toBe(2)
  })
})
