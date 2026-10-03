/**
 * TASK-1974 — productores del criterio de selección de figuras (contrato editorial v2). El planner los orquesta; cada uno
 * responde UNA pregunta del lector y declara cuál (`ChartSpecV1.question`):
 *
 * - `statFigureFor` — «¿cuánto es y cómo cambió?»: la tarjeta de cifra del capítulo (una métrica sola o varias, cada
 *   una en su escala). Una métrica con meta NO va en tarjeta: la gana el bullet (regla 2).
 * - `compositionChartsFor` — «¿de qué se compone?»: dona, waffle o barras ordenadas según las partes (regla 1), con la
 *   variedad como desempate (regla 3).
 * - `withQuestion` — la pregunta de los gráficos que ya produce el planner (línea, cascada, bullet, barras).
 */

import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { ChartSpecV1, FigureQuestion } from '../contracts/chart-spec'
import type { EvidenceFactV1 } from '../contracts/evidence'
import type { InsightModule } from '../contracts/request'
import { PLAN_TEXT_LIMITS, STAT_LABEL_MAX_CHARS, STAT_LABEL_MAX_WORDS, type PlanFigureReadingV1, type PlanStatFigureV1, type PlanStatItemV1 } from '../contracts/plan'
import { contextOfFacts, humanFactSentence, printedChange } from './editorial-v2'
import { canProduceFamily } from './family-evidence-matrix'
import { familiesForQuestion, metricDirectionOf, type FigureFamily } from './figure-selection'

/**
 * Orden de las cifras en la tarjeta: la métrica de resultado primero (la que abre la lectura del capítulo). Una métrica
 * fuera de la lista va al final, en el orden del snapshot.
 */
const STAT_ORDER = [
  'clicks',
  'impressions',
  'ctr',
  'position',
  'page_one_keywords',
  'organic_etv',
  'site.organic_sessions',
  'site.organic_engaged_sessions',
  'ai_sessions',
  'share_of_model',
  'citation_share',
  'sov.brand',
  'delivered.completed'
]

const statRank = (fact: EvidenceFactV1): number => {
  const index = STAT_ORDER.indexOf(fact.metricId)

  return index === -1 ? STAT_ORDER.length : index
}

/** Nombre corto de la cifra: sólo métricas con nombre de 3 palabras declarado van en tarjeta (nunca se trunca). */
export const statLabelOf = (fact: EvidenceFactV1): string | null => {
  const label = GH_INSIGHTS.stat.labels[fact.metricId]

  if (!label) return null

  return label.split(/\s+/).length <= STAT_LABEL_MAX_WORDS && label.length <= STAT_LABEL_MAX_CHARS ? label : null
}

export interface StatFigureInput {
  moduleKey: InsightModule
  facts: EvidenceFactV1[]
  byId: Map<string, EvidenceFactV1>
  /** Métricas con meta oficial (`target.<metricId>`): van en bullet, no en tarjeta. */
  targetMetrics: ReadonlySet<string>
  /** Hechos que otra figura ya dibuja (composición, apiladas): un dato, una figura. */
  takenFactIds: ReadonlySet<string>
}

/**
 * La tarjeta de cifra del capítulo (a lo más una; el render la pagina por capacidad). Lleva cada hecho medido con nombre
 * corto, sin meta y que ninguna otra figura dibuja. Sin cifras elegibles, no hay tarjeta.
 */
export const statFigureFor = ({ moduleKey, facts, byId, targetMetrics, takenFactIds }: StatFigureInput): PlanStatFigureV1 | null => {
  const eligible = facts
    .filter(fact => !targetMetrics.has(fact.metricId) && !takenFactIds.has(fact.factId) && statLabelOf(fact) !== null)
    .map((fact, index) => ({ fact, index }))
    .sort((a, b) => statRank(a.fact) - statRank(b.fact) || a.index - b.index)
    .map(({ fact }) => fact)

  if (eligible.length === 0) return null

  const items: PlanStatItemV1[] = eligible.map(fact => {
    const previous = fact.comparisonFactId ? byId.get(fact.comparisonFactId) : undefined

    return {
      itemId: fact.metricId,
      label: statLabelOf(fact)!,
      factId: fact.factId,
      comparisonFactId: previous ? previous.factId : null,
      direction: metricDirectionOf(fact),
      estimated: fact.observation === 'estimated'
    }
  })

  const noteMetric = eligible.find(fact => GH_INSIGHTS.stat.notes[fact.metricId])

  return {
    figureId: `stats.${moduleKey}`,
    question: 'value_change',
    title: GH_INSIGHTS.stat.boardTitle[moduleKey] ?? GH_INSIGHTS.stat.figureTitle,
    items,
    ...(noteMetric ? { note: { claimId: `stats.${moduleKey}.note`, text: GH_INSIGHTS.stat.notes[noteMetric.metricId]!, factIds: [] } } : {})
  }
}

/**
 * Lectura de la tarjeta: la conclusión es el cambio de la PRIMERA cifra que cambió en lo impreso (la de resultado, por
 * el orden de la tarjeta), en la misma frase que el resto del informe usa para ese hecho. Sin cambios impresos, la
 * primera cifra como valor (conclusión de página, no hallazgo). La página de cifras no lleva cifra principal: las cifras
 * son la figura (repetir una en el héroe mostraría el mismo dato dos veces).
 */
