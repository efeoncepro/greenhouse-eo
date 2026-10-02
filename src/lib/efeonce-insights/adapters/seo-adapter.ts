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
import { readSeoOverviewConnection } from '@/lib/growth/seo/overview/read-overview-connection'
import { type SeoMoverDimension, readSeoWindowMovers } from '@/lib/growth/seo/overview/read-window-movers'
import { readRankEvolution } from '@/lib/growth/seo/rank-evolution-reader'
import { resolveUnambiguousSeoTarget } from '@/lib/growth/seo/resolve-target'
import { readSeoWorkQueue } from '@/lib/growth/seo/work-queue/reader'
import type { SeoWorkQueueOrigin } from '@/lib/growth/seo/work-queue/contracts'

import { GH_INSIGHTS } from '@/lib/copy/insights'

import { SEO_SEARCH_CHANNEL } from '../contracts/channels'
import type { EvidenceFactV1, EvidenceRejectionV1, EvidenceSourceV1 } from '../contracts/evidence'
import type { ResolvedInsightWindow } from '../window'
import { type AdapterCollectInput, type ModuleReportAdapterV1, asComparisonRejections, evidenceWindow, factId } from './contract'
import { ga4OrganicFacts, readGa4ChannelWindow } from './ga4-site-facts'

export const SEO_ADAPTER_VERSION = 'seo_report_adapter_v1'

const GSC_METHOD = { name: 'gsc_window_aggregate', version: 'seo_measurement_v1' }
const RANK_METHOD = { name: 'dataforseo_serp_rank', version: 'seo_rank_v1' }

const daysBetween = (from: string, to: string): number => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)

/**
 * TASK-1962 — bloques de 7 días desde el inicio de la ventana (1–7, 8–14…; el último puede ser más corto y su etiqueta lo
 * dice). Un bloque se compara con el MISMO bloque del período anterior, así que ventanas de largo distinto (30 y 31 días)
 * siguen alineadas. Etiqueta humana («1–7 sept»), nunca una fecha ISO.
 */
const WEEK_DAYS = 7

const weekBlocksOf = (window: ResolvedInsightWindow, locale = 'es-CL') => {
  const blocks: Array<{ index: number; start: string; endExclusive: string; label: string }> = []
  const startMs = Date.parse(`${window.start}T00:00:00Z`)
  const endMs = Date.parse(`${window.endExclusive}T00:00:00Z`)
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  const month = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })

  for (let from = startMs, index = 1; from < endMs; from += WEEK_DAYS * 86_400_000, index += 1) {
    const to = Math.min(from + WEEK_DAYS * 86_400_000, endMs)
    const last = new Date(to - 86_400_000)
    const first = new Date(from)
    const label = `${first.getUTCDate()}–${last.getUTCDate()} ${month.format(last).replace('.', '')}`

    blocks.push({ index, start: day(from), endExclusive: day(to), label })
  }

  return blocks
}

