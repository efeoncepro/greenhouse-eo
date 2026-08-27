import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1775 — Foto de dominio (colector mensual).
 *
 * Cubre lo que decide si esta task gasta bien o mal: la normalización del sujeto, el costo
 * determinista que alimenta preview y gate, el parser del proveedor (`null` != `0`), el
 * pre-check de FRESCURA (un sujeto fresco no se re-compra; una fila de screening NO cuenta
 * como foto fresca) y el contrato "sujeto desconocido deja fila con NULLs".
 *
 * El SQL real se ejercita contra PG en `scripts/growth/_sanity-task-1775-domain-overview.ts`
 * (gate TASK-893: los mocks ejercitan el TS, no el SQL).
 */

vi.mock('server-only', () => ({}))

interface SqlCall {
  sql: string
  params: unknown[]
}

const state = {
  target: {
    seo_target_id: 'seot-1',
    organization_id: 'org-1',
    root_domain: 'cliente.cl',
    location_code: '2152',
    language_code: 'es'
  } as Record<string, unknown> | null,
  competitors: [] as Array<{ competitor_domain: string }>,
  freshDomains: [] as Array<{ normalized_domain: string }>,
  freshQueries: [] as SqlCall[],
  inserts: [] as SqlCall[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.target ? [state.target] : []
    }

    if (sql.includes('FROM greenhouse_growth.seo_competitors')) {
      return state.competitors
    }

    if (sql.includes('INSERT INTO greenhouse_growth.seo_domain_overview_snapshots')) {
      state.inserts.push({ sql, params })

      return []
    }

    if (sql.includes('FROM greenhouse_growth.seo_domain_overview_snapshots')) {
      state.freshQueries.push({ sql, params })

      return state.freshDomains
    }

    return []
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

const flags = { module: true, domainOverview: true }

vi.mock('../../flags', () => ({
  isSeoModuleEnabled: () => flags.module,
  isSeoDomainOverviewEnabled: () => flags.domainOverview
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const outboxMock = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => outboxMock(...args)
}))

import {
  captureDomainOverview,
  estimateDomainOverviewCost,
  parseDomainOverviewSide,
  parseDomainRankOverviewItem,
  previewDomainOverviewCapture
} from '../capture'
import { buildNullSnapshot, normalizeOverviewDomain } from '../persist'

const providerOkResponse = (item: Record<string, unknown> | null, cost = 0.0121) => ({
  ok: true,
  httpStatus: 200,
  cost,
  tasks: [
    {
      status_code: 20000,
      result: [{ items: item ? [item] : [] }]
    }
  ]
})

const sampleItem = {
  se_type: 'google',
  location_code: 2152,
  language_code: 'es',
  metrics: {
    organic: {
      pos_1: 12,
      pos_2_3: 44,
      pos_4_10: 310,
      count: 4120,
      etv: 8210.44,
      estimated_paid_traffic_cost: 15300.2,
      is_new: 30,
      is_up: 120,
      is_down: 80,
      is_lost: 12
    },
    paid: { count: 3, etv: 12.5, estimated_paid_traffic_cost: 40.1 }
  }
}

beforeEach(() => {
  state.target = {
    seo_target_id: 'seot-1',
    organization_id: 'org-1',
    root_domain: 'cliente.cl',
    location_code: '2152',
    language_code: 'es'
  }
  state.competitors = []
  state.freshDomains = []
  state.freshQueries = []
  state.inserts = []
  flags.module = true
  flags.domainOverview = true
  gateMock.mockReset()
  gateMock.mockResolvedValue({ allowed: true, budgetRemainingUsd: 50, blockedReason: null })
  providerMock.mockReset()
  outboxMock.mockReset()
})

describe('normalizeOverviewDomain', () => {
  it('quita esquema, path y www., y baja a lowercase', () => {
    expect(normalizeOverviewDomain('https://www.Competidor.CL/productos')).toBe('competidor.cl')
    expect(normalizeOverviewDomain('sub.dominio.mx')).toBe('sub.dominio.mx')
  })
})

describe('estimateDomainOverviewCost', () => {
  it('un request por sujeto, una fila por request', () => {
    const { providerCalls, estimatedCostUsd } = estimateDomainOverviewCost(3)

    expect(providerCalls).toBe(3)
    expect(estimatedCostUsd).toBeCloseTo(3 * 0.01212, 6)
  })
})

describe('parseDomainOverviewSide / parseDomainRankOverviewItem', () => {
  it('proyecta campos ausentes como null, NUNCA como 0', () => {
    const side = parseDomainOverviewSide({ count: 10 })

    expect(side.count).toBe(10)
    expect(side.etv).toBeNull()
    expect(side.positions.pos1).toBeNull()
    expect(side.isLost).toBeNull()
  })

  it('proyecta el item completo con ambos lados y la identidad del sujeto', () => {
    const snapshot = parseDomainRankOverviewItem(sampleItem, {
      domain: 'Competidor.cl',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(snapshot.normalizedDomain).toBe('competidor.cl')
    expect(snapshot.sourceEndpoint).toBe('domain_rank_overview')
    expect(snapshot.organic.count).toBe(4120)
    expect(snapshot.organic.etv).toBeCloseTo(8210.44)
    expect(snapshot.organic.positions.pos4_10).toBe(310)
    expect(snapshot.paid.count).toBe(3)
  })

  it('un valor negativo del proveedor se proyecta como null (defensivo)', () => {
    const side = parseDomainOverviewSide({ count: -5, etv: -1 })

    expect(side.count).toBeNull()
    expect(side.etv).toBeNull()
  })
})

describe('buildNullSnapshot', () => {
  it('todas las métricas NULL: el hecho "preguntamos y no hay dato"', () => {
    const snapshot = buildNullSnapshot({
      domain: 'desconocido.cl',
      locationCode: '2152',
      languageCode: 'es',
      captureDate: null,
      sourceEndpoint: 'domain_rank_overview'
    })

    expect(snapshot.organic.count).toBeNull()
    expect(snapshot.organic.etv).toBeNull()
    expect(snapshot.paid.etv).toBeNull()
  })
})

describe('previewDomainOverviewCapture', () => {
  it('reporta sujetos, frescos y pendientes sin llamar al proveedor', async () => {
    state.competitors = [{ competitor_domain: 'competidor.cl' }, { competitor_domain: 'otro.cl' }]
    state.freshDomains = [{ normalized_domain: 'competidor.cl' }]

    const preview = await previewDomainOverviewCapture('seot-1')

    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.subjects).toBe(3)
    expect(preview.fresh).toBe(1)
    expect(preview.pendingSubjects).toBe(2)
    expect(preview.estimatedCostUsd).toBeCloseTo(2 * 0.01212, 6)
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('flag OFF devuelve disabled', async () => {
    flags.domainOverview = false

    const preview = await previewDomainOverviewCapture('seot-1')

    expect(preview).toEqual({ ok: false, errorCode: 'disabled', status: null })
  })
})

describe('captureDomainOverview', () => {
  it('captura target + competidores y escribe una fila por sujeto', async () => {
    state.competitors = [{ competitor_domain: 'competidor.cl' }]
    providerMock.mockResolvedValue(providerOkResponse(sampleItem))

    const result = await captureDomainOverview('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.subjects).toBe(2)
    expect(result.captured).toBe(2)
    expect(providerMock).toHaveBeenCalledTimes(2)
    expect(state.inserts).toHaveLength(2)
    expect(outboxMock).toHaveBeenCalledTimes(1)
  })

  it('la frescura de la foto exige domain_rank_overview: el pre-check filtra por endpoint', async () => {
    providerMock.mockResolvedValue(providerOkResponse(sampleItem))

    await captureDomainOverview('seot-1')

    expect(state.freshQueries).toHaveLength(1)
    const params = state.freshQueries[0].params

    // $4 es la lista de source endpoints que cuentan como "foto fresca".
    expect(params[3]).toEqual(['domain_rank_overview'])
  })

  it('sujeto fresco se reporta fresh y NO pega el proveedor (segunda corrida = USD 0)', async () => {
    state.freshDomains = [{ normalized_domain: 'cliente.cl' }]

    const result = await captureDomainOverview('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fresh).toBe(1)
    expect(result.captured).toBe(0)
    expect(result.costUsd).toBe(0)
    expect(providerMock).not.toHaveBeenCalled()
    expect(gateMock).not.toHaveBeenCalled()
    expect(result.outcomes[0].status).toBe('fresh')
  })

  it('sujeto que el proveedor no conoce deja fila con NULLs (no se re-compra el ciclo)', async () => {
    providerMock.mockResolvedValue(providerOkResponse(null))

    const result = await captureDomainOverview('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.noMarketData).toBe(1)
    expect(state.inserts).toHaveLength(1)

    // organic_count es $19 (índice 18); NULL, jamás 0.
    expect(state.inserts[0].params[18]).toBeNull()
    expect(state.inserts[0].params[19]).toBeNull()
  })

  it('proveedor caído NO escribe fila (sin veredicto no hay hecho) y degrada honesto', async () => {
    providerMock.mockResolvedValue({ ok: false, httpStatus: 502, cost: 0, tasks: [] })

    const result = await captureDomainOverview('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.providerErrors).toBe(1)
    expect(state.inserts).toHaveLength(0)
    expect(outboxMock).not.toHaveBeenCalled()
  })

  it('gate bloqueado devuelve el blockedReason mapeado', async () => {
    gateMock.mockResolvedValue({ allowed: false, budgetRemainingUsd: 0, blockedReason: 'budget_exhausted' })

    const result = await captureDomainOverview('seot-1')

    expect(result).toEqual({ ok: false, errorCode: 'budget_exhausted', status: null })
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('dominios duplicados target/competidor se deduplican por normalización', async () => {
    state.competitors = [{ competitor_domain: 'https://www.cliente.cl' }]
    providerMock.mockResolvedValue(providerOkResponse(sampleItem))

    const result = await captureDomainOverview('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.subjects).toBe(1)
    expect(providerMock).toHaveBeenCalledTimes(1)
  })
})
