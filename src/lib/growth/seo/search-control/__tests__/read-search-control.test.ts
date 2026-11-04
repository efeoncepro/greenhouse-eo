import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ read: vi.fn(), connection: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('../../../search-console/reader', () => ({ readSearchConsoleAnalytics: mocks.read }))
vi.mock('../../../search-console/connection-store', () => ({ getSearchConsoleConnection: mocks.connection }))

import { rankSearchControlPageMovers, readSeoSearchControlForWindow } from '../read-search-control'

const SITE = 'sc-domain:berel.com'
const row = (keys: string[], clicks: number, impressions = clicks * 50, position = 7.4) => ({ keys, clicks, impressions, ctr: clicks / impressions, position })
const ok = (rows: ReturnType<typeof row>[]) => ({ ok: true, siteUrl: SITE, rows })
const window = { from: '2026-10-01', toExclusive: '2026-11-01' }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.connection.mockResolvedValue({ status: 'active', siteUrl: SITE })
})

describe('readSeoSearchControlForWindow (ISSUE-191)', () => {
  it('pide totales, serie y páginas SIN la dimensión consulta, con byPage y datos finales', async () => {
    mocks.read
      .mockResolvedValueOnce(ok([row([], 4094, 241113)]))
      .mockResolvedValueOnce(ok([row(['2026-10-02'], 100), row(['2026-10-01'], 90)]))
      .mockResolvedValueOnce(ok([row(['https://berel.com/articulos/a'], 4094)]))
    const result = await readSeoSearchControlForWindow('org', window, { scope: { rules: [{ kind: 'prefix', path: '/articulos' }] } })

    expect(result).toMatchObject({ ok: true, totals: { clicks: 4094, impressions: 241113 }, coveredDays: 2, servedFrom: '2026-10-01', servedTo: '2026-10-03' })
    if (!result.ok) throw new Error('unreachable')
    expect(result.totals.ctr).toBeCloseTo(4094 / 241113)

    for (const call of mocks.read.mock.calls) {
      const params = call[1]

      expect(params.dimensions).not.toContain('query')
      expect(params).toMatchObject({ type: 'web', dataState: 'final', aggregationType: 'byPage', range: { startDate: '2026-10-01', endDate: '2026-10-31' } })
    }

    expect(mocks.read.mock.calls.map(call => call[1].dimensions)).toEqual([[], ['date'], ['page']])
  })

  it('sin conexión activa es not_connected y no consulta a Google', async () => {
    mocks.connection.mockResolvedValue(null)
    expect(await readSeoSearchControlForWindow('org', window)).toEqual({ ok: false, errorCode: 'not_connected' })
    expect(mocks.read).not.toHaveBeenCalled()
  })

  it('propaga el error del reader (nunca devuelve ceros)', async () => {
    mocks.read.mockResolvedValue({ ok: false, errorCode: 'token_unhealthy', status: 'revoked' })
    expect(await readSeoSearchControlForWindow('org', window)).toEqual({ ok: false, errorCode: 'token_unhealthy' })
  })

  it('una página fuera del alcance pedido es un error visible', async () => {
    mocks.read
      .mockResolvedValueOnce(ok([row([], 10)]))
      .mockResolvedValueOnce(ok([row(['2026-10-01'], 10)]))
      .mockResolvedValueOnce(ok([row(['https://berel.com/productos/x'], 10)]))
    expect(await readSeoSearchControlForWindow('org', window, { scope: { rules: [{ kind: 'prefix', path: '/articulos' }] } })).toEqual({ ok: false, errorCode: 'page_outside_content_scope' })
  })

  it('sin datos en la ventana: coveredDays 0 y totales en cero medido por Google, no inventados', async () => {
    mocks.read.mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok([]))
    expect(await readSeoSearchControlForWindow('org', window)).toMatchObject({ ok: true, coveredDays: 0, servedFrom: null, totals: { clicks: 0, ctr: null, position: null } })
  })
})

describe('rankSearchControlPageMovers', () => {
  it('ordena por cambio absoluto, incluye páginas nuevas y desaparecidas, y desempata por ruta', () => {
    const movers = rankSearchControlPageMovers(
      [{ page: '/a', clicks: 138, impressions: 1 }, { page: '/b', clicks: 10, impressions: 1 }, { page: '/c', clicks: 50, impressions: 1 }, { page: '/d', clicks: 7, impressions: 1 }],
      [{ page: '/b', clicks: 10, impressions: 1 }, { page: '/x', clicks: 82, impressions: 1 }, { page: '/c', clicks: 0, impressions: 1 }, { page: '/d', clicks: 2, impressions: 1 }, { page: '/e', clicks: 5, impressions: 1 }],
      4
    )

    expect(movers).toEqual([
      { key: '/a', clicks: 138, previousClicks: 0 },
      { key: '/x', clicks: 0, previousClicks: 82 },
      { key: '/c', clicks: 50, previousClicks: 0 },
      { key: '/d', clicks: 7, previousClicks: 2 }
    ])
  })
})
