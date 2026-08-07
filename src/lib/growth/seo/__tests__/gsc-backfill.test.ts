import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1655 — `backfillGscHistory`: resumibilidad (salta días ya en BQ), honest
 * degradation (día que degrada se reporta y NO se escribe) y distinción empty vs failed.
 */

vi.mock('server-only', () => ({}))

const state = {
  existingDates: new Set<string>(),
  daysByDate: new Map<string, Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>>(),
  failDates: new Set<string>(),
  merged: [] as Array<{ captureDate: string; rows: number }>
}

vi.mock('@/lib/growth/search-console', () => ({
  readSearchConsoleAnalytics: async (_org: string, options: { range: { startDate: string } }) => {
    const date = options.range.startDate

    if (state.failDates.has(date)) {
      return { ok: false, errorCode: 'token_unhealthy', status: 'active' }
    }

    return { ok: true, siteUrl: 'sc-domain:berel.com', rows: state.daysByDate.get(date) ?? [] }
  }
}))

vi.mock('../gsc-history-bq-mirror', () => ({
  listGscHistoryDates: async () => state.existingDates,
  mergeGscHistoryRowsToBq: async (input: { captureDate: string; rows: unknown[] }) => {
    state.merged.push({ captureDate: input.captureDate, rows: input.rows.length })

    return input.rows.length
  }
}))

vi.mock('../flags', () => ({ isSeoModuleEnabled: () => true }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { backfillGscHistory } from '../gsc-backfill'

const gscApiRow = (query: string, page: string, position: number) => ({
  keys: [query, page],
  clicks: 3,
  impressions: 100,
  ctr: 0.03,
  position
})

beforeEach(() => {
  state.existingDates = new Set()
  state.daysByDate = new Map()
  state.failDates = new Set()
  state.merged = []
})

describe('backfillGscHistory', () => {
  it('materializa los días con datos, salta los ya presentes y nombra los vacíos', async () => {
    state.existingDates = new Set(['2026-08-02'])
    state.daysByDate.set('2026-08-01', [gscApiRow('pintura', '/latex', 4)])
    // 2026-08-03 sin filas → empty (hecho, no error).

    const result = await backfillGscHistory('org-1', { fromDate: '2026-08-01', toDate: '2026-08-03' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.materialized).toBe(1)
    expect(result.skippedExisting).toBe(1)
    expect(result.empty).toBe(1)
    expect(result.rowsWritten).toBe(1)
    // El día ya presente NO se re-fetchea ni se re-escribe (resumibilidad).
    expect(state.merged.map(entry => entry.captureDate)).toEqual(['2026-08-01'])
  })

  it('un día que degrada se reporta con su errorCode y NO escribe nada', async () => {
    state.failDates = new Set(['2026-08-01'])
    state.daysByDate.set('2026-08-02', [gscApiRow('pintura', '/latex', 4)])

    const result = await backfillGscHistory('org-1', { fromDate: '2026-08-01', toDate: '2026-08-02' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.degraded).toBe(1)
    expect(result.materialized).toBe(1)
    expect(result.outcomes[0]).toMatchObject({ captureDate: '2026-08-01', status: 'degraded', errorCode: 'token_unhealthy' })
    // El día degradado no llegó a BQ: medio día escrito parecería un día con menos tráfico.
    expect(state.merged.map(entry => entry.captureDate)).toEqual(['2026-08-02'])
  })

  it('descarta filas con position 0 (normalización de nulos de GSC, no medición real)', async () => {
    state.daysByDate.set('2026-08-01', [gscApiRow('pintura', '/latex', 0), gscApiRow('esmalte', '/esmalte', 7)])

    const result = await backfillGscHistory('org-1', { fromDate: '2026-08-01', toDate: '2026-08-01' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.rowsWritten).toBe(1)
  })

  it('rechaza un rango invertido', async () => {
    const result = await backfillGscHistory('org-1', { fromDate: '2026-08-03', toDate: '2026-08-01' })

    expect(result).toEqual({ ok: false, errorCode: 'invalid_range' })
  })
})
