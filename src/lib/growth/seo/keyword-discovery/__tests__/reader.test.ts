import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1664 — Reader de discovery.
 *
 * Cubre las reglas de honestidad del DTO: anti-oracle por org, composición en memoria de la
 * lente de mercado (◑) vía el reader canónico de TASK-1661 (nunca SQL directo), la lente GSC
 * medida (●) como campo SEPARADO, el orden por defecto de la spec y los filtros que exigen
 * dato presente (la ausencia nunca se convierte en 0).
 */

vi.mock('server-only', () => ({}))

interface SqlCall {
  sql: string
  params: unknown[]
}

const state = {
  runs: [] as Array<Record<string, unknown>>,
  candidates: [] as Array<Record<string, unknown>>,
  gscRows: [] as Array<{ query: string; impressions: string; weighted_position: string | null }>,
  tracked: [] as Array<{ keyword: string }>,
  actions: [] as Array<Record<string, unknown>>,
  calls: [] as SqlCall[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    state.calls.push({ sql, params })

    if (sql.includes('FROM greenhouse_growth.seo_keyword_discovery_runs')) return state.runs
    if (sql.includes('FROM greenhouse_growth.seo_keyword_discovery_candidates')) return state.candidates
    if (sql.includes('FROM greenhouse_growth.seo_gsc_daily')) return state.gscRows
    if (sql.includes('FROM greenhouse_growth.seo_keyword_set_members')) return state.tracked
    if (sql.includes('FROM greenhouse_growth.seo_keyword_discovery_actions')) return state.actions

    return []
  }
}))

const marketMock = vi.fn()

vi.mock('../../keyword-market-data', () => ({
  normalizeMarketKeyword: (keyword: string) =>
    keyword.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(),
  readKeywordMarketData: (...args: unknown[]) => marketMock(...args)
}))

import { readKeywordDiscovery } from '../reader'

const runRow = (overrides: Record<string, unknown> = {}) => ({
  run_id: 'seokdr-1',
  seo_target_id: 'seot-1',
  source_kind: 'manual',
  status: 'succeeded',
  location_code: '2152',
  language_code: 'es',
  seed_inputs_json: { seeds: [{ keyword: 'pintura', normalizedKeyword: 'pintura', origin: 'manual' }] },
  methods_json: [{ method: 'keyword_suggestions', resultsPerCall: 50 }],
  estimated_cost_usd: '0.02',
  actual_cost_usd: '0.018',
  provider_calls: 2,
  candidate_count: 2,
  error_code: null,
  created_by: 'user-1',
  requested_at: new Date('2026-08-14T12:00:00Z'),
  started_at: new Date('2026-08-14T12:01:00Z'),
  completed_at: new Date('2026-08-14T12:02:00Z'),
  ...overrides
})

const candidateRow = (overrides: Record<string, unknown> = {}) => ({
  candidate_id: 'seokdc-1',
  run_id: 'seokdr-1',
  keyword: 'pintura industrial',
  normalized_keyword: 'pintura industrial',
  seed_keywords_json: ['pintura'],
  source_endpoint: 'keyword_suggestions',
  source_rank: 1,
  captured_at: new Date('2026-08-14T12:01:30Z'),
  ...overrides
})

const marketEmpty = {
  market: 'unavailable' as const,
  byKeyword: new Map(),
  linkBarrierByKeyword: new Map(),
  freshness: { freshKeywords: 0, latestCaptureDate: null }
}

const datum = (normalizedKeyword: string, overrides: Record<string, unknown> = {}) => ({
  normalizedKeyword,
  keyword: normalizedKeyword,
  locationCode: '2152',
  languageCode: 'es',
  searchVolume: 1000,
  keywordDifficulty: 20,
  competition: 0.4,
  competitionLevel: 'medium',
  cpcUsd: 0.5,
  searchIntent: 'commercial',
  searchIntentProbability: 0.8,
  coreKeyword: 'pintura',
  providerLastUpdatedAt: '2026-07-15T00:00:00.000Z',
  avgPageRank: 10,
  avgMainDomainRank: 200,
  avgBacklinks: 5,
  avgReferringDomains: 3,
  ...overrides
})

beforeEach(() => {
  state.runs = []
  state.candidates = []
  state.gscRows = []
  state.tracked = []
  state.actions = []
  state.calls = []
  marketMock.mockReset()
  marketMock.mockResolvedValue(marketEmpty)
})

