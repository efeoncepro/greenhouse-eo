import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readOrganizationOperationalMetricsRow } from './organization-operational-metrics-reader'

/**
 * Canonical organization operational metrics reader — contract guard (TASK-1106).
 *
 * Root cause of ISSUE-087 / Sentry JAVASCRIPT-NEXTJS-7H: the delivery facet read rich columns
 * (rpa_median / pipeline_velocity / stuck_asset_pct) from a serving table that did not have them, and
 * the silent `.catch(() => [])` masked the 42703 as "no rows". These tests pin the honest-degradation
 * contract of the unified reader:
 *   - a Postgres row maps every field (incl. null) without inventing zeros for absent metrics;
 *   - an empty Postgres result falls back to the canonical BigQuery source;
 *   - a SCHEMA-DRIFT error (42703 / 42P01) is re-thrown loud (so the resolver records it in
 *     `_meta.errors` and the live guard fails) — NOT degraded into a silent null;
 *   - an availability error (connection / timeout) degrades to the BigQuery source.
 */

const runQueryMock = vi.fn()
const captureMock = vi.fn()
const readBigQueryMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (sql: string, params?: unknown[]) => runQueryMock(sql, params)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

vi.mock('./organization-ico-metrics-source', () => ({
  readOrganizationIcoMetricsFromBigQuery: (input: unknown) => readBigQueryMock(input)
}))

beforeEach(() => {
  runQueryMock.mockReset()
  captureMock.mockReset()
  readBigQueryMock.mockReset()
})

describe('readOrganizationOperationalMetricsRow', () => {
  it('maps a Postgres row preserving null metrics (no silent zeros)', async () => {
    runQueryMock.mockResolvedValueOnce([
      {
        period_year: 2026,
        period_month: 6,
        tasks_completed: '120',
        tasks_active: '40',
        tasks_total: '289',
        rpa_avg: '1.20',
        rpa_median: null, // genuinely null in the mirror — must stay null, not 0
        otd_pct: '85.50',
        ftr_pct: null,
        cycle_time_avg_days: '4.30',
        throughput_count: '52',
        pipeline_velocity: '0.01',
        stuck_asset_count: '8',
        stuck_asset_pct: '8.00',
        materialized_at: '2026-06-10T00:00:00.000Z'
      }
    ])

    const row = await readOrganizationOperationalMetricsRow('org-1', { periodYear: 2026, periodMonth: 6 })

    expect(row).not.toBeNull()
    expect(row?.source).toBe('postgres')
    expect(row?.periodYear).toBe(2026)
    expect(row?.tasksTotal).toBe(289)
    expect(row?.rpaAvg).toBe(1.2)
    expect(row?.rpaMedian).toBeNull()
    expect(row?.ftrPct).toBeNull()
    expect(row?.pipelineVelocity).toBe(0.01)
    expect(row?.stuckAssetPct).toBe(8)
    expect(row?.stuckAssetCount).toBe(8)
    expect(readBigQueryMock).not.toHaveBeenCalled()
  })

  it('falls back to BigQuery when Postgres has no rows', async () => {
    runQueryMock.mockResolvedValueOnce([])
    readBigQueryMock.mockResolvedValueOnce({
      organization_id: 'org-1',
      period_year: 2026,
      period_month: 5,
      rpa_avg: 1.1,
      rpa_median: 1,
      otd_pct: 90,
      ftr_pct: 80,
      cycle_time_avg_days: 3.2,
      throughput_count: 44,
      pipeline_velocity: 0.5,
      stuck_asset_count: 2,
      stuck_asset_pct: 2.6,
      total_tasks: 200,
      completed_tasks: 150,
      active_tasks: 40,
      materialized_at: '2026-05-31T00:00:00.000Z'
    })

    const row = await readOrganizationOperationalMetricsRow('org-1', { periodYear: 2026, periodMonth: 6 })

    expect(row?.source).toBe('bigquery')
    expect(row?.periodMonth).toBe(5)
    expect(row?.rpaMedian).toBe(1)
    expect(row?.stuckAssetPct).toBe(2.6)
    expect(row?.tasksTotal).toBe(200)
  })

  it('RE-THROWS schema-drift (42703) and never falls back to BigQuery', async () => {
    const driftError = Object.assign(new Error('column "rpa_median" does not exist'), { code: '42703' })

    runQueryMock.mockRejectedValueOnce(driftError)

    await expect(
      readOrganizationOperationalMetricsRow('org-1', { periodYear: 2026, periodMonth: 6 })
    ).rejects.toThrow(/rpa_median/)

    expect(captureMock).toHaveBeenCalledTimes(1)
    // Schema drift must NOT be masked by the BigQuery fallback — it has to surface loud.
    expect(readBigQueryMock).not.toHaveBeenCalled()
  })

  it('RE-THROWS schema-drift (42P01 undefined_table)', async () => {
    const driftError = Object.assign(new Error('relation does not exist'), { code: '42P01' })

    runQueryMock.mockRejectedValueOnce(driftError)

    await expect(
      readOrganizationOperationalMetricsRow('org-1', { periodYear: 2026, periodMonth: 6 })
    ).rejects.toThrow()

    expect(readBigQueryMock).not.toHaveBeenCalled()
  })

  it('degrades an availability error to the BigQuery source', async () => {
    const connError = Object.assign(new Error('connection terminated unexpectedly'), { code: '57P01' })

    runQueryMock.mockRejectedValueOnce(connError)
    readBigQueryMock.mockResolvedValueOnce({
      organization_id: 'org-1',
      period_year: 2026,
      period_month: 6,
      rpa_avg: 1,
      rpa_median: 1,
      otd_pct: 88,
      ftr_pct: 77,
      cycle_time_avg_days: 4,
      throughput_count: 30,
      pipeline_velocity: 0.2,
      stuck_asset_count: 1,
      stuck_asset_pct: 1.5,
      total_tasks: 100,
      completed_tasks: 70,
      active_tasks: 20,
      materialized_at: null
    })

    const row = await readOrganizationOperationalMetricsRow('org-1', { periodYear: 2026, periodMonth: 6 })

    expect(captureMock).toHaveBeenCalled()
    expect(row?.source).toBe('bigquery')
    expect(row?.periodMonth).toBe(6)
  })

  it('returns null when both Postgres and BigQuery have no data (honest no-data)', async () => {
    runQueryMock.mockResolvedValueOnce([])
    readBigQueryMock.mockResolvedValueOnce(null)

    const row = await readOrganizationOperationalMetricsRow('org-1', { periodYear: 2026, periodMonth: 6 })

    expect(row).toBeNull()
  })
})
