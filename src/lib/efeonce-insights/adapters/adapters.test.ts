import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AiVisibilityContracts from '@/lib/growth/ai-visibility/contracts'
import type * as MetricRegistry from '@/lib/ico-engine/metric-registry'

import { questionOfMetric } from '../presentation/content-contract'
import { resolveInsightWindows } from '../window'

/**
 * TASK-1962 — gate de mantenimiento del informe: todo hecho que un adapter emite responde a una pregunta del contrato de
 * contenido (`presentation/content-contract.ts`). Un dato nuevo sin su regla rompe aquí, no en el informe del cliente.
 */
const expectContentContract = (facts: ReadonlyArray<{ module: 'seo' | 'aeo' | 'ico'; metricId: string }>) => {
  const orphans = facts.filter(fact => questionOfMetric(fact.module, fact.metricId) === null).map(fact => `${fact.module}:${fact.metricId}`)

  expect(orphans, 'métricas sin contrato de contenido').toEqual([])
}

/**
 * TASK-1845 — adapters con readers mockeados: cubren unsupported_window (grano), método/gate
 * del grader, RpA suppressed, OTD con denominador, null ≠ cero y el enlace comparisonFactId.
 * El SQL real de los readers se ejercita en sus propios dominios y en el live test.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const seoMocks = vi.hoisted(() => ({
  isSeoModuleEnabled: vi.fn(() => true),
  resolveUnambiguousSeoTarget: vi.fn(),
  readSeoOverviewKpisForWindow: vi.fn(),
  readRankEvolution: vi.fn(),
  readDomainOverviewForTarget: vi.fn(),
  readSeoWindowMovers: vi.fn(),
  readSeoWorkQueue: vi.fn(),
  readSeoOverviewConnection: vi.fn()
}))

vi.mock('@/lib/growth/seo/flags', () => ({ isSeoModuleEnabled: seoMocks.isSeoModuleEnabled }))
vi.mock('@/lib/growth/seo/resolve-target', () => ({ resolveUnambiguousSeoTarget: seoMocks.resolveUnambiguousSeoTarget }))
vi.mock('@/lib/growth/seo/overview/read-overview-kpis', () => ({ readSeoOverviewKpisForWindow: seoMocks.readSeoOverviewKpisForWindow }))
vi.mock('@/lib/growth/seo/rank-evolution-reader', () => ({ readRankEvolution: seoMocks.readRankEvolution }))
vi.mock('@/lib/growth/seo/domain-overview/reader', () => ({ readDomainOverviewForTarget: seoMocks.readDomainOverviewForTarget }))
vi.mock('@/lib/growth/seo/overview/read-window-movers', () => ({ readSeoWindowMovers: seoMocks.readSeoWindowMovers }))
vi.mock('@/lib/growth/seo/work-queue/reader', () => ({ readSeoWorkQueue: seoMocks.readSeoWorkQueue }))
vi.mock('@/lib/growth/seo/overview/read-overview-connection', () => ({ readSeoOverviewConnection: seoMocks.readSeoOverviewConnection }))

const aeoMocks = vi.hoisted(() => ({ readClientGraderReport: vi.fn() }))

vi.mock('@/lib/growth/ai-visibility/client/command', () => ({
  readClientGraderReport: aeoMocks.readClientGraderReport,
  ClientGraderReportError: class ClientGraderReportError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  }
}))

const icoMocks = vi.hoisted(() => ({ readSpaceMetrics: vi.fn(), runGreenhousePostgresQuery: vi.fn() }))

vi.mock('@/lib/ico-engine/read-metrics', () => ({ readSpaceMetrics: icoMocks.readSpaceMetrics }))
vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: icoMocks.runGreenhousePostgresQuery }))

const NOW = new Date('2026-09-15T12:00:00.000Z')

const month = (start: string, end: string, comparison: 'none' | 'previous_period' = 'none') =>
  resolveInsightWindows({ start, endExclusive: end, timeZone: 'UTC' }, { kind: comparison }, NOW)

const gscWindow = (clicks: number, impressions: number, coveredDays: number, asOf: string | null) => ({
  totals: { clicks, impressions, position: impressions > 0 ? 12.345 : null, ctr: impressions > 0 ? clicks / impressions : null },
  series: [],
  servedFrom: asOf ? '2026-08-01' : null,
  servedTo: asOf,
  coveredDays,
  provenance: [{ section: '*', lens: 'measured', source: 'gsc', capturedAt: asOf }]
})

describe('SEO adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    seoMocks.isSeoModuleEnabled.mockReturnValue(true)
    seoMocks.resolveUnambiguousSeoTarget.mockResolvedValue({ target: { seoTargetId: 'tgt-1', rootDomain: 'x.cl', locationCode: '2152', languageCode: 'es', market: 'CL' }, conflict: null })
    seoMocks.readRankEvolution.mockResolvedValue({ ok: true, seoTargetId: 'tgt-1', organizationId: 'org', engine: 'google', device: 'desktop', range: { from: '2026-06-01', to: '2026-09-14', days: 106 }, source: 'postgres', series: [
      { keyword: 'a', points: [{ date: '2026-07-15', position: 3, url: null }, { date: '2026-08-20', position: 8, url: null }] },
      { keyword: 'b', points: [{ date: '2026-08-02', position: 14, url: null }] },
      { keyword: 'c', points: [{ date: '2026-09-01', position: 1, url: null }] }
    ], provenance: [] })
    seoMocks.readDomainOverviewForTarget.mockResolvedValue({ ok: true, subject: 'x.cl', capturedAt: '2026-09-01', etvMethodology: { version: 'improved_layout_clickstream_v2' }, history: [{ month: '2026-08', organicEtv: 1200 }, { month: '2026-07', organicEtv: 1000 }] })
    seoMocks.readSeoOverviewConnection.mockResolvedValue({ state: 'connected', dataAsOf: '2026-08-31' })
    seoMocks.readSeoWorkQueue.mockResolvedValue({
      ok: true,
      snapshot: { snapshotId: 'seowqs-1', organizationId: 'org', seoTargetId: 'tgt-1', priorityScoreVersion: 'v2', windowDays: 28, itemCount: 40, computedAt: '2026-09-02T13:00:00.000Z', expiresAt: '2026-09-03T13:00:00.000Z' },
      items: [
        { itemId: 'i1', rank: 1, origin: 'gsc_striking_distance', keyword: 'barniz para madera', targetUrl: 'https://x.cl/barniz', recommendedVerb: 'optimize', scoreBasis: 'measured_incremental_clicks', scoreBand: 1, priorityScore: 75.88, breakdown: { impressions: 10522, clicks: 17, currentCtr: 0.0016, weightedPosition: 8.36, targetPosition: 5, expectedCtrAtTarget: 0.009, ctrCurveSource: 'org_measured', curveSampleImpressions: 1, curveSampleClicks: 1, windowDays: 28, incrementalClicks: 76, basisReason: 'r' }, evidenceRef: 'e', sourceScoreVersion: null },
        { itemId: 'i2', rank: 2, origin: 'consolidation', keyword: 'pintura para exteriores', targetUrl: 'https://x.cl/exteriores', recommendedVerb: 'consolidate', scoreBasis: 'measured_without_curve', scoreBand: 2, priorityScore: null, breakdown: { impressions: 3000, clicks: 9, currentCtr: null, weightedPosition: 12.1, targetPosition: 5, expectedCtrAtTarget: null, ctrCurveSource: 'not_applicable', curveSampleImpressions: null, curveSampleClicks: null, windowDays: 28, incrementalClicks: null, basisReason: 'r', competingPages: 3 }, evidenceRef: 'e', sourceScoreVersion: null }
      ],
      originHealth: [], priorityScoreVersion: 'v2', asOf: '2026-09-02T13:00:00.000Z', staleness: 'fresh', nextCursor: null, provenance: []
    })
    seoMocks.readSeoWindowMovers.mockImplementation(async (_org: string, input: { dimension: 'query' | 'page' }) => ({
      ok: true,
      dimension: input.dimension,
      totalClicks: 500,
      previousTotalClicks: 400,
      movers: input.dimension === 'query'
        ? [{ key: 'pintura 19 litros', clicks: 120, previousClicks: 60, impressions: 900, previousImpressions: 800 }, { key: 'x marca', clicks: 30, previousClicks: 50, impressions: 300, previousImpressions: 310 }]
        : [{ key: 'https://x.cl/', clicks: 300, previousClicks: 250, impressions: 9000, previousImpressions: 8000 }]
    }))
  })

  it('TASK-1962 — con v2 y período anterior, las consultas y páginas que más movieron los clics son hechos con su comparable', async () => {
    seoMocks.readSeoOverviewKpisForWindow.mockImplementation(async (_org: string, window: { from: string }) => window.from === '2026-08-01' ? gscWindow(500, 20000, 31, '2026-08-31') : gscWindow(400, 18000, 31, '2026-07-31'))
    const { seoReportAdapter, pageLabelOf } = await import('./seo-adapter')
    const windows = month('2026-08-01', '2026-09-01', 'previous_period')
    const result = await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: windows.comparison, projectIds: [], editorialV2: true })

    const top = result.facts.find(fact => fact.factId === 'seo.driver.query.clicks.2026-08-01_2026-09-01.1')!

    expect(top).toMatchObject({ label: 'pintura 19 litros', value: 120, unit: 'count', comparisonFactId: 'seo.driver.query.clicks.2026-07-01_2026-08-01.1', dimension: { query: 'pintura 19 litros', rank: '1' } })
    expect(result.facts.find(fact => fact.factId === top.comparisonFactId)).toMatchObject({ value: 60, comparisonFactId: null })
    // La página se rotula con su ruta; la raíz es la página de inicio.
    expect(result.facts.find(fact => fact.metricId === 'driver.page.clicks' && fact.value === 300)!.label).toBe('Página de inicio')
    expect(pageLabelOf('https://x.cl/colores/grises/')).toBe('/colores/grises')
    // Una ruta que no cabe en la columna del informe se nombra por su último tramo (Berel, septiembre 2026).
    expect(pageLabelOf('https://x.cl/sites/default/files/2025-06/FT_PINTURA%20AUTOENFRIANTE.pdf')).toBe('…/FT_PINTURA AUTOENFRIANTE.pdf')
    expect(result.sources.some(source => source.reader === 'readSeoWindowMovers')).toBe(true)
    // Aportes al cambio de clics: cada consulta más el resto suman exactamente el cambio total (500 − 400).
    const deltas = result.facts.filter(fact => fact.metricId === 'driver.query.delta' && fact.window.start === '2026-08-01')

    expect(deltas.map(fact => [fact.label, fact.value])).toEqual([['pintura 19 litros', 60], ['x marca', -20], ['Resto de consultas', 60]])
    expect(deltas.reduce((sum, fact) => sum + fact.value!, 0)).toBe(100)
    // Bloques de 7 días: agosto tiene 5 (1–7 … 29–31), cada uno con su par del período anterior.
    const weeks = result.facts.filter(fact => fact.metricId.startsWith('clicks_week.') && fact.window.start >= '2026-08-01')

    expect(weeks.map(fact => fact.label)).toEqual(['1–7 ago', '8–14 ago', '15–21 ago', '22–28 ago', '29–31 ago'])
    expect(weeks[0]!.comparisonFactId).toMatch(/^seo\.clicks_week\.1\.2026-07-01/)
    expectContentContract(result.facts)

    // Sin período anterior no hay qué descomponer, y sin v2 la evidencia queda igual que antes.
    const noComparison = await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [], editorialV2: true })
    const v1 = await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: windows.comparison, projectIds: [] })

    expect(noComparison.facts.some(fact => fact.metricId.startsWith('driver.'))).toBe(false)
    expect(v1.facts.some(fact => fact.metricId.startsWith('driver.'))).toBe(false)
  })

  it('TASK-1962 — oportunidades de la cola SEO (sólo orígenes propios) como hechos de plan, y Search Console sin conectar', async () => {
    seoMocks.readSeoOverviewKpisForWindow.mockImplementation(async () => gscWindow(500, 20000, 31, '2026-08-31'))
    const { seoReportAdapter } = await import('./seo-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [], editorialV2: true })

    // La cola se pide filtrada a orígenes propios: nunca competidores ni candidatos de descubrimiento.
    expect(seoMocks.readSeoWorkQueue).toHaveBeenCalledWith('tgt-1', { origins: ['gsc_striking_distance', 'consolidation', 'declared_target'], limit: 5 })
    expect(result.facts.find(fact => fact.factId === 'seo.opportunity.1.ceiling')).toMatchObject({ value: 76, observation: 'estimated', dimension: { keyword: 'barniz para madera', page: '/barniz', verb: 'optimize', rank: '1' } })
    expect(result.facts.find(fact => fact.factId === 'seo.opportunity.1.target_position')).toMatchObject({ value: 5, role: 'reference' })
    // Banda 2: sin techo en clics (nunca un 0 de relleno).
    expect(result.facts.some(fact => fact.factId === 'seo.opportunity.2.ceiling')).toBe(false)
    expectContentContract(result.facts)

    // Sin la conexión OAuth, la ausencia de capturas es `not_connected` (una petición), no «sin datos».
    seoMocks.readSeoOverviewKpisForWindow.mockImplementation(async () => gscWindow(0, 0, 0, null))
    seoMocks.readSeoOverviewConnection.mockResolvedValue({ state: 'not_connected', dataAsOf: null })
    const disconnected = await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [], editorialV2: true })

    expect(disconnected.rejections).toEqual(expect.arrayContaining([expect.objectContaining({ metricId: 'gsc', reason: 'not_connected' })]))
  })

  it('TASK-1962 — un reader de causas sin datos se declara como límite, no como silencio', async () => {
    seoMocks.readSeoOverviewKpisForWindow.mockImplementation(async () => gscWindow(500, 20000, 31, '2026-08-31'))
    seoMocks.readSeoWindowMovers.mockResolvedValue({ ok: false, errorCode: 'no_data' })
    const { seoReportAdapter } = await import('./seo-adapter')
    const windows = month('2026-08-01', '2026-09-01', 'previous_period')
    const result = await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: windows.comparison, projectIds: [], editorialV2: true })

    expect(result.rejections).toEqual(expect.arrayContaining([expect.objectContaining({ metricId: 'driver.query', reason: 'insufficient_data' }), expect.objectContaining({ metricId: 'driver.page', reason: 'insufficient_data' })]))
  })

  it('produce hechos GSC/rank/ETV con unidad, población, cobertura, asOf, método y comparisonFactId', async () => {
    seoMocks.readSeoOverviewKpisForWindow.mockImplementation(async (_org: string, window: { from: string }) => window.from === '2026-08-01' ? gscWindow(500, 20000, 31, '2026-08-31') : gscWindow(400, 18000, 31, '2026-07-31'))
    const { seoReportAdapter } = await import('./seo-adapter')
    const windows = month('2026-08-01', '2026-09-01', 'previous_period')
    const result = await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: windows.comparison, projectIds: [] })

    const clicks = result.facts.find(fact => fact.factId === 'seo.clicks.2026-08-01_2026-09-01')!
    const prevClicks = result.facts.find(fact => fact.factId === 'seo.clicks.2026-07-01_2026-08-01')!
    const ctr = result.facts.find(fact => fact.factId === 'seo.ctr.2026-08-01_2026-09-01')!
    const pageOne = result.facts.find(fact => fact.factId === 'seo.page_one_keywords.2026-08-01_2026-09-01')!
    const etv = result.facts.find(fact => fact.factId === 'seo.organic_etv.2026-08-01_2026-09-01.2026-08')!

    expect(clicks).toMatchObject({ value: 500, unit: 'count', comparisonFactId: prevClicks.factId, freshness: { asOf: '2026-08-31' }, coverage: { kind: 'complete' }, method: { version: 'seo_measurement_v1' } })
    expect(ctr).toMatchObject({ value: 2.5, unit: 'percent', numerator: 500, denominator: 20000 })
    // rank: sólo puntos DENTRO de la ventana; keyword c (sept) queda fuera; a=8 (≤10), b=14
    expect(pageOne).toMatchObject({ value: 1, numerator: 1, denominator: 2 })
    expect(etv).toMatchObject({ value: 1200, unit: 'visits_estimated', observation: 'estimated', method: { version: 'improved_layout_clickstream_v2' }, comparisonFactId: 'seo.organic_etv.2026-07-01_2026-08-01.2026-07' })
    expect(result.rejections).toEqual([])
    expect(result.sources.map(source => source.reader)).toEqual(['readSeoOverviewKpisForWindow', 'readRankEvolution', 'readDomainOverviewForTarget', 'readSeoOverviewKpisForWindow', 'readRankEvolution', 'readDomainOverviewForTarget'])
    // TASK-1888 — Search Console, ranking y ETV miden Google: todo hecho SEO lleva el canal.
    expect(new Set(result.facts.map(fact => fact.channelId))).toEqual(new Set(['google']))
    // Sin v2, ningún hecho lleva dirección (evidencia v1 idéntica).
    expect(result.facts.some(fact => fact.dimension?.direction !== undefined)).toBe(false)
    expectContentContract(result.facts)
  })

  it('SEO con v2: la posición media (y su comparable) lleva lower_is_better; las demás métricas quedan neutras', async () => {
    seoMocks.readSeoOverviewKpisForWindow.mockImplementation(async (_org: string, window: { from: string }) => window.from === '2026-08-01' ? gscWindow(500, 20000, 31, '2026-08-31') : gscWindow(400, 18000, 31, '2026-07-31'))
    const { seoReportAdapter } = await import('./seo-adapter')
    const windows = month('2026-08-01', '2026-09-01', 'previous_period')
    const result = await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: windows.comparison, projectIds: [], editorialV2: true })
    const directions = new Map(result.facts.map(fact => [fact.factId, fact.dimension?.direction]))

    expect(directions.get('seo.position.2026-08-01_2026-09-01')).toBe('lower_is_better')
    expect(directions.get('seo.position.2026-07-01_2026-08-01')).toBe('lower_is_better')
    expect(result.facts.filter(fact => fact.metricId !== 'position').every(fact => fact.dimension?.direction === undefined)).toBe(true)
  })

  it('ventana no mensual: ETV declara unsupported_window con alternativa mensual; GSC sí sirve', async () => {
    seoMocks.readSeoOverviewKpisForWindow.mockResolvedValue(gscWindow(10, 100, 10, '2026-08-20'))
    const { seoReportAdapter } = await import('./seo-adapter')
    const windows = month('2026-08-10', '2026-08-20')
    const result = await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    // rank: ningún punto medido dentro de 10–19/08 (el 20/08 queda excluido) → también unsupported_window.
    expect(result.rejections).toEqual([
      expect.objectContaining({ metricId: 'rank', reason: 'unsupported_window' }),
      expect.objectContaining({ metricId: 'organic_etv', reason: 'unsupported_window', alternative: expect.objectContaining({ granularity: 'month' }) })
    ])
    expect(result.facts.some(fact => fact.metricId === 'clicks')).toBe(true)
    expect(seoMocks.readDomainOverviewForTarget).not.toHaveBeenCalled()
  })

  it('sin capturas GSC en la ventana es no_data (nunca cero), sin target es not_connected, módulo apagado es module_disabled', async () => {
    seoMocks.readSeoOverviewKpisForWindow.mockResolvedValue(gscWindow(0, 0, 0, null))
    seoMocks.resolveUnambiguousSeoTarget.mockResolvedValue({ target: null, conflict: null })
    const { seoReportAdapter } = await import('./seo-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    expect(result.facts).toEqual([])
    expect(result.rejections.map(rejection => rejection.reason).sort()).toEqual(['no_data', 'not_connected'])

    seoMocks.isSeoModuleEnabled.mockReturnValue(false)
    expect((await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })).rejections[0]!.reason).toBe('module_disabled')
  })

  it('ETV con método no disponible declara method_mismatch; mes sin snapshot es insufficient_data', async () => {
    seoMocks.readSeoOverviewKpisForWindow.mockResolvedValue(gscWindow(10, 100, 31, '2026-08-31'))
    seoMocks.readDomainOverviewForTarget.mockResolvedValue({ ok: false, reason: 'not_available_for_method' })
    const { seoReportAdapter } = await import('./seo-adapter')
    const windows = month('2026-08-01', '2026-09-01')

    expect((await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })).rejections).toEqual([expect.objectContaining({ metricId: 'organic_etv', reason: 'method_mismatch' })])

    seoMocks.readDomainOverviewForTarget.mockResolvedValue({ ok: true, subject: 'x.cl', capturedAt: '2026-09-01', etvMethodology: { version: 'v2' }, history: [{ month: '2026-07', organicEtv: 1 }] })
    expect((await seoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })).rejections).toEqual([expect.objectContaining({ metricId: 'organic_etv', reason: 'insufficient_data' })])
  })
})

describe('AEO adapter', () => {
  const report = (asOfDate: string | null, gate: string) => ({
    report: {
      gate: { status: gate, reason: 'r', nextAction: 'n' },
      overallScore: 61,
      dimensions: [{ key: 'presence', label: 'Presencia', score: 70 }],
      providerPresence: [{ provider: 'chatgpt', resolved: 12, present: 5 }],
      competitiveSov: { brandMentions: 5, competitors: [{ name: 'Pinturas Ñandú', mentions: 10 }, { name: 'Otra Marca', mentions: 5 }] },
      citationInsight: { ownDomainShare: 25, findingsWithCitations: 8, findingsCitingOwnDomain: 2 },
      provenance: { asOfDate, promptPackVersion: 'pp-3', scoreVersion: 'score-2', providersSampled: ['chatgpt', 'gemini'], promptCount: 12 }
    }
  })

  beforeEach(() => vi.clearAllMocks())

  it('un run dentro de la ventana produce score, dimensiones e indicadores estándar (tasa de mención, Share of Model, Share of Voice, citas)', async () => {
    aeoMocks.readClientGraderReport.mockResolvedValue(report('2026-08-20', 'ready'))
    const { aeoReportAdapter } = await import('./aeo-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await aeoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    expect(result.facts.find(fact => fact.metricId === 'overall_score')).toMatchObject({ value: 61, unit: 'score', method: { version: 'score-2/pp-3' }, freshness: { asOf: '2026-08-20' } })
    // TASK-1957 — la presencia se expresa con los indicadores estándar (skill seo-aeo §07), no como conteo suelto.
    expect(result.facts.find(fact => fact.metricId === 'mention_rate.chatgpt')).toMatchObject({ value: 41.7, unit: 'percent', numerator: 5, denominator: 12 })
    expect(result.facts.find(fact => fact.metricId === 'share_of_model')).toMatchObject({ value: 41.7, unit: 'percent', numerator: 5, denominator: 12 })
    expect(result.facts.find(fact => fact.metricId === 'sov.brand')).toMatchObject({ value: 25, unit: 'percent', numerator: 5, denominator: 20 })
    expect(result.facts.find(fact => fact.metricId === 'sov.competitor.pinturas-nandu')).toMatchObject({ label: 'Pinturas Ñandú', value: 50 })
    expect(result.facts.find(fact => fact.metricId === 'citation_share')).toMatchObject({ value: 25, numerator: 2, denominator: 8 })
    expect(result.facts.some(fact => fact.metricId.startsWith('presence.'))).toBe(false)
    expect(result.rejections).toEqual([])
    expectContentContract(result.facts)
  })

  it('TASK-1962 — con v2, sitios citados, tipo de fuente y tono del MISMO informe del Grader; sin v2, nada nuevo', async () => {
    const rich = report('2026-08-20', 'ready')

    Object.assign(rich.report, {
      citationSourceBreakdown: { reason: null, totalCitations: 246, uniqueDomains: 80, domains: [{ domain: 'chocale.cl', count: 11, engines: ['gemini'], classification: 'third_party' }, { domain: 'trustpilot.com', count: 9, engines: ['openai'], classification: 'third_party' }] },
      sourceTypeSummary: [{ sourceType: 'news', count: 16 }, { sourceType: 'owned', count: 3 }, { sourceType: 'unknown', count: 21 }],
      sentimentSummary: { positive: 3, neutral: 9, negative: 3, mixed: 1, evaluated: 16, net: 'neutral' }
    })
    aeoMocks.readClientGraderReport.mockResolvedValue(rich)
    const { aeoReportAdapter } = await import('./aeo-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const v2 = await aeoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [], editorialV2: true })

    expect(v2.facts.find(fact => fact.metricId === 'cited_source.1')).toMatchObject({ label: 'chocale.cl', value: 11, numerator: 11, denominator: 246, dimension: { domain: 'chocale.cl', rank: '1' } })
    expect(v2.facts.find(fact => fact.metricId === 'source_type.news')).toMatchObject({ label: 'Medios de noticias', value: 16 })
    expect(v2.facts.find(fact => fact.metricId === 'sentiment.negative')).toMatchObject({ label: 'Negativas', value: 3, numerator: 3, denominator: 16 })
    expectContentContract(v2.facts)

    const v1 = await aeoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    expect(v1.facts.some(fact => /^(cited_source|source_type|sentiment)\./.test(fact.metricId))).toBe(false)
  })

  it('sin competidores detectados no entra la participación frente a competencia ni el puntaje global que la pondera', async () => {
    // Caso real Berel 2026-09-03: competitive_sov = 100 contra nadie (marca / (marca + 0)) y pesa 15 % del global.
    const base = report('2026-08-20', 'ready')

    aeoMocks.readClientGraderReport.mockResolvedValue({
      report: {
        ...base.report,
        dimensions: [...base.report.dimensions, { key: 'competitive_sov', label: 'Competitive Share of Voice', score: 100 }],
        competitiveSov: { brandMentions: 5, competitors: [] }
      }
    })
    const { aeoReportAdapter } = await import('./aeo-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await aeoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    expect(result.facts.some(fact => fact.metricId === 'overall_score' || fact.metricId === 'dimension.competitive_sov')).toBe(false)
    expect(result.facts.find(fact => fact.metricId === 'dimension.presence')).toMatchObject({ value: 70 })
    expect(result.rejections.map(rejection => [rejection.metricId, rejection.reason])).toEqual(expect.arrayContaining([['overall_score', 'insufficient_data'], ['share_of_voice', 'insufficient_data']]))
  })

  it('el último run fuera de la ventana NO se proyecta como histórico: unsupported_window', async () => {
    aeoMocks.readClientGraderReport.mockResolvedValue(report('2026-09-10', 'ready'))
    const { aeoReportAdapter } = await import('./aeo-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await aeoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    expect(result.facts).toEqual([])
    expect(result.rejections).toEqual([expect.objectContaining({ reason: 'unsupported_window' })])
  })

  it('el rechazo del período de comparación queda marcado como tal; el de la ventana actual, no', async () => {
    // Caso real (Berel): el análisis del 3/9 cae en la ventana actual y el período anterior no tiene uno propio.
    aeoMocks.readClientGraderReport.mockResolvedValue(report('2026-09-03', 'ready'))
    const { aeoReportAdapter } = await import('./aeo-adapter')
    const windows = month('2026-09-01', '2026-09-21', 'previous_period')
    const result = await aeoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: windows.comparison, projectIds: [] })

    expect(result.facts.find(fact => fact.metricId === 'overall_score')).toBeDefined()
    expect(result.rejections).toEqual([expect.objectContaining({ reason: 'unsupported_window', scope: 'comparison' })])
  })

  it('review_required e insufficient_data se respetan; not_found es not_connected', async () => {
    const { aeoReportAdapter, } = await import('./aeo-adapter')
    const windows = month('2026-08-01', '2026-09-01')

    aeoMocks.readClientGraderReport.mockResolvedValue(report('2026-08-20', 'review_required'))
    expect((await aeoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })).rejections[0]!.reason).toBe('review_required')

    const { ClientGraderReportError } = await import('@/lib/growth/ai-visibility/client/command')

    aeoMocks.readClientGraderReport.mockRejectedValue(new ClientGraderReportError('not_found', 'x'))
    expect((await aeoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })).rejections[0]!.reason).toBe('not_connected')
  })
})

describe('ICO adapter', () => {
  const snapshot = (rpa: { value: number | null; dataStatus: string; suppressionReason?: string | null }, otd: { value: number | null; onTime: number; late: number; overdue: number }) => ({
    spaceId: 'sp-1', clientId: null, clientName: null, periodYear: 2026, periodMonth: 8,
    metrics: [
      { metricId: 'rpa', value: rpa.value, zone: null, dataStatus: rpa.dataStatus, suppressionReason: rpa.suppressionReason ?? null, evidence: { completedTasks: 10, eligibleTasks: 8, missingTasks: 2, nonPositiveTasks: 0 } },
      { metricId: 'otd_pct', value: otd.value, zone: null }
    ],
    cscDistribution: null,
    context: { totalTasks: 12, completedTasks: 10, activeTasks: 2, onTimeTasks: otd.onTime, lateDropTasks: otd.late, overdueTasks: otd.overdue, carryOverTasks: 0, overdueCarriedForwardTasks: 0 },
    computedAt: '2026-09-02T03:00:00.000Z', engineVersion: 'v1.0.0', source: 'materialized'
  })

  beforeEach(() => {
    vi.clearAllMocks()
    icoMocks.runGreenhousePostgresQuery.mockResolvedValue([{ space_id: 'sp-1', space_name: 'Sky · Diseño' }])
  })

  it('RpA y OTD salen del dueño por space y mes, con numerador/denominador y comparisonFactId', async () => {
    icoMocks.readSpaceMetrics.mockResolvedValue(snapshot({ value: 1.12, dataStatus: 'valid' }, { value: 80, onTime: 8, late: 1, overdue: 1 }))
    const { icoReportAdapter } = await import('./ico-adapter')
    const windows = month('2026-08-01', '2026-09-01', 'previous_period')
    const result = await icoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: windows.comparison, projectIds: [] })

    const otd = result.facts.find(fact => fact.factId === 'ico.otd.2026-08-01_2026-09-01.sp-1.2026-08')!

    expect(otd).toMatchObject({ value: 80, unit: 'percent', numerator: 8, denominator: 10, comparisonFactId: 'ico.otd.2026-07-01_2026-08-01.sp-1.2026-07', method: { version: 'v1.0.0' } })
    expect(result.facts.find(fact => fact.factId === 'ico.rpa.2026-08-01_2026-09-01.sp-1.2026-08')).toMatchObject({ value: 1.12, unit: 'ratio' })
    expect(icoMocks.readSpaceMetrics).toHaveBeenCalledWith('sp-1', 2026, 8)
    expect(icoMocks.readSpaceMetrics).toHaveBeenCalledWith('sp-1', 2026, 7)
  })

  it('RpA suppressed queda como rechazo (no cero) y OTD sin denominador es insufficient_data', async () => {
    icoMocks.readSpaceMetrics.mockResolvedValue(snapshot({ value: null, dataStatus: 'suppressed', suppressionReason: 'missing_rpa_values_only' }, { value: null, onTime: 0, late: 0, overdue: 0 }))
    const { icoReportAdapter } = await import('./ico-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await icoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    expect(result.facts).toEqual([])
    expect(result.rejections.map(rejection => [rejection.metricId, rejection.reason])).toEqual([['rpa', 'suppressed'], ['otd', 'insufficient_data']])
  })

  it('lee cada métrica por el id que declara el registro canónico del motor ICO', async () => {
    // El fixture de este archivo es un espejo escrito a mano: si repite un id equivocado, el test lo confirma en vez
    // de detectarlo (así pasó con 'otd'). Este cruce contra ICO_METRIC_REGISTRY es la verdad del motor.
    const { ICO_METRIC_REGISTRY } = await vi.importActual<typeof MetricRegistry>('@/lib/ico-engine/metric-registry')
    const { ICO_SNAPSHOT_METRIC_IDS } = await import('./ico-adapter')
    const registryIds = new Set(ICO_METRIC_REGISTRY.map(metric => metric.id))

    for (const id of Object.values(ICO_SNAPSHOT_METRIC_IDS)) expect(registryIds.has(id), id).toBe(true)
  })

  it('una métrica que el snapshot no trae se narra como límite, nunca se omite en silencio', async () => {
    icoMocks.readSpaceMetrics.mockResolvedValue({ ...snapshot({ value: 1.1, dataStatus: 'valid' }, { value: 80, onTime: 8, late: 1, overdue: 1 }), metrics: [] })
    const { icoReportAdapter } = await import('./ico-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await icoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    expect(result.facts).toEqual([])
    expect(result.rejections.map(rejection => [rejection.metricId, rejection.reason])).toEqual([['rpa', 'no_data'], ['otd', 'no_data']])
  })

  it('ventana no mensual es unsupported_window sin llamar al reader; sin spaces es not_connected', async () => {
    const { icoReportAdapter } = await import('./ico-adapter')
    const windows = month('2026-08-10', '2026-08-20')

    expect((await icoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })).rejections[0]!.reason).toBe('unsupported_window')
    expect(icoMocks.readSpaceMetrics).not.toHaveBeenCalled()

    icoMocks.runGreenhousePostgresQuery.mockResolvedValue([])
    expect((await icoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: month('2026-08-01', '2026-09-01').current, comparison: null, projectIds: [] })).rejections[0]!.reason).toBe('not_connected')
  })
})

describe('TASK-1888 — evidencia del contrato editorial v2', () => {
  const icoSnapshot = (ftr: number | null) => ({
    spaceId: 'sp-1', clientId: null, clientName: null, periodYear: 2026, periodMonth: 8,
    metrics: [
      { metricId: 'rpa', value: 1.12, zone: null, dataStatus: 'valid', suppressionReason: null, evidence: { completedTasks: 10, eligibleTasks: 8, missingTasks: 2, nonPositiveTasks: 0 } },
      { metricId: 'otd_pct', value: 80, zone: null },
      ...(ftr === null ? [] : [{ metricId: 'ftr_pct', value: ftr, zone: null, qualityGateStatus: 'healthy', trustEvidence: { sampleBasis: 'x', sampleSize: 9, totalTasks: 12, completedTasks: 10, activeTasks: 2, deliveryClassifiedTasks: 10 } }])
    ],
    cscDistribution: null,
    context: { totalTasks: 12, completedTasks: 10, activeTasks: 2, onTimeTasks: 8, lateDropTasks: 1, overdueTasks: 1, carryOverTasks: 0, overdueCarriedForwardTasks: 0 },
    computedAt: '2026-09-02T03:00:00.000Z', engineVersion: 'v1.0.0', source: 'materialized'
  })

  beforeEach(() => {
    vi.clearAllMocks()
    icoMocks.runGreenhousePostgresQuery.mockResolvedValue([{ space_id: 'sp-1', space_name: 'Sky · Diseño' }])
  })

  it('ICO con v2: lee ftr_pct del motor y suma las metas del registro como hechos de referencia', async () => {
    icoMocks.readSpaceMetrics.mockResolvedValue(icoSnapshot(86))
    const { icoReportAdapter } = await import('./ico-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await icoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [], editorialV2: true })

    expect(result.facts.find(fact => fact.metricId === 'ftr')).toMatchObject({ value: 86, unit: 'percent', coverage: { populationSize: 9 } })
    // Un space y un mes: la etiqueta es el nombre humano, sin «OTD · Sky · Diseño · 2026-08» (revisión de 1846).
    expect(result.facts.find(fact => fact.metricId === 'otd')!.label).toBe('Entregas a tiempo')

    const targets = Object.fromEntries(result.facts.filter(fact => fact.role === 'reference').map(fact => [fact.metricId, [fact.value, fact.dimension?.direction]]))
    const { ICO_METRIC_REGISTRY } = await vi.importActual<typeof MetricRegistry>('@/lib/ico-engine/metric-registry')
    const thresholds = (id: string) => ICO_METRIC_REGISTRY.find(metric => metric.id === id)!.thresholds

    // Los valores salen del registro dueño, no de literales: se comparan contra el registro, no contra 90/80/1,5.
    // La banda «cerca de la meta» es el borde exterior de la zona `attention` del MISMO registro (nunca meta × 0,85).
    expect(targets).toEqual({
      'target.otd': [thresholds('otd_pct').optimal.min, 'higher_is_better'],
      'band.otd': [thresholds('otd_pct').attention.min, 'higher_is_better'],
      'target.ftr': [thresholds('ftr_pct').optimal.min, 'higher_is_better'],
      'band.ftr': [thresholds('ftr_pct').attention.min, 'higher_is_better'],
      'target.rpa': [thresholds('rpa').optimal.max, 'lower_is_better'],
      'band.rpa': [thresholds('rpa').attention.max, 'lower_is_better']
    })

    // Cada hecho de VALOR lleva la dirección de su métrica desde el mismo registro (el render colorea la variación sin
    // buscar la meta, cuyo metricId es `target.otd`, no `otd`). Hechos reales de Sky: otd_pct, ftr_pct, rpa.
    const direction = (id: string) => (ICO_METRIC_REGISTRY.find(metric => metric.id === id)!.higherIsBetter ? 'higher_is_better' : 'lower_is_better')
    const values = Object.fromEntries(result.facts.filter(fact => fact.role !== 'reference').map(fact => [fact.metricId, fact.dimension?.direction]))

    expect(values).toEqual({ otd: direction('otd_pct'), ftr: direction('ftr_pct'), rpa: direction('rpa') })
    expect(values.rpa).toBe('lower_is_better')
    // TASK-1962 — «¿qué hicimos este mes?»: las piezas completadas del mismo snapshot, con su nombre humano.
    expect(result.facts.find(fact => fact.metricId === 'delivered.completed')).toMatchObject({ value: 10, unit: 'count', label: 'Piezas entregadas', coverage: { populationSize: 12 } })
    expectContentContract(result.facts)
  })

  it('ICO sin v2 entrega exactamente la evidencia v1 (sin FTR ni metas)', async () => {
    icoMocks.readSpaceMetrics.mockResolvedValue(icoSnapshot(86))
    const { icoReportAdapter } = await import('./ico-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await icoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    expect(result.facts.map(fact => fact.metricId).sort()).toEqual(['otd', 'rpa'])
    expect(result.facts.find(fact => fact.metricId === 'otd')!.label).toBe('OTD · Sky · Diseño · 2026-08')
    expect(result.facts.some(fact => fact.dimension?.direction !== undefined)).toBe(false)
  })

  it('ICO con v2 y un snapshot sin FTR lo narra como límite; sin FTR medido no hay meta de FTR', async () => {
    icoMocks.readSpaceMetrics.mockResolvedValue(icoSnapshot(null))
    const { icoReportAdapter } = await import('./ico-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await icoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [], editorialV2: true })

    expect(result.rejections.map(rejection => [rejection.metricId, rejection.reason])).toEqual([['ftr', 'no_data']])
    expect(result.facts.some(fact => fact.metricId === 'target.ftr' || fact.metricId === 'band.ftr')).toBe(false)
  })

  it('AEO: cada proveedor del grader tiene channelId estable; uno desconocido queda sin channelId', async () => {
    const { GROWTH_AI_VISIBILITY_PROVIDER_IDS } = await vi.importActual<typeof AiVisibilityContracts>('@/lib/growth/ai-visibility/contracts')
    const { channelForAeoProvider } = await import('../contracts/channels')

    for (const provider of GROWTH_AI_VISIBILITY_PROVIDER_IDS) expect(channelForAeoProvider(provider), provider).toBeDefined()

    aeoMocks.readClientGraderReport.mockResolvedValue({
      report: {
        gate: { status: 'ready', reason: 'r', nextAction: 'n' },
        overallScore: 61,
        dimensions: [],
        providerPresence: [{ provider: 'openai', resolved: 12, present: 5 }, { provider: 'nuevo_motor', resolved: 12, present: 2 }],
        provenance: { asOfDate: '2026-08-20', promptPackVersion: 'pp-3', scoreVersion: 'score-2', providersSampled: ['openai'], promptCount: 12 }
      }
    })
    const { aeoReportAdapter } = await import('./aeo-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await aeoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    expect(result.facts.find(fact => fact.metricId === 'mention_rate.openai')!.channelId).toBe('chatgpt')
    expect(result.facts.find(fact => fact.metricId === 'mention_rate.nuevo_motor')).not.toHaveProperty('channelId')
  })
})
