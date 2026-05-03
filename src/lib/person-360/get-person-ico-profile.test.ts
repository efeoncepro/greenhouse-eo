import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockRunIcoEngineQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: vi.fn()
}))

vi.mock('@/lib/ico-engine/shared', () => ({
  buildMetricSelectSQL: () => `
    10 AS rpa_avg,
    11 AS rpa_median,
    90 AS otd_pct,
    80 AS ftr_pct,
    4 AS cycle_time_avg_days,
    1 AS cycle_time_variance,
    7 AS throughput_count,
    1.5 AS pipeline_velocity,
    0 AS stuck_asset_count,
    0 AS stuck_asset_pct,
    9 AS total_tasks,
    7 AS completed_tasks,
    2 AS active_tasks,
    6 AS on_time_count,
    1 AS late_drop_count,
    1 AS overdue_count,
    0 AS carry_over_count
  `,
  buildPeriodFilterSQL: () => 'TRUE',
  getIcoEngineProjectId: () => 'greenhouse-test',
  runIcoEngineQuery: (...args: unknown[]) => mockRunIcoEngineQuery(...args)
}))

vi.mock('@/lib/ico-engine/schema', () => ({
  ICO_DATASET: 'ico_engine'
}))

import { getPersonIcoProfile, readPersonIcoSnapshot } from '@/lib/person-360/get-person-ico-profile'

describe('person ICO org scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads a scoped ICO snapshot from ICO Engine when organizationId is provided', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { client_id: 'client-1' }
    ])
    mockRunIcoEngineQuery.mockResolvedValueOnce([
      {
        member_id: 'member-1',
        period_year: 2026,
        period_month: 3,
        rpa_avg: '72',
        rpa_median: '70',
        otd_pct: '88',
        ftr_pct: '81',
        cycle_time_avg_days: '3.5',
        cycle_time_variance: '1.1',
        throughput_count: '12',
        pipeline_velocity: '1.4',
        stuck_asset_count: '1',
        stuck_asset_pct: '8',
        total_tasks: '13',
        completed_tasks: '12',
        active_tasks: '1',
        on_time_count: '10',
        late_drop_count: '2',
        overdue_count: '1',
        carry_over_count: '0'
      }
    ])

    const snapshot = await readPersonIcoSnapshot('member-1', 2026, 3, { organizationId: 'org-sky' })

    expect(String(mockRunIcoEngineQuery.mock.calls[0]?.[0])).toContain('client_id IN UNNEST(@clientIds)')
    expect(snapshot).toMatchObject({
      periodYear: 2026,
      periodMonth: 3,
      rpaAvg: 72,
      totalTasks: 13,
      activeTasks: 1
    })
  })

  it('builds a scoped ICO profile trend from ICO Engine periods', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { client_id: 'client-1' }
    ])
    mockRunIcoEngineQuery
      .mockResolvedValueOnce([{ period_year: 2026, period_month: 3 }])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          period_year: 2026,
          period_month: 3,
          rpa_avg: '80',
          rpa_median: '79',
          otd_pct: '92',
          ftr_pct: '85',
          cycle_time_avg_days: '4',
          cycle_time_variance: '1',
          throughput_count: '9',
          pipeline_velocity: '1.2',
          stuck_asset_count: '0',
          stuck_asset_pct: '0',
          total_tasks: '9',
          completed_tasks: '9',
          active_tasks: '0',
          on_time_count: '8',
          late_drop_count: '1',
          overdue_count: '0',
          carry_over_count: '0'
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          period_year: 2026,
          period_month: 2,
          rpa_avg: '65',
          rpa_median: '64',
          otd_pct: '70',
          ftr_pct: '72',
          cycle_time_avg_days: '5',
          cycle_time_variance: '2',
          throughput_count: '6',
          pipeline_velocity: '1.1',
          stuck_asset_count: '1',
          stuck_asset_pct: '10',
          total_tasks: '8',
          completed_tasks: '6',
          active_tasks: '2',
          on_time_count: '5',
          late_drop_count: '1',
          overdue_count: '1',
          carry_over_count: '1'
        }
      ])

    const profile = await getPersonIcoProfile('member-1', 2, { organizationId: 'org-sky' })

    expect(profile).toMatchObject({
      hasData: true,
      health: 'green'
    })
    expect(profile.trend).toHaveLength(2)
    expect(profile.current?.periodMonth).toBe(3)
  })
})
