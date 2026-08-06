import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1303 Slice 4 — signal `seo.rank.capture_lag`: severity matrix (ok ≤1d /
 * warning 2–3d o sin captura inicial / error ≥4d), scope solo targets con assignment
 * `seo_v1` vigente, date-math canónico y degradación `unknown` observada en fallo.
 */

vi.mock('server-only', () => ({}))

const state = {
  rows: [] as Array<{ seo_target_id: string; lag_days: number | null }>,
  sql: '',
  fail: false
}

vi.mock('@/lib/db', () => ({
  query: async (sql: string) => {
    state.sql = sql

    if (state.fail) throw new Error('pg down')

    return state.rows
  }
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { SEO_RANK_CAPTURE_LAG_SIGNAL_ID, getSeoRankCaptureLagSignal } from '../seo-rank-capture-lag'

beforeEach(() => {
  state.rows = []
  state.sql = ''
  state.fail = false
})

describe('getSeoRankCaptureLagSignal', () => {
  it('steady: todos los targets capturados hoy/ayer → ok', async () => {
    state.rows = [
      { seo_target_id: 'seot-1', lag_days: 0 },
      { seo_target_id: 'seot-2', lag_days: 1 }
    ]

    const signal = await getSeoRankCaptureLagSignal()

    expect(signal.signalId).toBe(SEO_RANK_CAPTURE_LAG_SIGNAL_ID)
    expect(signal.moduleKey).toBe('growth')
    expect(signal.severity).toBe('ok')
  })

  it('lag 2–3 días o target sin captura inicial → warning', async () => {
    state.rows = [
      { seo_target_id: 'seot-1', lag_days: 2 },
      { seo_target_id: 'seot-2', lag_days: null }
    ]

    const signal = await getSeoRankCaptureLagSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('hueco irrecuperable')
  })

  it('lag >= 4 días → error', async () => {
    state.rows = [{ seo_target_id: 'seot-1', lag_days: 4 }]

    expect((await getSeoRankCaptureLagSignal()).severity).toBe('error')
  })

  it('sin targets elegibles → ok con summary honesto (no hay serie que capturar)', async () => {
    const signal = await getSeoRankCaptureLagSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('Sin targets SEO elegibles')
  })

  it('SQL: scope por assignment seo_v1 vigente + date-math canónico (sin EXTRACT EPOCH)', async () => {
    await getSeoRankCaptureLagSignal()

    expect(state.sql).toContain("ma.module_key = 'seo_v1'")
    expect(state.sql).toContain('(CURRENT_DATE - MAX(s.capture_date))::int')
    expect(state.sql).not.toContain('EXTRACT')
  })

  it('fallo de la query → severity unknown observado, nunca throw', async () => {
    state.fail = true

    const signal = await getSeoRankCaptureLagSignal()

    expect(signal.severity).toBe('unknown')
  })
})
