import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SharedModule from './shared'

const mocks = vi.hoisted(() => ({
  runIcoEngineQuery: vi.fn()
}))

vi.mock('./shared', async importOriginal => {
  const actual = await importOriginal<typeof SharedModule>()

  return {
    ...actual,
    getIcoEngineProjectId: () => 'test-project',
    runIcoEngineQuery: mocks.runIcoEngineQuery
  }
})

vi.mock('./schema', () => ({
  ICO_DATASET: 'ico_engine',
  ENGINE_VERSION: 'test-engine'
}))

const staleDanielaRow = {
  member_id: 'daniela-ferreira',
  period_year: 2026,
  period_month: 6,
  rpa_avg: null,
  rpa_median: null,
  rpa_eligible_task_count: 0,
  rpa_missing_task_count: 0,
  rpa_non_positive_task_count: 1,
  otd_pct: 4.8,
  ftr_pct: null,
  cycle_time_avg_days: null,
  cycle_time_p50_days: null,
  cycle_time_variance: null,
  throughput_count: 1,
  pipeline_velocity: null,
  stuck_asset_count: 0,
  stuck_asset_pct: 0,
  total_tasks: 23,
  completed_tasks: 1,
  active_tasks: 22,
  on_time_count: 1,
  late_drop_count: 0,
  overdue_count: 20,
  carry_over_count: 0,
  overdue_carried_forward_count: 2,
  materialized_at: '2026-06-01T07:15:41.675Z'
}

const liveDanielaRow = {
  dimension_value: 'daniela-ferreira',
  rpa_avg: 1.13,
  rpa_median: 1,
  rpa_eligible_task_count: 8,
  rpa_missing_task_count: 0,
  rpa_non_positive_task_count: 101,
  otd_pct: 99.1,
  ftr_pct: null,
  cycle_time_avg_days: null,
  cycle_time_p50_days: null,
  cycle_time_variance: null,
  throughput_count: 109,
  pipeline_velocity: null,
  stuck_asset_count: 0,
  stuck_asset_pct: 0,
  total_tasks: 141,
  completed_tasks: 109,
  active_tasks: 32,
  on_time_count: 109,
  late_drop_count: 0,
  overdue_count: 1,
  carry_over_count: 23,
  overdue_carried_forward_count: 8
}

const setupDanielaFreshnessMocks = () => {
  mocks.runIcoEngineQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('metrics_by_member')) {
      return [staleDanielaRow]
    }

    if (sql.includes('source_freshness_at')) {
      return [{ source_freshness_at: '2026-06-16T07:17:33.268Z' }]
    }

    if (sql.includes('@dimensionValue AS dimension_value') || sql.includes('primary_owner_member_id AS dimension_value')) {
      return [liveDanielaRow]
    }

    if (sql.includes('fase_csc')) {
      return []
    }

    return []
  })
}

const getMetricValue = (
  snapshot: { metrics: Array<{ metricId: string; value: number | null }> },
  metricId: string
) => snapshot.metrics.find(metric => metric.metricId === metricId)?.value ?? null

describe('read-metrics member freshness guard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T12:00:00.000Z'))
    mocks.runIcoEngineQuery.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('falls back to live compute for a structurally complete but stale current-period member row', async () => {
    setupDanielaFreshnessMocks()

    const { readMemberMetrics } = await import('./read-metrics')
    const snapshot = await readMemberMetrics('daniela-ferreira', 2026, 6)

    expect(snapshot?.source).toBe('live')
    expect(getMetricValue(snapshot!, 'otd_pct')).toBe(99.1)
    expect(snapshot?.context).toMatchObject({
      completedTasks: 109,
      onTimeTasks: 109,
      overdueTasks: 1
    })
  })

  it('batch reader also replaces stale current-period rows with live snapshots', async () => {
    setupDanielaFreshnessMocks()

    const { readMemberMetricsBatch } = await import('./read-metrics')
    const snapshots = await readMemberMetricsBatch(['daniela-ferreira'], 2026, 6)
    const snapshot = snapshots.get('daniela-ferreira')

    expect(snapshot?.source).toBe('live')
    expect(getMetricValue(snapshot!, 'otd_pct')).toBe(99.1)
    expect(snapshot?.context.totalTasks).toBe(141)
  })
})
