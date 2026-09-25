/**
 * TASK-1889 Slice 4 — de un `ChartSpecV1` del plan (y su lectura, TASK-1888) a las páginas de figura
 * premium. Lo comparten el informe A4 y el deck: los dos dicen lo mismo de la misma figura, cada mapper
 * sólo pone las piezas en los slots de su plantilla.
 *
 * Qué página recibe cada familia (la que el canvas aprobado diseñó para esa pregunta):
 * - `bar_grouped` cuyas dimensiones son MÉTRICAS (clics, impresiones, CTR) → comparación: cada métrica
 *   en su propia escala, el período contra el anterior.
 * - `bar` o `bar_grouped` cuyas dimensiones son CANALES (comparables entre sí) → columnas sobre un eje.
 * - `bullet` → metas; `line` → tendencia.
 * Una familia sin página (las que la matriz familia × evidencia no produce) se RECHAZA con causa: nunca se
 * dibuja en una plantilla ajena. Una figura sin hechos suficientes para dibujarse NO se emite (el capítulo
 * la narra, y su ausencia está en la tabla y los límites): nunca una figura con un hueco inventado.
 *
 * Toda cifra sale del formateador canónico sobre los hechos del snapshot; la geometría la calcula la
 * plantilla desde esas mismas cifras. La única cifra derivada es el porcentaje de la meta (logrado ÷ meta),
 * que la página de metas imprime y el canvas aprobado exige; se redondea a entero y viaja con sus dos
 * hechos a la vista.
 */

import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { ChartSpecV1 } from '../contracts/chart-spec'
import type { EvidenceFactV1, EvidenceUnit } from '../contracts/evidence'
import type { PlanClaimV1, PlanFigureReadingV1 } from '../contracts/plan'
import { InsightsRenderRejectedError } from '../errors'
import { formatDeltaForUnit, formatFactValue } from '../editorial/format'

export type FigureKind = 'comparison' | 'columns' | 'targets' | 'trend'

type Slots = Record<string, unknown>

export interface FigureSlide {
  kind: FigureKind
  /** Hechos dibujados: con ellos se eligen las afirmaciones que la narran. */
  factIds: string[]
  /** Piezas comunes; cada mapper las nombra según su plantilla. */
  eyebrow: { icon?: string; label: string }
  keyFigure: string
  keyCaption: string
  conclusion: string
  lead: string | null
  figureTitle: string
  unitText: string
  sourceText: string
  closing: Array<{ kind: 'measure' | 'action'; label: string; text: string }>
  /** Slots propios de la familia (métricas, grupos, filas o series). */
  body: Slots
}

export interface FigureCapacity {
  metrics: number
  groups: number
  bulletRows: number
}

const L = GH_INSIGHTS.catalog

/** Capacidad de cada plantilla de figura (`*.slots.json`): métricas, grupos y filas por página. */
export const FIGURE_CAPACITY: Readonly<Record<'report' | 'deck', FigureCapacity>> = {
  report: { metrics: 5, groups: 6, bulletRows: 6 },
  deck: { metrics: 4, groups: 4, bulletRows: 5 }
}

/** El contentType de cada página de figura, por catálogo. */
export const FIGURE_CONTENT_TYPE = {
  report: {
    comparison: 'report-figure-comparison',
    columns: 'report-figure-columns',
    targets: 'report-figure-targets',
    trend: 'report-figure-trend'
  },
  deck: {
    comparison: 'insights-figure-comparison',
    columns: 'insights-figure-columns',
    targets: 'insights-figure-targets',
    trend: 'insights-figure-trend'
  }
} as const satisfies Record<'report' | 'deck', Record<FigureKind, string>>

/** Ícono de trazo por métrica (set del canvas). Una métrica sin ícono propio no recibe uno ajeno. */
const METRIC_ICON: Readonly<Record<string, string>> = {
  clicks: 'clicks',
  impressions: 'impressions',
  ctr: 'ctr',
  position: 'search',
  rank: 'search',
  page_one_keywords: 'search',
  keywords_tracked: 'search'
}