const gscFacts = async (organizationId: string, window: ResolvedInsightWindow, comparisonIds: Record<string, string | null>, editorialV2 = false) => {
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
    // TASK-1962 — sin la conexión OAuth de Search Console no es «sin datos»: es una fuente que el cliente tiene que
    // conectar, y el plan lo convierte en petición. Con conexión y sin capturas en la ventana sigue siendo `no_data`.
    const connection = await readSeoOverviewConnection(organizationId)
    const notConnected = connection.state === 'not_connected'

    rejections.push({ module: 'seo', metricId: 'gsc', reason: notConnected ? 'not_connected' : 'no_data', detail: notConnected ? 'Search Console no está conectado para la organización' : `Search Console no tiene capturas materializadas en ${window.start}–${window.endInclusive}` })

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
    evidenceRef: `seo_gsc_daily:${organizationId}:${window.start}_${window.endExclusive}`,
    // TASK-1888 — Search Console, el ranking y el ETV miden Google.
    channelId: SEO_SEARCH_CHANNEL
  }

  facts.push(
    { ...base, factId: factId('seo', 'clicks', window), metricId: 'clicks', label: 'Clics orgánicos', value: kpis.totals.clicks, unit: 'count', numerator: null, denominator: null, comparisonFactId: comparisonIds.clicks ?? null },
    { ...base, factId: factId('seo', 'impressions', window), metricId: 'impressions', label: 'Impresiones', value: kpis.totals.impressions, unit: 'count', numerator: null, denominator: null, comparisonFactId: comparisonIds.impressions ?? null },
    { ...base, factId: factId('seo', 'ctr', window), metricId: 'ctr', label: 'CTR', value: kpis.totals.ctr === null ? null : Number((kpis.totals.ctr * 100).toFixed(2)), unit: 'percent', numerator: kpis.totals.clicks, denominator: kpis.totals.impressions, comparisonFactId: comparisonIds.ctr ?? null },
    { ...base, factId: factId('seo', 'position', window), metricId: 'position', label: 'Posición media (ponderada por impresiones)', value: kpis.totals.position === null ? null : Number(kpis.totals.position.toFixed(2)), unit: 'position', numerator: null, denominator: null, comparisonFactId: comparisonIds.position ?? null }
  )

  // TASK-1962 — clics por bloque de 7 días (suma de los días medidos del MISMO reader): la evolución dentro del mes.
  // Un bloque sin días medidos queda sin valor (ausente ≠ 0). Sólo con contrato v2.
  if (editorialV2) {
    for (const block of weekBlocksOf(window)) {
      const points = kpis.series.filter(point => point.date >= block.start && point.date < block.endExclusive)
      const metricId = `clicks_week.${block.index}`

      facts.push({
        ...base,
        factId: factId('seo', metricId, window),
        metricId,
        label: block.label,
        value: points.length > 0 ? points.reduce((sum, point) => sum + point.clicks, 0) : null,
        unit: 'count',
        numerator: null,
        denominator: null,
        window: { start: block.start, endExclusive: block.endExclusive, granularity: 'day', partial: window.partial },
        comparisonFactId: comparisonIds[metricId] ?? null,
        dimension: { block: String(block.index), from: block.start, to: block.endExclusive }
      })
    }
  }

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
    evidenceRef: `seo_target:${seoTargetId}:${window.start}_${window.endExclusive}`,
    // TASK-1888 — Search Console, el ranking y el ETV miden Google.
    channelId: SEO_SEARCH_CHANNEL
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
    evidenceRef: `seo_target:${seoTargetId}:etv:${overview.etvMethodology.version}`,
    // TASK-1888 — Search Console, el ranking y el ETV miden Google.
    channelId: SEO_SEARCH_CHANNEL
  }

  window.months.forEach((month, index) => {
    const point = byMonth.get(month)!

    // El comparable de agosto es julio (misma posición en la ventana anterior), no "el mismo mes".
    facts.push({ ...base, factId: factId('seo', 'organic_etv', window, month), metricId: 'organic_etv', label: `Tráfico orgánico estimado ${month}`, value: point.organicEtv, unit: 'visits_estimated', numerator: null, denominator: null, window: { start: `${month}-01`, endExclusive: `${month}-01`, granularity: 'month', partial: false }, comparisonFactId: comparisonIds[`organic_etv#${index}`] ?? null, dimension: { month } })
  })

  return { facts, rejections, source: { module: 'seo', adapterVersion: SEO_ADAPTER_VERSION, reader: 'readDomainOverviewForTarget', asOf: overview.capturedAt, method, coverage: base.coverage, servedWindow: null } as EvidenceSourceV1 }
}

const SEO_LOWER_IS_BETTER = new Set(['position'])

/**
 * TASK-1962 — «¿por qué cambió?»: las consultas y páginas que más movieron los clics entre la ventana y su período
 * anterior, del reader dueño `readSeoWindowMovers` (misma tabla y suma que los clics del informe). Es descomposición
 * medida: dice DÓNDE cambió, nunca por qué. Sólo con contrato editorial v2 y período anterior pedido; si Search Console
 * no tiene la ventana actual, no se busca nada (el límite de Search Console ya lo dice).
 */
const MOVERS_METHOD = { name: 'gsc_window_movers', version: 'seo_movers_v1' }
const MOVERS_LIMIT = 5

