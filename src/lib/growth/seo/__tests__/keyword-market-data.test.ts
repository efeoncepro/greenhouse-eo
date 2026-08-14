import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1661 — Captura de datos de mercado por keyword.
 *
 * Cubre lo que decide si esta task gasta bien o mal: la normalización de la clave, el costo
 * determinista que alimenta el preview y el gate, el parser del proveedor (donde vive la
 * confusión clásica competition-paga vs dificultad-orgánica y el `null` != `0`), y el
 * contrato de gasto del runner — flags, pre-check de frescura, gate y degradación honesta.
 *
 * El SQL real se ejercita contra PG en `scripts/growth/_sanity-task-1661-market-data.ts`
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
    location_code: '2152',
    language_code: 'es'
  } as Record<string, unknown> | null,
  trackedKeywords: [] as Array<{ keyword: string }>,
  freshKeywords: [] as Array<{ normalized_keyword: string }>,
  inserts: [] as SqlCall[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.target ? [state.target] : []
    }

    if (sql.includes('FROM greenhouse_growth.seo_keyword_set_members')) {
      return state.trackedKeywords
    }

    if (sql.includes('INSERT INTO greenhouse_growth.seo_keyword_market_data')) {
      state.inserts.push({ sql, params })

      return []
    }

    if (sql.includes('FROM greenhouse_growth.seo_keyword_market_data')) {
      return state.freshKeywords
    }

    return []
  }
}))

const gateMock = vi.fn()

vi.mock('../entitlement', () => ({
  SEO_MODULE_KEY: 'seo_v2',
  SEO_MODULE_KEYS_READ: ['seo_v2'],
  enforceSeoRunEntitlement: (...args: unknown[]) => gateMock(...args)
}))

const providerMock = vi.fn()

vi.mock('@/lib/ai/dataforseo', () => ({
  postDataForSeoTask: (...args: unknown[]) => providerMock(...args)
}))

const flags = { module: true, marketData: true }

