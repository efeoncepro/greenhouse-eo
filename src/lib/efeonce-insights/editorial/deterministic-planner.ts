/**
 * TASK-1845 — planner DETERMINISTA: lectura factual del snapshot sin modelo. Es el fallback
 * obligatorio y la base que la IA acotada sólo puede reescribir (nunca recalcular). Cada
 * claim referencia sus factIds y escribe las cifras con `formatFactValue`.
 */

import type { ChartSpecV1 } from '../contracts/chart-spec'
import type { EvidenceFactV1, EvidenceRejectionV1, EvidenceSnapshotContentV1, EvidenceSourceV1 } from '../contracts/evidence'
import type { EditorialPlanV1, PlanChapterV1, PlanClaimV1, PlanTableV1 } from '../contracts/plan'
import type { InsightModule } from '../contracts/request'
import { formatDeltaPercent, formatFactValue } from './format'
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

  return `${subject}: ${REJECTION_TEXT[rejection.reason]}.`
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

const claimFor = (fact: EvidenceFactV1, byId: Map<string, EvidenceFactV1>, locale: string): PlanClaimV1 => {
  const comparison = fact.comparisonFactId ? byId.get(fact.comparisonFactId) : null
  const value = formatFactValue(fact.value, fact.unit, locale)
  const factIds = [fact.factId]
  let text = fact.value === null ? `${fact.label}: sin dato para el período.` : `${fact.label}: ${value}.`

  if (comparison && fact.value !== null && comparison.value !== null) {
    factIds.push(comparison.factId)
    const delta = formatDeltaPercent(fact.value, comparison.value, locale)
    const previous = formatFactValue(comparison.value, comparison.unit, locale)

    text = delta
      ? `${fact.label}: ${value} (período anterior ${previous}, variación ${delta}).`
      : `${fact.label}: ${value} (período anterior ${previous}).`
  }

  if (fact.window.partial) text += ' Período parcial: la fuente aún no cerró.'
  if (fact.observation === 'estimated') text += ' Valor estimado por la fuente.'

  return { claimId: `claim.${fact.factId}`, text, factIds }
}

const chartFor = (_module: InsightModule, facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>, unit: string, chartId: string, title: string): ChartSpecV1 | null => {
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

  return {
    specVersion: 'chart_spec_v1',
    chartId,
    family: series.length > 1 ? 'bar_grouped' : 'bar',
    relation: 'comparison',
    title,
    series,
    dimensionLabels: labelled.map(fact => fact.label),
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

export const buildDeterministicPlan = (snapshot: EvidenceSnapshotContentV1, input: { modules: InsightModule[]; locale: string }): EditorialPlanV1 => {
  const byId = new Map(snapshot.facts.map(fact => [fact.factId, fact]))
  const comparisonIds = new Set(snapshot.facts.map(fact => fact.comparisonFactId).filter((id): id is string => id !== null))
  const chapters: PlanChapterV1[] = []
  const summary: PlanClaimV1[] = []

  for (const moduleKey of input.modules) {
    // Hechos del período actual (los del período anterior sólo entran como comparación).
    const facts = snapshot.facts.filter(fact => fact.module === moduleKey && !comparisonIds.has(fact.factId))
    const rejections = snapshot.rejections.filter(rejection => rejection.module === moduleKey)
    const claims = facts.map(fact => claimFor(fact, byId, input.locale))
    const charts: ChartSpecV1[] = []
    const byUnit = new Map<string, EvidenceFactV1[]>()

    for (const fact of facts) byUnit.set(fact.unit, [...(byUnit.get(fact.unit) ?? []), fact])

    for (const [unit, unitFacts] of byUnit) {
      const chart = chartFor(moduleKey, unitFacts, byId, unit, `chart.${moduleKey}.${unit}`, `${MODULE_TITLES[moduleKey]} · ${unit}`)

      if (chart) charts.push(chart)
    }

    if (claims[0]) summary.push({ ...claims[0], claimId: `summary.${claims[0].claimId}` })

    chapters.push({
      chapterId: `chapter.${moduleKey}`,
      module: moduleKey,
      title: MODULE_TITLES[moduleKey],
      claims,
      charts,
      tables: facts.length > 0 ? [tableFor(`table.${moduleKey}`, `${MODULE_TITLES[moduleKey]} · resumen`, facts, byId, input.locale)] : [],
      limits: unique(rejections.map(limitFor))
    })
  }

  const references = snapshot.facts
    .filter(fact => !comparisonIds.has(fact.factId))
    .map(fact => ({ referenceId: `ref.${fact.factId}`, label: `${fact.label} (${windowLabel(fact)})`, evidenceRef: fact.evidenceRef }))

  return {
    planVersion: 'editorial_plan_v1',
    locale: input.locale,
    executiveSummary: summary,
    chapters,
    actions: [],
    limits: unique(snapshot.rejections.map(limitFor)),
    methodology: unique(snapshot.sources.map(source => methodologyFor(source, input.locale))),
    references
  }
}
