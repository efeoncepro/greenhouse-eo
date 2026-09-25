/**
 * TASK-1845 — planner DETERMINISTA: lectura factual del snapshot sin modelo. Es el fallback
 * obligatorio y la base que la IA acotada sólo puede reescribir (nunca recalcular). Cada
 * claim referencia sus factIds y escribe las cifras con `formatFactValue`.
 */

import type { ChartSpecV1 } from '../contracts/chart-spec'
import { isReferenceFact, type EvidenceFactV1, type EvidenceRejectionV1, type EvidenceSnapshotContentV1, type EvidenceSourceV1 } from '../contracts/evidence'
import type { EditorialPlanV1, PlanChapterV1, PlanClaimV1, PlanCoverV1, PlanTableV1 } from '../contracts/plan'
import type { InsightModule } from '../contracts/request'
import { assertChartsAllowed, bulletCharts, contextOfFacts, essentialsFor, humanFactSentence, lineCharts, openingFor, readingsFor, scopeLinesFor, summaryFindingsFor, type ChapterContext as ChapterContextV2 } from './editorial-v2'
import { formatDeltaForUnit, formatFactValue } from './format'
import { GH_INSIGHTS } from '@/lib/copy/insights'

const MODULE_TITLES: Record<InsightModule, string> = {
  seo: GH_INSIGHTS.modules.seo.title,
  aeo: GH_INSIGHTS.modules.aeo.title,
  ico: GH_INSIGHTS.modules.ico.title
}

const REJECTION_TEXT: Record<EvidenceRejectionV1['reason'], string> = GH_INSIGHTS.rejections

/**
 * Límites y metodología son texto que leen deck, informe y web tal cual: se redactan con copy
 * legible, nunca con el `metricId`, el `method.name` ni el nombre de la función lectora (eso queda
 * en el snapshot sellado). El `detail` del rechazo es diagnóstico del adapter —a veces en inglés o
 * con códigos— y tampoco entra al texto. Líneas idénticas se colapsan.
 */
const limitFor = (rejection: EvidenceRejectionV1): string => {
  const subject = (rejection.metricId ? GH_INSIGHTS.metrics[rejection.metricId] : undefined) ?? GH_INSIGHTS.modules[rejection.module].label

  // Un rechazo de la ventana de COMPARACIÓN se dice como tal: sin eso, «la fuente no sirve esta ventana»
  // aparecía al lado de las cifras del período actual que sí existen.
  return rejection.scope === 'comparison'
    ? `${subject}: ${GH_INSIGHTS.document.comparisonLimitPrefix} ${REJECTION_TEXT[rejection.reason]}.`
    : `${subject}: ${REJECTION_TEXT[rejection.reason]}.`
}

const cutoffLabel = (asOf: string | null, locale: string): string => {
  const civil = asOf?.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!civil) return GH_INSIGHTS.methodology.cutoffUndeclared

  const date = new Date(Date.UTC(Number(civil[1]), Number(civil[2]) - 1, Number(civil[3])))

  return `${GH_INSIGHTS.methodology.cutoff} ${new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)}`
}

const methodologyFor = (source: EvidenceSourceV1, locale: string): string => {
  const moduleLabel = GH_INSIGHTS.modules[source.module].title
  const origin = GH_INSIGHTS.sources[source.method.name]

  return origin ? `${moduleLabel}: ${origin}, ${cutoffLabel(source.asOf, locale)}.` : `${moduleLabel}: ${cutoffLabel(source.asOf, locale)}.`
}

const unique = (lines: string[]): string[] => [...new Set(lines)]

const windowLabel = (fact: EvidenceFactV1): string => `${fact.window.start} a ${fact.window.endExclusive}`

