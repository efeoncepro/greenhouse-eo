/**
 * TASK-1974 — criterio canónico de selección de figuras (`EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md` §4–§5.2)
 * como funciones PURAS (browser-safe, sin I/O). Tres reglas, en este orden:
 *
 * 1. La pregunta del lector decide la familia (`familiesForQuestion`).
 * 2. Un dato no se muestra dos veces (lo aplica el planner y lo verifica `duplicatedFigureFacts`).
 * 3. La variedad sólo desempata entre familias IGUAL de válidas (`chooseFigureFamily`); nunca elige una peor.
 *
 * La tarjeta de cifra no es una de las 15 familias de gráfico (`ChartFamily`): es la figura de la pregunta
 * `value_change` y vive en `chapter.stats` del plan.
 */

import type { ChartFamily, ChartSpecV1, FigureQuestion } from '../contracts/chart-spec'
import { FIGURE_QUESTIONS } from '../contracts/chart-spec'
import type { EvidenceFactV1 } from '../contracts/evidence'

/** Familia de una figura: un gráfico de las 15 familias o la tarjeta de cifra. */
export type FigureFamily = ChartFamily | 'stat'

/** Puntos mínimos para que la evolución sea una línea (criterio §5: «≥ 3 puntos»). */
export const EVOLUTION_MIN_POINTS = 3

/** Composición: dona con 2–3 partes; waffle con ≤ 4 categorías contables; más categorías, barras ordenadas. */
export const DONUT_MAX_PARTS = 3
export const WAFFLE_MAX_PARTS = 4

/** Un waffle dibuja un cuadro por unidad (criterio §5): por encima de esto no es un conteo legible. */
export const WAFFLE_MAX_UNITS = 100

/** Barras apiladas: ≤ 4 segmentos (criterio §5). */
export const STACKED_MAX_SEGMENTS = 4

/** Lo que el planner sabe de un grupo de hechos al preguntarse qué figura le corresponde. */
export interface FigureShape {
  question: FigureQuestion
  /** `evolution`: puntos en el tiempo. */
  points?: number
  /** `composition`: partes no superpuestas del todo. */
  parts?: number
  /** `composition`: total de unidades contables (respuestas, keywords…); `null` si las partes no son conteos. */
  units?: number | null
  /** `subset`: períodos comparados. */
  periods?: number
  /** `subset`: segmentos de la pila. */
  segments?: number
  /** `compare`: elementos comparados. */
  elements?: number
}

/**
 * Familias válidas para la pregunta, todas IGUAL de buenas (la variedad elige entre ellas). Vacío = el dato no tiene
 * figura propia para esa pregunta: queda en el hallazgo y en la tabla.
 */
export const familiesForQuestion = (shape: FigureShape): FigureFamily[] => {
  switch (shape.question) {
    case 'value_change':
      return ['stat']
    case 'target':
      return ['bullet']
    case 'evolution':
      return (shape.points ?? 0) >= EVOLUTION_MIN_POINTS ? ['line'] : []
    case 'explain_change':
      return ['waterfall']

    case 'composition': {
      const parts = shape.parts ?? 0
      const countable = shape.units !== null && shape.units !== undefined && shape.units > 0 && shape.units <= WAFFLE_MAX_UNITS

      if (parts < 2) return []
      // Unidades contables y pocas: el waffle es la regla MÁS específica (cada cuadro es una unidad); la dona queda como
      // alternativa igual de válida para la variedad.
      if (parts <= DONUT_MAX_PARTS) return countable ? ['waffle', 'donut'] : ['donut']
      if (parts <= WAFFLE_MAX_PARTS && countable) return ['waffle']

      return ['bar']
    }

    case 'subset':
      return (shape.periods ?? 0) >= 2 && (shape.segments ?? 0) >= 2 && (shape.segments ?? 0) <= STACKED_MAX_SEGMENTS ? ['bar_stacked'] : []
    case 'compare':
      return (shape.elements ?? 0) >= 2 ? ['bar'] : []
  }
}

/**
 * Familia de la figura: la primera válida, salvo que la figura anterior del capítulo ya usó esa familia y hay otra
 * IGUAL de válida (regla 3). Con una sola candidata la variedad no cambia nada.
 */
export const chooseFigureFamily = (shape: FigureShape, previousFamily: FigureFamily | null = null): FigureFamily | null => {
  const candidates = familiesForQuestion(shape)

  if (candidates.length === 0) return null

  return candidates.find(family => family !== previousFamily) ?? candidates[0]!
}

/** Orden del capítulo (§5.2): cifras → metas → evolución → explicación → composición → comparación. */
export const questionRank = (question: FigureQuestion | undefined): number => (question ? FIGURE_QUESTIONS.indexOf(question) : FIGURE_QUESTIONS.length)

/** Ordena las figuras de un capítulo por su pregunta; empates conservan el orden del productor. */
export const orderByQuestion = <T extends { question?: FigureQuestion }>(figures: readonly T[]): T[] =>
  figures.map((figure, index) => ({ figure, index })).sort((a, b) => questionRank(a.figure.question) - questionRank(b.figure.question) || a.index - b.index).map(({ figure }) => figure)

// ─── Dirección de las métricas ───────────────────────────────────────────────────────────────────

export type MetricDirection = 'higher_is_better' | 'lower_is_better'

/**
 * Dirección declarada de cada métrica (TASK-1974, punto (a) aprobado el 2026-10-03): de qué lado está «mejor». La pinta
 * la variación (verde mejor, rojo peor) en la tarjeta y en todas las figuras. Sin dirección conocida, tono neutro.
 * Prefijo con punto final = familia de métricas (`mention_rate.` cubre cada motor).
 */
