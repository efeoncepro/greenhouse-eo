import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MetricRegistry from '@/lib/ico-engine/metric-registry'

import { resolveInsightWindows } from '../window'

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
  readDomainOverviewForTarget: vi.fn()
}))

vi.mock('@/lib/growth/seo/flags', () => ({ isSeoModuleEnabled: seoMocks.isSeoModuleEnabled }))
vi.mock('@/lib/growth/seo/resolve-target', () => ({ resolveUnambiguousSeoTarget: seoMocks.resolveUnambiguousSeoTarget }))
vi.mock('@/lib/growth/seo/overview/read-overview-kpis', () => ({ readSeoOverviewKpisForWindow: seoMocks.readSeoOverviewKpisForWindow }))
vi.mock('@/lib/growth/seo/rank-evolution-reader', () => ({ readRankEvolution: seoMocks.readRankEvolution }))
vi.mock('@/lib/growth/seo/domain-overview/reader', () => ({ readDomainOverviewForTarget: seoMocks.readDomainOverviewForTarget }))

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
      provenance: { asOfDate, promptPackVersion: 'pp-3', scoreVersion: 'score-2', providersSampled: ['chatgpt', 'gemini'], promptCount: 12 }
    }
  })

  beforeEach(() => vi.clearAllMocks())

  it('un run dentro de la ventana produce score, dimensiones y presencia con numerador/denominador', async () => {
    aeoMocks.readClientGraderReport.mockResolvedValue(report('2026-08-20', 'ready'))
    const { aeoReportAdapter } = await import('./aeo-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await aeoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    expect(result.facts.find(fact => fact.metricId === 'overall_score')).toMatchObject({ value: 61, unit: 'score', method: { version: 'score-2/pp-3' }, freshness: { asOf: '2026-08-20' } })
    expect(result.facts.find(fact => fact.metricId === 'presence.chatgpt')).toMatchObject({ value: 5, numerator: 5, denominator: 12 })
    expect(result.rejections).toEqual([])
  })

  it('el último run fuera de la ventana NO se proyecta como histórico: unsupported_window', async () => {
    aeoMocks.readClientGraderReport.mockResolvedValue(report('2026-09-10', 'ready'))
    const { aeoReportAdapter } = await import('./aeo-adapter')
    const windows = month('2026-08-01', '2026-09-01')
    const result = await aeoReportAdapter.collect({ organizationId: 'org', audience: 'client', window: windows.current, comparison: null, projectIds: [] })

    expect(result.facts).toEqual([])
    expect(result.rejections).toEqual([expect.objectContaining({ reason: 'unsupported_window' })])
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
