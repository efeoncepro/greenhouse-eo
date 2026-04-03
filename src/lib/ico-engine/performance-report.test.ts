import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockRunIcoEngineQuery = vi.fn()
const mockReadAgencyMetrics = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/ico-engine/shared', () => ({
  buildAgencyReportScopeSql: () => 'TRUE',
  buildDeliveryPeriodSourceSql: () => '(SELECT 1)',
  buildMetricSelectSQL: () => `
    0 AS rpa_avg,
    0 AS rpa_median,
    0 AS otd_pct,
    0 AS ftr_pct,
    0 AS cycle_time_avg_days,
    0 AS cycle_time_p50_days,
    0 AS cycle_time_variance,
    0 AS throughput_count,
    0 AS pipeline_velocity,
    0 AS stuck_asset_count,
    0 AS stuck_asset_pct,
    0 AS total_tasks,
    0 AS completed_tasks,
    0 AS active_tasks,
    0 AS on_time_count,
    0 AS late_drop_count,
    0 AS overdue_count,
    0 AS carry_over_count
  `,
  getIcoEngineProjectId: () => 'greenhouse-test',
  isAgencyReportIncludedSpace: () => true,
  normalizeString: (value: unknown) => String(value ?? '').trim(),
  runIcoEngineQuery: (...args: unknown[]) => mockRunIcoEngineQuery(...args),
  toNullableNumber: (value: unknown) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)

    return Number.isFinite(num) ? num : null
  },
  toNumber: (value: unknown) => {
    const num = Number(value)

    return Number.isFinite(num) ? num : 0
  }
}))

vi.mock('@/lib/ico-engine/read-metrics', () => ({
  readAgencyMetrics: (...args: unknown[]) => mockReadAgencyMetrics(...args)
}))

vi.mock('@/lib/ico-engine/schema', () => ({
  ICO_DATASET: 'ico_engine'
}))

vi.mock('@/lib/commercial-cost-attribution/assignment-classification', () => ({
  isInternalCommercialAssignment: () => false
}))

import { readAgencyPerformanceReport } from '@/lib/ico-engine/performance-report'

describe('readAgencyPerformanceReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers materialized BigQuery report rows before serving cache', async () => {
    mockRunIcoEngineQuery.mockResolvedValueOnce([
      {
        report_scope: 'agency',
        period_year: 2026,
        period_month: 3,
        on_time_count: 247,
        late_drop_count: 25,
        on_time_pct: 84.3,
        overdue_count: 21,
        carry_over_count: 0,
        total_tasks: 293,
        completed_tasks: 272,
        active_tasks: 21,
        efeonce_tasks_count: 104,
        sky_tasks_count: 189,
        task_mix_json: JSON.stringify([{ segment_key: 'sky', segment_label: 'Sky', total_tasks: 189 }]),
        top_performer_member_id: 'member-1',
        top_performer_member_name: 'Daniela',
        top_performer_otd_pct: 86.3,
        top_performer_throughput_count: 98,
        top_performer_rpa_avg: 1.4,
        top_performer_ftr_pct: 81.2,
        top_performer_min_throughput: 5,
        trend_stable_band_pp: 1,
        multi_assignee_policy: 'primary_owner_first_assignee'
      },
      {
        report_scope: 'agency',
        period_year: 2026,
        period_month: 2,
        on_time_count: 191,
        late_drop_count: 75,
        on_time_pct: 67.5,
        overdue_count: 17,
        carry_over_count: 0,
        total_tasks: 283,
        completed_tasks: 266,
        active_tasks: 17,
        efeonce_tasks_count: 93,
        sky_tasks_count: 190,
        task_mix_json: '[]',
        top_performer_member_id: 'member-2',
        top_performer_member_name: 'Valentina',
        top_performer_otd_pct: 77.3,
        top_performer_throughput_count: 44,
        top_performer_rpa_avg: 1.2,
        top_performer_ftr_pct: 79.5,
        top_performer_min_throughput: 5,
        trend_stable_band_pp: 1,
        multi_assignee_policy: 'primary_owner_first_assignee'
      }
    ])

    const report = await readAgencyPerformanceReport(2026, 3)

    expect(mockRunGreenhousePostgresQuery).not.toHaveBeenCalled()
    expect(report.summary.onTimePct).toBe(84.3)
    expect(report.summary.totalTasks).toBe(293)
    expect(report.topPerformer?.memberName).toBe('Daniela')
  })

  it('falls back to serving when materialized BigQuery rows are unavailable', async () => {
    mockRunIcoEngineQuery.mockResolvedValueOnce([])
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        report_scope: 'agency',
        period_year: 2026,
        period_month: 3,
        on_time_count: 247,
        late_drop_count: 25,
        on_time_pct: 84.3,
        overdue_count: 21,
        carry_over_count: 0,
        total_tasks: 293,
        completed_tasks: 272,
        active_tasks: 21,
        efeonce_tasks_count: 104,
        sky_tasks_count: 189,
        task_mix_json: JSON.stringify([{ segment_key: 'sky', segment_label: 'Sky', total_tasks: 189 }]),
        top_performer_member_id: 'member-1',
        top_performer_member_name: 'Daniela',
        top_performer_otd_pct: 86.3,
        top_performer_throughput_count: 98,
        top_performer_rpa_avg: 1.4,
        top_performer_ftr_pct: 81.2,
        top_performer_min_throughput: 5,
        trend_stable_band_pp: 1,
        multi_assignee_policy: 'primary_owner_first_assignee'
      }
    ])

    const report = await readAgencyPerformanceReport(2026, 3)

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledOnce()
    expect(report.summary.onTimePct).toBe(84.3)
    expect(report.summary.totalTasks).toBe(293)
  })
})
