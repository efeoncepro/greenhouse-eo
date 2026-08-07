import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1303 Slice 3 — `readRankEvolution`: selección de fuente por ventana (PG ≤180d /
 * BQ para rango largo), shape `{ series: [{ keyword, points }] }`, filtros, degradación
 * honesta (`no_data` en vez de series fantasma) y date-math canónico (sin EXTRACT EPOCH).
 */

vi.mock('server-only', () => ({}))

const state = {
  target: { seo_target_id: 'seot-1', organization_id: 'org-1' } as Record<string, unknown> | null,
  pgRows: [] as Array<Record<string, unknown>>,
  pgSql: '',
  pgParams: [] as unknown[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.target ? [state.target] : []
    }

    state.pgSql = sql
    state.pgParams = params

    return state.pgRows
  }
}))

const bqQueryMock = vi.fn()

vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: () => ({ query: bqQueryMock }),
  getBigQueryProjectId: () => 'efeonce-group'
}))

vi.mock('../flags', () => ({
  isSeoModuleEnabled: () => true
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { RANK_EVOLUTION_HOT_WINDOW_DAYS, readRankEvolution } from '../rank-evolution-reader'

const pgRow = (keyword: string, date: string, position: number | null, url: string | null = null) => ({
  keyword,
  date,
  position,
  url
})

// TASK-1307 — el flag AIO viaja en la fila PG como `ai_overview` (serp_features ? 'ai_overview').
const pgRowWithAio = (keyword: string, date: string, position: number | null) => ({
  ...pgRow(keyword, date, position),
  ai_overview: true
})

beforeEach(() => {
  state.target = { seo_target_id: 'seot-1', organization_id: 'org-1' }
  state.pgRows = [
    pgRow('impermeabilizante', '2026-08-05', 8, 'https://berel.cl/imp'),
    pgRow('impermeabilizante', '2026-08-06', 7, 'https://berel.cl/imp'),
    pgRow('pintura para techos', '2026-08-06', 3, 'https://berel.cl/techos')
  ]
  state.pgSql = ''
  state.pgParams = []
  bqQueryMock.mockReset().mockResolvedValue([[]])
})

describe('readRankEvolution — fuente por ventana', () => {
  it('rango dentro de la ventana caliente → PG, sin tocar BQ', async () => {
    const result = await readRankEvolution('seot-1', { rangeDays: 90 })

    if (!result.ok) throw new Error('esperaba ok:true')

    expect(result.source).toBe('postgres')
    expect(result.range.days).toBe(90)
    expect(bqQueryMock).not.toHaveBeenCalled()

    expect(result.series).toHaveLength(2)
    expect(result.series[0]).toEqual({
      keyword: 'impermeabilizante',
      points: [
        { date: '2026-08-05', position: 8, url: 'https://berel.cl/imp' },
        { date: '2026-08-06', position: 7, url: 'https://berel.cl/imp' }
      ]
    })
  })

  it('rango largo → BigQuery seo_rank_history', async () => {
    bqQueryMock.mockResolvedValue([
      [
        { keyword: 'impermeabilizante', date: '2025-01-15', position: 12, url: 'https://berel.cl/imp' }
      ]
    ])

    const result = await readRankEvolution('seot-1', { rangeDays: RANK_EVOLUTION_HOT_WINDOW_DAYS + 1 })

    if (!result.ok) throw new Error('esperaba ok:true')

    expect(result.source).toBe('bigquery')
    expect(bqQueryMock).toHaveBeenCalledTimes(1)

    const call = bqQueryMock.mock.calls[0][0] as { query: string }

    expect(call.query).toContain('greenhouse_growth_analytics.seo_rank_history')
  })

  it('date-math canónico en PG: CURRENT_DATE - int, jamás EXTRACT(EPOCH ...)', async () => {
    await readRankEvolution('seot-1', { rangeDays: 30 })

    expect(state.pgSql).toContain('capture_date >= CURRENT_DATE - ($4::int - 1)')
    expect(state.pgSql).not.toContain('EXTRACT')
  })

  it('aiOverview sólo viaja cuando el SERP lo mostró (aditivo, nunca false explícito)', async () => {
    state.pgRows = [pgRowWithAio('impermeabilizante', '2026-08-06', 7), pgRow('pintura para techos', '2026-08-06', 3)]

    const result = await readRankEvolution('seot-1', { rangeDays: 90 })

    if (!result.ok) throw new Error('esperaba ok:true')

    expect(result.series[0].points[0]).toEqual({
      date: '2026-08-06',
      position: 7,
      url: null,
      aiOverview: true
    })
    // Sin AIO el campo NO existe: igualdad estructural intacta para consumers legacy.
    expect(result.series[1].points[0]).toEqual({ date: '2026-08-06', position: 3, url: null })
  })
})

describe('readRankEvolution — filtros y degradación', () => {
  it('filtro de keywords viaja al SQL (ANY) y engine/device parametrizan', async () => {
    await readRankEvolution('seot-1', { keywords: ['impermeabilizante'], engine: 'google', device: 'mobile' })

    expect(state.pgSql).toContain('keyword = ANY($5)')
    expect(state.pgParams[1]).toBe('google')
    expect(state.pgParams[2]).toBe('mobile')
    expect(state.pgParams[4]).toEqual(['impermeabilizante'])
  })

  it('serie vacía → no_data honesto (no un éxito con series fantasma)', async () => {
    state.pgRows = []

    expect(await readRankEvolution('seot-1')).toEqual({ ok: false, errorCode: 'no_data', status: null })
  })

  it('target inexistente → target_not_found', async () => {
    state.target = null

    expect(await readRankEvolution('seot-x')).toEqual({ ok: false, errorCode: 'target_not_found', status: null })
  })

  it('fallo de la fuente → query_failed observado, nunca throw al consumer', async () => {
    bqQueryMock.mockRejectedValue(new Error('bq down'))

    const result = await readRankEvolution('seot-1', { rangeDays: 400 })

    expect(result).toEqual({ ok: false, errorCode: 'query_failed', status: null })
  })
})
