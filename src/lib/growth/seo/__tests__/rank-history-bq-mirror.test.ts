import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1303 Slice 2 — `mirrorRankSnapshotsToBq`: re-lee PG con JOIN al target (para
 * denormalizar organization_id — la historia BQ viaja autocontenida en la extracción a
 * Wave), MERGEa por `rank_snapshot_id` y respeta el contrato ISSUE-082: timestamps como
 * STRING + cast en SQL, nunca tipos temporales en params.
 */

vi.mock('server-only', () => ({}))

const state = {
  rows: [] as Array<Record<string, unknown>>,
  pgSql: ''
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string) => {
    state.pgSql = sql

    return state.rows
  }
}))

const bqQueryMock = vi.fn()

vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: () => ({ query: bqQueryMock }),
  getBigQueryProjectId: () => 'efeonce-group'
}))

import { mirrorRankSnapshotsToBq } from '../rank-history-bq-mirror'

const row = (overrides: Partial<Record<string, unknown>> = {}) => ({
  rank_snapshot_id: 'seors-1',
  seo_target_id: 'seot-1',
  organization_id: 'org-1',
  keyword: 'pintura para techos',
  engine: 'google',
  device: 'desktop',
  capture_date: '2026-08-06',
  position: 3,
  url: 'https://berel.cl/techos',
  serp_features: '["ai_overview"]',
  estimated_traffic: null,
  provider_cost: '0.0080',
  source_run_id: 'seorun-1',
  captured_at: '2026-08-06T08:00:00.000000Z',
  ...overrides
})

beforeEach(() => {
  state.rows = [row()]
  state.pgSql = ''
  bqQueryMock.mockReset().mockResolvedValue([[]])
})

describe('mirrorRankSnapshotsToBq', () => {
  it('re-lee PG con JOIN al target y MERGEa cada fila por rank_snapshot_id', async () => {
    state.rows = [row(), row({ rank_snapshot_id: 'seors-2', keyword: 'impermeabilizante' })]

    const result = await mirrorRankSnapshotsToBq('seot-1', '2026-08-06')

    expect(state.pgSql).toContain('JOIN greenhouse_growth.seo_targets')
    expect(bqQueryMock).toHaveBeenCalledTimes(2)
    expect(result.rowsMirrored).toBe(2)

    const call = bqQueryMock.mock.calls[0][0] as { query: string; params: Record<string, unknown>; types: Record<string, string> }

    expect(call.query).toContain('MERGE `efeonce-group.greenhouse_growth_analytics.seo_rank_history` T')
    expect(call.query).toContain('ON T.rank_snapshot_id = S.rank_snapshot_id')
    expect(call.query).toContain('WHEN NOT MATCHED THEN INSERT')
  })

  it('ISSUE-082: timestamps/fechas viajan como STRING y se castean en SQL', async () => {
    await mirrorRankSnapshotsToBq('seot-1', '2026-08-06')

    const call = bqQueryMock.mock.calls[0][0] as { query: string; params: Record<string, unknown>; types: Record<string, string> }

    expect(call.types.captured_at).toBe('STRING')
    expect(call.types.capture_date).toBe('STRING')
    expect(call.query).toContain('TIMESTAMP(@captured_at)')
    expect(call.query).toContain('CAST(@capture_date AS DATE)')
    expect(call.query).toContain('CAST(@provider_cost AS NUMERIC)')
  })

  it('nullables (position/url/estimated_traffic/source_run_id) van como NULL tipado en SQL, no como param null', async () => {
    state.rows = [row({ position: null, url: null, estimated_traffic: null, source_run_id: null })]

    await mirrorRankSnapshotsToBq('seot-1', '2026-08-06')

    const call = bqQueryMock.mock.calls[0][0] as { query: string; params: Record<string, unknown> }

    expect(call.query).toContain('CAST(NULL AS INT64) AS position')
    expect(call.query).toContain('CAST(NULL AS STRING) AS url')
    expect(call.query).toContain('CAST(NULL AS NUMERIC) AS estimated_traffic')
    expect(call.params).not.toHaveProperty('position')
    expect(call.params).not.toHaveProperty('url')
  })

  it('0 filas en PG → 0 merges, resultado honesto', async () => {
    state.rows = []

    const result = await mirrorRankSnapshotsToBq('seot-1', '2026-08-06')

    expect(bqQueryMock).not.toHaveBeenCalled()
    expect(result.rowsMirrored).toBe(0)
  })
})
