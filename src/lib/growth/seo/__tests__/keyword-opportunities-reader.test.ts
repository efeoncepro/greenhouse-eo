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
  curve: [] as Array<{ position_bucket: string; ctr: string }>,
  thrown: null as Error | null
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string) => {
    if (state.thrown) throw state.thrown
    if (sql.includes('FROM greenhouse_growth.seo_targets')) return state.target
    if (sql.includes('PERCENTILE_CONT')) return [{ threshold: state.threshold }]
    if (sql.includes('position_bucket')) return state.curve

    return state.opportunities
  }
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: () => undefined }))

import { readKeywordOpportunities } from '../keyword-opportunities-reader'

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

  it('declara el mercado no disponible mientras TASK-1300 no aterrice, sin perder valor', async () => {
    state.opportunities = [opportunityRow()]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.market).toBe('unavailable')
      // El striking-distance NO depende del mercado: sigue habiendo oportunidad.
      expect(result.opportunities).toHaveLength(1)
      expect(result.opportunities[0]?.searchVolume).toBeNull()
    }
  })
})

describe('readKeywordOpportunities — score', () => {
  it('estima la ganancia con la curva de CTR de la PROPIA organización', async () => {
    // La org convierte 10% en posición 5; la keyword hoy convierte 5% (70/1400).
    state.curve = [{ position_bucket: '5', ctr: '0.10' }]
    state.opportunities = [opportunityRow()]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)
    // 1400 × (0.10 − 0.05) = 70 clics incrementales.
    if (result.ok) expect(result.opportunities[0]?.estimatedClickGain).toBe(70)
  })

  it('nunca produce una ganancia negativa cuando la keyword ya supera el CTR objetivo', async () => {
    state.curve = [{ position_bucket: '5', ctr: '0.01' }]
    state.opportunities = [opportunityRow()]

    const result = await readKeywordOpportunities('seot-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.opportunities[0]?.estimatedClickGain).toBe(0)
  })

  it('ordena por ganancia estimada, no por impresiones brutas', async () => {
    state.curve = [{ position_bucket: '5', ctr: '0.20' }]
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
