import { afterEach, describe, expect, it, vi } from 'vitest'

const { runGreenhousePostgresQuery } = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery
}))

import { recordProbeResults } from './persist'

describe('recordProbeResults', () => {
  afterEach(() => {
    runGreenhousePostgresQuery.mockReset()
  })

  it('does not hit Postgres for an empty batch', async () => {
    await recordProbeResults([])

    expect(runGreenhousePostgresQuery).not.toHaveBeenCalled()
  })

  it('persists all probes in one bulk insert', async () => {
    await recordProbeResults([
      {
        probeId: 'probe-1',
        sweepRunId: 'sweep-1',
        moduleKey: 'cloud',
        routePath: '/admin/ops-health',
        httpStatus: 200,
        ok: true,
        latencyMs: 123,
        errorMessage: null,
        triggeredBy: 'cron',
        startedAt: '2026-05-24T09:00:00.000Z',
        finishedAt: '2026-05-24T09:00:00.123Z'
      },
      {
        probeId: 'probe-2',
        sweepRunId: 'sweep-1',
        moduleKey: 'delivery',
        routePath: '/admin/integrations',
        httpStatus: 503,
        ok: false,
        latencyMs: 8000,
        errorMessage: 'HTTP 503',
        triggeredBy: 'cron',
        startedAt: '2026-05-24T09:00:01.000Z',
        finishedAt: '2026-05-24T09:00:09.000Z'
      }
    ])

    expect(runGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
    expect(runGreenhousePostgresQuery.mock.calls[0][0]).toContain('UNNEST')
    expect(runGreenhousePostgresQuery.mock.calls[0][1][0]).toEqual(['probe-1', 'probe-2'])
    expect(runGreenhousePostgresQuery.mock.calls[0][1][7]).toEqual([null, 'HTTP 503'])
  })
})