export const statReading = (stat: PlanStatFigureV1, byId: Map<string, EvidenceFactV1>, locale: string): PlanFigureReadingV1 | null => {
  const facts = stat.items.map(item => byId.get(item.factId)).filter((fact): fact is EvidenceFactV1 => Boolean(fact && fact.value !== null))
  const context = contextOfFacts(facts)

  for (const fact of facts) {
    const change = printedChange(fact, byId, locale)
    const text = change ? humanFactSentence(fact, byId, locale, context) : null

    if (change && text && text.length <= PLAN_TEXT_LIMITS.conclusion) {
      return { chartId: stat.figureId, conclusion: { claimId: `${stat.figureId}.conclusion`, text, factIds: [fact.factId, change.previous.factId] }, nextStep: null }
    }
  }

  const first = facts[0]
  const text = first ? humanFactSentence(first, byId, locale, context) : null

  return first && text && text.length <= PLAN_TEXT_LIMITS.conclusion
    ? { chartId: stat.figureId, conclusion: { claimId: `${stat.figureId}.value`, text, factIds: [first.factId] }, nextStep: null }
    : null
}

/** Composiciones del Grader que el criterio resuelve por sus partes: tono y tipo de fuente citada. */
const AEO_COMPOSITIONS = [
  { prefix: 'sentiment.', key: 'sentiment' },
  { prefix: 'source_type.', key: 'source_type' }
] as const

const compositionSpec = (chartId: string, family: Extract<FigureFamily, 'waffle' | 'donut' | 'bar'>, title: string, parts: EvidenceFactV1[]): ChartSpecV1 => {
  const base = {
    specVersion: 'chart_spec_v1' as const,
    chartId,
    title,
    unit: 'count',
    scale: { kind: 'linear' as const, baseline: 0 as const },
    references: [],
    question: 'composition' as const,
    tabularEquivalent: { columns: ['Parte', 'Cantidad'], rows: parts.map(fact => [null, fact.factId]) }
  }

  if (family === 'waffle') {
    return { ...base, family, relation: 'composition', series: [], dimensionLabels: parts.map(fact => fact.label), data: { kind: 'waffle', parts: parts.map(fact => ({ partId: fact.metricId, label: fact.label, factId: fact.factId })), totalFactId: null } }
  }

  // Dona: una serie de partes de un total. Barras: las partes ORDENADAS de mayor a menor (más de 4 categorías).
  return { ...base, family, relation: family === 'donut' ? 'composition' : 'comparison', series: [{ seriesId: 'parts', label: title, factIds: parts.map(fact => fact.factId), unit: 'count' }], dimensionLabels: parts.map(fact => fact.label) }
}

/**
 * «¿De qué se compone?» para el Grader: el tono (pocas respuestas contables) y el tipo de fuente. 2–3 partes → dona o
 * waffle (la variedad desempata con la figura anterior); ≤ 4 categorías contables → waffle; más → barras ordenadas.
 * Todas las partes con valor entran, «sin clasificar» incluida: una composición sin una de sus partes describe otro
 * todo (Berel septiembre: 5 tipos de fuente → barras ordenadas, criterio §7).
 */
export const compositionChartsFor = (moduleKey: InsightModule, facts: EvidenceFactV1[], previousFamily: FigureFamily | null): ChartSpecV1[] => {
  if (moduleKey !== 'aeo') return []

  const charts: ChartSpecV1[] = []
  let previous = previousFamily

  for (const { prefix, key } of AEO_COMPOSITIONS) {
    const parts = facts.filter(fact => fact.metricId.startsWith(prefix) && fact.value !== null && fact.value > 0)
    const units = parts.reduce((sum, fact) => sum + fact.value!, 0)

    // La variedad sólo elige entre familias que el criterio da por igual de válidas Y que la matriz autoriza en el módulo.
    const candidates = familiesForQuestion({ question: 'composition', parts: parts.length, units }).filter(
      (family): family is 'waffle' | 'donut' | 'bar' => (family === 'waffle' || family === 'donut' || family === 'bar') && canProduceFamily(family, moduleKey)
    )

    const family = candidates.find(candidate => candidate !== previous) ?? candidates[0]

    if (!family) continue

    // Barras: las partes ordenadas de mayor a menor. Waffle y dona conservan el orden de la fuente (el waffle llena
    // fila por fila en ese orden).
    // «Sin clasificar» es el resto que la fuente no tipificó: va al final, nunca encabeza el orden.
    const residual = (fact: EvidenceFactV1) => (fact.metricId.endsWith('.unknown') ? 1 : 0)
    const ordered = family === 'bar' ? [...parts].sort((a, b) => residual(a) - residual(b) || b.value! - a.value!) : parts

    charts.push(compositionSpec(`chart.aeo.${family === 'bar' ? 'parts' : family}.${key.replace(/_/g, '-')}`, family, GH_INSIGHTS.aeoFamilyTitles[key] ?? key, ordered))
    previous = family
  }

  return charts
}

/** Pregunta de un gráfico por su familia, cuando el productor no la declaró. */
const QUESTION_BY_FAMILY: Partial<Record<ChartSpecV1['family'], FigureQuestion>> = {
  bullet: 'target',
  gauge: 'target',
  line: 'evolution',
  waterfall: 'explain_change',
  waffle: 'composition',
  donut: 'composition',
  pie: 'composition',
  bar_stacked: 'subset',
  bar: 'compare',
  bar_grouped: 'compare'
}

export const withQuestion = (chart: ChartSpecV1): ChartSpecV1 => (chart.question ? chart : ((question => (question ? { ...chart, question } : chart))(QUESTION_BY_FAMILY[chart.family])))
