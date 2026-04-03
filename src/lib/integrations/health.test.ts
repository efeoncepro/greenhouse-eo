import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runGreenhousePostgresQueryMock, getNotionRawFreshnessGateMock } = vi.hoisted(() => ({
  runGreenhousePostgresQueryMock: vi.fn(),
  getNotionRawFreshnessGateMock: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  runGreenhousePostgresQuery: runGreenhousePostgresQueryMock
}))

vi.mock('@/lib/integrations/notion-readiness', () => ({
  getNotionRawFreshnessGate: getNotionRawFreshnessGateMock
}))

describe('integration health snapshots', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    getNotionRawFreshnessGateMock.mockResolvedValue({
      ready: true,
      reason: 'Raw listo',
      checkedAt: '2026-04-03T15:00:00.000Z',
      boundaryStartAt: '2026-04-03T00:00:00.000Z',
      freshestRawSyncedAt: '2026-04-03T15:00:00.000Z',
      activeSpaceCount: 0,
      staleSpaces: [],
      spaces: []
    })
  })

  it('keeps a recently recovered integration healthy while preserving incident counters', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-03T18:00:00.000Z'))

    runGreenhousePostgresQueryMock
      .mockResolvedValueOnce([
        {
          source_system: 'hubspot',
          runs_24h: 5,
          failures_24h: 2,
          last_success: '2026-04-03T17:10:00.000Z'
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ last_sync: '2026-04-03T17:12:00.000Z' }])

    const { getIntegrationHealthSnapshots } = await import('@/lib/integrations/health')

    const snapshots = await getIntegrationHealthSnapshots(['hubspot'])
    const hubspot = snapshots.get('hubspot')

    expect(hubspot).toMatchObject({
      integrationKey: 'hubspot',
      health: 'healthy',
      syncRunsLast24h: 5,
      syncFailuresLast24h: 2,
      freshnessLabel: 'hace 48min'
    })
  })

  it('keeps stale integrations degraded even when the last successful run had no failures', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-03T18:00:00.000Z'))

    runGreenhousePostgresQueryMock
      .mockResolvedValueOnce([
        {
          source_system: 'nubox',
          runs_24h: 1,
          failures_24h: 0,
          last_success: '2026-04-01T18:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const { getIntegrationHealthSnapshots } = await import('@/lib/integrations/health')

    const snapshots = await getIntegrationHealthSnapshots(['nubox'])
    const nubox = snapshots.get('nubox')

    expect(nubox).toMatchObject({
      integrationKey: 'nubox',
      health: 'degraded',
      syncRunsLast24h: 1,
      syncFailuresLast24h: 0,
      freshnessLabel: 'hace 2d'
    })
  })
})
