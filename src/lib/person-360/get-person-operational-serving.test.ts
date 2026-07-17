import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

import {
  ensurePersonOperationalSchema,
  getPersonOperationalServing
} from './get-person-operational-serving'

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
})

describe('person operational serving', () => {
  it('validates serving readiness without runtime DDL', async () => {
    mocks.runGreenhousePostgresQuery.mockResolvedValue([])

    await ensurePersonOperationalSchema()

    const sql = mocks.runGreenhousePostgresQuery.mock.calls.map(([query]) => String(query)).join('\n')

    expect(sql).not.toMatch(/CREATE\s+TABLE/i)
    expect(sql).toContain('SELECT 1 FROM greenhouse_serving.person_operational_metrics LIMIT 0')
    expect(sql).toContain('SELECT 1 FROM greenhouse_serving.ico_member_metrics LIMIT 0')
  })

  it('falls back to ico_member_metrics when person_operational_metrics is unavailable', async () => {
    mocks.runGreenhousePostgresQuery
      .mockRejectedValueOnce(new Error('permission denied for schema greenhouse_serving'))
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          period_year: 2026,
          period_month: 7,
          tasks_completed: 8,
          tasks_active: 3,
          tasks_total: 11,
          rpa_avg: '1.25',
          otd_pct: '92.5',
          ftr_pct: '88',
          cycle_time_avg_days: '4.5',
          throughput_count: 8,
          stuck_asset_count: 1,
          project_breakdown: [],
          source: 'ico_member_metrics',
          materialized_at: '2026-07-15T12:00:00Z'
        }
      ])

    const result = await getPersonOperationalServing('member-1')

    expect(result.hasData).toBe(true)
    expect(result.source).toBe('postgres')
    expect(result.current?.periodYear).toBe(2026)
    expect(result.current?.rpaAvg).toBe(1.25)
  })
})
