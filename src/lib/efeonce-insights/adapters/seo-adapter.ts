import 'server-only'

/**
 * TASK-1845 — adapter SEO (Search Visibility 360). Consume readers canónicos del dominio
 * `growth/seo`: KPIs GSC por ventana explícita (misma fórmula del dueño), rank evolution por
 * target inequívoco y ETV mensual con su metodología versionada. No mezcla fórmulas ETV, no
 * inventa histórico y declara `unsupported_window` cuando el grano no coincide.
 */

import { readDomainOverviewForTarget } from '@/lib/growth/seo/domain-overview/reader'
import { isSeoModuleEnabled } from '@/lib/growth/seo/flags'
import { readSeoOverviewKpisForWindow } from '@/lib/growth/seo/overview/read-overview-kpis'
import { readRankEvolution } from '@/lib/growth/seo/rank-evolution-reader'
import { resolveUnambiguousSeoTarget } from '@/lib/growth/seo/resolve-target'

import type { EvidenceFactV1, EvidenceRejectionV1, EvidenceSourceV1 } from '../contracts/evidence'
import type { ResolvedInsightWindow } from '../window'
import { type AdapterCollectInput, type ModuleReportAdapterV1, asComparisonRejections, evidenceWindow, factId } from './contract'

export const SEO_ADAPTER_VERSION = 'seo_report_adapter_v1'

const GSC_METHOD = { name: 'gsc_window_aggregate', version: 'seo_measurement_v1' }
const RANK_METHOD = { name: 'dataforseo_serp_rank', version: 'seo_rank_v1' }

const daysBetween = (from: string, to: string): number => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)

const gscFacts = async (organizationId: string, window: ResolvedInsightWindow, comparisonIds: Record<string, string | null>) => {
  const kpis = await readSeoOverviewKpisForWindow(organizationId, { from: window.start, toExclusive: window.endExclusive })
  const facts: EvidenceFactV1[] = []
  const rejections: EvidenceRejectionV1[] = []
  const asOf = kpis.provenance[0]?.capturedAt ?? null
  const coverageRatio = window.days > 0 ? kpis.coveredDays / window.days : 0

  const coverage = {
    kind: coverageRatio >= 0.999 ? ('complete' as const) : coverageRatio >= 0.5 ? ('partial' as const) : coverageRatio > 0 ? ('sparse' as const) : ('none' as const),
    ratio: Number(coverageRatio.toFixed(4)),
    populationSize: kpis.coveredDays
  }

  if (kpis.coveredDays === 0) {
    rejections.push({ module: 'seo', metricId: 'gsc', reason: 'no_data', detail: `Search Console no tiene capturas materializadas en ${window.start}–${window.endInclusive}` })

    return { facts, rejections, source: null as EvidenceSourceV1 | null }
  }

  const base = {
    factVersion: 'evidence_fact_v1' as const,
    module: 'seo' as const,
    population: 'Consultas de Search Console de la propiedad conectada',
    source: 'greenhouse_growth.seo_gsc_daily',
    method: GSC_METHOD,
    coverage,
    freshness: { asOf },
    observation: 'observed' as const,
    window: evidenceWindow(window, 'period'),
    evidenceRef: `seo_gsc_daily:${organizationId}:${window.start}_${window.endExclusive}`
  }

  facts.push(
    { ...base, factId: factId('seo', 'clicks', window), metricId: 'clicks', label: 'Clics orgánicos', value: kpis.totals.clicks, unit: 'count', numerator: null, denominator: null, comparisonFactId: comparisonIds.clicks ?? null },
    { ...base, factId: factId('seo', 'impressions', window), metricId: 'impressions', label: 'Impresiones', value: kpis.totals.impressions, unit: 'count', numerator: null, denominator: null, comparisonFactId: comparisonIds.impressions ?? null },
    { ...base, factId: factId('seo', 'ctr', window), metricId: 'ctr', label: 'CTR', value: kpis.totals.ctr === null ? null : Number((kpis.totals.ctr * 100).toFixed(2)), unit: 'percent', numerator: kpis.totals.clicks, denominator: kpis.totals.impressions, comparisonFactId: comparisonIds.ctr ?? null },
    { ...base, factId: factId('seo', 'position', window), metricId: 'position', label: 'Posición media (ponderada por impresiones)', value: kpis.totals.position === null ? null : Number(kpis.totals.position.toFixed(2)), unit: 'position', numerator: null, denominator: null, comparisonFactId: comparisonIds.position ?? null }
  )

  const source: EvidenceSourceV1 = {
    module: 'seo',
    adapterVersion: SEO_ADAPTER_VERSION,
    reader: 'readSeoOverviewKpisForWindow',
    asOf,
    method: GSC_METHOD,
    coverage,
    servedWindow: kpis.servedFrom && kpis.servedTo ? { start: kpis.servedFrom, endExclusive: kpis.servedTo, granularity: 'day', partial: window.partial } : null
  }

  return { facts, rejections, source }
}