describe('readKeywordDiscovery — runs', () => {
  it('un runId de otra org responde run_not_found (anti-oracle)', async () => {
    state.runs = []

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-ajeno' })

    expect(result).toEqual({ ok: false, errorCode: 'run_not_found' })
  })

  it('sin runId lista el historial de corridas sin componer candidatos', async () => {
    state.runs = [runRow()]

    const result = await readKeywordDiscovery({ organizationId: 'org-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.runs).toHaveLength(1)
    expect(result.runs[0].estimatedCostUsd).toBe(0.02)
    expect(result.candidates).toHaveLength(0)
    expect(marketMock).not.toHaveBeenCalled()
  })
})

describe('readKeywordDiscovery — composición de candidatos', () => {
  it('compone mercado (◑) por el reader canónico y GSC medido (●) como lente separada', async () => {
    state.runs = [runRow()]
    state.candidates = [candidateRow()]
    state.gscRows = [{ query: 'pintura industrial', impressions: '340', weighted_position: '12.4' }]
    marketMock.mockResolvedValue({
      market: 'available',
      byKeyword: new Map([['pintura industrial', datum('pintura industrial')]]),
      linkBarrierByKeyword: new Map([['pintura industrial', 'low']]),
      freshness: { freshKeywords: 1, latestCaptureDate: '2026-08-13' }
    })

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    const candidate = result.candidates[0]

    expect(candidate.searchVolume).toBe(1000)
    expect(candidate.difficulty).toBe(20)
    expect(candidate.displayMarker).toBe('◑')
    expect(candidate.measuredGsc).toEqual({ impressions: 340, position: 12.4, displayMarker: '●' })
    expect(candidate.linkBarrier).toBe('low')
    expect(result.marketAvailability).toBe('available')
    expect(result.marketFreshness).toBe('2026-08-13')

    // El reader JAMÁS consulta la tabla de mercado directo: pasa por el reader canónico.
    expect(state.calls.some(call => call.sql.includes('seo_keyword_market_data'))).toBe(false)
  })

  it('sin dato de mercado la fila viaja con null, nunca con 0', async () => {
    state.runs = [runRow()]
    state.candidates = [candidateRow()]

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.candidates[0].searchVolume).toBeNull()
    expect(result.candidates[0].difficulty).toBeNull()
    expect(result.marketAvailability).toBe('unavailable')
  })

  it('alreadyTracked refleja el set vigente sin escribirlo', async () => {
    state.runs = [runRow()]
    state.candidates = [candidateRow()]
    state.tracked = [{ keyword: 'Pintura Industrial' }]

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.candidates[0].alreadyTracked).toBe(true)

    const writesToSet = state.calls.filter(
      call => call.sql.includes('seo_keyword_set_members') && !call.sql.trimStart().startsWith('SELECT')
    )

    expect(writesToSet).toHaveLength(0)
  })
})

