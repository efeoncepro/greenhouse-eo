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

import { bulletItemDirection, type ChartSpecV1 } from '../contracts/chart-spec'
import type { EvidenceFactV1, EvidenceUnit } from '../contracts/evidence'
import type { PlanChapterV1, PlanClaimV1, PlanFigureReadingV1, PlanStatFigureV1 } from '../contracts/plan'
import { InsightsRenderRejectedError } from '../errors'
import { formatDeltaForUnit, formatFactValue } from '../editorial/format'
import { metricDirectionOf } from '../editorial/figure-selection'
import { statItemView, statBoardChannelsOf } from '../presentation/stat-card'
import { sourcesLabelOf } from '../presentation/vocabulary'

export type FigureKind = 'comparison' | 'columns' | 'targets' | 'trend' | 'stat' | 'waterfall' | 'waffle' | 'donut' | 'stacked'

type Slots = Record<string, unknown>

export interface FigureSlide {
  kind: FigureKind
  /** Hechos dibujados: con ellos se eligen las afirmaciones que la narran. */
  factIds: string[]
  /** Piezas comunes; cada mapper las nombra según su plantilla. */
  eyebrow: { icon?: string; label: string }
  /** Cifra principal y su bajada; `null` en la página de cifras (las cifras SON la figura: TASK-1975). */
  keyFigure: string | null
  keyCaption: string | null
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
  /** TASK-1975 — cifras por página, pasos intermedios de una cascada, partes de waffle y dona, períodos y segmentos. */
  stats: number
  waterfallSteps: number
  waffleParts: number
  donutParts: number
  stackedPeriods: number
  stackedSegments: number
}

const L = GH_INSIGHTS.catalog

/** Capacidad de cada plantilla de figura (`*.slots.json`): métricas, grupos y filas por página. */
export const FIGURE_CAPACITY: Readonly<Record<'report' | 'deck', FigureCapacity>> = {
  report: { metrics: 5, groups: 6, bulletRows: 6, stats: 6, waterfallSteps: 8, waffleParts: 4, donutParts: 3, stackedPeriods: 6, stackedSegments: 4 },
  deck: { metrics: 4, groups: 4, bulletRows: 5, stats: 6, waterfallSteps: 6, waffleParts: 4, donutParts: 3, stackedPeriods: 4, stackedSegments: 4 }
}

