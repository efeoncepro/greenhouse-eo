import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import { detectPreviredSyncFreshness } from './previred-sync-freshness'

describe('detectPreviredSyncFreshness', () => {
  beforeEach(() => {
    mockRunGreenhousePostgresQuery.mockReset()
  })

  it('reads freshness from finished_at/started_at instead of the nonexistent completed_at column', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([{ hours_since: '12.4' }])

    const metric = await detectPreviredSyncFreshness()

    expect(mockRunGreenhousePostgresQuery.mock.calls[0]?.[0]).toContain('COALESCE(finished_at, started_at)')
    expect(metric).toEqual({
      key: 'previred_sync_freshness',
      label: 'Horas desde último sync PREVIRED',
      value: 12,
      status: 'ok'
    })
  })

  it('returns info when no successful sync has been recorded yet', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([{ hours_since: null }])

    const metric = await detectPreviredSyncFreshness()

    expect(metric.status).toBe('info')
    expect(metric.value).toBe(-1)
  })
})
