import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1777 — Drill-down nominal (parsers, fusión de movimiento y el pase que controla el
 * gasto). El SQL real se ejercita en `_sanity-task-1777-backlink-detail.ts` (gate 893).
 */

vi.mock('server-only', () => ({}))

interface SqlCall {
  sql: string
  params: unknown[]
}

const state = {
  passRows: [] as Array<Record<string, unknown>>,
  verdictInserts: [] as SqlCall[],
  txQueries: [] as SqlCall[],
  verdictConflict: false
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    if (sql.includes('INSERT INTO greenhouse_growth.seo_backlink_drilldowns')) {
      state.verdictInserts.push({ sql, params })

      return state.verdictConflict ? [] : [{ backlink_drilldown_id: 'seobdd-1' }]
    }

    if (sql.includes('FROM greenhouse_growth.seo_backlink_snapshots s')) {
      return state.passRows
    }

    return []
  },
  withGreenhousePostgresTransaction: async (callback: (client: unknown) => Promise<unknown>) => {
    const client = {
      query: async (sql: string, params: unknown[] = []) => {
        state.txQueries.push({ sql, params })

        if (sql.includes('seo_backlink_drilldowns')) {
          return { rows: state.verdictConflict ? [] : [{ backlink_drilldown_id: 'seobdd-1' }] }
        }

        return { rows: [] }
      }
    }

    return callback(client)
  }
}))

const gateMock = vi.fn()

vi.mock('../../entitlement', () => ({
  SEO_MODULE_KEY: 'seo_v2',
  SEO_MODULE_KEYS_READ: ['seo_v2'],
  enforceSeoRunEntitlement: (...args: unknown[]) => gateMock(...args)
}))

const providerMock = vi.fn()

vi.mock('@/lib/ai/dataforseo', () => ({
  postDataForSeoTask: (...args: unknown[]) => providerMock(...args)
}))

const flags = { module: true, detail: true }

vi.mock('../../flags', () => ({
  isSeoModuleEnabled: () => flags.module,
  isSeoBacklinkDetailEnabled: () => flags.detail
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const outboxMock = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => outboxMock(...args)
}))

vi.mock('../../rank-capture', () => ({
  resolveSantiagoCaptureDate: () => '2026-08-27'
}))

import {
  estimateDetailCost,
  mergeMovementIntoDomains,
  parseAnchorItems,
  parseMovementItems,
  parseReferringDomainItems,
  resolveDetailRowLimit,
  runBacklinkDetailPass
} from '../detail-capture'

const okTasks = (items: Array<Record<string, unknown>>) => [
  { status_code: 20000, result: [{ items }] }
]

const passRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  backlink_snapshot_id: 'seobs-1',
  seo_target_id: 'seot-1',
  organization_id: 'org-1',
  root_domain: 'cliente.cl',
  capture_date: '2026-08-27',
  referring_domains: 100,
  new_lost_delta: { newBacklinks: 20, lostBacklinks: 5, windowDays: 30 },
  previous_referring_domains: 100,
  has_prior_detail: true,
  ...overrides
})

const providerOk = (items: Array<Record<string, unknown>>, cost = 0.028) => ({
  ok: true,
  httpStatus: 200,
  cost,
  tasks: okTasks(items)
})

beforeEach(() => {
  state.passRows = []
  state.verdictInserts = []
  state.txQueries = []
  state.verdictConflict = false
  flags.module = true
  flags.detail = true
  gateMock.mockReset()
  gateMock.mockResolvedValue({ allowed: true, budgetRemainingUsd: 50, blockedReason: null })
  providerMock.mockReset()
  outboxMock.mockReset()
  delete process.env.GROWTH_SEO_BACKLINK_DETAIL_ROW_LIMIT
})