const iconOf = (fact: EvidenceFactV1 | undefined): string | undefined => (fact ? METRIC_ICON[fact.metricId] : undefined)

const unitWordOf = (unit: string): string => (GH_INSIGHTS.units[unit] ?? GH_INSIGHTS.document.unitLabel).toLowerCase()

const fmt = (fact: EvidenceFactV1, locale: string) => formatFactValue(fact.value, fact.unit, locale)

/**
 * Dirección de una variación para el lector. En una POSICIÓN el número menor es mejor: bajar de #6,6 a #5,8 es
 * «subir» en Google, así que se invierte (caso real Berel: «▲ 0,8 pos.» destacaba un empeoramiento).
 */
export const directionOf = (current: number, previous: number): 'up' | 'down' | 'flat' =>
  current > previous ? 'up' : current < previous ? 'down' : 'flat'

/**
 * Si subir es mejor para la métrica del hecho: la posición siempre es «menor es mejor»; si no, la dirección que declara
 * el hecho de referencia (meta) de la misma métrica. Sin dirección conocida ⇒ null (tono neutro, nunca adivinado).
 */
export const higherIsBetterOf = (fact: EvidenceFactV1, facts: Iterable<EvidenceFactV1>): boolean | null => {
  if (fact.unit === 'position') return false

  for (const other of facts) {
    const direction = other.dimension?.direction

    if (other.module === fact.module && other.metricId === fact.metricId && direction) return direction === 'higher_is_better'
  }

  return null
}

/**
 * Una sola regla para tablas y figuras: el triángulo sigue al valor (▲ subió, ▼ bajó) y el tono dice si el cambio es
 * mejor o peor según la dirección de la métrica. Valor `<dirección>:<tono>` (ver `DELTA_VALUES` del catálogo).
 */
export const trendOf = (
  current: number,
  previous: number,
  fact: EvidenceFactV1,
  facts: Iterable<EvidenceFactV1>
): { direction: 'up' | 'down' | 'flat'; tone: 'better' | 'worse' | 'neutral'; value: string } => {
  const direction = directionOf(current, previous)
  const higher = direction === 'flat' ? null : higherIsBetterOf(fact, facts)
  const tone = higher === null ? 'neutral' : (direction === 'up') === higher ? 'better' : 'worse'

  return { direction, tone, value: `${direction}:${tone}` }
}

/** La píldora dice la dirección con el triángulo: la cifra va sin signo. */
export const unsigned = (delta: string): string => delta.replace(/^[+\-−]\s*/, '')

const monthLabel = (value: string, locale: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(value)

  if (!match) return value

  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 15)))
    .replace('.', '')
}

const measured = (byId: ReadonlyMap<string, EvidenceFactV1>, id: string | undefined): EvidenceFactV1 | null => {
  const fact = id ? byId.get(id) : undefined

  return fact && fact.value !== null ? fact : null
}

/**
 * Reparte `items` en el mínimo de páginas que la capacidad exige, EQUILIBRADAS: 7 grupos en figuras de 6
 * salen 4 + 3, nunca 6 + 1 (una figura de un solo grupo no es una figura).
 */
export const balancedPages = <T>(items: readonly T[], capacity: number): T[][] => {
  const pages = Math.max(1, Math.ceil(items.length / capacity))
  const size = Math.ceil(items.length / pages)

  return Array.from({ length: pages }, (_, i) => items.slice(i * size, (i + 1) * size)).filter(page => page.length > 0)
}

const reject = (chart: ChartSpecV1, reason: string): never => {
  throw new InsightsRenderRejectedError(`La figura ${chart.chartId} no tiene página: ${reason}`)
}

