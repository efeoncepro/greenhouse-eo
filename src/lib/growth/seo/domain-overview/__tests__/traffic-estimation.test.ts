import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1775 — Screening de cartera (`bulk_traffic_estimation`).
 *
 * Cubre el pre-check any-source (foto O screening vigente = no re-comprar), el chunking a
 * 1.000 dominios, el contrato NULL-row para dominios desconocidos y que el screening jamás
 * finge ser la foto completa (posiciones NULL).
 */

vi.mock('server-only', () => ({}))

interface SqlCall {
  sql: string
  params: unknown[]
}

const state = {
  freshDomains: [] as Array<{ normalized_domain: string }>,
  freshQueries: [] as SqlCall[],
  inserts: [] as SqlCall[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
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

const flags = { module: true }

vi.mock('../../flags', () => ({
  isSeoModuleEnabled: () => flags.module,
  isSeoDomainOverviewEnabled: () => true
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

import { estimateBulkTrafficCost, estimateDomainTraffic, parseBulkTrafficItem } from '../traffic-estimation'

const ETV_FIXTURE = { version: 'legacy_static_v1', evidence: 'explicit_request', requestedAt: '2026-10-15T12:00:00.000Z', policyVersion: 'etv-policy.v1', historicalBasis: null } as const

const bulkResponse = (items: Array<Record<string, unknown>>, cost = 0.0124) => ({
  ok: true,
  httpStatus: 200,
  cost,
  tasks: [{ status_code: 20000, result: [{ items }] }]
})

beforeEach(() => {
  state.freshDomains = []
  state.freshQueries = []
  state.inserts = []
  flags.module = true
  gateMock.mockReset()
  gateMock.mockResolvedValue({ allowed: true, budgetRemainingUsd: 50, blockedReason: null })
  providerMock.mockReset()
})

describe('estimateBulkTrafficCost', () => {
  it('trocea a 1.000 por llamada y cobra por dominio', () => {
    const { providerCalls, estimatedCostUsd } = estimateBulkTrafficCost(1500)

    expect(providerCalls).toBe(2)
    expect(estimatedCostUsd).toBeCloseTo(2 * 0.012 + 1500 * 0.00012, 6)
  })
})

describe('parseBulkTrafficItem', () => {
  it('sólo etv + count; posiciones y momentum quedan NULL (el screening no es la foto)', () => {
    const parsed = parseBulkTrafficItem(
      { target: 'competidor.cl', metrics: { organic: { etv: 812.4, count: 940 }, paid: { etv: 0, count: 0 } } },
      { locationCode: '2152', languageCode: 'es', etvMethodology: ETV_FIXTURE }
    )

    expect(parsed?.sourceEndpoint).toBe('bulk_traffic_estimation')
    expect(parsed?.organic.etv).toBeCloseTo(812.4)
    expect(parsed?.organic.count).toBe(940)
    expect(parsed?.organic.positions.pos1).toBeNull()
    expect(parsed?.organic.isNew).toBeNull()
    // 0 del proveedor se conserva como 0 (tráfico cero ≠ sin dato).
    expect(parsed?.paid.etv).toBe(0)
  })
})

describe('estimateDomainTraffic', () => {
  it('el pre-check acepta cualquier source (foto o screening vigente no se re-compra)', async () => {
    state.freshDomains = [{ normalized_domain: 'fresco.cl' }]
    providerMock.mockResolvedValue(
      bulkResponse([{ target: 'nuevo.cl', metrics: { organic: { etv: 10, count: 5 } } }])
    )

    const result = await estimateDomainTraffic({
      organizationId: 'org-1',
      domains: ['fresco.cl', 'nuevo.cl'],
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fresh).toBe(1)
    expect(result.estimated).toBe(1)

    const sources = state.freshQueries[0].params[3]

    expect(sources).toEqual(['domain_rank_overview', 'historical_rank_overview', 'bulk_traffic_estimation'])

    // El request al proveedor sólo lleva el pendiente.
    const call = providerMock.mock.calls[0][0] as { tasks: Array<{ targets: string[] }> }

    expect(call.tasks[0].targets).toEqual(['nuevo.cl'])
  })

  it('dominio que el proveedor no conoce deja fila con NULLs', async () => {
    providerMock.mockResolvedValue(bulkResponse([]))

    const result = await estimateDomainTraffic({
      organizationId: 'org-1',
      domains: ['desconocido.cl'],
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.noMarketData).toBe(1)
    expect(state.inserts).toHaveLength(1)
  })

  it('proveedor caído no escribe filas y degrada honesto', async () => {
    providerMock.mockResolvedValue({ ok: false, httpStatus: 502, cost: 0, tasks: [] })

    const result = await estimateDomainTraffic({
      organizationId: 'org-1',
      domains: ['a.cl'],
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.providerErrors).toBe(1)
    expect(state.inserts).toHaveLength(0)
  })

  it('gate bloqueado devuelve el reason sin gastar', async () => {
    gateMock.mockResolvedValue({ allowed: false, budgetRemainingUsd: 0, blockedReason: 'quota_exhausted' })

    const result = await estimateDomainTraffic({
      organizationId: 'org-1',
      domains: ['a.cl'],
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result).toEqual({ ok: false, errorCode: 'quota_exhausted', status: null })
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('lista vacía se rechaza', async () => {
    const result = await estimateDomainTraffic({
      organizationId: 'org-1',
      domains: [],
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result).toEqual({ ok: false, errorCode: 'no_domains', status: null })
  })
})