describe('parsers puros', () => {
  it('referring_domains: dominio en minúsculas, rank clampeado a 0-100, NULL != 0', () => {
    const rows = parseReferringDomainItems(
      okTasks([{ domain: 'Blog.Ejemplo.CL', rank: 340, backlinks: 12, backlinks_spam_score: 15 }])
    )

    expect(rows).toHaveLength(1)
    expect(rows?.[0].normalizedReferringDomain).toBe('blog.ejemplo.cl')
    // Defensivo: si llegara la escala 0-1000 pese al rank_scale pedido, se clampea — jamás
    // se persiste una cifra absurda mezclando escalas.
    expect(rows?.[0].rank).toBe(100)
    expect(rows?.[0].firstSeen).toBeNull()
  })

  it('anchors: hash sha256 estable + dedupe; el anchor vacío es un hecho y se conserva', () => {
    const rows = parseAnchorItems(okTasks([{ anchor: 'pintura berel', backlinks: 40 }, { anchor: 'pintura berel', backlinks: 40 }, { anchor: '' }]))

    expect(rows).toHaveLength(2)
    expect(rows?.[0].anchorTextHash).toHaveLength(64)
    expect(rows?.[1].anchor).toBe('')
  })

  it('task fallida (status != 20000) devuelve null, jamás lista vacía', () => {
    expect(parseReferringDomainItems([{ status_code: 40501, result: [] }])).toBeNull()
    expect(parseAnchorItems([{ status_code: 40501, result: [] }])).toBeNull()
    expect(parseMovementItems([{ status_code: 40501, result: [] }])).toBeNull()
  })
})

describe('mergeMovementIntoDomains — la regla de precedencia', () => {
  const present = parseReferringDomainItems(
    okTasks([{ domain: 'sigue.cl', rank: 50, backlinks: 5 }, { domain: 'gano-link.cl', rank: 40, backlinks: 3 }])
  ) as NonNullable<ReturnType<typeof parseReferringDomainItems>>

  const sample = (domain: string) => ({
    domain,
    urlFrom: `https://${domain}/post`,
    urlTo: 'https://cliente.cl/',
    anchor: 'cliente',
    dofollow: true,
    rank: 30,
    spamScore: 10,
    firstSeen: '2026-08-20 00:00:00 +00:00',
    lastSeen: '2026-08-25 00:00:00 +00:00'
  })

  it('new manda sobre present; lost sólo si el dominio YA NO está presente', () => {
    const merged = mergeMovementIntoDomains(present, [sample('gano-link.cl')], [sample('se-fue.cl'), sample('sigue.cl')])
    const byDomain = new Map(merged.map(row => [row.normalizedReferringDomain, row]))

    expect(byDomain.get('gano-link.cl')?.movement).toBe('new')
    expect(byDomain.get('gano-link.cl')?.sampleAnchor).toBe('cliente')
    expect(byDomain.get('se-fue.cl')?.movement).toBe('lost')
    expect(byDomain.get('se-fue.cl')?.lostDate).toBe('2026-08-25 00:00:00 +00:00')
    // Perdió UN enlace pero el dominio sigue: present, con la muestra del caído como contexto.
    expect(byDomain.get('sigue.cl')?.movement).toBe('present')
    expect(byDomain.get('sigue.cl')?.sampleUrlFrom).toContain('sigue.cl')
  })
})

describe('estimateDetailCost / resolveDetailRowLimit', () => {
  it('peor caso: 2 requests base + movimiento condicional', () => {
    expect(estimateDetailCost(100, 0)).toBeCloseTo(2 * 0.024 + 2 * 100 * 0.000036, 6)
    expect(estimateDetailCost(100, 2)).toBeCloseTo(4 * 0.024 + 4 * 100 * 0.000036, 6)
  })

  it('knob respetado y clampeado', () => {
    expect(resolveDetailRowLimit({} as NodeJS.ProcessEnv)).toBe(100)
    expect(resolveDetailRowLimit({ GROWTH_SEO_BACKLINK_DETAIL_ROW_LIMIT: '5000' } as unknown as NodeJS.ProcessEnv)).toBe(1000)
  })
})