const kindOf = (chart: ChartSpecV1): FigureKind => {
  if (chart.family === 'bullet') return 'targets'
  if (chart.family === 'line') return 'trend'

  if (chart.family === 'bar' || chart.family === 'bar_grouped') {
    // Columnas sólo cuando las dimensiones son CANALES distintos (comparables en un mismo eje). Todas las
    // métricas SEO traen el mismo canal (`google`): siguen siendo métricas distintas, cada una en su escala.
    // Caso real Berel 2026-09-25: clics e impresiones en un eje dejaban 9.377 contra 512.113 invisible.
    const channels = chart.dimensionChannelIds ?? []
    const byChannel = channels.length > 1 && channels.every(Boolean) && new Set(channels).size === channels.length

    return chart.family === 'bar_grouped' && !byChannel ? 'comparison' : 'columns'
  }

  return reject(chart, `la familia ${chart.family} no tiene página de figura en el catálogo (la matriz familia × evidencia no la produce).`)
}

const normalize = (text: string): string => text.toLocaleLowerCase('es').replace(/[\s.,;:()«»"]+/g, ' ').trim()

/**
 * Cierre de la figura. «Lo que significa» que repite la conclusión impresa no dice nada nuevo: no se dibuja
 * (caso real Berel/Sky: el planner determinista escribe la misma frase en los dos lugares). Sin lectura, sin panel.
 */
const closingOf = (reading: PlanFigureReadingV1 | undefined, conclusion: string): FigureSlide['closing'] => [
  // `meaning` puede venir ausente (TASK-1888: sólo se emite si dice algo distinto de la conclusión).
  ...(reading?.meaning && normalize(reading.meaning.text) !== normalize(conclusion)
    ? [{ kind: 'measure' as const, label: L.whatItMeans, text: reading.meaning.text }]
    : []),
  ...(reading?.nextStep ? [{ kind: 'action' as const, label: L.nextStep, text: reading.nextStep.text }] : [])
]

/**
 * Fuente de la figura: las fuentes legibles de los hechos que dibuja (por `method.name`, `GH_INSIGHTS.sources`),
 * sin repetir. El texto genérico queda sólo si ningún hecho declara una fuente conocida.
 */
export const sourcesOf = (factIds: readonly string[], byId: ReadonlyMap<string, EvidenceFactV1>): string => {
  const names = [...new Set(factIds.flatMap(id => {
    const name = GH_INSIGHTS.sources[byId.get(id)?.method?.name ?? '']

    return name ? [name.charAt(0).toUpperCase() + name.slice(1)] : []
  }))]

  return names.length > 0 ? names.join(' · ') : GH_INSIGHTS.document.evidenceSource
}

export const buildFigureSlides = (
  chart: ChartSpecV1,
  byId: ReadonlyMap<string, EvidenceFactV1>,
  reading: PlanFigureReadingV1 | undefined,
  claims: readonly PlanClaimV1[],
  locale: string,
  capacity: FigureCapacity
): FigureSlide[] => {
  const kind = kindOf(chart)
  const current = chart.series.at(-1)
  const previous = chart.series.length > 1 ? chart.series[0] : undefined

  // Cifra principal: la de la lectura del plan; sin lectura (plan v1), el primer hecho de la figura.
  const fallbackFact =
    kind === 'targets' && chart.data?.kind === 'bullet'
      ? measured(byId, chart.data.items[0]?.valueFactId)
      : measured(byId, current?.factIds[0])

  const keyFigure = reading?.keyFigure?.value ?? (fallbackFact ? fmt(fallbackFact, locale) : null)

  if (!keyFigure) return []

  const keyCaption = reading?.keyFigure?.caption.text ?? (fallbackFact?.label ?? chart.title)
  const drawn = new Set<string>()

  // Metas: la conclusión es la afirmación que cita la META, no la de comparación con el período anterior.
  const targetIds = new Set(chart.data?.kind === 'bullet' ? chart.data.items.map(item => item.targetFactId) : [])

  const base = (factIds: string[], body: Slots, unitText: string, icon: string | undefined): Omit<FigureSlide, 'kind'> => {
    const citing = claims.filter(claim => claim.factIds.some(id => factIds.includes(id)))
    const aboutTarget = claims.filter(claim => claim.factIds.some(id => targetIds.has(id)))
    const ordered = kind === 'targets' ? [...aboutTarget, ...citing.filter(claim => !aboutTarget.includes(claim))] : citing
    const conclusionClaim = reading?.conclusion ?? ordered[0]
    const conclusion = conclusionClaim?.text ?? chart.title
    // La bajada no repite un HECHO de la conclusión con otras palabras (Berel clics, Sky FTR): sin otro hecho, no hay bajada.
    // Tampoco repite un miembro de la conclusión: en un empate («todos los motores…») la conclusión cita a todos.
    const concluded = new Set(conclusionClaim?.factIds ?? [])
    const lead = ordered.find(claim => claim.text !== conclusion && !(claim.factIds[0] !== undefined && concluded.has(claim.factIds[0])))?.text ?? null

    factIds.forEach(id => drawn.add(id))

    return {
      factIds,
      eyebrow: { ...(icon ? { icon } : {}), label: L.figureEyebrow[kind] },
      keyFigure,
      keyCaption,
      conclusion,
      lead,
      figureTitle: chart.title,
      unitText,
      sourceText: sourcesOf(factIds, byId),
      closing: closingOf(reading, conclusion),
      body
    }
  }

  if (kind === 'comparison') {
    const rows = (current?.factIds ?? []).flatMap((id, index) => {
      const now = measured(byId, id)
      const before = measured(byId, previous?.factIds[index])

      if (!now || !before) return []

      const delta = formatDeltaForUnit(now.value!, before.value!, now.unit, locale)

      return [{
        ids: [now.factId, before.factId],
        row: {
          ...(iconOf(now) ? { icon: iconOf(now) } : {}),
          name: chart.dimensionLabels[index] ?? now.label,
          unit: unitWordOf(now.unit),
          current: fmt(now, locale),
          prior: fmt(before, locale),
          direction: delta ? trendOf(now.value!, before.value!, now, byId.values()).value : 'flat:neutral',
          delta: delta ? unsigned(delta) : '—'
        }
      }]
    })

    if (rows.length < 2) return []

    const units = [...new Set(rows.map(entry => entry.row.unit))]

    return balancedPages(rows, capacity.metrics).map(page => ({
      kind,
      ...base(
        page.flatMap(entry => entry.ids),
        { legend: { current: current!.label, ...(previous ? { prior: previous.label } : {}) }, metrics: page.map(entry => entry.row) },
        `${units.join('; ')}. ${L.ownScale}`,
        'bars'
      )
    }))
  }

  if (kind === 'columns') {
    const paired = Boolean(previous)

    const groups = (current?.factIds ?? []).flatMap((id, index) => {
      const now = measured(byId, id)
      const before = paired ? measured(byId, previous!.factIds[index]) : null

      if (!now || (paired && !before)) return []

      const delta = before ? formatDeltaForUnit(now.value!, before.value!, now.unit, locale) : null

      return [{
        ids: [now.factId, ...(before ? [before.factId] : [])],
        group: {
          label: chart.dimensionLabels[index] ?? now.label,
          current: fmt(now, locale),
          ...(before ? { prior: fmt(before, locale) } : {}),
          ...(delta && before ? (({ direction, tone }) => ({ delta, direction, tone }))(trendOf(now.value!, before.value!, now, byId.values())) : {})
        }
      }]
    })

    if (groups.length < 2) return []

    const first = measured(byId, current?.factIds[0])

    return balancedPages(groups, capacity.groups).map(page => ({
      kind,
      ...base(
        page.flatMap(entry => entry.ids),
        {
          legend: { current: current!.label, ...(previous ? { prior: previous.label } : {}) },
          columnGroups: page.map(entry => entry.group)
        },
        unitWordOf(chart.unit),
        iconOf(first ?? undefined) ?? 'bars'
      )
    }))
  }

  if (kind === 'targets') {
    if (chart.data?.kind !== 'bullet') return reject(chart, 'una figura de metas trae sus datos en `data` (bullet).')

    const lowerIsBetter = chart.data.direction === 'lower_is_better'

    const rows = chart.data.items.flatMap(item => {
      const value = measured(byId, item.valueFactId)
      const target = measured(byId, item.targetFactId)
      // Límite de atención del registro dueño (hecho de referencia, aditivo de TASK-1888). Sin él, sin zona.
      const band = measured(byId, item.bandFactId)

      if (!value || !target || target.value! <= 0) return []

      const met = lowerIsBetter ? value.value! <= target.value! : value.value! >= target.value!

      return [{
        ids: [value.factId, target.factId, ...(band ? [band.factId] : [])],
        met,
        row: {
          ...(iconOf(value) ? { icon: iconOf(value) } : {}),
          name: item.label,
          unit: unitWordOf(value.unit),
          value: fmt(value, locale),
          achievedLabel: L.achievedRow,
          targetLabel: L.targetRow,
          target: fmt(target, locale),
          ...(band ? { band: fmt(band, locale) } : {}),
          // Una métrica en % se lee contra la meta en puntos porcentuales («10,9 pp»): «114 %» de un porcentaje se
          // confunde con una variación. Las cantidades conservan el «% de la meta» del canvas («107 %»).
          pct:
            value.unit === 'percent'
              ? unsigned(formatDeltaForUnit(value.value!, target.value!, 'percent', locale) ?? '0 pp')
              : `${Math.round((value.value! / target.value!) * 100)} %`
        }
      }]
    })

    if (rows.length === 0) return []

    return balancedPages(rows, capacity.bulletRows).map(page => ({
      kind,
      ...base(
        page.flatMap(entry => entry.ids),
        {
          legend: { achieved: L.achieved, target: L.target, ...(page.some(entry => !entry.met) ? { gap: L.largestGap } : {}) },
          bulletDirection: chart.data!.kind === 'bullet' ? chart.data!.direction : 'higher_is_better',
          bulletRows: page.map(entry => entry.row)
        },
        unitWordOf(chart.unit),
        'target'
      )
    }))
  }

  // trend
  const roles = ['primary', 'reference', 'detail'] as const

  if (chart.series.length === 0 || chart.series.length > roles.length) {
    return reject(chart, 'una tendencia lleva de una a tres series distinguibles en gris.')
  }

  const series = chart.series.map((s, index) => {
    const values = s.factIds.map(id => {
      const fact = measured(byId, id)

      return fact ? fmt(fact, locale) : null
    })

    return { label: s.label, role: roles[index]!, values, endLabel: values.filter((v): v is string => v !== null).at(-1) }
  })

  if (series.some(s => s.values.filter(Boolean).length < 2)) return []

  const ids = chart.series.flatMap(s => s.factIds)
  const first = measured(byId, chart.series[0]!.factIds[0])

  return [{
    kind,
    ...base(
      ids,
      {
        lineLegend: series.map(s => ({ role: s.role, label: s.label })),
        lineSeries: series.map(s => ({ label: s.label, role: s.role, values: s.values, ...(s.endLabel ? { endLabel: s.endLabel } : {}) })),
        lineXLabels: chart.dimensionLabels.map((label, index) => ({ index, label: monthLabel(label, locale) }))
      },
      unitWordOf(chart.unit as EvidenceUnit),
      iconOf(first ?? undefined) ?? 'trend'
    )
  }]
}

/**
 * ¿Esta figura tendrá página? El MISMO predicado que usa el render, exportado para que el planner no elija como
 * esencial la conclusión de un gráfico que no se dibuja (familia sin página o hechos insuficientes). Un solo lugar:
 * si el render cambia qué dibuja, el planner lo sabe sin copiar la regla.
 */
export const hasFigurePage = (chart: ChartSpecV1, byId: ReadonlyMap<string, EvidenceFactV1>, locale = 'es-CL'): boolean => {
  try {
    return buildFigureSlides(chart, byId, undefined, [], locale, FIGURE_CAPACITY.report).length > 0
  } catch {
    return false
  }
}

/** La lectura del plan que corresponde a un gráfico (a lo más una por `chartId`). */
export const readingFor = (readings: readonly PlanFigureReadingV1[] | undefined, chart: ChartSpecV1): PlanFigureReadingV1 | undefined =>
  readings?.find(reading => reading.chartId === chart.chartId)

/**
 * Título de una esencial en el resumen. Si la esencial cita UN solo hecho medido (sin contar el período anterior ni
 * la meta), es el nombre de ese hecho. Si cita varios —un empate, «todos los motores mencionan la marca»—, no es de
 * ninguno: el título es el de la figura que los dibuja juntos. Regla estructural sobre los hechos citados, nunca
 * sobre el texto (caso real Berel: «Presencia en Gemini» titulaba un empate de cuatro motores).
 */
export const essentialTitleOf = (
  item: PlanClaimV1,
  byId: ReadonlyMap<string, EvidenceFactV1>,
  charts: readonly ChartSpecV1[]
): string => {
  const cited = item.factIds.map(id => byId.get(id)).filter((fact): fact is EvidenceFactV1 => Boolean(fact))
  const comparisons = new Set(cited.map(fact => fact.comparisonFactId).filter(Boolean))
  // El período anterior no es otro miembro: se descarta por su enlace (`comparisonFactId`) o por su ventana.
  const primary = cited.find(fact => fact.role !== 'reference' && !comparisons.has(fact.factId))
  const windowKey = (fact: EvidenceFactV1) => JSON.stringify(fact.window ?? null)

  const measured = cited.filter(
    fact => fact.role !== 'reference' && !comparisons.has(fact.factId) && (!primary || windowKey(fact) === windowKey(primary))
  )

  if (measured.length <= 1) return (measured[0] ?? cited[0])?.label ?? item.text

  return groupNameOf(measured, charts)
}

/**
 * Nombre común de varios hechos (un empate): ÚNICA fuente para el título de la esencial y para el rótulo de la cifra
 * del planner (TASK-1888 `tieSubject`), para que el mismo empate no se nombre de dos maneras.
 * 1. El nombre de su familia de métrica (`GH_INSIGHTS.tieSubjects`, «Presencia por motor»).
 * 2. Si no hay, el título de la figura que los dibuja juntos, sin el sufijo de unidad («· Cantidad», «(0 a 100)»).
 * 3. Si aún lleva cifras, el primer tramo del título sin números; y si no hay figura, el nombre del primer hecho.
 */
export const groupNameOf = (facts: readonly EvidenceFactV1[], charts: readonly ChartSpecV1[]): string => {
  const families = new Set(facts.map(fact => fact.metricId.split('.')[0] ?? ''))
  const byFamily = families.size === 1 ? GH_INSIGHTS.tieSubjects[[...families][0]!] : undefined

  if (byFamily) return byFamily

  const ids = new Set(facts.map(fact => fact.factId))

  const figure = charts.find(chart => {
    const drawn = [...chart.series.flatMap(serie => serie.factIds), ...(chart.data?.kind === 'bullet' ? chart.data.items.map(i => i.valueFactId) : [])]

    return drawn.filter(id => ids.has(id)).length >= 2
  })

  if (!figure) return facts[0]?.label ?? ''

  const units = new Set(Object.values(GH_INSIGHTS.units))
  const parts = figure.title.split(' · ')
  const withoutUnit = (parts.length > 1 && units.has(parts.at(-1)!) ? parts.slice(0, -1).join(' · ') : figure.title).replace(/\s*\([^)]*\)\s*$/, '')

  return /\d/.test(withoutUnit) ? parts[0]!.replace(/\d/g, '').trim() : withoutUnit
}
