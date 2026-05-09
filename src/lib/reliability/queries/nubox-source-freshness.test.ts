import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  evaluateNuboxSourceFreshnessRows,
  getNuboxSourceFreshnessSignal,
  NUBOX_SOURCE_FRESHNESS_SIGNAL_ID
} from './nubox-source-freshness'

const NOW = new Date('2026-05-09T12:00:00Z')

const row = (
  sourceObjectType: string,
  latestStatus: string,
  latestSuccessFinishedAt: string | null
) => ({
  source_object_type: sourceObjectType,
  latest_status: latestStatus,
  latest_started_at: latestSuccessFinishedAt,
  latest_finished_at: latestSuccessFinishedAt,
  latest_notes: null,
  latest_success_finished_at: latestSuccessFinishedAt
})

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('evaluateNuboxSourceFreshnessRows', () => {
  it('returns ok when raw, quotes and balance lanes are fresh', () => {
    const evaluated = evaluateNuboxSourceFreshnessRows([
      row('raw_sync', 'succeeded', '2026-05-09T11:00:00Z'),
      row('conformed_sync', 'succeeded', '2026-05-09T11:05:00Z'),
      row('postgres_projection', 'succeeded', '2026-05-09T11:07:00Z'),
      row('quotes_hot_sync', 'succeeded', '2026-05-09T11:45:00Z'),
      row('balance_sync', 'succeeded', '2026-05-09T10:00:00Z')
    ] as never, NOW)

    expect(evaluated.severity).toBe('ok')
    expect(evaluated.summary).toContain('dentro de SLA')
  })

  it('returns error when raw is stale but conformed is fresh', () => {
    const evaluated = evaluateNuboxSourceFreshnessRows([
      row('raw_sync', 'failed', '2026-05-03T23:45:25Z'),
      row('conformed_sync', 'succeeded', '2026-05-09T11:30:02Z'),
      row('postgres_projection', 'succeeded', '2026-05-09T11:30:09Z'),
      row('quotes_hot_sync', 'failed', null),
      row('balance_sync', 'succeeded', '2026-05-09T10:00:00Z')
    ] as never, NOW)

    expect(evaluated.severity).toBe('error')
    expect(evaluated.summary).toContain('raw_sync stale')
    expect(evaluated.summary).toContain('conformed/projection frescos sobre raw stale')
    expect(evaluated.summary).toContain('quotes_hot_sync stale')
  })

  it('returns warning when only balance sync is stale', () => {
    const evaluated = evaluateNuboxSourceFreshnessRows([
      row('raw_sync', 'succeeded', '2026-05-09T11:00:00Z'),
      row('conformed_sync', 'succeeded', '2026-05-09T11:05:00Z'),
      row('postgres_projection', 'succeeded', '2026-05-09T11:07:00Z'),
      row('quotes_hot_sync', 'succeeded', '2026-05-09T11:45:00Z'),
      row('balance_sync', 'succeeded', '2026-05-09T02:00:00Z')
    ] as never, NOW)

    expect(evaluated.severity).toBe('warning')
    expect(evaluated.summary).toContain('balance_sync stale')
  })
})

describe('getNuboxSourceFreshnessSignal', () => {
  it('returns a finance freshness signal from source_sync_runs', async () => {
    queryMock.mockResolvedValueOnce([
      row('raw_sync', 'succeeded', '2026-05-09T11:00:00Z'),
      row('conformed_sync', 'succeeded', '2026-05-09T11:05:00Z'),
      row('postgres_projection', 'succeeded', '2026-05-09T11:07:00Z'),
      row('quotes_hot_sync', 'succeeded', '2026-05-09T11:45:00Z'),
      row('balance_sync', 'succeeded', '2026-05-09T10:00:00Z')
    ])

    const signal = await getNuboxSourceFreshnessSignal()

    expect(signal.signalId).toBe(NUBOX_SOURCE_FRESHNESS_SIGNAL_ID)
    expect(signal.moduleKey).toBe('finance')
    expect(signal.kind).toBe('freshness')
    expect(String(queryMock.mock.calls[0]?.[0])).toContain('greenhouse_sync.source_sync_runs')
  })

  it('returns unknown when the query throws', async () => {
    queryMock.mockRejectedValueOnce(new Error('source_sync_runs unavailable'))

    const signal = await getNuboxSourceFreshnessSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
  })
})