/** El contentType de cada página de figura, por catálogo. */
export const FIGURE_CONTENT_TYPE = {
  report: {
    comparison: 'report-figure-comparison',
    columns: 'report-figure-columns',
    targets: 'report-figure-targets',
    trend: 'report-figure-trend',
    stat: 'report-figure-stat',
    waterfall: 'report-figure-waterfall',
    waffle: 'report-figure-waffle',
    donut: 'report-figure-donut',
    stacked: 'report-figure-stacked'
  },
  deck: {
    comparison: 'insights-figure-comparison',
    columns: 'insights-figure-columns',
    targets: 'insights-figure-targets',
    trend: 'insights-figure-trend',
    stat: 'insights-figure-stat',
    waterfall: 'insights-figure-waterfall',
    waffle: 'insights-figure-waffle',
    donut: 'insights-figure-donut',
    stacked: 'insights-figure-stacked'
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
  keywords_tracked: 'search',
  organic_etv: 'trend'
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
 * Si subir es mejor para la métrica del hecho, en este orden: la dirección que declara el propio hecho
 * (`dimension.direction`); la posición, que siempre es «menor es mejor»; la dirección de un hecho de referencia (meta o
 * banda) de la misma métrica. Las referencias ICO reales se llaman `target.rpa`/`band.rpa` y nombran su métrica en
 * `dimension.metric`: se casan por ahí, no por `metricId`. Sin dirección conocida ⇒ null (tono neutro, nunca adivinado).
 * Se resuelve en el render para que también lo lean los snapshots ya sellados.
 */
const directionValue = (direction: string | undefined): boolean | null =>
  direction === 'higher_is_better' ? true : direction === 'lower_is_better' ? false : null

export const higherIsBetterOf = (fact: EvidenceFactV1, facts: Iterable<EvidenceFactV1>): boolean | null => {
  // TASK-1974/1975 — la dirección del propio hecho, la declarada por métrica (`METRIC_DIRECTIONS`) o la de la posición.
  const declared = metricDirectionOf(fact)

  if (declared) return declared === 'higher_is_better'

  for (const other of facts) {
    if (other === fact || other.module !== fact.module) continue

    const names = other.dimension?.metric === fact.metricId || other.metricId === fact.metricId
    const declared = directionValue(other.dimension?.direction)

    if (names && declared !== null) return declared
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

/**
 * TASK-1962/1975 — familias con página de figura en los catálogos PDF (informe A4 y deck). Las demás familias que la
 * matriz familia × evidencia autoriza (medidor, mapa de calor…) se dibujan en la web; en el PDF quedan su hallazgo y su
 * tabla. Los mappers filtran con este conjunto a propósito: una familia fuera de él nunca llega a `kindOf`, que sigue
 * rechazando. La tarjeta de cifra no es una familia: viaja en `chapter.stats` (`buildStatSlides`).
 */
export const PDF_FIGURE_FAMILIES: ReadonlySet<ChartSpecV1['family']> = new Set(['bar', 'bar_grouped', 'line', 'bullet', 'waterfall', 'waffle', 'donut', 'bar_stacked'])

export const hasPdfFigurePage = (chart: Pick<ChartSpecV1, 'family'>): boolean => PDF_FIGURE_FAMILIES.has(chart.family)

const kindOf = (chart: ChartSpecV1): FigureKind => {
  if (chart.family === 'bullet') return 'targets'
  if (chart.family === 'line') return 'trend'
  if (chart.family === 'waterfall') return 'waterfall'
  if (chart.family === 'waffle') return 'waffle'
  if (chart.family === 'donut') return 'donut'
  if (chart.family === 'bar_stacked') return 'stacked'

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
/** TASK-1957 — la fuente legible sale del vocabulario común: la misma que imprime el informe web. */
export const sourcesOf = (factIds: readonly string[], byId: ReadonlyMap<string, EvidenceFactV1>): string =>
  sourcesLabelOf(factIds.flatMap(id => {
    const fact = byId.get(id)

    return fact ? [fact] : []
  }))

/** Cifra con signo explícito («+182», «−23»): el signo es obligatorio en un paso de cascada (nunca sólo color). */
const signedOf = (delta: number, unit: EvidenceUnit, locale: string): string =>
  `${delta >= 0 ? '+' : '−'}${formatFactValue(Math.abs(delta), unit, locale)}`

/**
 * Participaciones enteras que suman 100 (restos mayores; empate por orden de entrada). Cifra derivada DECLARADA
 * (TASK-1975: parte ÷ suma), impresa junto a su cuenta: nunca reemplaza al hecho.
 */
export const sharesOf = (values: readonly number[]): number[] => {
  const total = values.reduce((sum, value) => sum + value, 0)

  if (total <= 0) return values.map(() => 0)

  const exact = values.map(value => (value / total) * 100)
  const shares = exact.map(Math.floor)
  let remaining = 100 - shares.reduce((sum, share) => sum + share, 0)

  for (const index of exact.map((value, i) => ({ i, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest).map(entry => entry.i)) {
    if (remaining <= 0) break
    shares[index]! += 1
    remaining -= 1
  }

  return shares
}

const percentLabel = (share: number): string => `${share} %`

/**
 * Participación impresa de una parte: una parte con valor que redondea a 0 se lee «<1 %», nunca «0 %» (un dato real no
 * se presenta como cero; caso real Berel 2026-09: 8 de 1.686 visitas desde asistentes de IA).
 */
const shareLabel = (share: number, value: number): string => (share === 0 && value > 0 ? GH_INSIGHTS.catalog.shareUnderOne : percentLabel(share))

/** Contexto del capítulo que una figura necesita para decidir qué imprime (TASK-1975: el centro de la dona). */
export interface FigureContext {
  /** Hechos que ya tienen tarjeta de cifra en el capítulo: no se repiten como cifra en otra figura. */
  statFactIds?: ReadonlySet<string>
}

export const buildFigureSlides = (
  chart: ChartSpecV1,
  byId: ReadonlyMap<string, EvidenceFactV1>,
  reading: PlanFigureReadingV1 | undefined,
  claims: readonly PlanClaimV1[],
  locale: string,
  capacity: FigureCapacity,
  context: FigureContext = {}
): FigureSlide[] => {
  const kind = kindOf(chart)
  const current = chart.series.at(-1)
  const previous = chart.series.length > 1 ? chart.series[0] : undefined

  // Cifra principal: la de la lectura del plan; sin lectura (plan v1), el primer hecho que la figura dibuja. En la
  // cascada, el cambio entre sus dos totales; en las apiladas, el segmento base del último período.
  const fallbackFact =
    chart.data?.kind === 'bullet'
      ? measured(byId, chart.data.items[0]?.valueFactId)
      : chart.data?.kind === 'waffle'
        ? measured(byId, chart.data.parts[0]?.factId)
        : kind === 'stacked'
          ? measured(byId, chart.series[0]?.factIds.at(-1))
          : kind === 'waterfall'
            ? null
            : measured(byId, current?.factIds[0])

  const waterfallChange = (() => {
    if (chart.data?.kind !== 'waterfall') return null

    const first = measured(byId, chart.data.steps[0]?.factId)
    const last = measured(byId, chart.data.steps.at(-1)?.factId)

    return first && last ? signedOf(last.value! - first.value!, last.unit, locale) : null
  })()

  const keyFigure = reading?.keyFigure?.value ?? waterfallChange ?? (fallbackFact ? fmt(fallbackFact, locale) : null)

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

    const data = chart.data

    const rows = data.items.flatMap(item => {
      // TASK-1974 — cada fila con SU dirección: una figura junta metas que mejoran al subir (OTD) y al bajar (RpA).
      const direction = bulletItemDirection(data, item)
      const lowerIsBetter = direction === 'lower_is_better'

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
          direction,
          unit: unitWordOf(value.unit),
          value: fmt(value, locale),
          achievedLabel: L.achievedRow,
          targetLabel: L.targetRow,
          target: fmt(target, locale),
          ...(band ? { band: fmt(band, locale) } : {}),
          // Una métrica en % se lee contra la meta en puntos porcentuales («10,9 pp»): «114 %» de un porcentaje se
          // confunde con una variación. Las cantidades conservan el «% de la meta» del canvas («107 %»).
          // Con «menos es mejor» se imprime la distancia a la meta en su unidad («0,50»): «67 % de la meta» se leería como
          // que faltó. El triángulo (resolver) dice si quedó sobre o bajo la meta.
          pct:
            value.unit === 'percent'
              ? unsigned(formatDeltaForUnit(value.value!, target.value!, 'percent', locale) ?? '0 pp')
              : lowerIsBetter
                ? formatFactValue(Math.abs(value.value! - target.value!), value.unit, locale)
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
          bulletDirection: data.direction,
          bulletRows: page.map(entry => entry.row)
        },
        unitWordOf(chart.unit),
        'target'
      )
    }))
  }

  if (kind === 'waterfall') {
    if (chart.data?.kind !== 'waterfall') return reject(chart, 'una cascada trae sus pasos en `data` (waterfall).')

    const steps = chart.data.steps.map(step => ({ step, fact: measured(byId, step.factId) }))

    if (steps.some(entry => !entry.fact)) return []

    const [start, ...tail] = steps
    const end = tail.pop()
    const middle = tail

    if (!start || !end || !start.step.isTotal || !end.step.isTotal || middle.some(entry => entry.step.isTotal)) {
      return reject(chart, 'una cascada va de un total a otro: el primer y el último paso son totales y los del medio, aportes.')
    }

    // Una cascada no se pagina: partida no explica el cambio. Con más pasos que la capacidad no se emite y el planner
    // lo sabe por `hasFigurePage`.
    if (middle.length < 1 || middle.length > capacity.waterfallSteps) return []

    const startValue = start.fact!.value!
    const endValue = end.fact!.value!
    const sum = middle.reduce((total, entry) => total + entry.fact!.value!, 0)

    // Lo que la figura dibuja debe cuadrar: inicial + Σ aportes = final. Si no, mentiría sobre el cambio.
    if (Math.abs(startValue + sum - endValue) > 1e-6) {
      const unit = end.fact!.unit
      const parts = middle.map(entry => signedOf(entry.fact!.value!, unit, locale).replace(/^([+−])/, '$1 ')).join(' ')

      throw new InsightsRenderRejectedError(
        `La cascada ${chart.chartId} no cuadra: ${fmt(start.fact!, locale)} ${parts} ≠ ${fmt(end.fact!, locale)}.`
      )
    }

    const unit = end.fact!.unit
    const removes = middle.some(entry => entry.fact!.value! < 0)
    const adds = middle.some(entry => entry.fact!.value! >= 0)

    return [{
      kind,
      ...base(
        steps.map(entry => entry.fact!.factId),
        {
          legend: {
            prior: start.step.label,
            // La leyenda sólo nombra lo que la figura dibuja: sin pasos que sumen, no hay «Sumó».
            ...(adds ? { added: L.stepAdded } : {}),
            ...(removes ? { removed: L.stepRemoved } : {}),
            current: end.step.label
          },
          waterfallSteps: [
            { label: start.step.label, value: fmt(start.fact!, locale), kind: 'start' },
            ...middle.map(entry => ({
              label: entry.step.label,
              value: signedOf(entry.fact!.value!, unit, locale),
              kind: entry.fact!.value! < 0 ? 'remove' : 'add'
            })),
            { label: end.step.label, value: fmt(end.fact!, locale), kind: 'end' }
          ],
          note: { text: L.axisFromZeroNote }
        },
        unitWordOf(chart.unit),
        'steps'
      )
    }]
  }

  if (kind === 'waffle') {
    if (chart.data?.kind !== 'waffle') return reject(chart, 'un waffle trae sus partes en `data` (waffle).')

    const data = chart.data
    const parts = data.parts.map(part => ({ part, fact: measured(byId, part.factId) }))

    if (parts.some(entry => !entry.fact) || parts.length < 2 || parts.length > capacity.waffleParts) return []

    // Un cuadro es una unidad: sólo conteos enteros, hasta cien (más no es un conteo legible).
    const counts = parts.map(entry => entry.fact!.value!)

    if (counts.some(count => !Number.isInteger(count) || count < 0)) return []

    const total = counts.reduce((sum, count) => sum + count, 0)

    if (total < 1 || total > 100) return []

    const declared = data.totalFactId ? measured(byId, data.totalFactId) : null

    if (declared && declared.value !== total) {
      throw new InsightsRenderRejectedError(
        `El waffle ${chart.chartId} no suma su total: las partes dan ${total} y el total medido es ${fmt(declared, locale)}.`
      )
    }

    return [{
      kind,
      ...base(
        [...parts.map(entry => entry.fact!.factId), ...(declared ? [declared.factId] : [])],
        {
          waffleParts: parts.map(entry => ({ label: entry.part.label, count: fmt(entry.fact!, locale) })),
          note: { text: L.waffleUnitNote(formatFactValue(total, 'count', locale)) }
        },
        unitWordOf(chart.unit),
        'grid'
      )
    }]
  }

  if (kind === 'donut') {
    const series = chart.series[0]

    if (!series || chart.series.length !== 1) return reject(chart, 'una dona es una sola serie de partes.')

    const parts = series.factIds.map((id, index) => ({ label: chart.dimensionLabels[index] ?? byId.get(id)?.label ?? '', fact: measured(byId, id) }))

    // Nunca torta ni dona con más de tres porciones, ni con una sola: con eso no hay composición que leer.
    if (parts.some(entry => !entry.fact) || parts.length < 2 || parts.length > capacity.donutParts) return []
    if (parts.some(entry => entry.fact!.value! < 0)) return []

    const values = parts.map(entry => entry.fact!.value!)
    const total = values.reduce((sum, value) => sum + value, 0)

    if (total <= 0) return []

    const shares = sharesOf(values)
    const unit = parts[0]!.fact!.unit

    // Centro (aprobado 2026-10-03): si el total ya tiene tarjeta de cifra en el capítulo, el centro dice la
    // participación de la parte principal; si no, el total de las partes. Nunca la misma cifra dos veces.
    const totalHasCard = [...(context.statFactIds ?? [])].some(id => {
      const fact = byId.get(id)

      return fact !== undefined && fact.value === total && fact.unit === unit && fact.module === parts[0]!.fact!.module
    })

    const main = shares.indexOf(Math.max(...shares))

    return [{
      kind,
      ...base(
        parts.map(entry => entry.fact!.factId),
        {
          donutParts: parts.map((entry, index) => ({ label: entry.label, count: fmt(entry.fact!, locale), share: shareLabel(shares[index]!, values[index]!) })),
          donutCenter: totalHasCard
            ? { value: percentLabel(shares[main]!), label: parts[main]!.label }
            : { value: formatFactValue(total, unit, locale), label: L.donutTotal }
        },
        unitWordOf(chart.unit),
        'donut'
      )
    }]
  }

  if (kind === 'stacked') {
    const segments = chart.series
    const periods = chart.dimensionLabels

    if (segments.length < 2 || segments.length > capacity.stackedSegments || periods.length < 2 || periods.length > capacity.stackedPeriods) return []

    const grid = periods.map((_, p) => segments.map(segment => measured(byId, segment.factIds[p])))

    if (grid.some(row => row.some(fact => !fact || fact.value! < 0))) return []

    const base0 = segments[0]!.label.toLocaleLowerCase(locale)

    const rows = grid.map((row, p) => {
      const values = row.map(fact => fact!.value!)
      const total = values.reduce((sum, value) => sum + value, 0)
      const unit = row[0]!.unit

      return {
        label: periods[p]!,
        segments: row.map(fact => fmt(fact!, locale)),
        total: formatFactValue(total, unit, locale),
        // Participación del segmento base: cifra derivada declarada (base ÷ total), redondeada.
        baseShare: `${percentLabel(total > 0 ? Math.round((values[0]! / total) * 100) : 0)} ${base0}`
      }
    })

    const lastBase = grid.at(-1)![0]!
    const prevBase = grid.at(-2)![0]!
    const baseDelta = formatDeltaForUnit(lastBase.value!, prevBase.value!, lastBase.unit, locale)

    return [{
      kind,
      ...base(
        grid.flat().map(fact => fact!.factId),
        {
          stackedLegend: segments.map(segment => ({ label: segment.label })),
          stackedPeriods: rows,
          ...(baseDelta
            ? (({ direction, tone }) => ({ stackedAnnotation: { delta: unsigned(baseDelta), direction, tone, label: base0 } }))(
                trendOf(lastBase.value!, prevBase.value!, lastBase, byId.values())
              )
            : {})
        },
        unitWordOf(chart.unit),
        'layers'
      )
    }]
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

// ─── Tarjeta de cifra (TASK-1975) ────────────────────────────────────────────────────────────────

const STAT_NAME_MAX_WORDS = 3
const STAT_NAME_MAX_CHARS = 24

/** La división de la cifra vive con la tarjeta (`presentation/stat-card.ts`): la usan el PDF, el deck y la web. */
export { splitStatValue } from '../presentation/stat-card'

const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Página de cifras: la figura de la pregunta `value_change` (`chapter.stats`). Sin cifra principal en el héroe —las
 * cifras SON la figura y repetir una mostraría el mismo dato dos veces—; conclusión y lead del plan arriba; hasta
 * `capacity.stats` cifras por página, repartidas en páginas equilibradas. El nombre de cada cifra tiene 3 palabras y
 * 24 caracteres como máximo: más largo se rechaza con causa, nunca se trunca. Variación, tono y período salen de
 * `statItemView` (el mismo que alimenta la web).
 */
export const buildStatSlides = (
  stat: PlanStatFigureV1,
  byId: ReadonlyMap<string, EvidenceFactV1>,
  reading: PlanFigureReadingV1 | undefined,
  claims: readonly PlanClaimV1[],
  locale: string,
  capacity: FigureCapacity
): FigureSlide[] => {
  const S = GH_INSIGHTS.stat

  // Isotipos del tablero (contrato AXIS 0.2.0): una vez en el título, o en cada celda si mezcla motores de respuesta.
  const board = statBoardChannelsOf(stat.items.flatMap(item => byId.get(item.factId) ?? []))

  const views = stat.items.flatMap(item => {
    const view = statItemView(item, byId, locale, board)

    return view ? [{ view, fact: byId.get(item.factId)! }] : []
  })

  if (views.length === 0) return []

  for (const { view } of views) {
    const words = view.label.trim().split(/\s+/).length

    if (words > STAT_NAME_MAX_WORDS || view.label.length > STAT_NAME_MAX_CHARS) {
      throw new InsightsRenderRejectedError(
        `La cifra «${view.label}» de ${stat.figureId} tiene un nombre de ${words} palabras y ${view.label.length} caracteres: el máximo es ${STAT_NAME_MAX_WORDS} y ${STAT_NAME_MAX_CHARS}.`
      )
    }
  }

  return balancedPages(views, capacity.stats).map(page => {
    const factIds = page.flatMap(({ view }) => [view.factId, ...(view.comparison ? [view.comparison.factId] : [])])
    const citing = claims.filter(claim => claim.factIds.some(id => factIds.includes(id)))
    const conclusionClaim = reading?.conclusion ?? citing[0]
    const conclusion = conclusionClaim?.text ?? stat.title
    const concluded = new Set(conclusionClaim?.factIds ?? [])
    const lead = citing.find(claim => claim.text !== conclusion && !(claim.factIds[0] !== undefined && concluded.has(claim.factIds[0])))?.text ?? null

    return {
      kind: 'stat' as const,
      factIds,
      eyebrow: { icon: 'numbers', label: L.figureEyebrow.stat },
      keyFigure: null,
      keyCaption: null,
      conclusion,
      lead,
      figureTitle: stat.title,
      unitText: L.statUnit,
      sourceText: sourcesOf(factIds, byId),
      closing: closingOf(reading, conclusion),
      body: {
        statCount: L.statCount(page.length),
        statItems: page.map(({ view, fact }) => ({
          // El isotipo del canal reemplaza al ícono de la métrica: nunca los dos.
          ...(view.channel ? { channel: view.channel.platform } : iconOf(fact) ? { icon: iconOf(fact) } : {}),
          name: view.label,
          ...(view.context ? { context: view.context } : {}),
          ...(view.estimated ? { estimated: S.estimated } : {}),
          ...view.parts,
          ...(view.change ? { trend: `${view.change.direction}:${view.change.tone}`, delta: view.change.display } : {}),
          ...(view.comparison ? { versus: S.versus(`<strong>${escapeHtml(view.comparison.display)}</strong>`, escapeHtml(view.comparison.period)) } : {}),
          // La línea gris bajo la cifra dice por qué no hay variación: sin dato, o primer período medido.
          ...(view.noData ? { noData: view.noData } : view.firstPeriod ? { noData: view.firstPeriod } : {}),
          ...(view.lowerIsBetter ? { lowerIsBetter: view.lowerIsBetter } : {})
        })),
        // La nota del tablero es una afirmación del plan (con sus hechos): se imprime su texto.
        ...(stat.note ? { note: { text: stat.note.text } } : {}),
        ...(board.title.length > 0 ? { titleChannels: board.title.map(platform => ({ channelId: platform })) } : {})
      }
    }
  })
}

/** Una página de figura con el id que la ubica en el plan (para los mensajes de rechazo y el índice). */
export interface ChapterFigure {
  figureId: string
  figure: FigureSlide
}

/**
 * TASK-1975 — TODAS las páginas de figura de un capítulo, en el orden del criterio (§5.2): la página de cifras primero
 * y después los gráficos con página PDF, en el orden del plan (el planner ya los ordenó por pregunta). Un solo lugar
 * para el informe A4 y el deck.
 */
export const chapterFigureSlides = (
  chapter: Pick<PlanChapterV1, 'charts' | 'stats' | 'readings' | 'claims'>,
  byId: ReadonlyMap<string, EvidenceFactV1>,
  locale: string,
  capacity: FigureCapacity
): ChapterFigure[] => {
  const statFactIds = new Set((chapter.stats ?? []).flatMap(stat => stat.items.map(item => item.factId)))

  const stats = (chapter.stats ?? []).flatMap(stat =>
    buildStatSlides(stat, byId, chapter.readings?.find(reading => reading.chartId === stat.figureId), chapter.claims, locale, capacity).map(figure => ({
      figureId: stat.figureId,
      figure
    }))
  )

  const charts = chapter.charts.filter(hasPdfFigurePage).flatMap(chart =>
    buildFigureSlides(chart, byId, readingFor(chapter.readings, chart), chapter.claims, locale, capacity, { statFactIds }).map(figure => ({
      figureId: chart.chartId,
      figure
    }))
  )

  return [...stats, ...charts]
}

/**
 * ¿Esta figura tendrá página? El MISMO predicado que usa el render, exportado para que el planner no elija como
 * esencial la conclusión de un gráfico que no se dibuja (familia sin página o hechos insuficientes). Un solo lugar:
 * si el render cambia qué dibuja, el planner lo sabe sin copiar la regla.
 */
export const hasFigurePage = (chart: ChartSpecV1, byId: ReadonlyMap<string, EvidenceFactV1>, locale = 'es-CL'): boolean => {
  if (!hasPdfFigurePage(chart)) return false

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
