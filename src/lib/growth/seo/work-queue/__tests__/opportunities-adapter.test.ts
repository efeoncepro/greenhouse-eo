import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = { queue: null as unknown }

vi.mock('../reader', () => ({ readSeoWorkQueue: vi.fn(async () => state.queue) }))
vi.mock('../../keyword-market-data', () => ({
  normalizeMarketKeyword: (k: string) => k.toLowerCase(),
  readKeywordMarketData: vi.fn(async () => ({
    market: 'available',
    byKeyword: new Map(),
    linkBarrierByKeyword: new Map()
  }))
}))

const { readKeywordOpportunitiesFromWorkQueue } = await import('../opportunities-adapter')

const breakdown = (over: Record<string, unknown> = {}) => ({
  impressions: 1200,
  clicks: 3,
  currentCtr: 0.0025,
  weightedPosition: 12,
  targetPosition: 5,
  expectedCtrAtTarget: 0.0098,
  ctrCurveSource: 'org_measured',
  curveSampleImpressions: 37_600,
  curveSampleClicks: 370,
  windowDays: 28,
  incrementalClicks: 8.8,
  basisReason: '',
  ...over
})

const item = (over: Record<string, unknown> = {}) => ({
  itemId: 'seowqi-1',
  rank: 1,
  origin: 'gsc_striking_distance',
  keyword: 'pinturas',
  targetUrl: 'https://berel.com/p',
  recommendedVerb: 'optimize',
  scoreBasis: 'measured_incremental_clicks',
  scoreBand: 1,
  priorityScore: 8.8,
  breakdown: breakdown(),
  evidenceRef: 'seo:gsc_query:pinturas',
  sourceScoreVersion: null,
  ...over
})

const queueResult = (items: unknown[]) => ({
  ok: true,
  snapshot: {
    snapshotId: 'seowqs-1',
    organizationId: 'org-1',
    seoTargetId: 'seot-1',
    priorityScoreVersion: 'incremental-clicks-v1',
    windowDays: 28,
    itemCount: items.length,
    computedAt: '2026-08-28T10:00:00.000Z',
    expiresAt: '2026-08-29T12:00:00.000Z'
  },
  items,
  originHealth: [],
  priorityScoreVersion: 'incremental-clicks-v1',
  asOf: '2026-08-28T10:00:00.000Z',
  staleness: 'fresh',
  nextCursor: null
})

beforeEach(() => {
  state.queue = null
})

describe('TASK-1700 — adapter de la lente', () => {
  it('sirve la lente cuando todas las filas tienen techo', async () => {
    state.queue = queueResult([item()])

    const result = await readKeywordOpportunitiesFromWorkQueue('seot-1')

    expect(result?.servedFromWorkQueue).toBe(true)
    expect(result?.result.ok && result.result.opportunities[0]!.estimatedClickGain).toBe(9)
    expect(result?.result.ok && result.result.orderedBy).toBe('estimated_click_gain')
  })

  /**
   * 🔴 EL ASSERT QUE PROTEGE LA COSTURA ENTRE DOS CONTRATOS QUE USAN LA MISMA PALABRA CON
   * SEMÁNTICAS OPUESTAS.
   *
   * En la cola, `priorityScore = null` significa «me niego a estimar». En la lente,
   * `estimatedClickGain` es `number` y un `0` es una afirmación POSITIVA: «ya convierte por
   * encima de la media de la posición objetivo». Traducir `null → 0` reintroduce en el
   * contrato el cero-sentinel que TASK-1792 eliminó del código, y con una curva no utilizable
   * saldría TODA la lente empatada en un cero fabricado bajo un envelope que dice
   * `org_measured`.
   *
   * La cola sirve esta lente sólo si puede hacerlo sin fabricar; si no, devuelve `null` y el
   * caller cae al reader legacy, que desde 1792 ordena honestamente ese caso.
   */
  it('NO sirve la lente si alguna fila no tiene techo: devuelve null y cede al legacy', async () => {
    state.queue = queueResult([
      item(),
      item({
        itemId: 'seowqi-2',
        keyword: 'sellador',
        scoreBand: 2,
        scoreBasis: 'measured_without_curve',
        priorityScore: null,
        breakdown: breakdown({ ctrCurveSource: 'unusable', expectedCtrAtTarget: null, incrementalClicks: null })
      })
    ])

    expect(await readKeywordOpportunitiesFromWorkQueue('seot-1')).toBeNull()
  })

  it('cede al legacy cuando la cola nunca corrió: `absent` no es "no hay trabajo"', async () => {
    state.queue = { ...queueResult([]), staleness: 'absent', snapshot: null }

    expect(await readKeywordOpportunitiesFromWorkQueue('seot-1')).toBeNull()
  })

  it('cede al legacy cuando la cola está apagada o falló', async () => {
    state.queue = { ok: false, errorCode: 'disabled' }

    expect(await readKeywordOpportunitiesFromWorkQueue('seot-1')).toBeNull()
  })

  it('recorta a la ventana de posición de la lente (8–20)', async () => {
    // El colector de consolidación cubre TODAS las posiciones a propósito, pero la lente
    // legacy nunca mostró las de fuera de 8–20: servirlas sería un cambio de comportamiento.
    state.queue = queueResult([
      item({ keyword: 'dentro', breakdown: breakdown({ weightedPosition: 12 }) }),
      item({ itemId: 'seowqi-3', keyword: 'fuera-arriba', breakdown: breakdown({ weightedPosition: 3 }) }),
      item({ itemId: 'seowqi-4', keyword: 'fuera-abajo', breakdown: breakdown({ weightedPosition: 40 }) })
    ])

    const result = await readKeywordOpportunitiesFromWorkQueue('seot-1')

    expect(result?.result.ok && result.result.opportunities.map(o => o.keyword)).toEqual(['dentro'])
  })

  it('marca la canibalización sin mezclarla con optimización', async () => {
    state.queue = queueResult([
      item({ origin: 'consolidation', recommendedVerb: 'consolidate', breakdown: breakdown({ competingPages: 4 }) })
    ])

    const result = await readKeywordOpportunitiesFromWorkQueue('seot-1')

    expect(result?.result.ok && result.result.opportunities[0]).toMatchObject({
      cannibalized: true,
      competingPages: 4
    })
  })
})