describe('runBacklinkDetailPass — la política de gasto', () => {
  it('flag OFF: el pase no corre ni evalúa', async () => {
    flags.detail = false

    const result = await runBacklinkDetailPass()

    expect(result).toEqual({ skipped: 'disabled' })
  })

  it('sin movimiento: veredicto skipped_no_movement a costo CERO, sin tocar el proveedor', async () => {
    state.passRows = [passRow({ new_lost_delta: { newBacklinks: 1, lostBacklinks: 0 } })]

    const result = await runBacklinkDetailPass()

    expect('snapshots' in result && result.skipped).toBe(1)
    expect(providerMock).not.toHaveBeenCalled()
    expect(gateMock).not.toHaveBeenCalled()
    expect(state.verdictInserts).toHaveLength(1)
    expect(state.verdictInserts[0].params[1]).toBe('skipped_no_movement')
  })

  it('snapshot partial: veredicto skipped_partial, jamás gasto "por si acaso"', async () => {
    state.passRows = [passRow({ new_lost_delta: {}, has_prior_detail: false })]

    const result = await runBacklinkDetailPass()

    expect('snapshots' in result && result.skipped).toBe(1)
    expect(state.verdictInserts[0].params[1]).toBe('skipped_partial')
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('con movimiento: drill-down completo — 4 llamadas, filas en tx, outbox con motivo', async () => {
    state.passRows = [passRow()]
    providerMock
      .mockResolvedValueOnce(providerOk([{ domain: 'ref.cl', rank: 50, backlinks: 5 }]))
      .mockResolvedValueOnce(providerOk([{ anchor: 'cliente', backlinks: 40 }]))
      .mockResolvedValueOnce(providerOk([{ domain_from: 'nuevo.cl', url_from: 'https://nuevo.cl/x', anchor: 'cliente', dofollow: true, domain_from_rank: 30, is_new: true }]))
      .mockResolvedValueOnce(providerOk([{ domain_from: 'perdido.cl', url_from: 'https://perdido.cl/y', anchor: 'x', dofollow: false, domain_from_rank: 20, is_lost: true }]))

    const result = await runBacklinkDetailPass()

    expect('snapshots' in result && result.drilled).toBe(1)
    expect(providerMock).toHaveBeenCalledTimes(4)

    // Todas las llamadas con rank_scale one_hundred (mezclar escalas = cifras absurdas).
    for (const call of providerMock.mock.calls) {
      expect((call[0] as { tasks: Array<Record<string, unknown>> }).tasks[0].rank_scale).toBe('one_hundred')
    }

    // El de lost pide status_type all + filtro is_lost (filtrar es gratis; traer todo no).
    const lostCall = providerMock.mock.calls[3][0] as { tasks: Array<Record<string, unknown>> }

    expect(lostCall.tasks[0].backlinks_status_type).toBe('all')
    expect(lostCall.tasks[0].filters).toEqual(['is_lost', '=', true])

    // Veredicto + 3 dominios + 1 anchor dentro de la transacción.
    expect(state.txQueries.filter(query => query.sql.includes('seo_backlink_referring_domains'))).toHaveLength(3)
    expect(state.txQueries.filter(query => query.sql.includes('seo_backlink_anchors'))).toHaveLength(1)
    expect(outboxMock).toHaveBeenCalledTimes(1)

    const payload = (outboxMock.mock.calls[0][0] as { payload: { triggerReason: string } }).payload

    expect(payload.triggerReason).toBe('backlink_movement')
  })

  it('sólo movimiento new: NO se pide el endpoint de lost (la dirección la dicta el delta)', async () => {
    state.passRows = [passRow({ new_lost_delta: { newBacklinks: 20, lostBacklinks: 0 } })]
    providerMock
      .mockResolvedValueOnce(providerOk([{ domain: 'ref.cl', rank: 50 }]))
      .mockResolvedValueOnce(providerOk([{ anchor: 'cliente', backlinks: 40 }]))
      .mockResolvedValueOnce(providerOk([]))

    await runBacklinkDetailPass()

    expect(providerMock).toHaveBeenCalledTimes(3)
  })

  it('proveedor caído en referring_domains: veredicto failed, cero filas hijas', async () => {
    state.passRows = [passRow()]
    providerMock.mockResolvedValue({ ok: false, httpStatus: 502, cost: 0, tasks: [], breakerOpen: false })

    const result = await runBacklinkDetailPass()

    expect('snapshots' in result && result.failed).toBe(1)
    expect(state.verdictInserts.some(insert => insert.params[1] === 'failed')).toBe(true)
    expect(state.txQueries).toHaveLength(0)
    expect(outboxMock).not.toHaveBeenCalled()
  })

  it('gate bloqueado: NO se escribe veredicto (el snapshot puede reevaluarse al renovarse el mes)', async () => {
    state.passRows = [passRow()]
    gateMock.mockResolvedValue({ allowed: false, budgetRemainingUsd: 0, blockedReason: 'budget_exhausted' })

    const result = await runBacklinkDetailPass()

    expect('snapshots' in result && result.budgetBlocked).toBe(1)
    expect(state.verdictInserts).toHaveLength(0)
    expect(providerMock).not.toHaveBeenCalled()
  })
})