/**
 * Etiqueta legible de una página: la ruta, sin dominio; la raíz es la página de inicio. Una ruta larga se nombra por
 * su último tramo («…/FT_PINTURA AUTOENFRIANTE.pdf»): la ruta completa de un archivo de 57 caracteres no cabe en la
 * columna del informe A4 y el render falla cerrado (Berel, septiembre 2026). El tramo final es lo que identifica la
 * página; la URL completa queda en el `evidenceRef` del snapshot.
 */
const PAGE_LABEL_MAX = 40

export const pageLabelOf = (url: string): string => {
  try {
    const path = decodeURIComponent(new URL(url).pathname).replace(/\/+$/, '')

    if (path === '') return GH_INSIGHTS.reading.homePage
    if (path.length <= PAGE_LABEL_MAX) return path

    return `…/${path.split('/').filter(Boolean).at(-1)}`
  } catch {
    return url
  }
}

/**
 * TASK-1962 — «¿qué recomendamos?» (contrato de contenido, pregunta 5): las oportunidades de la cola SEO priorizada
 * (TASK-1700, autoridad de orden del módulo), SÓLO de orígenes propios. Nunca `competitor_gap` (la comparativa
 * competitiva SEO no es client-facing, auditoría §7) ni candidatos de descubrimiento. Cada oportunidad trae sus
 * cifras como hechos (impresiones y posición medidas, posición objetivo como referencia, techo de clics estimado por
 * el modelo de CTR propio) para que la acción del plan las cite. Son hechos de PLAN: no compiten como hallazgo.
 */
const OPPORTUNITY_ORIGINS: readonly SeoWorkQueueOrigin[] = ['gsc_striking_distance', 'consolidation', 'declared_target']
const OPPORTUNITY_LIMIT = 5
const OPPORTUNITY_METHOD = { name: 'seo_work_queue', version: 'seo_work_queue_v1' }

const opportunityFacts = async (seoTargetId: string): Promise<{ facts: EvidenceFactV1[]; sources: EvidenceSourceV1[] }> => {
  const queue = await readSeoWorkQueue(seoTargetId, { origins: OPPORTUNITY_ORIGINS, limit: OPPORTUNITY_LIMIT })

  if (!queue.ok || !queue.snapshot || queue.items.length === 0) return { facts: [], sources: [] }

  const computedAt = queue.snapshot.computedAt
  const end = computedAt.slice(0, 10)
  const start = new Date(Date.parse(`${end}T00:00:00Z`) - queue.snapshot.windowDays * 86_400_000).toISOString().slice(0, 10)
  const coverage = { kind: 'complete' as const, ratio: null, populationSize: queue.snapshot.itemCount }

  const base = {
    factVersion: 'evidence_fact_v1' as const,
    module: 'seo' as const,
    population: 'Cola de trabajo SEO priorizada del sitio',
    source: 'greenhouse_growth.seo_work_queue_items',
    method: OPPORTUNITY_METHOD,
    coverage,
    freshness: { asOf: computedAt },
    window: { start, endExclusive: end, granularity: 'period' as const, partial: false },
    evidenceRef: `seo_work_queue:${queue.snapshot.snapshotId}`,
    comparisonFactId: null,
    numerator: null,
    denominator: null,
    channelId: SEO_SEARCH_CHANNEL
  }

  const facts = queue.items
    .filter(item => OPPORTUNITY_ORIGINS.includes(item.origin))
    .slice(0, OPPORTUNITY_LIMIT)
    .flatMap((item, index): EvidenceFactV1[] => {
      const rank = String(index + 1)
      const dimension = { keyword: item.keyword, page: item.targetUrl ? pageLabelOf(item.targetUrl) : '', verb: item.recommendedVerb, origin: item.origin, rank }
      const id = (name: string) => `seo.opportunity.${rank}.${name}`

      const out: EvidenceFactV1[] = [
        { ...base, factId: id('impressions'), metricId: `opportunity.${rank}.impressions`, label: item.keyword, value: item.breakdown.impressions, unit: 'count', observation: 'observed', dimension }
      ]

      if (item.breakdown.weightedPosition !== null) {
        out.push({ ...base, factId: id('position'), metricId: `opportunity.${rank}.position`, label: item.keyword, value: Number(item.breakdown.weightedPosition.toFixed(1)), unit: 'position', observation: 'observed', dimension })
        // La posición objetivo es un entero de la cola (un parámetro, no una medición): se cita como «la posición 5», no
        // con el formato de una posición media («#5,0»).
        out.push({ ...base, factId: id('target_position'), metricId: `opportunity.${rank}.target_position`, label: item.keyword, value: item.breakdown.targetPosition, unit: 'count', observation: 'observed', dimension, role: 'reference' })
      }

      // Sólo la banda 1 tiene techo en clics (curva de CTR propia utilizable); en las demás no hay cifra, nunca un 0.
      if (item.priorityScore !== null) {
        out.push({ ...base, factId: id('ceiling'), metricId: `opportunity.${rank}.ceiling`, label: item.keyword, value: Math.round(item.priorityScore), unit: 'count', observation: 'estimated', dimension })
      }

      return out
    })

  return {
    facts,
    sources: facts.length > 0 ? [{ module: 'seo', adapterVersion: SEO_ADAPTER_VERSION, reader: 'readSeoWorkQueue', asOf: computedAt, method: OPPORTUNITY_METHOD, coverage, servedWindow: null }] : []
  }
}

