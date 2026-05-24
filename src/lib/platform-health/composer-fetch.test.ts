import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetOperationsOverview = vi.fn()
const mockGetReliabilityOverview = vi.fn()
const mockGetLatestSyntheticSnapshotsByRoute = vi.fn()

vi.mock('@/lib/operations/get-operations-overview', () => ({
  getOperationsOverview: () => mockGetOperationsOverview()
}))

vi.mock('@/lib/reliability/get-reliability-overview', () => ({
  getReliabilityOverview: (...args: unknown[]) => mockGetReliabilityOverview(...args)
}))

vi.mock('@/lib/reliability/synthetic/reader', () => ({
  getLatestSyntheticSnapshotsByRoute: () => mockGetLatestSyntheticSnapshotsByRoute()
}))

vi.mock('@/lib/cloud/health', () => ({
  getCloudPlatformHealthSnapshot: vi.fn(async () => ({}))
}))

vi.mock('@/lib/cloud/observability', () => ({
  getCloudObservabilityPosture: vi.fn(async () => ({})),
  getCloudSentryIncidents: vi.fn(async () => ({}))
}))

vi.mock('@/lib/integrations/health', () => ({
  getIntegrationHealthSnapshots: vi.fn(async () => new Map())
}))

const { __composerInternalsForTests } = await import('./composer')

describe('fetchAllSources', () => {
  it('reuses operations and synthetic snapshots when composing reliability', async () => {
    const operations = { health: 'ok' }
    const synthetics = [{ route: '/home' }]

    const reliability = {
      generatedAt: '2026-05-24T00:00:00.000Z',
      modules: [],
      totals: { totalModules: 0, healthy: 0, warning: 0, error: 0, unknownOrPending: 0 },
      integrationBoundaries: [],
      notes: []
    }

    mockGetOperationsOverview.mockResolvedValue(operations)
    mockGetLatestSyntheticSnapshotsByRoute.mockResolvedValue(synthetics)
    mockGetReliabilityOverview.mockResolvedValue(reliability)

    const sources = await __composerInternalsForTests.fetchAllSources()

    expect(sources.operations.value).toBe(operations)
    expect(sources.synthetics.value).toBe(synthetics)
    expect(mockGetOperationsOverview).toHaveBeenCalledTimes(1)
    expect(mockGetLatestSyntheticSnapshotsByRoute).toHaveBeenCalledTimes(1)
    expect(mockGetReliabilityOverview).toHaveBeenCalledWith(operations, {
      syntheticSnapshots: synthetics
    })
  })
})