export const METRIC_DIRECTIONS: Readonly<Record<string, MetricDirection>> = {
  clicks: 'higher_is_better',
  impressions: 'higher_is_better',
  ctr: 'higher_is_better',
  page_one_keywords: 'higher_is_better',
  organic_etv: 'higher_is_better',
  position: 'lower_is_better',
  'site.organic_sessions': 'higher_is_better',
  'site.organic_engaged_sessions': 'higher_is_better',
  ai_sessions: 'higher_is_better',
  share_of_model: 'higher_is_better',
  citation_share: 'higher_is_better',
  'sov.brand': 'higher_is_better',
  'mention_rate.': 'higher_is_better'
}

const directionValue = (value: string | undefined): MetricDirection | null =>
  value === 'higher_is_better' || value === 'lower_is_better' ? value : null

/**
 * Dirección de un hecho: la que trae el propio hecho (`dimension.direction`, p. ej. ICO desde su registro) gana; si no,
 * la declarada por métrica; una posición siempre es «menor es mejor»; si no, desconocida (`null`).
 */
export const metricDirectionOf = (fact: Pick<EvidenceFactV1, 'metricId' | 'unit' | 'dimension'>): MetricDirection | null => {
  const own = directionValue(fact.dimension?.direction)

  if (own) return own

  const metricId = fact.metricId ?? ''

  const declared =
    METRIC_DIRECTIONS[metricId] ?? Object.entries(METRIC_DIRECTIONS).find(([key]) => key.endsWith('.') && metricId.startsWith(key))?.[1]

  if (declared) return declared

  return fact.unit === 'position' ? 'lower_is_better' : null
}

export type ChangeDirection = 'up' | 'down' | 'flat'
export type ChangeTone = 'better' | 'worse' | 'neutral'

/**
 * Tono semántico de una variación (aprobado el 2026-10-03): el triángulo sigue al valor y el color sigue a la dirección
 * de la métrica — verde si el cambio es mejor, rojo si es peor, gris si es neutro (sin dirección declarada o sin
 * cambio). Una sola regla para la tarjeta, las columnas, las metas y las tablas.
 */
export const changeToneOf = (current: number, previous: number, direction: MetricDirection | null): { direction: ChangeDirection; tone: ChangeTone } => {
  const moved: ChangeDirection = current > previous ? 'up' : current < previous ? 'down' : 'flat'

  if (moved === 'flat' || direction === null) return { direction: moved, tone: 'neutral' }

  return { direction: moved, tone: (moved === 'up') === (direction === 'higher_is_better') ? 'better' : 'worse' }
}

// ─── Un dato, una figura ─────────────────────────────────────────────────────────────────────────

/** Una figura del capítulo reducida a lo que el gate necesita: su id, su familia y los hechos que dibuja. */
export interface FigureFactUse {
  figureId: string
  family: FigureFamily
  /** Hechos del período actual que la figura dibuja (sin comparables ni referencias). */
  factIds: string[]
  /** Hechos que la figura usa como ANCLA (totales de una cascada): pueden repetir el de una tarjeta. */
  anchorFactIds?: string[]
}

/**
 * Hechos que alimentan MÁS de una figura del capítulo (regla 2). Excepción aprobada (§5.2): los totales de una cascada
 * son anclas de la explicación y conviven con la tarjeta de la misma métrica. Devuelve `factId → figuras`.
 */
export const duplicatedFigureFacts = (figures: readonly FigureFactUse[]): Map<string, string[]> => {
  const owners = new Map<string, string[]>()

  for (const figure of figures) {
    const anchors = new Set(figure.anchorFactIds ?? [])

    for (const factId of new Set(figure.factIds)) {
      if (anchors.has(factId)) continue
      owners.set(factId, [...(owners.get(factId) ?? []), figure.figureId])
    }
  }

  return new Map([...owners].filter(([, ids]) => ids.length > 1))
}

/**
 * Hechos del período actual que dibuja un gráfico, separando las anclas de una cascada. Los comparables (series
 * anteriores, `comparisonFactId`) y las referencias (metas, bandas) acompañan a su hecho principal: no cuentan.
 */
export const chartFactUse = (chart: ChartSpecV1, isCurrent: (factId: string) => boolean): FigureFactUse => {
  const data = chart.data
  let factIds: string[] = []
  let anchorFactIds: string[] = []

  if (data?.kind === 'bullet') factIds = data.items.map(item => item.valueFactId)
  else if (data?.kind === 'waterfall') {
    factIds = data.steps.map(step => step.factId)
    anchorFactIds = data.steps.filter(step => step.isTotal).map(step => step.factId)
  } else if (data?.kind === 'waffle') factIds = data.parts.map(part => part.factId)
  else if (data?.kind === 'funnel') factIds = data.stages.map(stage => stage.factId)
  else if (data?.kind === 'gauge') factIds = [data.valueFactId]
  else if (data?.kind === 'venn_two') factIds = [data.onlyAFactId, data.onlyBFactId, data.bothFactId]
  else if (data?.kind === 'upset') factIds = data.intersections.map(item => item.factId)
  else if (data?.kind === 'heatmap') factIds = data.cells.flat().filter((id): id is string => Boolean(id))
  else factIds = chart.series.flatMap(series => series.factIds)

  return { figureId: chart.chartId, family: chart.family, factIds: factIds.filter(isCurrent), ...(anchorFactIds.length > 0 ? { anchorFactIds } : {}) }
}