const moverFacts = async (
  organizationId: string,
  window: ResolvedInsightWindow,
  previous: ResolvedInsightWindow,
  current: EvidenceFactV1 | undefined
): Promise<{ facts: EvidenceFactV1[]; rejections: EvidenceRejectionV1[]; sources: EvidenceSourceV1[] }> => {
  const facts: EvidenceFactV1[] = []
  const rejections: EvidenceRejectionV1[] = []
  const sources: EvidenceSourceV1[] = []

  if (!current || current.value === null) return { facts, rejections, sources }

  for (const dimension of ['query', 'page'] as SeoMoverDimension[]) {
    const metricId = `driver.${dimension}.clicks`

    const result = await readSeoWindowMovers(organizationId, {
      window: { from: window.start, toExclusive: window.endExclusive },
      previous: { from: previous.start, toExclusive: previous.endExclusive },
      dimension,
      limit: MOVERS_LIMIT
    })

    if (!result.ok) {
      rejections.push({ module: 'seo', metricId: `driver.${dimension}`, reason: result.errorCode === 'disabled' ? 'module_disabled' : 'insufficient_data', detail: `Movers ${dimension}: ${result.errorCode}` })
      continue
    }

    if (result.movers.length === 0) continue

    const base = {
      factVersion: 'evidence_fact_v1' as const,
      module: 'seo' as const,
      metricId,
      population: dimension === 'query' ? 'Consultas con texto de Search Console' : 'Páginas de Search Console',
      source: 'greenhouse_growth.seo_gsc_daily',
      method: MOVERS_METHOD,
      coverage: current.coverage,
      freshness: current.freshness,
      observation: 'observed' as const,
      unit: 'count' as const,
      numerator: null,
      denominator: null,
      channelId: SEO_SEARCH_CHANNEL
    }

    result.movers.forEach((mover, index) => {
      const rank = String(index + 1)
      const label = dimension === 'page' ? pageLabelOf(mover.key) : mover.key
      const dims = { [dimension]: label, rank }
      const previousId = factId('seo', metricId, previous, rank)

      facts.push(
        { ...base, factId: factId('seo', metricId, window, rank), label, value: mover.clicks, window: evidenceWindow(window, 'period'), evidenceRef: `seo_gsc_daily:movers:${organizationId}:${window.start}_${window.endExclusive}`, comparisonFactId: previousId, dimension: dims },
        { ...base, factId: previousId, label, value: mover.previousClicks, window: evidenceWindow(previous, 'period'), evidenceRef: `seo_gsc_daily:movers:${organizationId}:${previous.start}_${previous.endExclusive}`, comparisonFactId: null, dimension: dims }
      )
    })

    // TASK-1962 — aportes de cada consulta al cambio total de clics, y el resto, para la cascada «qué explica el cambio».
    // La suma por consulta es exactamente el total del informe (misma tabla), así que el resto es medido, no estimado.
    if (dimension === 'query') {
      let explained = 0

      result.movers.forEach((mover, index) => {
        const delta = mover.clicks - mover.previousClicks

        explained += delta
        facts.push({ ...base, factId: factId('seo', 'driver.query.delta', window, String(index + 1)), metricId: 'driver.query.delta', label: mover.key, value: delta, window: evidenceWindow(window, 'period'), evidenceRef: `seo_gsc_daily:movers:${organizationId}:${window.start}_${window.endExclusive}`, comparisonFactId: null, dimension: { query: mover.key, rank: String(index + 1) } })
      })

      facts.push({ ...base, factId: factId('seo', 'driver.query.delta', window, 'rest'), metricId: 'driver.query.delta', label: GH_INSIGHTS.figures.driversRestLabel, value: result.totalClicks - result.previousTotalClicks - explained, window: evidenceWindow(window, 'period'), evidenceRef: `seo_gsc_daily:movers:${organizationId}:${window.start}_${window.endExclusive}`, comparisonFactId: null, dimension: { query: GH_INSIGHTS.figures.driversRestLabel, rank: 'rest' } })
    }

    sources.push({ module: 'seo', adapterVersion: SEO_ADAPTER_VERSION, reader: 'readSeoWindowMovers', asOf: current.freshness.asOf, method: MOVERS_METHOD, coverage: current.coverage, servedWindow: null })
  }

  return { facts, rejections, sources }
}