vi.mock('../flags', () => ({
  isSeoModuleEnabled: () => flags.module,
  isSeoKeywordMarketDataEnabled: () => flags.marketData
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  LABS_RESULT_ROW_USD,
  LABS_TASK_SETUP_USD,
  MAX_KEYWORDS_PER_OVERVIEW_CALL,
  captureKeywordMarketData,
  deriveLinkBarrier,
  estimateMarketDataCost,
  normalizeMarketKeyword,
  parseKeywordOverviewItem,
  previewKeywordMarketDataCapture
} from '../keyword-market-data'

const okGate = { allowed: true, tier: 'contracted', allowanceRemaining: 5, budgetRemainingUsd: 40, blockedReason: null }

const providerOk = (items: unknown[], cost = 0.0157) => ({
  ok: true,
  httpStatus: 200,
  endpoint: '/v3/dataforseo_labs/google/keyword_overview/live',
  cost,
  latencyMs: 120,
  secretSource: 'env',
  tasks: [{ status_code: 20000, result: [{ items }] }]
})

const overviewItem = (keyword: string, overrides: Record<string, unknown> = {}) => ({
  keyword,
  keyword_info: {
    search_volume: 1300,
    cpc: 0.42,
    competition: 0.31,
    competition_level: 'MEDIUM',
    last_updated_time: '2026-07-15 00:00:00 +00:00'
  },
  keyword_properties: { keyword_difficulty: 44, core_keyword: 'pintura industrial' },
  search_intent_info: { main_intent: 'commercial', probability: 0.87 },
  ...overrides
})

beforeEach(() => {
  state.target = { seo_target_id: 'seot-1', organization_id: 'org-1', location_code: '2152', language_code: 'es' }
  state.trackedKeywords = []
  state.freshKeywords = []
  state.inserts = []
  flags.module = true
  flags.marketData = true
  gateMock.mockReset()
  gateMock.mockResolvedValue(okGate)
  providerMock.mockReset()
})

describe('normalizeMarketKeyword', () => {
  it('colapsa espacios, recorta y baja a minúsculas', () => {
    expect(normalizeMarketKeyword('  Pintura   Industrial ')).toBe('pintura industrial')
  })

  it('CONSERVA las tildes: "diseño" y "diseno" son búsquedas distintas con volúmenes distintos', () => {
    expect(normalizeMarketKeyword('Diseño Web')).toBe('diseño web')
    expect(normalizeMarketKeyword('Diseño Web')).not.toBe('diseno web')
  })
})

describe('estimateMarketDataCost', () => {
  it('aplica el modelo dual de Labs: task setup por llamada + costo por fila', () => {
    const result = estimateMarketDataCost(31)

    expect(result.providerCalls).toBe(1)
    expect(result.estimatedCostUsd).toBeCloseTo(LABS_TASK_SETUP_USD + 31 * LABS_RESULT_ROW_USD, 6)
    expect(result.formula).toContain('31 fila(s)')
  })

  it('cobra un task setup por cada llamada cuando hay más keywords que el máximo del endpoint', () => {
    const keywords = MAX_KEYWORDS_PER_OVERVIEW_CALL + 1
    const result = estimateMarketDataCost(keywords)

    expect(result.providerCalls).toBe(2)
    expect(result.estimatedCostUsd).toBeCloseTo(2 * LABS_TASK_SETUP_USD + keywords * LABS_RESULT_ROW_USD, 6)
  })

  it('una corrida sin pendientes no cuesta nada', () => {
    expect(estimateMarketDataCost(0)).toMatchObject({ providerCalls: 0, estimatedCostUsd: 0 })
  })
})

describe('parseKeywordOverviewItem', () => {
  const context = { locationCode: '2152', languageCode: 'es' }

  it('proyecta el item completo conservando la semántica de cada métrica', () => {
    expect(parseKeywordOverviewItem(overviewItem('Pintura Industrial'), context)).toEqual({
      normalizedKeyword: 'pintura industrial',
      keyword: 'Pintura Industrial',
      locationCode: '2152',
      languageCode: 'es',
      searchVolume: 1300,
      keywordDifficulty: 44,
      competition: 0.31,
      competitionLevel: 'medium',
      cpcUsd: 0.42,
      searchIntent: 'commercial',
      searchIntentProbability: 0.87,
      coreKeyword: 'pintura industrial',
      providerLastUpdatedAt: '2026-07-15 00:00:00 +00:00',
      // Sin `avg_backlinks_info` en el item, el perfil de enlaces queda NULL: "no capturado".
      avgPageRank: null,
      avgMainDomainRank: null,
      avgBacklinks: null,
      avgReferringDomains: null
    })
  })

  it('un campo ausente es null, NUNCA 0 — "no hay dato" != "nadie lo busca"', () => {
    const datum = parseKeywordOverviewItem(
      { keyword: 'nicho raro', keyword_info: null, keyword_properties: null, search_intent_info: null },
      context
    )

    expect(datum?.searchVolume).toBeNull()
    expect(datum?.keywordDifficulty).toBeNull()
    expect(datum?.competition).toBeNull()
    expect(datum?.searchVolume).not.toBe(0)
  })

  it('search_volume 0 SÍ se conserva: es una medición real de demanda nula', () => {
    const datum = parseKeywordOverviewItem(
      overviewItem('sin demanda', { keyword_info: { search_volume: 0 } }),
      context
    )

    expect(datum?.searchVolume).toBe(0)
  })

  it('no confunde competition (paga) con keyword_difficulty (orgánica)', () => {
    const datum = parseKeywordOverviewItem(
      overviewItem('x', {
        keyword_info: { competition: 0.9 },
        keyword_properties: { keyword_difficulty: 12 }
      }),
      context
    )

    expect(datum?.competition).toBe(0.9)
    expect(datum?.keywordDifficulty).toBe(12)
  })

  it('descarta valores fuera de rango en vez de persistir basura que el CHECK rechazaría', () => {
    const datum = parseKeywordOverviewItem(
      overviewItem('x', {
        keyword_properties: { keyword_difficulty: 140 },
        keyword_info: { search_volume: -5, competition: 3 },
        search_intent_info: { main_intent: 'inventado', probability: 0.5 }
      }),
      context
    )

    expect(datum?.keywordDifficulty).toBeNull()
    expect(datum?.searchVolume).toBeNull()
    expect(datum?.competition).toBe(1)
    expect(datum?.searchIntent).toBeNull()
  })

  it('un item sin keyword no produce fila', () => {
    expect(parseKeywordOverviewItem({ keyword: '   ' }, context)).toBeNull()
  })
})

describe('previewKeywordMarketDataCapture (dry-run)', () => {
  it('reporta conteo, fórmula y costo SIN llamar al proveedor', async () => {
    state.trackedKeywords = [{ keyword: 'pintura industrial' }, { keyword: 'esmalte sintético' }]

    const result = await previewKeywordMarketDataCapture('seot-1')

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.pendingKeywords).toBe(2)
    expect(result.providerCalls).toBe(1)
    expect(result.estimatedCostUsd).toBeCloseTo(LABS_TASK_SETUP_USD + 2 * LABS_RESULT_ROW_USD, 6)
    expect(result.wouldBeAllowed).toBe(true)
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('descuenta del costo las keywords con captura vigente', async () => {
    state.trackedKeywords = [{ keyword: 'pintura industrial' }, { keyword: 'esmalte sintético' }]
    state.freshKeywords = [{ normalized_keyword: 'pintura industrial' }]

    const result = await previewKeywordMarketDataCapture('seot-1')

    expect(result.ok && result.alreadyFresh).toBe(1)
    expect(result.ok && result.pendingKeywords).toBe(1)
  })

  it('reporta el bloqueo sin ejecutar cuando el gate no autoriza', async () => {
    state.trackedKeywords = [{ keyword: 'x' }]
    gateMock.mockResolvedValue({ ...okGate, allowed: false, blockedReason: 'budget_exhausted' })

    const result = await previewKeywordMarketDataCapture('seot-1')

    expect(result.ok && result.wouldBeAllowed).toBe(false)
    expect(result.ok && result.blockedReason).toBe('budget_exhausted')
    expect(providerMock).not.toHaveBeenCalled()
  })
})

describe('captureKeywordMarketData — contrato de gasto', () => {
  it('con el flag propio OFF no consulta, no gasta y no escribe', async () => {
    flags.marketData = false
    state.trackedKeywords = [{ keyword: 'x' }]

    expect(await captureKeywordMarketData('seot-1')).toEqual({ ok: false, errorCode: 'disabled', status: null })
    expect(providerMock).not.toHaveBeenCalled()
    expect(gateMock).not.toHaveBeenCalled()
  })

  it('el flag del módulo apagado también corta: son dos condiciones independientes', async () => {
    flags.module = false
    state.trackedKeywords = [{ keyword: 'x' }]

    expect(await captureKeywordMarketData('seot-1')).toEqual({ ok: false, errorCode: 'disabled', status: null })
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('una keyword con captura vigente NO se vuelve a comprar', async () => {
    state.trackedKeywords = [{ keyword: 'pintura industrial' }]
    state.freshKeywords = [{ normalized_keyword: 'pintura industrial' }]

    const result = await captureKeywordMarketData('seot-1')

    expect(result.ok && result.alreadyFresh).toBe(1)
    expect(result.ok && result.providerCalls).toBe(0)
    expect(result.ok && result.costUsd).toBe(0)
    expect(providerMock).not.toHaveBeenCalled()
    expect(gateMock).not.toHaveBeenCalled()
  })

  it('no llama al proveedor cuando el gate bloquea', async () => {
    state.trackedKeywords = [{ keyword: 'x' }]
    gateMock.mockResolvedValue({ ...okGate, allowed: false, blockedReason: 'budget_exhausted' })

    expect(await captureKeywordMarketData('seot-1')).toEqual({
      ok: false,
      errorCode: 'budget_exhausted',
      status: null
    })
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('persiste la captura y manda el payload correcto, sin clickstream', async () => {
    state.trackedKeywords = [{ keyword: 'Pintura Industrial' }]
    providerMock.mockResolvedValue(providerOk([overviewItem('Pintura Industrial')]))

    const result = await captureKeywordMarketData('seot-1')

    expect(result.ok && result.captured).toBe(1)

    const payload = providerMock.mock.calls[0][0]

    expect(payload.family).toBe('labs')
    expect(payload.endpoint).toBe('/v3/dataforseo_labs/google/keyword_overview/live')
    expect(payload.organizationId).toBe('org-1')
    // location_code viaja como NÚMERO al proveedor aunque se almacene TEXT.
    expect(payload.tasks[0].location_code).toBe(2152)
    expect(payload.tasks[0].include_clickstream_data).toBe(false)
    expect(state.inserts).toHaveLength(1)
  })

  it('un task_status distinto de 20000 NO escribe filas y se reporta como provider_error', async () => {
    state.trackedKeywords = [{ keyword: 'x' }]
    providerMock.mockResolvedValue({ ...providerOk([]), tasks: [{ status_code: 40501, result: null }] })

    const result = await captureKeywordMarketData('seot-1')

    expect(result.ok && result.providerErrors).toBe(1)
    expect(result.ok && result.captured).toBe(0)
    expect(state.inserts).toHaveLength(0)
    expect(result.ok && result.outcomes[0]?.errorCode).toBe('task_status_40501')
  })

  it('distingue "el proveedor no tiene la keyword" de un error del proveedor', async () => {
    state.trackedKeywords = [{ keyword: 'nicho inexistente' }]
    providerMock.mockResolvedValue(providerOk([]))

    const result = await captureKeywordMarketData('seot-1')

    expect(result.ok && result.noMarketData).toBe(1)
    expect(result.ok && result.providerErrors).toBe(0)
  })

  it('REGISTRA la keyword que el proveedor no tiene, para no re-comprarla cada corrida', async () => {
    // Bug encontrado en el smoke real (2026-08-13): sin fila, el pre-check de frescura nunca la
    // veía y la corrida siguiente volvía a pagar por una respuesta vacía. Tres estados: fila
    // ausente = nunca preguntamos; fila con NULL = preguntamos y no hay; 0 = demanda cero real.
    state.trackedKeywords = [{ keyword: 'nicho inexistente' }]
    providerMock.mockResolvedValue(providerOk([]))

    await captureKeywordMarketData('seot-1')

    expect(state.inserts).toHaveLength(1)

    // La fila se escribe con métricas NULL, nunca con 0.
    const params = state.inserts[0].params

    expect(params[4]).toBeNull()
    expect(params[5]).toBeNull()
  })

  it('atribuye el costo del batch a UNA sola fila para no multiplicar el gasto real', async () => {
    state.trackedKeywords = [{ keyword: 'a' }, { keyword: 'b' }]
    providerMock.mockResolvedValue(providerOk([overviewItem('a'), overviewItem('b')], 0.02))

    await captureKeywordMarketData('seot-1')

    // `provider_cost` es $16 del INSERT canónico (el writer compartido `persistKeywordMarketData`
    // parametriza también `source_endpoint`, TASK-1664). Se referencia por su posición SEMÁNTICA
    // y no como "el último parámetro": agregar una columna al final movería el índice y el test
    // pasaría a medir otra cosa en silencio — que es exactamente lo que ocurrió al sumar los
    // cuatro campos de avg_backlinks_info.
    const providerCostParamIndex = 15
    const costs = state.inserts.map(call => call.params[providerCostParamIndex])

    // Sólo la PRIMERA fila escrita del lote lleva el costo del batch.
    expect(costs).toEqual([0.02, 0])
  })

  it('un target inexistente o pausado no gasta', async () => {
    state.target = null

    expect(await captureKeywordMarketData('seot-1')).toEqual({
      ok: false,
      errorCode: 'target_not_found',
      status: null
    })
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('un set vacío no gasta', async () => {
    state.trackedKeywords = []

    expect(await captureKeywordMarketData('seot-1')).toEqual({
      ok: false,
      errorCode: 'no_keywords',
      status: null
    })
    expect(providerMock).not.toHaveBeenCalled()
  })
})

describe('deriveLinkBarrier (barrera de enlaces desde la evidencia del top-10)', () => {
  it('sin ninguna señal → unknown; un hueco JAMÁS se pinta como "baja"', () => {
    expect(deriveLinkBarrier({ avgReferringDomains: null, avgPageRank: null })).toBe('unknown')
  })

  it('gobierna la DIVERSIDAD de dominios, no el conteo de enlaces (caso berel vs pintura)', () => {
    // Medido 2026-08-13 en MX. berel: 5.125 backlinks pero sólo 30,4 dominios (concentración).
    // pintura: 232 backlinks y 52,6 dominios (diversidad real).
    const berel = deriveLinkBarrier({ avgReferringDomains: 30.4, avgPageRank: 89.9 })
    const pintura = deriveLinkBarrier({ avgReferringDomains: 52.6, avgPageRank: 60.9 })

    // Ambas altas, pero por razones distintas y NINGUNA por el conteo de enlaces:
    // berel por page_rank (URLs individualmente fuertes), pintura por diversidad de dominios.
    expect(berel).toBe('high')
    expect(pintura).toBe('high')
  })

  it('distingue lo que keyword_difficulty colapsaba: ambas daban KD 0', () => {
    // `pintura` (135.000 búsquedas/mes) y `pintura para piso` salían las dos KD 0.
    const pintura = deriveLinkBarrier({ avgReferringDomains: 52.6, avgPageRank: 60.9 })
    const pisos = deriveLinkBarrier({ avgReferringDomains: 0.1, avgPageRank: 5.2 })

    expect(pintura).toBe('high')
    expect(pisos).toBe('low')
    expect(pintura).not.toBe(pisos)
  })

  it('page rank muy alto implica barrera alta aunque los dominios sean pocos', () => {
    expect(deriveLinkBarrier({ avgReferringDomains: 2, avgPageRank: 95 })).toBe('high')
  })

  it('umbrales de dominios referentes: <10 baja, 10–39 media, 40+ alta', () => {
    expect(deriveLinkBarrier({ avgReferringDomains: 9.9, avgPageRank: 10 })).toBe('low')
    expect(deriveLinkBarrier({ avgReferringDomains: 10, avgPageRank: 10 })).toBe('medium')
    expect(deriveLinkBarrier({ avgReferringDomains: 39.9, avgPageRank: 10 })).toBe('medium')
    expect(deriveLinkBarrier({ avgReferringDomains: 40, avgPageRank: 10 })).toBe('high')
  })

  it('sin dominios pero con page rank bajo → unknown, no "baja"', () => {
    // Es la diferencia entre "no lo capturamos" y "medimos que no hay barrera".
    expect(deriveLinkBarrier({ avgReferringDomains: null, avgPageRank: 12 })).toBe('unknown')
  })

  it('0 dominios medidos SÍ es barrera baja: es una medición, no un hueco', () => {
    expect(deriveLinkBarrier({ avgReferringDomains: 0, avgPageRank: 0 })).toBe('low')
  })
})

describe('parseKeywordOverviewItem — perfil de enlaces', () => {
  const context = { locationCode: '2484', languageCode: 'es' }

  it('proyecta avg_backlinks_info, incluidos los promedios fraccionarios', () => {
    const datum = parseKeywordOverviewItem(
      overviewItem('pintura para piso', {
        avg_backlinks_info: { backlinks: 0.1, referring_main_domains: 0.1, rank: 5.2, main_domain_rank: 496.7 }
      }),
      context
    )

    expect(datum?.avgBacklinks).toBe(0.1)
    expect(datum?.avgReferringDomains).toBe(0.1)
    expect(datum?.avgPageRank).toBe(5.2)
    expect(datum?.avgMainDomainRank).toBe(496.7)
  })

  it('sin avg_backlinks_info todo queda null — no capturado, no "sin barrera"', () => {
    const datum = parseKeywordOverviewItem(overviewItem('x', { avg_backlinks_info: null }), context)

    expect(datum?.avgReferringDomains).toBeNull()
    expect(deriveLinkBarrier({
      avgReferringDomains: datum?.avgReferringDomains ?? null,
      avgPageRank: datum?.avgPageRank ?? null
    })).toBe('unknown')
  })
})
