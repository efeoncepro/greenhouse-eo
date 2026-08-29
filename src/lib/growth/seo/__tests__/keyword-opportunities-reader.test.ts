import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1302 Slice 4 — readKeywordOpportunities.
 *
 * Cubre la lógica TS: score de ganancia de clics, quick-win, canibalización, orden y
 * degradación. El SQL (CTEs + DISTINCT ON + PERCENTILE_CONT + comparaciones DATE) se
 * ejercita aparte contra PG real en `scripts/growth/_sanity-seo-keyword-opportunities.ts`
 * — gate TASK-893: los mocks ejercitan el TS, NUNCA el SQL.
 */

vi.mock('server-only', () => ({}))

const state = {
  target: [{ organization_id: 'org-1' }] as Array<{ organization_id: string }>,
  threshold: '10',
  opportunities: [] as Array<Record<string, string>>,
  curve: [] as Array<{ position_bucket: string; impressions: string; clicks: string }>,
  /** TASK-1661 — capturas de mercado (lente ◑). Vacío = nunca se consultó. */
  marketData: [] as Array<Record<string, unknown>>,
  thrown: null as Error | null
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string) => {
    if (state.thrown) throw state.thrown
    if (sql.includes('FROM greenhouse_growth.seo_targets')) return state.target
    if (sql.includes('PERCENTILE_CONT')) return [{ threshold: state.threshold }]
    if (sql.includes('position_bucket')) return state.curve
    // Explícito y NO por catch-all: el fallback de abajo devolvía las filas de oportunidades
    // para cualquier query desconocida, así que la de mercado veía datos que nunca existieron
    // y el reader reportaba `available` sin una sola captura.
    if (sql.includes('FROM greenhouse_growth.seo_keyword_market_data')) return state.marketData

    return state.opportunities
  }
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: () => undefined }))

import { readKeywordOpportunities } from '../keyword-opportunities-reader'

/**
 * TASK-1792 — un bucket de la curva CON su muestra. El reader ya no puede leer un CTR sin
 * saber sobre cuántas impresiones y clics se calculó.
 */
const curveBucket = (position: number, impressions: number, clicks: number) => ({
  position_bucket: String(position),
  impressions: String(impressions),
  clicks: String(clicks)
})

/** Bucket objetivo SANO: la muestra de `berel.com` en la posición 5 (PG, 2026-08-28). */
const usableTargetBucket = (ctr: number) => curveBucket(5, 100_000, Math.round(100_000 * ctr))

/** 🔴 Bucket objetivo REAL de `efeoncepro.com`: 75 impresiones, 0 clics. El que rompía la lente. */
const efeonceTargetBucket = () => curveBucket(5, 75, 0)

const opportunityRow = (overrides: Partial<Record<string, string>> = {}) => ({
  keyword: 'zapatos rojos',
  page: 'https://x.com/a',
  weighted_position: '12.17',
  impressions: '1400',
  clicks: '70',
  competing_pages: '1',
  ...overrides
})

beforeEach(() => {
  state.target = [{ organization_id: 'org-1' }]
  state.threshold = '10'
  state.opportunities = []
  state.curve = []
  state.marketData = []
  state.thrown = null
})

describe('readKeywordOpportunities — contrato', () => {
  it('degrada cuando el target no existe', async () => {
    state.target = []

    const result = await readKeywordOpportunities('seot-missing')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errorCode).toBe('target_not_found')
  })

  it('degrada a query_failed sin filtrar el error crudo', async () => {
    state.thrown = new Error('column "x" does not exist')

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.errorCode).toBe('query_failed')
      // El detalle técnico va a Sentry, no al contrato.
      expect(JSON.stringify(result)).not.toContain('does not exist')
    }
  })

  it('sin capturas de mercado declara `unavailable` SIN perder el striking-distance', async () => {
    state.opportunities = [opportunityRow()]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.market).toBe('unavailable')
      // El striking-distance es demanda MEDIDA de GSC: no depende del enriquecimiento.
      expect(result.opportunities).toHaveLength(1)
      expect(result.opportunities[0]?.searchVolume).toBeNull()
      expect(result.opportunities[0]?.difficulty).toBeNull()
    }
  })

  it('TASK-1661 — con captura de mercado enriquece y declara `available`', async () => {
    state.opportunities = [opportunityRow()]
    state.marketData = [
      {
        normalized_keyword: 'zapatos rojos',
        keyword: 'zapatos rojos',
        search_volume: 2400,
        keyword_difficulty: 38,
        competition: '0.4200',
        competition_level: 'medium',
        cpc_usd: '0.5100',
        search_intent: 'commercial',
        search_intent_probability: '0.9100',
        core_keyword: 'zapatos',
        provider_last_updated_at: new Date('2026-07-15T00:00:00.000Z'),
        capture_date: '2026-08-01',
        is_fresh: true
      }
    ]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.market).toBe('available')
      expect(result.opportunities[0]?.searchVolume).toBe(2400)
      expect(result.opportunities[0]?.difficulty).toBe(38)
    }
  })

  it('TASK-1661 — una keyword SIN captura queda en null, nunca en 0', async () => {
    state.opportunities = [opportunityRow({ keyword: 'sin dato de mercado' })]
    state.marketData = [
      {
        normalized_keyword: 'otra keyword',
        keyword: 'otra keyword',
        search_volume: 900,
        keyword_difficulty: 10,
        competition: null,
        competition_level: null,
        cpc_usd: null,
        search_intent: null,
        search_intent_probability: null,
        core_keyword: null,
        provider_last_updated_at: null,
        capture_date: '2026-08-01',
        is_fresh: true
      }
    ]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      // Hay dato para la selección, pero NO para esta keyword: `null`, jamás 0.
      expect(result.opportunities[0]?.searchVolume).toBeNull()
      expect(result.opportunities[0]?.searchVolume).not.toBe(0)
    }
  })
})