describe('readKeywordDiscovery — orden y filtros', () => {
  it('ordena: acción pendiente primero, luego match de seed, luego volumen desc', async () => {
    state.runs = [runRow()]
    state.candidates = [
      candidateRow({ candidate_id: 'seokdc-a', keyword: 'accionada', normalized_keyword: 'accionada' }),
      candidateRow({ candidate_id: 'seokdc-b', keyword: 'pintura', normalized_keyword: 'pintura' }),
      candidateRow({ candidate_id: 'seokdc-c', keyword: 'volumen alto', normalized_keyword: 'volumen alto' }),
      candidateRow({ candidate_id: 'seokdc-d', keyword: 'volumen bajo', normalized_keyword: 'volumen bajo' })
    ]
    state.actions = [
      { candidate_id: 'seokdc-a', action_kind: 'dismissed', actor: 'user-1', created_at: new Date('2026-08-14T13:00:00Z') }
    ]
    marketMock.mockResolvedValue({
      market: 'available',
      byKeyword: new Map([
        ['volumen alto', datum('volumen alto', { searchVolume: 9000, coreKeyword: null })],
        ['volumen bajo', datum('volumen bajo', { searchVolume: 10, coreKeyword: null })]
      ]),
      linkBarrierByKeyword: new Map(),
      freshness: { freshKeywords: 2, latestCaptureDate: '2026-08-13' }
    })

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    const order = result.candidates.map(candidate => candidate.candidateId)

    // 'pintura' matchea seed (primero entre pendientes); luego volumen desc; la accionada al final.
    expect(order).toEqual(['seokdc-b', 'seokdc-c', 'seokdc-d', 'seokdc-a'])
  })

  it('auditoría SEO: oportunidad MEDIDA (GSC sin seguir) ordena antes que volumen estimado', async () => {
    state.runs = [runRow()]
    state.candidates = [
      candidateRow({ candidate_id: 'seokdc-est', keyword: 'estimada grande', normalized_keyword: 'estimada grande' }),
      candidateRow({ candidate_id: 'seokdc-med', keyword: 'medida chica', normalized_keyword: 'medida chica' }),
      candidateRow({ candidate_id: 'seokdc-trk', keyword: 'medida seguida', normalized_keyword: 'medida seguida' })
    ]
    state.gscRows = [
      { query: 'medida chica', impressions: '40', weighted_position: '18.0' },
      { query: 'medida seguida', impressions: '900', weighted_position: '4.0' }
    ]
    state.tracked = [{ keyword: 'medida seguida' }]
    marketMock.mockResolvedValue({
      market: 'available',
      byKeyword: new Map([['estimada grande', datum('estimada grande', { searchVolume: 9000, coreKeyword: null })]]),
      linkBarrierByKeyword: new Map(),
      freshness: { freshKeywords: 1, latestCaptureDate: '2026-08-13' }
    })

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    // La keyword que el Space YA recibe (●) y no sigue es la decisión de mayor valor, aunque
    // su volumen estimado sea menor; la ya seguida no salta la fila.
    expect(result.candidates.map(candidate => candidate.candidateId)[0]).toBe('seokdc-med')
  })

  it('auditoría SEO: a igual volumen desempata la barrera de enlaces (low < high < Sin dato), no KD', async () => {
    state.runs = [runRow()]
    state.candidates = [
      candidateRow({ candidate_id: 'seokdc-x', keyword: 'kw x', normalized_keyword: 'kw x' }),
      candidateRow({ candidate_id: 'seokdc-y', keyword: 'kw y', normalized_keyword: 'kw y' }),
      candidateRow({ candidate_id: 'seokdc-z', keyword: 'kw z', normalized_keyword: 'kw z' })
    ]
    marketMock.mockResolvedValue({
      market: 'available',
      byKeyword: new Map([
        // KD invertido a propósito: si el desempate usara difficulty, 'x' (KD 5) iría primero.
        ['kw x', datum('kw x', { searchVolume: 1000, keywordDifficulty: 5, coreKeyword: null })],
        ['kw y', datum('kw y', { searchVolume: 1000, keywordDifficulty: 80, coreKeyword: null })],
        ['kw z', datum('kw z', { searchVolume: 1000, keywordDifficulty: 1, coreKeyword: null })]
      ]),
      linkBarrierByKeyword: new Map([
        ['kw x', 'high'],
        ['kw y', 'low']
        // 'kw z' sin barrera → "Sin dato" ordena al final, jamás como "baja".
      ]),
      freshness: { freshKeywords: 3, latestCaptureDate: '2026-08-13' }
    })

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.candidates.map(candidate => candidate.candidateId)).toEqual(['seokdc-y', 'seokdc-x', 'seokdc-z'])
  })

  it('excludeTracked deja fuera lo ya seguido y el DTO expone cpcUsd/competitionLevel', async () => {
    state.runs = [runRow()]
    state.candidates = [
      candidateRow({ candidate_id: 'seokdc-1', keyword: 'nueva', normalized_keyword: 'nueva' }),
      candidateRow({ candidate_id: 'seokdc-2', keyword: 'ya seguida', normalized_keyword: 'ya seguida' })
    ]
    state.tracked = [{ keyword: 'ya seguida' }]
    marketMock.mockResolvedValue({
      market: 'available',
      byKeyword: new Map([['nueva', datum('nueva', { cpcUsd: 1.35, competitionLevel: 'high' })]]),
      linkBarrierByKeyword: new Map(),
      freshness: { freshKeywords: 1, latestCaptureDate: '2026-08-13' }
    })

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1', excludeTracked: true })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.candidates.map(candidate => candidate.candidateId)).toEqual(['seokdc-1'])
    expect(result.candidates[0].cpcUsd).toBe(1.35)
    expect(result.candidates[0].competitionLevel).toBe('high')
  })

  it('minSearchVolume exige dato presente: null queda excluido por el filtro explícito', async () => {
    state.runs = [runRow()]
    state.candidates = [
      candidateRow({ candidate_id: 'seokdc-1', normalized_keyword: 'con dato', keyword: 'con dato' }),
      candidateRow({ candidate_id: 'seokdc-2', normalized_keyword: 'sin dato', keyword: 'sin dato' })
    ]
    marketMock.mockResolvedValue({
      market: 'available',
      byKeyword: new Map([['con dato', datum('con dato', { searchVolume: 500 })]]),
      linkBarrierByKeyword: new Map(),
      freshness: { freshKeywords: 1, latestCaptureDate: '2026-08-13' }
    })

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1', minSearchVolume: 100 })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.candidates.map(candidate => candidate.candidateId)).toEqual(['seokdc-1'])
  })

  describe('TASK-1694 — clusterConflict: la señal de canibalización contra el set seguido', () => {
    /** El reader lee mercado DOS veces: candidatos primero, set seguido después. */
    const marketByCall = (candidates: Map<string, unknown>, tracked: Map<string, unknown>) => {
      marketMock.mockImplementation(async (input: { keywords: string[] }) => {
        const isTrackedRead = input.keywords.some(keyword => tracked.has(keyword))
        const source = isTrackedRead ? tracked : candidates

        return {
          market: source.size > 0 ? 'available' : 'unavailable',
          byKeyword: source,
          linkBarrierByKeyword: new Map(),
          freshness: { freshKeywords: source.size, latestCaptureDate: '2026-08-13' }
        }
      })
    }

    it('mismo core que una keyword vigente DISTINTA → conflict, con los miembros nombrados', async () => {
      state.runs = [runRow()]
      state.candidates = [
        candidateRow({ candidate_id: 'seokdc-1', keyword: 'pintura para pisos', normalized_keyword: 'pintura para pisos' })
      ]
      state.tracked = [{ keyword: 'pintura pisos' }]

      marketByCall(
        new Map([['pintura para pisos', datum('pintura para pisos', { coreKeyword: 'pintura piso' })]]),
        new Map([['pintura pisos', datum('pintura pisos', { coreKeyword: 'pintura piso' })]])
      )

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      const [candidate] = result.candidates

      expect(candidate.clusterConflict).toEqual({
        status: 'conflict',
        coreKeyword: 'pintura piso',
        trackedMembers: ['pintura pisos'],
        trackedMemberCount: 1
      })
      // 🔴 Señales SEPARADAS: la keyword NO está seguida y aun así choca con el cluster.
      expect(candidate.alreadyTracked).toBe(false)
    })

    it('cores distintos con el set completamente resuelto → clear', async () => {
      state.runs = [runRow()]
      state.candidates = [candidateRow({ candidate_id: 'seokdc-1', keyword: 'barniz', normalized_keyword: 'barniz' })]
      state.tracked = [{ keyword: 'pintura pisos' }]

      marketByCall(
        new Map([['barniz', datum('barniz', { coreKeyword: 'barniz' })]]),
        new Map([['pintura pisos', datum('pintura pisos', { coreKeyword: 'pintura piso' })]])
      )

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates[0].clusterConflict.status).toBe('clear')
    })

    it('🔴 keyword SEGUIDA sin fila de mercado → unknown, JAMÁS clear (nunca preguntamos por ella)', async () => {
      state.runs = [runRow()]
      state.candidates = [candidateRow({ candidate_id: 'seokdc-1', keyword: 'barniz', normalized_keyword: 'barniz' })]
      state.tracked = [{ keyword: 'pintura pisos' }]

      // El set seguido no resolvió su core: el conflicto no está descartado, está sin medir.
      marketByCall(new Map([['barniz', datum('barniz', { coreKeyword: 'barniz' })]]), new Map())

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates[0].clusterConflict.status).toBe('unknown')
    })

    it('🔴 candidato SIN fila de mercado → unknown: no se sabe a qué clúster pertenece', async () => {
      state.runs = [runRow()]
      state.candidates = [candidateRow({ candidate_id: 'seokdc-1', keyword: 'barniz', normalized_keyword: 'barniz' })]
      state.tracked = [{ keyword: 'pintura pisos' }]

      marketByCall(
        new Map(),
        new Map([['pintura pisos', datum('pintura pisos', { coreKeyword: 'pintura piso' })]])
      )

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates[0].clusterConflict).toMatchObject({ status: 'unknown', coreKeyword: null })
    })

    it('🔴 core NULL = la keyword ES su propia canónica: el candidato variante SÍ choca con ella', async () => {
      // Medido contra el store real (923 filas): el proveedor NUNCA emite un core que apunte a
      // la keyword misma — 527 nulos, 396 apuntando a otra, cero autorreferentes. Leer el NULL
      // como "no se sabe" perdería la colisión MÁS probable: la del candidato variante contra
      // la canónica que el target ya sigue.
      state.runs = [runRow()]
      state.candidates = [
        candidateRow({ candidate_id: 'seokdc-1', keyword: 'acrilicos pintura', normalized_keyword: 'acrilicos pintura' })
      ]
      state.tracked = [{ keyword: 'pintura acrilica' }]

      marketByCall(
        new Map([['acrilicos pintura', datum('acrilicos pintura', { coreKeyword: 'pintura acrilica' })]]),
        // La seguida es la canónica del clúster: fila presente, `core_keyword` nulo.
        new Map([['pintura acrilica', datum('pintura acrilica', { coreKeyword: null })]])
      )

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates[0].clusterConflict).toMatchObject({
        status: 'conflict',
        trackedMembers: ['pintura acrilica']
      })
    })

    it('la propia keyword ya seguida no cuenta como conflicto consigo misma', async () => {
      state.runs = [runRow()]
      state.candidates = [
        candidateRow({ candidate_id: 'seokdc-1', keyword: 'pintura pisos', normalized_keyword: 'pintura pisos' })
      ]
      state.tracked = [{ keyword: 'pintura pisos' }]

      marketByCall(
        new Map([['pintura pisos', datum('pintura pisos', { coreKeyword: 'pintura piso' })]]),
        new Map([['pintura pisos', datum('pintura pisos', { coreKeyword: 'pintura piso' })]])
      )

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      // Es identidad, no canibalización: eso ya lo dice `alreadyTracked`.
      expect(result.candidates[0].alreadyTracked).toBe(true)
      expect(result.candidates[0].clusterConflict.status).toBe('clear')
    })

    it('sin nada seguido el veredicto es clear (hecho positivo) y no consulta el set', async () => {
      state.runs = [runRow()]
      state.candidates = [candidateRow()]
      state.tracked = []

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates[0].clusterConflict.status).toBe('clear')
      // Una sola lectura de mercado: la del set seguido no ocurre si no hay set.
      expect(marketMock).toHaveBeenCalledTimes(1)
    })

    it('el conflicto se resuelve sin gastar: cero llamadas al proveedor', async () => {
      state.runs = [runRow()]
      state.candidates = [candidateRow()]
      state.tracked = [{ keyword: 'otra keyword' }]

      await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      // Sólo el reader canónico del store de TASK-1661 (candidatos + set seguido). Nada más.
      expect(marketMock).toHaveBeenCalledTimes(2)
    })

    it('trackedMembers nombra hasta 5 pero trackedMemberCount dice el total', async () => {
      state.runs = [runRow()]
      state.candidates = [candidateRow({ candidate_id: 'seokdc-1', keyword: 'nueva', normalized_keyword: 'nueva' })]

      const trackedKeywords = ['t1', 't2', 't3', 't4', 't5', 't6', 't7']

      state.tracked = trackedKeywords.map(keyword => ({ keyword }))

      marketByCall(
        new Map([['nueva', datum('nueva', { coreKeyword: 'core compartido' })]]),
        new Map(trackedKeywords.map(keyword => [keyword, datum(keyword, { coreKeyword: 'core compartido' })]))
      )

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates[0].clusterConflict.trackedMembers).toHaveLength(5)
      expect(result.candidates[0].clusterConflict.trackedMemberCount).toBe(7)
    })
  })

  describe('TASK-1694 — la política de inclusión de la corrida es interpretable después', () => {
    it('una corrida NUEVA expone la política que registró su snapshot', async () => {
      state.runs = [
        runRow({
          methods_json: [
            { method: 'keyword_suggestions', resultsPerCall: 50, volumePolicy: 'all' },
            { method: 'related_keywords', resultsPerCall: 50, volumePolicy: 'all' }
          ]
        })
      ]

      const result = await readKeywordDiscovery({ organizationId: 'org-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.runs[0].methods.map(spec => spec.volumePolicy)).toEqual(['all', 'all'])
    })

    it('🔴 una corrida ANTERIOR sin el campo se lee con el default HISTÓRICO por método', async () => {
      state.runs = [
        runRow({
          methods_json: [
            { method: 'keyword_suggestions', resultsPerCall: 50 },
            { method: 'keyword_ideas', resultsPerCall: 50 },
            { method: 'related_keywords', resultsPerCall: 50 },
            { method: 'keywords_for_site', resultsPerCall: 50 }
          ]
        })
      ]

      const result = await readKeywordDiscovery({ organizationId: 'org-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      // El default de lectura REPRODUCE la historia, no la reescribe: sugerencias e ideas sí
      // filtraban en el proveedor; relacionadas y dominio no.
      expect(result.runs[0].methods.map(spec => spec.volumePolicy)).toEqual([
        'positive_volume_only',
        'positive_volume_only',
        'all',
        'all'
      ])
    })
  })

  describe('TASK-1694 — un candidato es una keyword, no una fila de procedencia', () => {
    const twoProvenances = () => {
      state.runs = [runRow()]
      state.candidates = [
        candidateRow({
          candidate_id: 'seokdc-rel',
          normalized_keyword: 'pintura epoxica',
          keyword: 'pintura epoxica',
          source_endpoint: 'related_keywords',
          source_rank: 7,
          seed_keywords_json: ['pintura']
        }),
        candidateRow({
          candidate_id: 'seokdc-sug',
          normalized_keyword: 'pintura epoxica',
          keyword: 'pintura epoxica',
          source_endpoint: 'keyword_suggestions',
          source_rank: 2,
          seed_keywords_json: ['pintura industrial']
        })
      ]
    }

    it('la misma keyword hallada por dos métodos colapsa a UNA fila con las dos procedencias', async () => {
      twoProvenances()

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates).toHaveLength(1)
      expect(result.totalCandidates).toBe(1)

      const [candidate] = result.candidates

      expect(candidate.candidateIds).toEqual(['seokdc-sug', 'seokdc-rel'])
      expect(candidate.provenance).toHaveLength(2)
      // Representante = menor sourceRank; los escalares apuntan a él.
      expect(candidate.candidateId).toBe('seokdc-sug')
      expect(candidate.sourceEndpoint).toBe('keyword_suggestions')
      expect(candidate.sourceRank).toBe(2)
      // La procedencia viaja íntegra, con sus seeds propias por fila.
      expect(candidate.provenance.map(entry => entry.sourceEndpoint)).toEqual([
        'keyword_suggestions',
        'related_keywords'
      ])
      expect(candidate.provenance[1].seedKeywords).toEqual(['pintura'])
    })

    it('con sourceRank empatado desempata el candidateId ascendente', async () => {
      state.runs = [runRow()]
      state.candidates = [
        candidateRow({ candidate_id: 'seokdc-z', normalized_keyword: 'kw', keyword: 'kw', source_rank: 3 }),
        candidateRow({
          candidate_id: 'seokdc-a',
          normalized_keyword: 'kw',
          keyword: 'kw',
          source_endpoint: 'related_keywords',
          source_rank: 3
        })
      ]

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates[0].candidateId).toBe('seokdc-a')
      expect(result.candidates[0].candidateIds).toEqual(['seokdc-a', 'seokdc-z'])
    })

    it('un sourceRank nulo nunca gana la representación frente a uno medido', async () => {
      state.runs = [runRow()]
      state.candidates = [
        candidateRow({ candidate_id: 'seokdc-a', normalized_keyword: 'kw', keyword: 'kw', source_rank: null }),
        candidateRow({
          candidate_id: 'seokdc-z',
          normalized_keyword: 'kw',
          keyword: 'kw',
          source_endpoint: 'related_keywords',
          source_rank: 9
        })
      ]

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates[0].candidateId).toBe('seokdc-z')
    })

    it('latestAction es la MÁS RECIENTE entre todas las procedencias fusionadas', async () => {
      twoProvenances()
      state.actions = [
        {
          candidate_id: 'seokdc-rel',
          action_kind: 'promoted_to_tracking',
          actor: 'user-2',
          created_at: new Date('2026-08-15T10:00:00Z')
        },
        {
          candidate_id: 'seokdc-sug',
          action_kind: 'dismissed',
          actor: 'user-1',
          created_at: new Date('2026-08-14T10:00:00Z')
        }
      ]

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      // La decisión se registró sobre la procedencia que NO quedó de representante y aun así
      // manda: el reader sigue siendo la autoridad de "esta keyword ya se decidió".
      expect(result.candidates[0].latestAction).toMatchObject({ kind: 'promoted_to_tracking', actor: 'user-2' })
    })

    it('el filtro sourceEndpoint deja la procedencia restringida a lo pedido', async () => {
      twoProvenances()
      // El filtro es SQL-side: el mock devuelve sólo lo que ese endpoint produjo.
      state.candidates = state.candidates.filter(row => row.source_endpoint === 'related_keywords')

      const result = await readKeywordDiscovery({
        organizationId: 'org-1',
        runId: 'seokdr-1',
        sourceEndpoint: 'related_keywords'
      })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates[0].candidateIds).toEqual(['seokdc-rel'])
    })

    it('dos lecturas idénticas devuelven el mismo representante y el mismo orden', async () => {
      state.runs = [runRow()]
      state.candidates = [
        candidateRow({ candidate_id: 'seokdc-b1', normalized_keyword: 'kw b', keyword: 'kw b', source_rank: 4 }),
        candidateRow({ candidate_id: 'seokdc-a1', normalized_keyword: 'kw a', keyword: 'kw a', source_rank: 1 }),
        candidateRow({
          candidate_id: 'seokdc-a2',
          normalized_keyword: 'kw a',
          keyword: 'kw a',
          source_endpoint: 'keyword_ideas',
          source_rank: 6
        })
      ]

      const first = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })
      const second = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(first.ok && second.ok).toBe(true)

      if (!first.ok || !second.ok) return

      expect(first.candidates.map(candidate => candidate.candidateId)).toEqual(
        second.candidates.map(candidate => candidate.candidateId)
      )
      expect(first.candidates.map(candidate => candidate.candidateIds)).toEqual(
        second.candidates.map(candidate => candidate.candidateIds)
      )
    })

    it('la unión de todas las páginas coincide con totalCandidates, sin repetidos ni faltantes', async () => {
      state.runs = [runRow()]
      state.candidates = [
        candidateRow({ candidate_id: 'c1', normalized_keyword: 'kw 1', keyword: 'kw 1', source_rank: 1 }),
        candidateRow({ candidate_id: 'c1b', normalized_keyword: 'kw 1', keyword: 'kw 1', source_rank: 5 }),
        candidateRow({ candidate_id: 'c2', normalized_keyword: 'kw 2', keyword: 'kw 2', source_rank: 2 }),
        candidateRow({ candidate_id: 'c3', normalized_keyword: 'kw 3', keyword: 'kw 3', source_rank: 3 })
      ]

      const page1 = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1', limit: 2 })

      expect(page1.ok).toBe(true)

      if (!page1.ok) return

      expect(page1.totalCandidates).toBe(3)
      expect(page1.nextCursor).toBe('2')

      const page2 = await readKeywordDiscovery({
        organizationId: 'org-1',
        runId: 'seokdr-1',
        limit: 2,
        cursor: page1.nextCursor
      })

      expect(page2.ok).toBe(true)

      if (!page2.ok) return

      const union = [...page1.candidates, ...page2.candidates].map(candidate => candidate.normalizedKeyword)

      expect(page2.nextCursor).toBeNull()
      expect(new Set(union).size).toBe(3)
      expect(union).toHaveLength(page1.totalCandidates)
    })
  })

  describe('TASK-1694 — la barrera de enlaces decide; la dificultad cruda ya no', () => {
    const threeBarriers = () => {
      state.runs = [runRow()]
      state.candidates = [
        candidateRow({ candidate_id: 'seokdc-low', keyword: 'kw low', normalized_keyword: 'kw low' }),
        candidateRow({ candidate_id: 'seokdc-high', keyword: 'kw high', normalized_keyword: 'kw high' }),
        candidateRow({ candidate_id: 'seokdc-unknown', keyword: 'kw unknown', normalized_keyword: 'kw unknown' }),
        candidateRow({ candidate_id: 'seokdc-nomarket', keyword: 'kw nomarket', normalized_keyword: 'kw nomarket' })
      ]
      marketMock.mockResolvedValue({
        market: 'available',
        byKeyword: new Map([
          ['kw low', datum('kw low', { coreKeyword: null })],
          ['kw high', datum('kw high', { coreKeyword: null })],
          ['kw unknown', datum('kw unknown', { coreKeyword: null })]
        ]),
        linkBarrierByKeyword: new Map([
          ['kw low', 'low'],
          ['kw high', 'high'],
          ['kw unknown', 'unknown']
        ]),
        freshness: { freshKeywords: 3, latestCaptureDate: '2026-08-13' }
      })
    }

    it('maxLinkBarrier excluye la barrera Alta y deja pasar low/medium', async () => {
      threeBarriers()

      const result = await readKeywordDiscovery({
        organizationId: 'org-1',
        runId: 'seokdr-1',
        maxLinkBarrier: 'medium'
      })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates.map(candidate => candidate.candidateId)).toEqual(['seokdc-low'])
    })

    it('🔴 "Sin dato" no es "Baja": unknown y sin-fila-de-mercado quedan fuera por default', async () => {
      threeBarriers()

      const result = await readKeywordDiscovery({
        organizationId: 'org-1',
        runId: 'seokdr-1',
        maxLinkBarrier: 'high'
      })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      // 'high' es el techo MÁS permisivo del vocabulario y aun así no arrastra lo no medido.
      expect(result.candidates.map(candidate => candidate.candidateId).sort()).toEqual(['seokdc-high', 'seokdc-low'])
    })

    it('includeUnknownBarrier explícito incorpora lo no medido (unknown y sin fila)', async () => {
      threeBarriers()

      const result = await readKeywordDiscovery({
        organizationId: 'org-1',
        runId: 'seokdr-1',
        maxLinkBarrier: 'low',
        includeUnknownBarrier: true
      })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.candidates.map(candidate => candidate.candidateId).sort()).toEqual([
        'seokdc-low',
        'seokdc-nomarket',
        'seokdc-unknown'
      ])
    })

    it('maxDifficulty ya no reduce filas y viaja declarado en ignoredFilters', async () => {
      state.runs = [runRow()]
      state.candidates = [
        candidateRow({ candidate_id: 'seokdc-facil', keyword: 'facil', normalized_keyword: 'facil' }),
        candidateRow({ candidate_id: 'seokdc-dificil', keyword: 'dificil', normalized_keyword: 'dificil' })
      ]
      marketMock.mockResolvedValue({
        market: 'available',
        byKeyword: new Map([
          ['facil', datum('facil', { keywordDifficulty: 5, coreKeyword: null })],
          ['dificil', datum('dificil', { keywordDifficulty: 90, coreKeyword: null })]
        ]),
        linkBarrierByKeyword: new Map(),
        freshness: { freshKeywords: 2, latestCaptureDate: '2026-08-13' }
      })

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1', maxDifficulty: 20 })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      // Fail-safe: devuelve MÁS de lo pedido y lo dice, en vez del subconjunto equivocado en silencio.
      expect(result.totalCandidates).toBe(2)
      expect(result.ignoredFilters).toEqual([
        { filter: 'maxDifficulty', reason: 'non_decisional_link_barrier_is_canonical', replacement: 'maxLinkBarrier' }
      ])
    })

    it('sin maxDifficulty el contrato no anuncia filtros ignorados', async () => {
      state.runs = [runRow()]
      state.candidates = [candidateRow()]

      const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.ignoredFilters).toEqual([])
    })

    it('el historial de corridas (sin runId) también declara el filtro ignorado', async () => {
      state.runs = [runRow()]

      const result = await readKeywordDiscovery({ organizationId: 'org-1', maxDifficulty: 20 })

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.ignoredFilters).toHaveLength(1)
    })
  })

  it('pagina con limit + cursor y reporta el total', async () => {
    state.runs = [runRow()]
    state.candidates = [
      candidateRow({ candidate_id: 'seokdc-1', normalized_keyword: 'a', keyword: 'a' }),
      candidateRow({ candidate_id: 'seokdc-2', normalized_keyword: 'b', keyword: 'b' }),
      candidateRow({ candidate_id: 'seokdc-3', normalized_keyword: 'c', keyword: 'c' })
    ]

    const first = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1', limit: 2 })

    expect(first.ok).toBe(true)

    if (!first.ok) return

    expect(first.candidates).toHaveLength(2)
    expect(first.totalCandidates).toBe(3)
    expect(first.nextCursor).toBe('2')

    const second = await readKeywordDiscovery({
      organizationId: 'org-1',
      runId: 'seokdr-1',
      limit: 2,
      cursor: first.nextCursor
    })

    expect(second.ok).toBe(true)

    if (!second.ok) return

    expect(second.candidates).toHaveLength(1)
    expect(second.nextCursor).toBeNull()
  })
})
