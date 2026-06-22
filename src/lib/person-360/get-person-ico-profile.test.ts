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

import {
  computeHealth,
  getPersonIcoProfile,
  readPersonIcoSnapshot,
  type IcoMetricPeriod
} from '@/lib/person-360/get-person-ico-profile'

const period = (overrides: Partial<IcoMetricPeriod> = {}): IcoMetricPeriod =>
  ({
    periodYear: 2026,
    periodMonth: 6,
    rpaAvg: 1,
    rpaMedian: 1,
    otdPct: 90,
    ftrPct: 85,
    cycleTimeAvgDays: null,
    cycleTimeVariance: null,
    throughputCount: null,
    pipelineVelocity: null,
    stuckAssetCount: null,
    stuckAssetPct: null,
    totalTasks: null,
    completedTasks: null,
    activeTasks: null,
    onTimeCount: null,
    lateDropCount: null,
    overdueCount: null,
    carryOverCount: null,
    overdueCarriedForwardCount: null,
    metricTrust: null,
    ...overrides
  }) as IcoMetricPeriod

describe('computeHealth — escala RpA (TASK-1219)', () => {
  it('caso real Daniela: OTD alto + RpA bajo (rondas) → green, NO red', () => {
    // El bug previo (rpa >= 70) daba red con OTD 96.2 / RpA 1.13.
    expect(computeHealth(period({ otdPct: 96.2, rpaAvg: 1.13 }))).toBe('green')
  })

  it('RpA bajo es BUENO: 0 rondas (aprobado a la primera) + OTD alto → green', () => {
    expect(computeHealth(period({ otdPct: 88, rpaAvg: 0 }))).toBe('green')
  })

  it('RpA alto (muchas rondas) penaliza: 3 rondas → red aunque OTD sea alto', () => {
    expect(computeHealth(period({ otdPct: 95, rpaAvg: 3 }))).toBe('red')
  })

  it('banda atención: RpA 2 + OTD 70 → yellow', () => {
    expect(computeHealth(period({ otdPct: 70, rpaAvg: 2 }))).toBe('yellow')
  })

  it('RpA null (sin dato) no penaliza: la salud la decide OTD', () => {
    expect(computeHealth(period({ otdPct: 90, rpaAvg: null }))).toBe('green')
    expect(computeHealth(period({ otdPct: 60, rpaAvg: null }))).toBe('yellow')
    expect(computeHealth(period({ otdPct: 30, rpaAvg: null }))).toBe('red')
  })

  it('OTD bajo arrastra a red aunque RpA sea óptimo', () => {
    expect(computeHealth(period({ otdPct: 40, rpaAvg: 0.5 }))).toBe('red')
  })

  it('cortes canónicos del semáforo RpA (1.5 / 2.5)', () => {
    expect(computeHealth(period({ otdPct: 90, rpaAvg: 1.5 }))).toBe('green')
    expect(computeHealth(period({ otdPct: 90, rpaAvg: 1.51 }))).toBe('yellow')
    expect(computeHealth(period({ otdPct: 60, rpaAvg: 2.5 }))).toBe('yellow')
    expect(computeHealth(period({ otdPct: 60, rpaAvg: 2.51 }))).toBe('red')
  })
})

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
        rpa_avg: '1.2',
        rpa_median: '1',
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
      rpaAvg: 1.2,
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
          rpa_avg: '1',
          rpa_median: '1',
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
          rpa_avg: '2',
          rpa_median: '2',
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