const rankFacts = async (seoTargetId: string, window: ResolvedInsightWindow, comparisonIds: Record<string, string | null>) => {
  const facts: EvidenceFactV1[] = []
  const rejections: EvidenceRejectionV1[] = []
  const rangeDays = Math.max(1, daysBetween(window.start, new Date().toISOString().slice(0, 10)) + 1)
  const result = await readRankEvolution(seoTargetId, { rangeDays: Math.min(rangeDays, 1825) })

  if (!result.ok) {
    rejections.push({ module: 'seo', metricId: 'rank', reason: result.errorCode === 'no_data' ? 'no_data' : result.errorCode === 'disabled' ? 'module_disabled' : 'insufficient_data', detail: `Rank evolution: ${result.errorCode}` })

    return { facts, rejections, source: null as EvidenceSourceV1 | null }
  }

  // Selección (no fórmula): último punto medido DENTRO de la ventana por keyword.
  let tracked = 0
  let pageOne = 0
  let lastDate: string | null = null

  for (const series of result.series) {
    const inWindow = series.points.filter(point => point.date >= window.start && point.date < window.endExclusive)
    const last = inWindow[inWindow.length - 1]

    if (!last) continue

    tracked += 1
    if (last.position !== null && last.position <= 10) pageOne += 1
    if (!lastDate || last.date > lastDate) lastDate = last.date
  }

  if (tracked === 0) {
    rejections.push({ module: 'seo', metricId: 'rank', reason: 'unsupported_window', detail: `No hay mediciones de ranking dentro de ${window.start}–${window.endInclusive}`, alternative: { granularity: 'day', note: 'El tracking sirve puntos diarios desde su primera captura; elegir una ventana con capturas.' } })

    return { facts, rejections, source: null as EvidenceSourceV1 | null }
  }

  const base = {
    factVersion: 'evidence_fact_v1' as const,
    module: 'seo' as const,
    population: 'Keywords trackeadas del target con medición dentro de la ventana',
    source: 'greenhouse_growth.seo_rank_snapshots',
    method: RANK_METHOD,
    coverage: { kind: 'complete' as const, ratio: null, populationSize: tracked },
    freshness: { asOf: lastDate },
    observation: 'observed' as const,
    window: evidenceWindow(window, 'period'),
    evidenceRef: `seo_target:${seoTargetId}:${window.start}_${window.endExclusive}`
  }

  facts.push(
    { ...base, factId: factId('seo', 'keywords_tracked', window), metricId: 'keywords_tracked', label: 'Keywords con medición', value: tracked, unit: 'count', numerator: null, denominator: null, comparisonFactId: comparisonIds.keywords_tracked ?? null },
    { ...base, factId: factId('seo', 'page_one_keywords', window), metricId: 'page_one_keywords', label: 'Keywords en primera página (≤10)', value: pageOne, unit: 'count', numerator: pageOne, denominator: tracked, comparisonFactId: comparisonIds.page_one_keywords ?? null }
  )

  return {
    facts,
    rejections,
    source: { module: 'seo', adapterVersion: SEO_ADAPTER_VERSION, reader: 'readRankEvolution', asOf: lastDate, method: RANK_METHOD, coverage: base.coverage, servedWindow: { start: result.range.from, endExclusive: result.range.to, granularity: 'day', partial: false } } as EvidenceSourceV1
  }
}

