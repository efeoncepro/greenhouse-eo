import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock postgres client antes de importar los detectors.
vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: vi.fn()
}))

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { detectStuckDraftPeriods } from './stuck-draft-periods'
import { detectCompensationVersionOverlaps } from './compensation-version-overlaps'
import { detectPreviredSyncFreshness } from './previred-sync-freshness'
import { detectProjectionQueueFailures } from './projection-queue-failures'
import { isPayrollPlatformMetric, PAYROLL_PLATFORM_METRIC_KEYS } from './types'

const mockedQuery = vi.mocked(runGreenhousePostgresQuery)

beforeEach(() => {
  mockedQuery.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TASK-729 detector: stuck_draft_periods', () => {
  it('returns ok when count = 0', async () => {
    mockedQuery.mockResolvedValueOnce([{ cnt: '0' }] as never)

    const result = await detectStuckDraftPeriods()

    expect(result.key).toBe('stuck_draft_periods')
    expect(result.value).toBe(0)
    expect(result.status).toBe('ok')
  })

  it('returns warning when count = 1', async () => {
    mockedQuery.mockResolvedValueOnce([{ cnt: '1' }] as never)

    const result = await detectStuckDraftPeriods()

    expect(result.value).toBe(1)
    expect(result.status).toBe('warning')
  })

  it('returns error when count > 1', async () => {
    mockedQuery.mockResolvedValueOnce([{ cnt: '5' }] as never)

    const result = await detectStuckDraftPeriods()

    expect(result.value).toBe(5)
    expect(result.status).toBe('error')
  })

  it('fail-soft when query throws (legacy schema, connection issue)', async () => {
    mockedQuery.mockRejectedValueOnce(new Error('relation does not exist'))

    const result = await detectStuckDraftPeriods()

    expect(result.value).toBe(0)
    expect(result.status).toBe('info')
  })
})

describe('TASK-729 detector: compensation_version_overlaps', () => {
  it('returns ok when no overlaps', async () => {
    mockedQuery.mockResolvedValueOnce([{ cnt: '0' }] as never)

    const result = await detectCompensationVersionOverlaps()

    expect(result.key).toBe('compensation_version_overlaps')
    expect(result.value).toBe(0)
    expect(result.status).toBe('ok')
  })

  it('returns error when overlaps detected (critical platform integrity)', async () => {
    mockedQuery.mockResolvedValueOnce([{ cnt: '3' }] as never)

    const result = await detectCompensationVersionOverlaps()

    expect(result.value).toBe(3)
    expect(result.status).toBe('error')
  })

  it('fail-soft when query throws', async () => {
    mockedQuery.mockRejectedValueOnce(new Error('column does not exist'))

    const result = await detectCompensationVersionOverlaps()

    expect(result.status).toBe('info')
    expect(result.value).toBe(0)
  })
})

describe('TASK-729 detector: previred_sync_freshness', () => {
  it('returns ok when last sync was <= 24h ago', async () => {
    mockedQuery.mockResolvedValueOnce([{ hours_since: '4.2' }] as never)

    const result = await detectPreviredSyncFreshness()

    expect(result.key).toBe('previred_sync_freshness')
    expect(result.value).toBe(4)
    expect(result.status).toBe('ok')
  })

  it('returns warning when last sync was 24h–72h ago', async () => {
    mockedQuery.mockResolvedValueOnce([{ hours_since: '50.0' }] as never)

    const result = await detectPreviredSyncFreshness()

    expect(result.value).toBe(50)
    expect(result.status).toBe('warning')
  })

  it('returns error when last sync was > 72h ago', async () => {
    mockedQuery.mockResolvedValueOnce([{ hours_since: '120.0' }] as never)

    const result = await detectPreviredSyncFreshness()

    expect(result.value).toBe(120)
    expect(result.status).toBe('error')
  })

  it('returns info when no successful sync recorded', async () => {
    mockedQuery.mockResolvedValueOnce([{ hours_since: null }] as never)

    const result = await detectPreviredSyncFreshness()

    expect(result.value).toBe(-1)
    expect(result.status).toBe('info')
  })

  it('returns info on query error (fail-soft)', async () => {
    mockedQuery.mockRejectedValueOnce(new Error('timeout'))

    const result = await detectPreviredSyncFreshness()

    expect(result.value).toBe(-1)
    expect(result.status).toBe('info')
  })
})

describe('TASK-729 detector: projection_queue_failures', () => {
  it('returns ok when no failures', async () => {
    mockedQuery.mockResolvedValueOnce([{ cnt: '0' }] as never)

    const result = await detectProjectionQueueFailures()

    expect(result.key).toBe('projection_queue_failures')
    expect(result.value).toBe(0)
    expect(result.status).toBe('ok')
  })

  it('returns warning when 1-5 failures', async () => {
    mockedQuery.mockResolvedValueOnce([{ cnt: '3' }] as never)

    const result = await detectProjectionQueueFailures()

    expect(result.value).toBe(3)
    expect(result.status).toBe('warning')
  })

  it('returns error when > 5 failures', async () => {
    mockedQuery.mockResolvedValueOnce([{ cnt: '12' }] as never)

    const result = await detectProjectionQueueFailures()

    expect(result.value).toBe(12)
    expect(result.status).toBe('error')
  })

  it('fail-soft on query error', async () => {
    mockedQuery.mockRejectedValueOnce(new Error('relation does not exist'))

    const result = await detectProjectionQueueFailures()

    expect(result.value).toBe(0)
    expect(result.status).toBe('info')
  })
})

describe('TASK-729 platform metric classification', () => {
  it('marks stuck_draft_periods as platform metric', () => {
    expect(isPayrollPlatformMetric('stuck_draft_periods')).toBe(true)
  })

  it('marks compensation_version_overlaps as platform metric', () => {
    expect(isPayrollPlatformMetric('compensation_version_overlaps')).toBe(true)
  })

  it('marks projection_queue_failures as platform metric', () => {
    expect(isPayrollPlatformMetric('projection_queue_failures')).toBe(true)
  })

  it('marks previred_sync_freshness as operational (NOT platform — info-only)', () => {
    expect(isPayrollPlatformMetric('previred_sync_freshness')).toBe(false)
  })

  it('platform metric set has exactly 3 keys (stuck/overlaps/queue)', () => {
    expect(PAYROLL_PLATFORM_METRIC_KEYS.size).toBe(3)
  })
})