describe('readKeywordOpportunities — score', () => {
  it('estima la ganancia con la curva de CTR de la PROPIA organización', async () => {
    // La org convierte 10% en posición 5; la keyword hoy convierte 5% (70/1400).
    state.curve = [usableTargetBucket(0.1)]
    state.opportunities = [opportunityRow()]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)
    // 1400 × (0.10 − 0.05) = 70 clics incrementales.
    if (result.ok) expect(result.opportunities[0]?.estimatedClickGain).toBe(70)
  })

  it('nunca produce una ganancia negativa cuando la keyword ya supera el CTR objetivo', async () => {
    state.curve = [usableTargetBucket(0.01)]
    state.opportunities = [opportunityRow()]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.opportunities[0]?.estimatedClickGain).toBe(0)
  })

  it('ordena por ganancia estimada, no por impresiones brutas', async () => {
    state.curve = [usableTargetBucket(0.2)]
    state.opportunities = [
      // Muchas impresiones pero ya convierte bien ⇒ poco que ganar.
      opportunityRow({ keyword: 'mucho-trafico', impressions: '1000', clicks: '190' }),
      // Menos impresiones pero convierte pésimo ⇒ más upside.
      opportunityRow({ keyword: 'gran-upside', impressions: '900', clicks: '9' })
    ]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.opportunities[0]?.keyword).toBe('gran-upside')
  })
})

describe('readKeywordOpportunities — señales de calidad', () => {
  it('marca quick-win sólo en página 1 (posición ≤ 10)', async () => {
    state.opportunities = [
      opportunityRow({ keyword: 'pagina-1', weighted_position: '9.2' }),
      opportunityRow({ keyword: 'pagina-2', weighted_position: '14.8' })
    ]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      const byKeyword = new Map(result.opportunities.map(item => [item.keyword, item]))

      expect(byKeyword.get('pagina-1')?.quickWin).toBe(true)
      expect(byKeyword.get('pagina-2')?.quickWin).toBe(false)
    }
  })

  it('marca canibalización cuando la query tiene más de una página', async () => {
    state.opportunities = [
      opportunityRow({ keyword: 'una-pagina', competing_pages: '1' }),
      opportunityRow({ keyword: 'dos-paginas', competing_pages: '2' })
    ]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      const byKeyword = new Map(result.opportunities.map(item => [item.keyword, item]))

      expect(byKeyword.get('una-pagina')?.cannibalized).toBe(false)
      // No se descarta: la acción es consolidar, no optimizar.
      expect(byKeyword.get('dos-paginas')?.cannibalized).toBe(true)
      expect(byKeyword.get('dos-paginas')?.competingPages).toBe(2)
    }
  })

  it('respeta el piso estadístico aunque el percentil resuelva más bajo', async () => {
    state.threshold = '2'
    state.opportunities = [opportunityRow()]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)
    // Bajo 10 impresiones la "posición media" no es interpretable.
    if (result.ok) expect(result.impressionsThreshold).toBe(10)
  })

  it('expone la ventana y el umbral aplicados para que el consumer no los adivine', async () => {
    state.opportunities = []

    const result = await readKeywordOpportunities('seot-1', { windowDays: 14 })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.windowDays).toBe(14)
      expect(result.impressionsThreshold).toBeGreaterThanOrEqual(10)
    }
  })
})

/**
 * TASK-1792 — el orden es honesto o dice que no lo es.
 *
 * El defecto original no producía un orden malo: producía la AUSENCIA de orden, sin que nada
 * fallara. Estos tests fijan que la lente nunca vuelva a ordenar por un campo que no
 * discrimina sin declararlo.
 */