const claimFor = (fact: EvidenceFactV1, byId: Map<string, EvidenceFactV1>, locale: string, v2Context: ChapterContextV2 | null = null): PlanClaimV1 => {
  const comparison = fact.comparisonFactId ? byId.get(fact.comparisonFactId) : null
  // Un conteo que es parte de un total («21 keywords en primera página», «presente en 2 consultas») sin su total no
  // dice nada: se escribe «21 de 31». El total sale del mismo hecho (denominador), que la validación ya admite.
  const partOfTotal = fact.unit === 'count' && fact.value !== null && fact.numerator === fact.value && fact.denominator !== null && fact.denominator > 0
  const value = `${formatFactValue(fact.value, fact.unit, locale)}${partOfTotal ? ` de ${formatFactValue(fact.denominator, 'count', locale)}` : ''}`
  const factIds = [fact.factId]
  let text = fact.value === null ? `${fact.label}: sin dato para el período.` : `${fact.label}: ${value}.`

  if (comparison && fact.value !== null && comparison.value !== null) {
    factIds.push(comparison.factId)
    // TASK-1888 — una métrica que ya es porcentaje varía en puntos porcentuales («+1,8 pp»), no en % relativo.
    const delta = formatDeltaForUnit(fact.value, comparison.value, fact.unit, locale)
    const previous = formatFactValue(comparison.value, comparison.unit, locale)

    text = delta
      ? `${fact.label}: ${value} (período anterior ${previous}, variación ${delta}).`
      : `${fact.label}: ${value} (período anterior ${previous}).`
  }

  // TASK-1888 — v2: la misma redacción humana de las lecturas («Las impresiones bajaron de…»), mismas cifras citadas.
  const human = v2Context ? humanFactSentence(fact, byId, locale, v2Context) : null

  if (human) text = human

  if (fact.window.partial) text += ' Período parcial: la fuente aún no cerró.'
  if (fact.observation === 'estimated') text += ' Valor estimado por la fuente.'

  return { claimId: `claim.${fact.factId}`, text, factIds }
}

const chartFor = (_module: InsightModule, facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>, unit: string, chartId: string, title: string, editorialV2 = false): ChartSpecV1 | null => {
  const withValue = facts.filter(fact => fact.value !== null)

  if (withValue.length === 0) return null

  const comparable = withValue.filter(fact => fact.comparisonFactId && byId.get(fact.comparisonFactId)?.value !== null)

  const series = comparable.length > 0
    ? [
        { seriesId: `${chartId}.previous`, label: 'Período anterior', factIds: comparable.map(fact => fact.comparisonFactId!), unit },
        { seriesId: `${chartId}.current`, label: 'Período', factIds: comparable.map(fact => fact.factId), unit }
      ]
    : [{ seriesId: `${chartId}.current`, label: 'Período', factIds: withValue.map(fact => fact.factId), unit }]

  const labelled = comparable.length > 0 ? comparable : withValue
  // TASK-1888 — canal. Si las dimensiones SON canales distintos (presencia por motor AEO), cada una lleva el suyo en
  // `dimensionChannelIds`. Si todo el gráfico mide UN solo canal (SEO: clics, impresiones, CTR… son todas de Google),
  // la dimensión es una métrica, no un canal: el canal va en la serie. Marcar cada métrica como «google» hacía que un
  // consumer leyera canales donde no los hay (hallazgo de TASK-1889 con Berel, 2026-09-25).
  const distinctChannels = new Set(labelled.map(fact => fact.channelId ?? null))
  const perDimension = editorialV2 && distinctChannels.size > 1
  const chartChannel = editorialV2 && distinctChannels.size === 1 ? labelled[0]?.channelId : undefined
  const channels = perDimension ? { dimensionChannelIds: labelled.map(fact => fact.channelId ?? null) } : {}
  const channelSeries = chartChannel ? series.map(item => ({ ...item, channelId: chartChannel })) : series

  return {
    specVersion: 'chart_spec_v1',
    chartId,
    family: series.length > 1 ? 'bar_grouped' : 'bar',
    relation: 'comparison',
    title,
    series: channelSeries,
    dimensionLabels: labelled.map(fact => fact.label),
    ...channels,
    unit,
    scale: { kind: 'linear', baseline: 0 },
    references: [],
    tabularEquivalent: {
      columns: series.length > 1 ? ['Métrica', 'Período anterior', 'Período'] : ['Métrica', 'Período'],
      rows: labelled.map(fact => (series.length > 1 ? [null, fact.comparisonFactId!, fact.factId] : [null, fact.factId]))
    }
  }
}

const tableFor = (tableId: string, title: string, facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>, locale: string): PlanTableV1 => ({
  tableId,
  title,
  columns: ['Métrica', 'Período', 'Período anterior', 'Corte de la fuente'],
  rows: facts.map(fact => {
    const comparison = fact.comparisonFactId ? byId.get(fact.comparisonFactId) : null

    return [fact.label, formatFactValue(fact.value, fact.unit, locale), comparison ? formatFactValue(comparison.value, comparison.unit, locale) : '—', fact.freshness.asOf ?? '—']
  })
})

