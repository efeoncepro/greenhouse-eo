import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1776 — Captura de visibilidad por sujeto-página.
 *
 * Cubre lo que decide si esta task gasta bien o mal: la foto sale del agregado `metrics`
 * (set completo, no las filas compradas), el detalle acotado por `limit`, el enriquecimiento
 * GRATUITO del mercado vía el writer compartido (costo 0, sólo keywords no frescas), el
 * pre-check de frescura por source, la NULL-row para sujeto desconocido y el target de URL
 * CON esquema. El SQL real se ejercita en `_sanity-task-1776-url-visibility.ts` (gate 893).
 */

vi.mock('server-only', () => ({}))

interface SqlCall {
  sql: string
  params: unknown[]
}

const state = {
  freshVisibility: [] as Array<{ subject_kind: string; normalized_subject: string }>,
  freshMarket: [] as Array<{ normalized_keyword: string }>,
  visibilityInserts: [] as SqlCall[],
  marketInserts: [] as SqlCall[],
  targets: [] as Array<Record<string, unknown>>,
  competitors: [] as Array<{ competitor_domain: string }>
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    if (sql.includes('INSERT INTO greenhouse_growth.seo_url_visibility_snapshots')) {
      state.visibilityInserts.push({ sql, params })

      return []
    }

    if (sql.includes('INSERT INTO greenhouse_growth.seo_keyword_market_data')) {
      state.marketInserts.push({ sql, params })

      return []
    }

    if (sql.includes('FROM greenhouse_growth.seo_url_visibility_snapshots')) {
      return state.freshVisibility
    }

    if (sql.includes('FROM greenhouse_growth.seo_keyword_market_data')) {
      return state.freshMarket
    }

    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.targets
    }

    if (sql.includes('FROM greenhouse_growth.seo_competitors')) {
      return state.competitors
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

const flags = { module: true, urlVisibility: true }

vi.mock('../../flags', () => ({
  isSeoModuleEnabled: () => flags.module,
  isSeoUrlVisibilityEnabled: () => flags.urlVisibility
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const outboxMock = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => outboxMock(...args)
}))

import {
  captureUrlVisibility,
  estimateUrlVisibilityCost,
  projectRankedKeywordsResult,
  resolveRowLimit
} from '../capture'

const ETV_FIXTURE = { version: 'legacy_static_v1', evidence: 'explicit_request', requestedAt: '2026-10-15T12:00:00.000Z', policyVersion: 'etv-policy.v1', historicalBasis: null } as const

import { resolveVisibilitySubject } from '../resolve-subject'

const rankedItem = (keyword: string, volume: number, rank: number) => ({
  keyword_data: {
    keyword,
    keyword_info: { search_volume: volume, cpc: 1.2, competition: 0.4, competition_level: 'medium' },
    keyword_properties: { keyword_difficulty: 20, core_keyword: null },
    search_intent_info: { main_intent: 'commercial', probability: 0.8 },
    avg_backlinks_info: { backlinks: 10, referring_main_domains: 5, rank: 30, main_domain_rank: 200 }
  },
  ranked_serp_element: {
    serp_item: { type: 'organic', rank_group: rank, rank_absolute: rank, url: `https://cliente.cl/${keyword}`, etv: volume * 0.1 }
  }
})

const providerResponse = (overrides: Record<string, unknown> = {}, cost = 0.0241) => ({
  ok: true,
  httpStatus: 200,
  cost,
  tasks: [
    {
      status_code: 20000,
      result: [
        {
          total_count: 4120,
          items_count: 2,
          metrics: {
            organic: { pos_1: 12, pos_2_3: 44, pos_4_10: 310, count: 4120, etv: 8210.44, estimated_paid_traffic_cost: 15300.2, is_new: 30, is_up: 120, is_down: 80, is_lost: 12 },
            paid: { count: 3, etv: 12.5 }
          },
          items: [rankedItem('pintura', 135000, 4), rankedItem('pintura industrial', 2400, 9)],
          ...overrides
        }
      ]
    }
  ]
})

beforeEach(() => {
  state.freshVisibility = []
  state.freshMarket = []
  state.visibilityInserts = []
  state.marketInserts = []
  state.targets = []
  state.competitors = []
  flags.module = true
  flags.urlVisibility = true
  gateMock.mockReset()
  gateMock.mockResolvedValue({ allowed: true, budgetRemainingUsd: 50, blockedReason: null })
  providerMock.mockReset()
  outboxMock.mockReset()
  delete process.env.GROWTH_SEO_URL_VISIBILITY_ROW_LIMIT
})

describe('resolveRowLimit / estimateUrlVisibilityCost', () => {
  it('default 100, knob respetado y clampeado al máximo del proveedor', () => {
    expect(resolveRowLimit({} as NodeJS.ProcessEnv)).toBe(100)
    expect(resolveRowLimit({ GROWTH_SEO_URL_VISIBILITY_ROW_LIMIT: '250' } as unknown as NodeJS.ProcessEnv)).toBe(250)
    expect(resolveRowLimit({ GROWTH_SEO_URL_VISIBILITY_ROW_LIMIT: '5000' } as unknown as NodeJS.ProcessEnv)).toBe(1000)
  })

  it('el costo estimado es peor caso: setup + limit filas por sujeto', () => {
    expect(estimateUrlVisibilityCost(2, 100).estimatedCostUsd).toBeCloseTo(2 * (0.012 + 100 * 0.00012), 6)
  })
})

describe('projectRankedKeywordsResult', () => {
  const subject = (() => {
    const resolution = resolveVisibilitySubject({ subject: 'cliente.cl', kind: 'domain' })

    if (!resolution.ok) throw new Error('unreachable')

    return resolution.subject
  })()

  it('la foto sale del agregado metrics (set completo), el detalle de items', () => {
    const { snapshot } = projectRankedKeywordsResult(
      (providerResponse().tasks[0].result as Array<Record<string, unknown>>)[0] as never,
      { subject, locationCode: '2152', languageCode: 'es', etvMethodology: ETV_FIXTURE }
    )

    expect(snapshot.totalRankedKeywords).toBe(4120)
    expect(snapshot.organic.count).toBe(4120)
    expect(snapshot.organic.etv).toBeCloseTo(8210.44)
    expect(snapshot.organic.positions.pos4_10).toBe(310)
    expect(snapshot.topKeywords).toHaveLength(2)
    expect(snapshot.topKeywords?.[0]).toMatchObject({ keyword: 'pintura', position: 4, searchVolume: 135000 })
  })

  it('los datums de mercado salen del parser canónico de keyword_overview (cero derivación paralela)', () => {
    const { marketData } = projectRankedKeywordsResult(
      (providerResponse().tasks[0].result as Array<Record<string, unknown>>)[0] as never,
      { subject, locationCode: '2152', languageCode: 'es', etvMethodology: ETV_FIXTURE }
    )

    expect(marketData).toHaveLength(2)
    expect(marketData[0]).toMatchObject({
      normalizedKeyword: 'pintura',
      searchVolume: 135000,
      searchIntent: 'commercial',
      avgReferringDomains: 5
    })
  })
})

describe('captureUrlVisibility', () => {
  const baseInput = {
    organizationId: 'org-1',
    subjects: [{ subject: 'cliente.cl', kind: 'domain' as const }],
    locationCode: '2152',
    languageCode: 'es',
    seoTargetId: 'seot-1'
  }

  it('captura, persiste el snapshot y enriquece el mercado con costo CERO', async () => {
    providerMock.mockResolvedValue(providerResponse())

    const result = await captureUrlVisibility(baseInput)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.captured).toBe(1)
    expect(result.marketRowsWritten).toBe(2)
    expect(state.visibilityInserts).toHaveLength(1)
    expect(state.marketInserts).toHaveLength(2)

    // provider_cost de la PRIMERA fila de mercado debe ser 0: el gasto ya quedó en la fila
    // de visibilidad — atribuirlo dos veces inflaría el ledger por fila.
    const firstMarketParams = state.marketInserts[0].params

    expect(firstMarketParams[15]).toBe(0)
    expect(outboxMock).toHaveBeenCalledTimes(1)
  })

  it('el enriquecimiento salta keywords con mercado fresco (patrón top-up 1664)', async () => {
    state.freshMarket = [{ normalized_keyword: 'pintura' }]
    providerMock.mockResolvedValue(providerResponse())

    const result = await captureUrlVisibility(baseInput)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.marketRowsWritten).toBe(1)
    expect(state.marketInserts).toHaveLength(1)
  })

  it('sujeto fresco no pega al proveedor (segunda corrida = USD 0)', async () => {
    state.freshVisibility = [{ subject_kind: 'domain', normalized_subject: 'cliente.cl' }]

    const result = await captureUrlVisibility(baseInput)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fresh).toBe(1)
    expect(result.costUsd).toBe(0)
    expect(providerMock).not.toHaveBeenCalled()
    expect(gateMock).not.toHaveBeenCalled()
  })

  it('sujeto que el proveedor no conoce deja fila con NULLs', async () => {
    providerMock.mockResolvedValue(providerResponse({ total_count: null, metrics: null, items: [] }))

    const result = await captureUrlVisibility(baseInput)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.noMarketData).toBe(1)
    expect(state.visibilityInserts).toHaveLength(1)
    expect(state.marketInserts).toHaveLength(0)
  })

  it('proveedor caído NO escribe fila y degrada honesto', async () => {
    providerMock.mockResolvedValue({ ok: false, httpStatus: 502, cost: 0, tasks: [] })

    const result = await captureUrlVisibility(baseInput)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.providerErrors).toBe(1)
    expect(state.visibilityInserts).toHaveLength(0)
    expect(outboxMock).not.toHaveBeenCalled()
  })

  it('sujeto url viaja al proveedor CON esquema; subfolder viaja como host + filtro relative_url', async () => {
    providerMock.mockResolvedValue(providerResponse())

    await captureUrlVisibility({
      ...baseInput,
      subjects: [
        { subject: 'cliente.cl/guia/', kind: 'url' },
        { subject: 'cliente.cl/blog', kind: 'subfolder' }
      ]
    })

    const calls = providerMock.mock.calls.map(call => (call[0] as { tasks: Array<Record<string, unknown>> }).tasks[0])

    expect(calls[0].target).toBe('https://cliente.cl/guia')
    expect(calls[0].filters).toBeUndefined()
    expect(calls[1].target).toBe('cliente.cl')
    expect(calls[1].filters).toEqual(['ranked_serp_element.serp_item.relative_url', 'like', '/blog%'])
  })

  it('sujeto inválido queda como outcome propio sin frenar el resto', async () => {
    providerMock.mockResolvedValue(providerResponse())

    const result = await captureUrlVisibility({
      ...baseInput,
      subjects: [
        { subject: 'cliente.cl/blog', kind: 'domain' },
        { subject: 'cliente.cl', kind: 'domain' }
      ]
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.invalid).toBe(1)
    expect(result.captured).toBe(1)
  })

  it('gate bloqueado devuelve el blockedReason mapeado sin gastar', async () => {
    gateMock.mockResolvedValue({ allowed: false, budgetRemainingUsd: 0, blockedReason: 'budget_exhausted' })

    const result = await captureUrlVisibility(baseInput)

    expect(result).toEqual({ ok: false, errorCode: 'budget_exhausted', status: null })
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('flag OFF devuelve disabled', async () => {
    flags.urlVisibility = false

    const result = await captureUrlVisibility(baseInput)

    expect(result).toEqual({ ok: false, errorCode: 'disabled', status: null })
  })
})