describe('readKeywordOpportunities — honestidad del orden y de la curva (TASK-1792)', () => {
  it('con curva utilizable ordena por ganancia y lo declara', async () => {
    state.curve = [usableTargetBucket(0.2)]
    state.opportunities = [
      opportunityRow({ keyword: 'mucho-trafico', impressions: '1000', clicks: '190' }),
      opportunityRow({ keyword: 'gran-upside', impressions: '900', clicks: '9' })
    ]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.ctrCurveSource).toBe('org_measured')
      expect(result.orderedBy).toBe('estimated_click_gain')
      expect(result.opportunities[0]?.keyword).toBe('gran-upside')
      expect(result.curveSampleSize).toEqual({ impressions: 100_000, clicks: 20_000 })
    }
  })

  /**
   * 🔴 EL CASO QUE ROMPÍA LA PANTALLA, con la curva real medida contra PG.
   *
   * Antes: `targetCtr = 0` → ganancia 0 en las 24 filas → `.sort()` no-op. Ahora la lente
   * declara `unusable` y ordena por demanda medida.
   */
  it('con el bucket 75/0 de efeoncepro.com declara `unusable` y NO colapsa la ganancia a cero', async () => {
    state.curve = [efeonceTargetBucket()]
    state.opportunities = [
      opportunityRow({ keyword: 'lejos-pero-masivo', impressions: '900', clicks: '0', weighted_position: '20' }),
      opportunityRow({ keyword: 'cerca-de-pagina-1', impressions: '500', clicks: '0', weighted_position: '8' })
    ]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.ctrCurveSource).toBe('unusable')
      expect(result.orderedBy).toBe('measured_demand')
      // La muestra viaja, para que el consumidor pueda decir POR QUÉ no alcanza.
      expect(result.curveSampleSize).toEqual({ impressions: 75, clicks: 0 })
      // El anti-assert del reader: ni el CTR objetivo ni las ganancias colapsan a cero.
      expect(result.expectedCtrAtTarget).toBeGreaterThan(0)
      expect(result.opportunities.every(row => row.estimatedClickGain > 0)).toBe(true)
      // Y el orden es el declarado: cercanía a página 1 vence al volumen bruto.
      expect(result.opportunities[0]?.keyword).toBe('cerca-de-pagina-1')
    }
  })

  /**
   * El segundo modo de colapso: la curva SÍ es utilizable, pero todas las filas ya convierten
   * por encima de la media objetivo, así que el `Math.max(0, …)` las deja a todas en 0. Un
   * `.sort()` sobre varianza cero preserva el orden de entrada y finge haber ordenado.
   */
  it('si la ganancia no discrimina, ordena por el criterio secundario y lo declara', async () => {
    state.curve = [usableTargetBucket(0.01)]
    state.opportunities = [
      opportunityRow({ keyword: 'lejos', impressions: '900', clicks: '450', weighted_position: '20' }),
      opportunityRow({ keyword: 'cerca', impressions: '500', clicks: '250', weighted_position: '8' })
    ]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      // La curva sí sirve — lo que no discrimina es el campo.
      expect(result.ctrCurveSource).toBe('org_measured')
      expect(result.opportunities.every(row => row.estimatedClickGain === 0)).toBe(true)
      // 🔴 El invariante: varianza cero ⇒ jamás se declara orden por ganancia.
      expect(result.orderedBy).toBe('measured_demand')
      expect(result.opportunities[0]?.keyword).toBe('cerca')
    }
  })

  it('sin ningún bucket en la posición objetivo declara `fallback`, no `unusable`', async () => {
    // Sitio sin señal ni para estimar un nivel: 2 clics no escalan nada.
    state.curve = [curveBucket(12, 500, 2)]
    state.opportunities = [opportunityRow()]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      // Nunca observamos esa posición ≠ la observamos y no alcanza.
      expect(result.ctrCurveSource).toBe('fallback')
      expect(result.curveSampleSize).toBeNull()
      expect(result.orderedBy).toBe('measured_demand')
    }
  })

  /**
   * TASK-1792 Slice 4 — el estado que cierra el salto entre «curva propia» y «tabla prestada».
   *
   * El bucket objetivo no alcanza, pero el AGREGADO del sitio sí tiene muestra para estimar un
   * parámetro: se presta la forma de la referencia y se escala al nivel medido de este sitio.
   * Un parámetro medido en vez de veinte prestados.
   */
  it('con bucket objetivo insuficiente pero nivel estimable, declara la curva calibrada', async () => {
    state.curve = [efeonceTargetBucket(), curveBucket(3, 20_000, 600)]
    state.opportunities = [opportunityRow()]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.ctrCurveSource).toBe('org_level_reference_shape')
      // La muestra del bucket objetivo viaja igual: es lo que explica por qué no se midió ahí.
      expect(result.curveSampleSize).toEqual({ impressions: 75, clicks: 0 })
      expect(result.expectedCtrAtTarget).toBeGreaterThan(0)
      // Sigue sin ordenar por un techo prestado, por muy calibrado que esté.
      expect(result.orderedBy).toBe('measured_demand')
    }
  })

  it('declara la posición objetivo contra la que se calculó el techo', async () => {
    state.curve = [usableTargetBucket(0.1)]
    state.opportunities = [opportunityRow()]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.targetPosition).toBe(5)
  })
})
