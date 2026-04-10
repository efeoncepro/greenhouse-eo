import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireCronAuth = vi.fn()
const mockFetchEntraUsersWithManagers = vi.fn()
const mockSyncEntraProfiles = vi.fn()
const mockRunEntraHierarchyGovernanceScan = vi.fn()

vi.mock('@/lib/cron/require-cron-auth', () => ({
  requireCronAuth: (...args: unknown[]) => mockRequireCronAuth(...args)
}))

vi.mock('@/lib/entra/graph-client', () => ({
  fetchEntraUsersWithManagers: (...args: unknown[]) => mockFetchEntraUsersWithManagers(...args)
}))

vi.mock('@/lib/entra/profile-sync', () => ({
  syncEntraProfiles: (...args: unknown[]) => mockSyncEntraProfiles(...args)
}))

vi.mock('@/lib/reporting-hierarchy/governance', () => ({
  runEntraHierarchyGovernanceScan: (...args: unknown[]) => mockRunEntraHierarchyGovernanceScan(...args)
}))

import { GET } from '@/app/api/cron/entra-profile-sync/route'

describe('GET /api/cron/entra-profile-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCronAuth.mockReturnValue({ authorized: true, errorResponse: null })
  })

  it('runs profile sync and governance with the same Entra snapshot', async () => {
    const entraUsers = [{ id: 'entra-1', mail: 'user@efeonce.org', manager: null }]

    mockFetchEntraUsersWithManagers.mockResolvedValue(entraUsers)
    mockSyncEntraProfiles.mockResolvedValue({
      processed: 1,
      usersUpdated: 0,
      profilesUpdated: 0,
      profilesCreated: 0,
      profilesLinked: 0,
      membersUpdated: 0,
      avatarsSynced: 0,
      skipped: 0,
      errors: []
    })
    mockRunEntraHierarchyGovernanceScan.mockResolvedValue({
      syncRunId: 'rh-sync-1',
      status: 'succeeded',
      syncMode: 'poll',
      recordsRead: 1,
      proposalsDetected: 0,
      notes: 'ok',
      startedAt: '2026-04-10T13:00:00.000Z',
      finishedAt: '2026-04-10T13:00:02.000Z'
    })

    const response = await GET(new Request('http://localhost/api/cron/entra-profile-sync'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockSyncEntraProfiles).toHaveBeenCalledWith(entraUsers)
    expect(mockRunEntraHierarchyGovernanceScan).toHaveBeenCalledWith({
      triggeredBy: 'cron:entra-profile-sync',
      syncMode: 'poll',
      entraUsers
    })
    expect(body.hierarchyGovernance.syncRunId).toBe('rh-sync-1')
  })
})
