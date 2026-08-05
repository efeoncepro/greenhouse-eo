import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1302 Slice 2 — materializeGscDailySnapshot.
 *
 * Cubre los dos invariantes duros: honest degradation (reader degradado ⇒ CERO
 * escrituras) y sin truncamiento silencioso (pagina hasta agotar; si topa el techo lo
 * declara). Más idempotencia del UPSERT y descarte de filas sin medición real.
 */

vi.mock('server-only', () => ({}))

interface ReaderCall {
  startRow?: number
  rowLimit?: number
  dimensions?: string[]
}

const state = {
  readerCalls: [] as ReaderCall[],
  // Cola de respuestas del reader, una por página.
  readerResponses: [] as Array<
    | { ok: true; siteUrl: string; rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> }
    | { ok: false; errorCode: string; status: string | null }
  >,
  upsertedRows: [] as Array<{ queries: string[]; pages: string[] }>
}

vi.mock('@/lib/growth/search-console', () => ({
  readSearchConsoleAnalytics: async (_orgId: string, params: ReaderCall) => {
    state.readerCalls.push({ startRow: params.startRow, rowLimit: params.rowLimit, dimensions: params.dimensions })

    return state.readerResponses.shift() ?? { ok: true, siteUrl: 'sc-domain:x.com', rows: [] }
  }
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (_sql: string, params?: unknown[]) => {
    if (params && Array.isArray(params[3])) {
      state.upsertedRows.push({ queries: params[3] as string[], pages: params[4] as string[] })
    }

    return []
  }
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: () => undefined }))

import { materializeGscDailySnapshot } from '../gsc-daily-materializer'

const row = (query: string, page = 'https://x.com/a', position = 12.5) => ({
  keys: [query, page],
  clicks: 1,
  impressions: 10,
  ctr: 0.1,
  position
})

beforeEach(() => {
  state.readerCalls = []
  state.readerResponses = []
  state.upsertedRows = []
})

describe('materializeGscDailySnapshot — honest degradation', () => {
  it('no escribe NINGUNA fila cuando el reader degrada por falta de conexión', async () => {
    state.readerResponses = [{ ok: false, errorCode: 'not_connected', status: null }]

    const result = await materializeGscDailySnapshot('org-1', '2026-08-04')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errorCode).toBe('not_connected')

    // El invariante que importa: cero escrituras. Un día sin conexión NO puede
    // parecerse a un día con cero tráfico.
    expect(state.upsertedRows).toHaveLength(0)
  })

  it('propaga token_unhealthy sin escribir', async () => {
    state.readerResponses = [{ ok: false, errorCode: 'token_unhealthy', status: 'revoked' }]

    const result = await materializeGscDailySnapshot('org-1', '2026-08-04')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.errorCode).toBe('token_unhealthy')
      expect(result.status).toBe('revoked')
    }

    expect(state.upsertedRows).toHaveLength(0)
  })
})

describe('materializeGscDailySnapshot — paginación', () => {
  it('pagina hasta que Google devuelve una página incompleta', async () => {
    state.readerResponses = [
      { ok: true, siteUrl: 'sc-domain:x.com', rows: [row('a'), row('b')] },
      { ok: true, siteUrl: 'sc-domain:x.com', rows: [row('c')] }
    ]

    const result = await materializeGscDailySnapshot('org-1', '2026-08-04', { rowsPerPage: 2 })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.pagesFetched).toBe(2)
      expect(result.rowsWritten).toBe(3)
      expect(result.truncated).toBe(false)
    }

    // Segunda llamada con el offset correcto — sin esto Google repetiría la página 1.
    expect(state.readerCalls[0]?.startRow).toBe(0)
    expect(state.readerCalls[1]?.startRow).toBe(2)
  })

  it('pide query×page, que es el grano de la serie', async () => {
    state.readerResponses = [{ ok: true, siteUrl: 'sc-domain:x.com', rows: [] }]

    await materializeGscDailySnapshot('org-1', '2026-08-04')

    expect(state.readerCalls[0]?.dimensions).toEqual(['query', 'page'])
  })

  it('declara truncated al topar el techo de páginas en vez de fingir un día completo', async () => {
    state.readerResponses = [
      { ok: true, siteUrl: 'sc-domain:x.com', rows: [row('a'), row('b')] },
      { ok: true, siteUrl: 'sc-domain:x.com', rows: [row('c'), row('d')] }
    ]

    const result = await materializeGscDailySnapshot('org-1', '2026-08-04', { rowsPerPage: 2, maxPages: 2 })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.truncated).toBe(true)
      expect(result.pagesFetched).toBe(2)
    }
  })

  it('conserva lo ya escrito y marca truncated si una página posterior degrada', async () => {
    state.readerResponses = [
      { ok: true, siteUrl: 'sc-domain:x.com', rows: [row('a'), row('b')] },
      { ok: false, errorCode: 'query_failed', status: 'active' }
    ]

    const result = await materializeGscDailySnapshot('org-1', '2026-08-04', { rowsPerPage: 2 })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.rowsWritten).toBe(2)
      expect(result.truncated).toBe(true)
    }
  })
})

describe('materializeGscDailySnapshot — calidad de fila', () => {
  it('descarta filas sin medición real (position 0) sin romper el batch', async () => {
    state.readerResponses = [
      {
        ok: true,
        siteUrl: 'sc-domain:x.com',
        rows: [row('buena'), { keys: ['mala', 'https://x.com/b'], clicks: 0, impressions: 0, ctr: 0, position: 0 }]
      }
    ]

    const result = await materializeGscDailySnapshot('org-1', '2026-08-04')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.rowsWritten).toBe(1)
    expect(state.upsertedRows[0]?.queries).toEqual(['buena'])
  })

  it('un día sin tráfico es ok con 0 filas, NO un error', async () => {
    // La distinción load-bearing de toda la serie: "GSC respondió y no hubo tráfico"
    // y "la consulta falló" son hechos distintos. Colapsarlos haría indistinguible un
    // día flojo de un día roto, que es justo lo que esta task existe para evitar.
    state.readerResponses = [{ ok: true, siteUrl: 'sc-domain:x.com', rows: [] }]

    const result = await materializeGscDailySnapshot('org-1', '2026-08-04')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.rowsWritten).toBe(0)
      expect(result.truncated).toBe(false)
    }

    expect(state.upsertedRows).toHaveLength(0)
  })
})
