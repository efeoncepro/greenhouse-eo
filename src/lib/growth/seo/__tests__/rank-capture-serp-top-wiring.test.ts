import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1699 Slice 3 — cableado del top-N al camino de captura, tras flag.
 *
 * Los tres contratos que esta suite afirma:
 * 1. Camino feliz: snapshot + top-N viajan en la MISMA transacción.
 * 2. 🔴 Un throw del writer del top-N NO aborta el batch NI impide el INSERT del
 *    snapshot — la medición YA PAGADA jamás se pierde por la fila de contexto.
 * 3. No-regresión de costo: `buildSerpTask` no cambió (mismo depth, mismo
 *    load_async_ai_overview, mismos campos) — el costo marginal del top-N es CERO.
 */

vi.mock('server-only', () => ({}))

interface QueryCall {
  sql: string
  params: unknown[]
}

const state = {
  topResultsEnabled: true,
  poolCalls: [] as QueryCall[],
  txCalls: [] as QueryCall[][],
  txCount: 0,
  persistCalls: [] as Array<Record<string, unknown>>,
  persistThrows: false,
  parsedRows: [
    { rankAbsolute: 1, rankGroup: 1, itemType: 'organic', resultDomain: 'rival.cl', resultUrl: 'https://rival.cl/', resultTitle: 'R', isOwnDomain: false }
  ] as Array<Record<string, unknown>>,
  providerTasks: [] as unknown[],
  captured: [] as unknown[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[]) => {
    state.poolCalls.push({ sql, params })

    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return [
        {
          seo_target_id: 'seot-1',
          organization_id: 'org-1',
          root_domain: 'cliente.cl',
          location_code: '2152',
          language_code: 'es',
          status: 'active'
        }
      ]
    }

    if (sql.includes('seo_keyword_set_members')) {
      return [{ keyword: 'pintura' }]
    }

    if (sql.includes('FROM greenhouse_growth.seo_rank_snapshots')) {
      return []
    }

    return []
  }
}))

vi.mock('@/lib/db', () => ({
  withTransaction: async (callback: (client: unknown) => Promise<unknown>) => {
    state.txCount += 1
    const calls: QueryCall[] = []

    state.txCalls.push(calls)

    return callback({
      query: async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params: params ?? [] })

        return { rows: [], rowCount: 1 }
      }
    })
  }
}))

vi.mock('@/lib/ai/dataforseo', () => ({
  DATAFORSEO_DEFAULT_ORGANIC_ENDPOINT: '/v3/serp/google/organic/live/advanced',
  postDataForSeoTask: async (input: { tasks: unknown[] }) => {
    state.providerTasks.push(...input.tasks)

    return {
      ok: true,
      httpStatus: 200,
      cost: 0.008,
      tasks: [{ result: [{ items: [{ type: 'organic', rank_group: 3, rank_absolute: 3, domain: 'cliente.cl', url: 'https://cliente.cl/x' }] }] }]
    }
  }
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: async () => undefined
}))

const capture = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => capture(...args)
}))

vi.mock('../entitlement', () => ({
  enforceSeoRunEntitlement: async () => ({ allowed: true, blockedReason: null })
}))

vi.mock('../flags', () => ({
  isSeoModuleEnabled: () => true,
  isSeoSerpTopResultsEnabled: () => state.topResultsEnabled
}))

vi.mock('../serp-top-results', () => ({
  parseSerpTopResults: () => state.parsedRows,
  persistSerpTopResults: async (_client: unknown, input: Record<string, unknown>) => {
    state.persistCalls.push(input)

    if (state.persistThrows) throw new Error('top_n_writer_boom')

    return { rowsWritten: (input.rows as unknown[]).length }
  }
}))

const { captureRankSnapshot } = await import('../rank-capture')

beforeEach(() => {
  state.topResultsEnabled = true
  state.poolCalls = []
  state.txCalls = []
  state.txCount = 0
  state.persistCalls = []
  state.persistThrows = false
  state.providerTasks = []
  capture.mockClear()
})

describe('cableado del top-N (TASK-1699)', () => {
  it('camino feliz: snapshot + top-N en la MISMA transacción, outcome captured', async () => {
    const result = await captureRankSnapshot('seot-1', 'cron')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.status).toBe('succeeded')

    expect(state.txCount).toBe(1)

    const txSql = state.txCalls[0].map(call => call.sql).join('\n')

    expect(txSql).toContain('INSERT INTO greenhouse_growth.seo_rank_snapshots')
    expect(state.persistCalls).toHaveLength(1)
    expect(state.persistCalls[0]).toMatchObject({ seoTargetId: 'seot-1', keyword: 'pintura' })

    // El snapshot NO se insertó por el pool: viajó dentro de la tx.
    expect(state.poolCalls.some(call => call.sql.includes('INSERT INTO greenhouse_growth.seo_rank_snapshots'))).toBe(false)
  })

  it('🔴 un throw del writer del top-N no aborta el batch ni pierde el snapshot pagado', async () => {
    state.persistThrows = true

    const result = await captureRankSnapshot('seot-1', 'cron')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // La keyword quedó capturada igual: la medición pagada nunca se pierde.
    expect(result.status).toBe('succeeded')
    expect(result.captured).toBe(1)

    // Fallback: el snapshot entró por el pool tras el rollback de la tx.
    expect(state.poolCalls.some(call => call.sql.includes('INSERT INTO greenhouse_growth.seo_rank_snapshots'))).toBe(true)

    // Y el fallo quedó observado con el source declarado.
    expect(capture).toHaveBeenCalledWith(
      expect.any(Error),
      'growth',
      expect.objectContaining({ tags: expect.objectContaining({ source: 'seo_serp_top_results' }) })
    )
  })

  it('flag OFF: cero transacciones, cero persist, snapshot directo como siempre', async () => {
    state.topResultsEnabled = false

    const result = await captureRankSnapshot('seot-1', 'cron')

    expect(result.ok).toBe(true)
    expect(state.txCount).toBe(0)
    expect(state.persistCalls).toHaveLength(0)
    expect(state.poolCalls.some(call => call.sql.includes('INSERT INTO greenhouse_growth.seo_rank_snapshots'))).toBe(true)
  })

  it('🔴 no-regresión de costo: buildSerpTask no cambió (mismo depth, mismos flags, mismos campos)', async () => {
    await captureRankSnapshot('seot-1', 'cron')

    expect(state.providerTasks).toHaveLength(1)
    // Igualdad EXACTA del task: un campo nuevo o un multiplicador distinto rompe acá.
    expect(state.providerTasks[0]).toEqual({
      keyword: 'pintura',
      language_code: 'es',
      device: 'desktop',
      depth: 20,
      load_async_ai_overview: true,
      location_code: 2152
    })
  })
})