const etvFacts = async (seoTargetId: string, window: ResolvedInsightWindow, comparisonIds: Record<string, string | null>) => {
  const facts: EvidenceFactV1[] = []
  const rejections: EvidenceRejectionV1[] = []

  if (!window.wholeMonths) {
    rejections.push({ module: 'seo', metricId: 'organic_etv', reason: 'unsupported_window', detail: 'ETV se sirve por mes calendario; la ventana no es de meses completos', alternative: { granularity: 'month', note: 'Pedir un rango de meses completos para incluir ETV.' } })

    return { facts, rejections, source: null as EvidenceSourceV1 | null }
  }

  const overview = await readDomainOverviewForTarget(seoTargetId, { historyMonths: 72 })

  if (!overview || !overview.ok) {
    const reason = overview && !overview.ok && overview.reason === 'not_available_for_method' ? 'method_mismatch' : 'no_data'

    rejections.push({ module: 'seo', metricId: 'organic_etv', reason, detail: overview && !overview.ok ? `Domain overview: ${overview.reason}` : 'Sin domain overview para el target' })

    return { facts, rejections, source: null as EvidenceSourceV1 | null }
  }

  const method = { name: 'dataforseo_etv', version: overview.etvMethodology.version }
  const byMonth = new Map(overview.history.map(point => [point.month, point]))
  const missing = window.months.filter(month => !byMonth.has(month))

  if (missing.length > 0) {
    rejections.push({ module: 'seo', metricId: 'organic_etv', reason: 'insufficient_data', detail: `Sin snapshot ETV para ${missing.join(', ')}` })

    return { facts, rejections, source: null as EvidenceSourceV1 | null }
  }

  const base = {
    factVersion: 'evidence_fact_v1' as const,
    module: 'seo' as const,
    population: `Dominio ${overview.subject} en el mercado del target`,
    source: 'greenhouse_growth.seo_domain_overview_snapshots',
    method,
    coverage: { kind: 'complete' as const, ratio: 1, populationSize: window.months.length },
    freshness: { asOf: overview.capturedAt },
    observation: 'estimated' as const,
    evidenceRef: `seo_target:${seoTargetId}:etv:${overview.etvMethodology.version}`
  }

  window.months.forEach((month, index) => {
    const point = byMonth.get(month)!

    // El comparable de agosto es julio (misma posición en la ventana anterior), no "el mismo mes".
    facts.push({ ...base, factId: factId('seo', 'organic_etv', window, month), metricId: 'organic_etv', label: `Tráfico orgánico estimado ${month}`, value: point.organicEtv, unit: 'visits_estimated', numerator: null, denominator: null, window: { start: `${month}-01`, endExclusive: `${month}-01`, granularity: 'month', partial: false }, comparisonFactId: comparisonIds[`organic_etv#${index}`] ?? null, dimension: { month } })
  })

  return { facts, rejections, source: { module: 'seo', adapterVersion: SEO_ADAPTER_VERSION, reader: 'readDomainOverviewForTarget', asOf: overview.capturedAt, method, coverage: base.coverage, servedWindow: null } as EvidenceSourceV1 }
}

const collectForWindow = async (input: AdapterCollectInput, window: ResolvedInsightWindow, seoTargetId: string | null, comparisonIds: Record<string, string | null>) => {
  const gsc = await gscFacts(input.organizationId, window, comparisonIds)
  const rank = seoTargetId ? await rankFacts(seoTargetId, window, comparisonIds) : { facts: [], rejections: [] as EvidenceRejectionV1[], source: null }
  const etv = seoTargetId ? await etvFacts(seoTargetId, window, comparisonIds) : { facts: [], rejections: [] as EvidenceRejectionV1[], source: null }

  return {
    facts: [...gsc.facts, ...rank.facts, ...etv.facts],
    rejections: [...gsc.rejections, ...rank.rejections, ...etv.rejections],
    sources: [gsc.source, rank.source, etv.source].filter((source): source is EvidenceSourceV1 => source !== null)
  }
}

export const seoReportAdapter: ModuleReportAdapterV1 = {
  describe: () => ({
    module: 'seo',
    version: SEO_ADAPTER_VERSION,
    granularities: ['day', 'month', 'period'],
    dimensions: [],
    suggestedSections: ['visibilidad_organica', 'ranking', 'trafico_estimado']
  }),
  collect: async input => {
    if (!isSeoModuleEnabled()) {
      return { facts: [], sources: [], rejections: [{ module: 'seo', metricId: null, reason: 'module_disabled', detail: 'El módulo SEO está apagado en este runtime' }] }
    }

    const target = await resolveUnambiguousSeoTarget(input.organizationId)
    const rejections: EvidenceRejectionV1[] = []

    if (!target.target) {
      rejections.push({ module: 'seo', metricId: null, reason: target.conflict ? 'target_ambiguous' : 'not_connected', detail: target.conflict ? `La organización tiene ${target.conflict.length} mercados activos; el encargo debe elegir uno` : 'La organización no tiene un target SEO activo' })
    }

    const seoTargetId = target.target?.seoTargetId ?? null

    // La comparación se recolecta PRIMERO para poder enlazar comparisonFactId en el período actual.
    const comparisonIds: Record<string, string | null> = {}
    let comparison: Awaited<ReturnType<typeof collectForWindow>> | null = null

    if (input.comparison) {
      comparison = await collectForWindow(input, input.comparison, seoTargetId, {})

      const etvOrder = comparison.facts.filter(fact => fact.metricId === 'organic_etv')

      for (const fact of comparison.facts) comparisonIds[fact.metricId] = fact.factId
      etvOrder.forEach((fact, index) => {
        comparisonIds[`organic_etv#${index}`] = fact.factId
      })
    }

    const current = await collectForWindow(input, input.window, seoTargetId, comparisonIds)

    return {
      facts: [...current.facts, ...(comparison?.facts ?? [])],
      sources: [...current.sources, ...(comparison?.sources ?? [])],
      rejections: [...rejections, ...current.rejections, ...asComparisonRejections(comparison?.rejections ?? [])]
    }
  }
}