export interface DeterministicPlanInput {
  modules: InsightModule[]
  locale: string
  /** TASK-1888 — contrato editorial v2 (`INSIGHTS_EDITORIAL_V2_ENABLED`). Ausente/false ⇒ plan v1. */
  editorialV2?: boolean
  /** TASK-1888 — portada ya resuelta (`resolveInsightCover`); se sella tal cual en el plan. Sólo con v2. */
  cover?: PlanCoverV1 | null
}

export const buildDeterministicPlan = (snapshot: EvidenceSnapshotContentV1, input: DeterministicPlanInput): EditorialPlanV1 => {
  const byId = new Map(snapshot.facts.map(fact => [fact.factId, fact]))
  const comparisonIds = new Set(snapshot.facts.map(fact => fact.comparisonFactId).filter((id): id is string => id !== null))
  const chapters: PlanChapterV1[] = []
  const summary: PlanClaimV1[] = []
  const editorialV2 = input.editorialV2 === true

  for (const moduleKey of input.modules) {
    // Hechos del período actual (los del período anterior sólo entran como comparación). Una meta oficial es un
    // hecho de REFERENCIA (TASK-1888): se cita en gráficos y lecturas, nunca como hallazgo propio.
    const facts = snapshot.facts.filter(fact => fact.module === moduleKey && !comparisonIds.has(fact.factId) && !isReferenceFact(fact))
    const referenceFacts = snapshot.facts.filter(fact => fact.module === moduleKey && isReferenceFact(fact))
    const rejections = snapshot.rejections.filter(rejection => rejection.module === moduleKey)
    const v2Context = editorialV2 ? contextOfFacts(facts) : null
    const claims = facts.map(fact => claimFor(fact, byId, input.locale, v2Context))
    const charts: ChartSpecV1[] = []
    const byUnit = new Map<string, EvidenceFactV1[]>()

    for (const fact of facts) byUnit.set(fact.unit, [...(byUnit.get(fact.unit) ?? []), fact])

    for (const [unit, unitFacts] of byUnit) {
      const chart = chartFor(moduleKey, unitFacts, byId, unit, `chart.${moduleKey}.${unit}`, GH_INSIGHTS.units[unit] ? `${GH_INSIGHTS.modules[moduleKey].label} · ${GH_INSIGHTS.units[unit]}` : GH_INSIGHTS.modules[moduleKey].label, editorialV2)

      if (chart) charts.push(chart)
    }

    if (editorialV2) {
      charts.push(...bulletCharts(moduleKey, facts, referenceFacts), ...lineCharts(moduleKey, facts))
      assertChartsAllowed(moduleKey, charts)
    }

    if (claims[0]) summary.push({ ...claims[0], claimId: `summary.${claims[0].claimId}` })

    chapters.push({
      chapterId: `chapter.${moduleKey}`,
      module: moduleKey,
      title: MODULE_TITLES[moduleKey],
      claims,
      charts,
      tables: facts.length > 0 ? [tableFor(`table.${moduleKey}`, `${MODULE_TITLES[moduleKey]} · resumen`, facts, byId, input.locale)] : [],
      limits: unique(rejections.map(limitFor)),
      ...(editorialV2 ? { opening: openingFor(moduleKey), readings: readingsFor(charts, byId, input.locale) } : {})
    })
  }

  const references = snapshot.facts
    .filter(fact => !comparisonIds.has(fact.factId) && !isReferenceFact(fact))
    .map(fact => ({ referenceId: `ref.${fact.factId}`, label: `${fact.label} (${windowLabel(fact)})`, evidenceRef: fact.evidenceRef }))

  // TASK-1888 — con v2 la tesis del resumen y su bajada son hallazgos del informe; sin hallazgos, la afirmación v1.
  const findings = editorialV2 ? summaryFindingsFor(chapters, byId, input.locale) : []
  const executiveSummary = findings.length > 0 ? findings : summary

  return {
    planVersion: 'editorial_plan_v1',
    locale: input.locale,
    executiveSummary,
    chapters,
    actions: [],
    limits: unique(snapshot.rejections.map(limitFor)),
    methodology: unique(snapshot.sources.map(source => methodologyFor(source, input.locale))),
    references,
    // TASK-1888 — campos v2: sólo con el contrato encendido; un plan v1 no los trae.
    ...(editorialV2
      ? {
          essentials: essentialsFor(chapters, byId, input.locale, findings),
          scopeLines: scopeLinesFor(input.modules),
          ...(input.cover ? { cover: input.cover } : {})
        }
      : {})
  }
}