const collectForWindow = async (input: AdapterCollectInput, window: ResolvedInsightWindow, seoTargetId: string | null, comparisonIds: Record<string, string | null>) => {
  const gsc = await gscFacts(input.organizationId, window, comparisonIds, input.editorialV2 === true)
  const rank = seoTargetId ? await rankFacts(seoTargetId, window, comparisonIds) : { facts: [], rejections: [] as EvidenceRejectionV1[], source: null }
  const etv = seoTargetId ? await etvFacts(seoTargetId, window, comparisonIds) : { facts: [], rejections: [] as EvidenceRejectionV1[], source: null }
  // TASK-1962 — qué pasa después del clic: visitas orgánicas al sitio según GA4 (sólo contrato v2).
  const site = input.editorialV2 === true ? ga4OrganicFacts(input.organizationId, window, await readGa4ChannelWindow(input.organizationId, window), comparisonIds) : { facts: [], rejections: [] as EvidenceRejectionV1[], source: null }

  return {
    facts: [...gsc.facts, ...rank.facts, ...etv.facts, ...site.facts],
    rejections: [...gsc.rejections, ...rank.rejections, ...etv.rejections, ...site.rejections],
    sources: [gsc.source, rank.source, etv.source, site.source].filter((source): source is EvidenceSourceV1 => source !== null)
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

    const opportunities = input.editorialV2 === true && seoTargetId ? await opportunityFacts(seoTargetId) : { facts: [], sources: [] }

    const movers = input.editorialV2 === true && input.comparison
      ? await moverFacts(input.organizationId, input.window, input.comparison, current.facts.find(fact => fact.metricId === 'clicks'))
      : { facts: [], rejections: [], sources: [] }

    // TASK-1888 — con v2, la dirección de las métricas donde MENOR es mejor (posición media), para que el render no
    // lea una subida de posición como mejora. El resto queda sin dirección (neutro), como antes.
    const directed = (facts: EvidenceFactV1[]) =>
      input.editorialV2 === true ? facts.map(fact => (SEO_LOWER_IS_BETTER.has(fact.metricId) ? { ...fact, dimension: { ...fact.dimension, direction: 'lower_is_better' } } : fact)) : facts

    return {
      facts: [...directed(current.facts), ...directed(comparison?.facts ?? []), ...movers.facts, ...opportunities.facts],
      sources: [...current.sources, ...(comparison?.sources ?? []), ...movers.sources, ...opportunities.sources],
      rejections: [...rejections, ...current.rejections, ...movers.rejections, ...asComparisonRejections(comparison?.rejections ?? [])]
    }
  }
}
