/**
 * TASK-1888 — productores deterministas del contrato editorial v2 (browser-safe, sin modelo). Emiten SÓLO las
 * familias que la matriz familia × evidencia marca `producer_now` para el módulo (`family-evidence-matrix.ts`), y
 * cada cifra de cada frase sale de `formatFactValue` sobre un hecho referenciado: el validador del plan las
 * reconstruye y rechaza cualquier otra.
 *
 * La lectura por figura es FACTUAL: dice dónde quedó el valor contra su meta o su período anterior. Nunca una causa,
 * nunca una explicación, nunca un «próximo paso» que la evidencia no sostenga (sin brecha con la meta ⇒ `null`).
 */

import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { ChartSpecV1 } from '../contracts/chart-spec'
import type { EvidenceFactV1 } from '../contracts/evidence'
import type { PlanChapterV1, PlanClaimV1, PlanFigureReadingV1 } from '../contracts/plan'
import { PLAN_ESSENTIALS_MAX, PLAN_TEXT_LIMITS } from '../contracts/plan'
import type { InsightModule } from '../contracts/request'
import { hasFigurePage } from '../render/figure-slots'
import { canProduceFamily } from './family-evidence-matrix'
import { formatDeltaForUnit, formatFactValue } from './format'

/** Líneas de tendencia: la matriz exige ≥ 3 meses; el render admite hasta 3 series por figura (gris distinguible). */
export const LINE_MIN_POINTS = 3
const LINE_MAX_SERIES = 3

const monthOf = (fact: EvidenceFactV1): string | null => fact.dimension?.month ?? null

const itemLabel = (fact: EvidenceFactV1): string => fact.dimension?.spaceName ?? fact.label

const fmt = (fact: EvidenceFactV1, locale: string): string => formatFactValue(fact.value, fact.unit, locale)

/** Un conteo que es parte de un total se dice con su total («2 de 6»), como la afirmación del planner v1. */
const valueText = (fact: EvidenceFactV1, locale: string): string =>
  fact.unit === 'count' && fact.value !== null && fact.numerator === fact.value && fact.denominator !== null && fact.denominator > 0
    ? `${fmt(fact, locale)} ${GH_INSIGHTS.reading.outOf} ${formatFactValue(fact.denominator, 'count', locale)}`
    : fmt(fact, locale)

// ─── Familias nuevas ─────────────────────────────────────────────────────────────────────────────

/**
 * Bullet ICO: una figura por métrica con meta oficial (hecho de referencia del registro), un ítem por space en el
 * ÚLTIMO mes medido de la ventana.
 */
export const bulletCharts = (moduleKey: InsightModule, facts: EvidenceFactV1[], references: EvidenceFactV1[]): ChartSpecV1[] => {
  if (!canProduceFamily('bullet', moduleKey)) return []

  return references.filter(reference => reference.metricId.startsWith('target.')).flatMap(target => {
    const metricId = target.metricId.replace(/^target\./, '')
    // Banda «cerca de la meta» del mismo registro, si el adapter la entregó (TASK-1888, pedido de TASK-1889).
    const band = references.find(reference => reference.metricId === `band.${metricId}` && reference.value !== null)
    const measured = facts.filter(fact => fact.metricId === metricId && fact.value !== null)
    const lastMonth = measured.map(monthOf).filter((month): month is string => month !== null).sort().at(-1) ?? null
    const items = lastMonth ? measured.filter(fact => monthOf(fact) === lastMonth) : measured

    if (items.length === 0 || target.value === null || target.value <= 0) return []

    const chartId = `chart.${moduleKey}.bullet.${metricId}`

    return [{
      specVersion: 'chart_spec_v1' as const,
      chartId,
      family: 'bullet' as const,
      relation: 'target' as const,
      title: `${GH_INSIGHTS.metrics[metricId] ?? metricId} · ${GH_INSIGHTS.figures.bulletTitle}`,
      series: [],
      dimensionLabels: items.map(itemLabel),
      unit: target.unit,
      scale: { kind: 'linear' as const, baseline: 0 as const },
      references: [],
      tabularEquivalent: {
        columns: ['Espacio', GH_INSIGHTS.figures.currentLabel, GH_INSIGHTS.figures.targetLabel],
        rows: items.map(item => [null, item.factId, target.factId])
      },
      data: {
        kind: 'bullet' as const,
        direction: target.dimension?.direction === 'lower_is_better' ? ('lower_is_better' as const) : ('higher_is_better' as const),
        items: items.map(item => ({ itemId: `${chartId}.${item.factId}`, label: itemLabel(item), valueFactId: item.factId, targetFactId: target.factId, ...(band ? { bandFactId: band.factId } : {}) }))
      }
    }]
  })
}

/**
 * Línea mensual: una figura por métrica cuando la ventana trae ≥ 3 meses. Una serie por dimensión (space en ICO; una
 * sola en SEO/ETV) SÓLO si tiene todos los meses: un hueco no se interpola ni se dibuja como cero.
 */
export const lineCharts = (moduleKey: InsightModule, facts: EvidenceFactV1[]): ChartSpecV1[] => {
  if (!canProduceFamily('line', moduleKey)) return []

  const byMetric = new Map<string, EvidenceFactV1[]>()

  for (const fact of facts) if (monthOf(fact) && fact.value !== null) byMetric.set(fact.metricId, [...(byMetric.get(fact.metricId) ?? []), fact])

  return [...byMetric.entries()].flatMap(([metricId, metricFacts]) => {
    const months = [...new Set(metricFacts.map(fact => monthOf(fact)!))].sort()

    if (months.length < LINE_MIN_POINTS) return []

    const byDimension = new Map<string, EvidenceFactV1[]>()

    for (const fact of metricFacts) {
      const key = fact.dimension?.spaceId ?? metricId

      byDimension.set(key, [...(byDimension.get(key) ?? []), fact])
    }

    const complete = [...byDimension.entries()]
      .map(([key, series]) => ({ key, series: months.map(month => series.find(fact => monthOf(fact) === month)) }))
      .filter((entry): entry is { key: string; series: EvidenceFactV1[] } => entry.series.every(Boolean))

    const unit = metricFacts[0]!.unit
    const title = `${GH_INSIGHTS.metrics[metricId] ?? metricFacts[0]!.label} · ${GH_INSIGHTS.figures.lineTitle}`
    const charts: ChartSpecV1[] = []

    for (let offset = 0; offset < complete.length; offset += LINE_MAX_SERIES) {
      const chunk = complete.slice(offset, offset + LINE_MAX_SERIES)
      const chartId = `chart.${moduleKey}.line.${metricId}${offset > 0 ? `.${offset / LINE_MAX_SERIES + 1}` : ''}`

      charts.push({
        specVersion: 'chart_spec_v1',
        chartId,
        family: 'line',
        relation: 'trend',
        title,
        series: chunk.map(entry => {
          const first = entry.series[0]!

          return {
            seriesId: `${chartId}.${entry.key}`,
            label: first.dimension?.spaceName ?? GH_INSIGHTS.metrics[metricId] ?? first.label,
            factIds: entry.series.map(fact => fact.factId),
            unit,
            ...(first.channelId ? { channelId: first.channelId } : {})
          }
        }),
        dimensionLabels: months,
        unit,
        // Conteos y visitas nacen en cero; porcentajes e índices usan escala propia, declarada.
        scale: { kind: 'linear', baseline: unit === 'count' || unit === 'visits_estimated' ? 0 : null },
        references: [],
        tabularEquivalent: {
          columns: ['Mes', ...chunk.map(entry => entry.series[0]!.dimension?.spaceName ?? GH_INSIGHTS.metrics[metricId] ?? metricId)],
          rows: months.map((_, index) => [null, ...chunk.map(entry => entry.series[index]!.factId)])
        }
      })
    }

    return charts
  })
}

// ─── Lectura por figura ──────────────────────────────────────────────────────────────────────────

const claim = (claimId: string, text: string, factIds: string[]): PlanClaimV1 => ({ claimId, text, factIds: [...new Set(factIds)] })

const R = GH_INSIGHTS.reading
const L = PLAN_TEXT_LIMITS

/** El primer texto que cabe en su tope (planner primero; el render nunca recorta). */
const firstFitting = (limit: number, ...texts: Array<string | null>): string | null => texts.find((text): text is string => text !== null && text.length <= limit) ?? null

const lowerFirst = (text: string): string => `${text.charAt(0).toLowerCase()}${text.slice(1)}`
const upperFirst = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/**
 * Contexto del capítulo: el sujeto de una frase es el NOMBRE HUMANO de la métrica; el space y el mes sólo se nombran
 * cuando el capítulo tiene más de uno (el encabezado ya dice cliente y período). «RpA · Sky Airline · 2026-08» como
 * sujeto era la etiqueta interna del hecho filtrándose al texto (hallazgo de 1846, 2026-09-25).
 */
interface ChapterContext {
  multiSpace: boolean
  multiMonth: boolean
}

const contextOf = (charts: ChartSpecV1[], byId: Map<string, EvidenceFactV1>): ChapterContext => {
  const facts = charts.flatMap(chartSpecFactIdsOf).map(id => byId.get(id)).filter((fact): fact is EvidenceFactV1 => Boolean(fact) && fact!.role !== 'reference')
  // Sólo el período actual: el mes del comparable es «período anterior» y la frase ya lo dice.
  const comparisonIds = new Set(facts.map(fact => fact.comparisonFactId).filter(Boolean))
  const current = facts.filter(fact => !comparisonIds.has(fact.factId))
  const spaces = new Set(current.map(fact => fact.dimension?.spaceId).filter(Boolean))
  const months = new Set(current.map(fact => fact.dimension?.month).filter(Boolean))

  return { multiSpace: spaces.size > 1, multiMonth: months.size > 1 }
}

const chartSpecFactIdsOf = (chart: ChartSpecV1): string[] => [
  ...chart.series.flatMap(series => series.factIds),
  ...(chart.data?.kind === 'bullet' ? chart.data.items.map(item => item.valueFactId) : [])
]

const subjectOf = (fact: EvidenceFactV1, context: ChapterContext): string => {
  const name = GH_INSIGHTS.metrics[fact.metricId] ?? fact.label
  const extras = [context.multiSpace ? fact.dimension?.spaceName : null, context.multiMonth ? fact.dimension?.month : null].filter(Boolean)

  return extras.length > 0 && name !== fact.label ? `${name} (${extras.join(', ')})` : name
}

/** Variación de un hecho contra su comparable, en la unidad que imprime el documento. Null sin comparable. */
const changeOf = (fact: EvidenceFactV1, byId: Map<string, EvidenceFactV1>, locale: string) => {
  const previous = fact.comparisonFactId ? byId.get(fact.comparisonFactId) : undefined

  if (!previous || fact.value === null || previous.value === null) return null

  const text = formatDeltaForUnit(fact.value, previous.value, fact.unit, locale)

  if (!text) return null

  // Magnitud comparable entre las dimensiones de UNA figura (misma unidad): pp o posiciones si aplica, relativa si no.
  const magnitude = fact.unit === 'percent' || fact.unit === 'position' ? Math.abs(fact.value - previous.value) : Math.abs((fact.value - previous.value) / previous.value)

  return { previous, text, magnitude }
}

/** «de 96,5 % a 90,9 % (-5,6 pp)»: compacto, sin concordancia de verbos, las cifras dicen la dirección. */
const fromTo = (fact: EvidenceFactV1, change: NonNullable<ReturnType<typeof changeOf>>, locale: string): string =>
  `${R.from} ${fmt(change.previous, locale)} ${R.lineTo} ${valueText(fact, locale)} (${change.text})`

/** Estado de un bullet contra su meta: el ítem con mayor brecha manda. Lo usan la lectura y la tesis del resumen. */
const bulletStatus = (chart: ChartSpecV1, byId: Map<string, EvidenceFactV1>) => {
  if (chart.data?.kind !== 'bullet') return null

  const lowerIsBetter = chart.data.direction === 'lower_is_better'

  const items = chart.data.items
    .map(item => ({ item, value: byId.get(item.valueFactId), target: byId.get(item.targetFactId) }))
    .filter((entry): entry is { item: (typeof entry)['item']; value: EvidenceFactV1; target: EvidenceFactV1 } => Boolean(entry.value && entry.target && entry.value.value !== null && entry.target.value !== null))

  if (items.length === 0) return null

  // Brecha en la dirección que empeora: positiva = no alcanzó la meta.
  const gap = (entry: (typeof items)[number]) => (lowerIsBetter ? entry.value.value! - entry.target.value! : entry.target.value! - entry.value.value!)
  const lead = [...items].sort((a, b) => gap(b) - gap(a))[0]!
  const metricId = chart.chartId.split('.').at(-1) ?? ''

  return { items, gap, lead, missing: items.filter(entry => gap(entry) > 0), metricName: GH_INSIGHTS.metrics[metricId] }
}

const bulletReading = (chart: ChartSpecV1, byId: Map<string, EvidenceFactV1>, locale: string, context: ChapterContext): PlanFigureReadingV1 | null => {
  const status = bulletStatus(chart, byId)

  if (!status) return null

  const { items, gap, lead, missing, metricName } = status
  const verdict = gap(lead) > 0 ? R.missesTarget : R.meetsTarget
  const target = `${fmt(lead.value, locale)} (${R.targetShort} ${fmt(lead.target, locale)})`

  // Conclusión = el hecho contra su META, con la métrica nombrada (también se lee en «Lo esencial»). Con un solo space
  // el sujeto es la frase («No alcanza la meta de…»); con varios, el space con mayor brecha.
  const conclusionText = firstFitting(
    L.conclusion,
    `${context.multiSpace ? `${lead.item.label} ${verdict}` : upperFirst(verdict)}${metricName ? ` ${R.metricOf} ${lowerFirst(metricName)}` : ''}: ${target}.`,
    `${context.multiSpace ? `${lead.item.label} ${verdict}` : upperFirst(verdict)}: ${target}.`
  )

  const leadChange = changeOf(lead.value, byId, locale)
  const phrase = (entry: (typeof items)[number]) => `${entry.item.label}: ${fmt(entry.value, locale)} (${R.targetShort} ${fmt(entry.target, locale)})`

  const meaningText = items.length > 1
    ? firstFitting(L.meaning, `${items.map(phrase).join('; ')}.`)
    : leadChange
      ? firstFitting(L.meaning, `${R.againstPrevious}: ${fromTo(lead.value, leadChange, locale)}.`)
      : null

  return {
    chartId: chart.chartId,
    keyFigure: {
      factId: lead.value.factId,
      value: fmt(lead.value, locale),
      caption: claim(`${chart.chartId}.key`, context.multiSpace ? `${metricName ?? chart.title} · ${lead.item.label}.` : `${metricName ?? chart.title}.`, [lead.value.factId])
    },
    ...(conclusionText ? { conclusion: claim(`${chart.chartId}.conclusion`, conclusionText, [lead.value.factId, lead.target.factId]) } : {}),
    ...(meaningText ? { meaning: claim(`${chart.chartId}.meaning`, meaningText, items.length > 1 ? items.flatMap(entry => [entry.value.factId, entry.target.factId]) : [lead.value.factId, leadChange!.previous.factId]) } : {}),
    // «Revisar primero X» sólo tiene sentido cuando hay entre qué elegir: dos o más spaces, uno con brecha.
    nextStep:
      items.length > 1 && missing.length > 0
        ? claim(`${chart.chartId}.next`, `${R.nextStepGap} ${lead.item.label}: ${R.nextStepGapReason}`, [lead.value.factId])
        : null
  }
}

const lineReading = (chart: ChartSpecV1, byId: Map<string, EvidenceFactV1>, locale: string, context: ChapterContext): PlanFigureReadingV1 | null => {
  const firstMonth = chart.dimensionLabels[0]
  const lastMonth = chart.dimensionLabels.at(-1)

  const phrases = chart.series.flatMap(series => {
    const first = byId.get(series.factIds[0] ?? '')
    const last = byId.get(series.factIds.at(-1) ?? '')

    if (!first || !last || !firstMonth || !lastMonth) return []

    // Con un solo space la serie es la métrica; con varios, el space.
    const subject = context.multiSpace ? series.label : subjectOf(first, { multiSpace: false, multiMonth: false })

    return [{ series, first, last, text: `${subject}: ${R.from} ${fmt(first, locale)} ${R.lineIn} ${firstMonth} ${R.lineTo} ${fmt(last, locale)} ${R.lineIn} ${lastMonth}` }]
  })

  const lead = phrases[0]

  if (!lead) return null

  const conclusionText = firstFitting(L.conclusion, `${lead.text}.`)
  const meaningText = phrases.length > 1 ? firstFitting(L.meaning, `${phrases.map(phrase => phrase.text).join('; ')}.`) : null

  return {
    chartId: chart.chartId,
    keyFigure: { factId: lead.last.factId, value: fmt(lead.last, locale), caption: claim(`${chart.chartId}.key`, `${lead.series.label} · ${lastMonth}.`, [lead.last.factId]) },
    ...(conclusionText ? { conclusion: claim(`${chart.chartId}.conclusion`, conclusionText, [lead.first.factId, lead.last.factId]) } : {}),
    ...(meaningText ? { meaning: claim(`${chart.chartId}.meaning`, meaningText, phrases.flatMap(phrase => [phrase.first.factId, phrase.last.factId])) } : {}),
    nextStep: null
  }
}

/** «La cifra más alta» con el verbo de su familia: un motor que menciona, una dimensión evaluada, o genérico. */
const highestText = (fact: EvidenceFactV1, context: ChapterContext, locale: string): string => {
  if (fact.metricId.startsWith('presence.')) {
    const engine = (fact.channelId ? GH_INSIGHTS.channels[fact.channelId] : undefined) ?? fact.label.replace(/^Presencia en\s+/i, '')

    return `${engine} ${R.mostMentions}: ${valueText(fact, locale)}.`
  }

  if (fact.metricId.startsWith('dimension.')) return `${R.bestDimension} ${lowerFirst(fact.label)}: ${valueText(fact, locale)}.`

  return `${R.highest} ${subjectOf(fact, context)}: ${valueText(fact, locale)}.`
}

/**
 * Barras: el hallazgo es el MAYOR CAMBIO (≥ 2 comparables), el cambio del único hecho, o la cifra más alta. Sin «Lo que
 * significa»: repetir la afirmación no es una lectura (Berel p. 5, 2026-09-25); queda para la redacción IA o humana.
 */
const barReading = (chart: ChartSpecV1, byId: Map<string, EvidenceFactV1>, locale: string, context: ChapterContext): PlanFigureReadingV1 | null => {
  const current = chart.series.at(-1)
  const facts = (current?.factIds ?? []).map(id => byId.get(id)).filter((fact): fact is EvidenceFactV1 => Boolean(fact && fact.value !== null))
  const first = facts[0]

  if (!first) return null

  const changes = facts.flatMap(fact => {
    const change = changeOf(fact, byId, locale)

    return change ? [{ fact, change }] : []
  })

  const biggest = [...changes].sort((a, b) => b.change.magnitude - a.change.magnitude)[0]
  const highest = [...facts].sort((a, b) => (b.value as number) - (a.value as number))[0]!

  const conclusionText = biggest
    ? firstFitting(
        L.conclusion,
        changes.length > 1 ? `${R.largestChange} ${lowerFirst(subjectOf(biggest.fact, context))}: ${fromTo(biggest.fact, biggest.change, locale)}.` : null,
        `${subjectOf(biggest.fact, context)}: ${fromTo(biggest.fact, biggest.change, locale)}.`
      )
    : firstFitting(L.conclusion, facts.length > 1 ? highestText(highest, context, locale) : `${subjectOf(first, context)}: ${valueText(first, locale)}.`)

  const key = biggest?.fact ?? (facts.length > 1 ? highest : first)
  const cited = biggest ? [biggest.fact.factId, biggest.change.previous.factId] : [key.factId]

  if (!conclusionText) return null

  return {
    chartId: chart.chartId,
    keyFigure: { factId: key.factId, value: fmt(key, locale), caption: claim(`${chart.chartId}.key`, `${subjectOf(key, context)}.`, [key.factId]) },
    conclusion: claim(`${chart.chartId}.conclusion`, conclusionText, cited),
    nextStep: null
  }
}

/**
 * Lectura de cada figura QUE TIENE PÁGINA. `hasFigurePage` es el predicado del render (TASK-1889: ejecuta el mismo
 * `buildFigureSlides`), así que planner y render no pueden divergir: una figura sin página no recibe lectura, y
 * «Lo esencial» nunca cita una conclusión que no se imprime (Berel CTR, 2026-09-25).
 */
export const readingsFor = (charts: ChartSpecV1[], byId: Map<string, EvidenceFactV1>, locale: string): PlanFigureReadingV1[] => {
  const context = contextOf(charts, byId)

  return charts.filter(chart => hasFigurePage(chart, byId, locale)).flatMap(chart => {
    const reading = chart.family === 'bullet' ? bulletReading(chart, byId, locale, context) : chart.family === 'line' ? lineReading(chart, byId, locale, context) : barReading(chart, byId, locale, context)

    return reading ? [reading] : []
  })
}

// ─── Plan ────────────────────────────────────────────────────────────────────────────────────────

export const openingFor = (moduleKey: InsightModule): PlanClaimV1 => ({ claimId: `opening.${moduleKey}`, text: GH_INSIGHTS.chapterOpenings[moduleKey], factIds: [] })

export const scopeLinesFor = (modules: InsightModule[]): string[] => modules.map(moduleKey => GH_INSIGHTS.scopeLines[moduleKey])

/** Conclusiones de un capítulo en orden de peso editorial: metas primero, luego tendencias, luego comparaciones. */
const conclusionsOf = (chapter: PlanChapterV1): PlanClaimV1[] => {
  const rank = (chartId: string) => (chartId.includes('.bullet.') ? 0 : chartId.includes('.line.') ? 1 : 2)

  return [...(chapter.readings ?? [])]
    .sort((a, b) => rank(a.chartId) - rank(b.chartId))
    .flatMap(reading => (reading.conclusion ? [reading.conclusion] : []))
}

/**
 * Tesis del resumen (y su bajada) como HALLAZGO del informe, no la primera afirmación del primer módulo (revisión de
 * 1846, 2026-09-25). Prioridad: una meta sin cumplir («Entregas a tiempo es la única meta sin cumplir…», donde «única»
 * es selección, no cifra nueva); si no hay, el hallazgo de mayor peso. La bajada, el siguiente hallazgo sobre OTRO hecho.
 */
export const summaryFindingsFor = (chapters: PlanChapterV1[], byId: Map<string, EvidenceFactV1>, locale: string): PlanClaimV1[] => {
  const bullets = chapters.flatMap(chapter => chapter.charts.filter(chart => chart.family === 'bullet' && (chapter.readings ?? []).some(reading => reading.chartId === chart.chartId)))
  const statuses = bullets.map(chart => ({ chart, status: bulletStatus(chart, byId)! })).filter(entry => entry.status)
  const missed = statuses.filter(entry => entry.status.missing.length > 0)
  const ordered = chapters.flatMap(conclusionsOf)
  let thesis: PlanClaimV1 | null = null

  if (missed.length === 1 && statuses.length > 1 && missed[0]!.status.metricName) {
    const { status } = missed[0]!
    const text = firstFitting(L.summaryThesis, `${status.metricName} ${R.onlyMissed}: ${fmt(status.lead.value, locale)} (${R.targetShort} ${fmt(status.lead.target, locale)}).`)

    if (text) thesis = claim('summary.thesis', text, [status.lead.value.factId, status.lead.target.factId])
  }

  thesis ??= (() => {
    const first = ordered.find(item => item.text.length <= L.summaryThesis)

    return first ? { ...first, claimId: 'summary.thesis' } : null
  })()

  if (!thesis) return []

  const lead = ordered.find(item => item.factIds[0] !== thesis!.factIds[0] && item.text.length <= L.summaryLead)

  return [thesis, ...(lead ? [{ ...lead, claimId: 'summary.lead' }] : [])]
}

/**
 * «Lo esencial del mes»: hasta 5 hallazgos, alternando capítulos para que ningún módulo se coma el resumen. UN HECHO,
 * UNA ESENCIAL: ni el hecho de la tesis o su bajada, ni dos esenciales sobre el mismo hecho (Sky: FTR aparecía como
 * mayor cambio y como meta cumplida). Primero las conclusiones (metas, tendencias, comparaciones); si no alcanzan,
 * cada hecho aún no citado en la misma forma compacta, nunca con la etiqueta interna.
 */
export const essentialsFor = (chapters: PlanChapterV1[], byId: Map<string, EvidenceFactV1>, locale: string, exclude: PlanClaimV1[] = []): PlanClaimV1[] => {
  const cited = new Set<string>(exclude.flatMap(item => (item.factIds[0] ? [item.factIds[0]] : [])))

  const candidates = chapters.map(chapter => {
    const context = contextOf(chapter.charts, byId)

    const facts = chapter.claims.flatMap(item => {
      const fact = item.factIds[0] ? byId.get(item.factIds[0]) : undefined

      if (!fact || fact.value === null) return []

      const change = changeOf(fact, byId, locale)
      const text = change ? `${subjectOf(fact, context)}: ${fromTo(fact, change, locale)}.` : `${subjectOf(fact, context)}: ${valueText(fact, locale)}.`

      return [claim(`fact.${fact.factId}`, text, change ? [fact.factId, change.previous.factId] : [fact.factId])]
    })

    return [...conclusionsOf(chapter), ...facts]
  })

  const essentials: PlanClaimV1[] = []

  for (let round = 0; essentials.length < PLAN_ESSENTIALS_MAX && candidates.some(list => list.length > round); round += 1) {
    for (const list of candidates) {
      const item = list[round]

      if (!item || essentials.length >= PLAN_ESSENTIALS_MAX || item.text.length > PLAN_TEXT_LIMITS.essential || cited.has(item.factIds[0]!)) continue
      cited.add(item.factIds[0]!)
      essentials.push({ ...item, claimId: `essential.${item.claimId}` })
    }
  }

  return essentials
}

/** Defensa en profundidad: un productor que emite una familia fuera de la matriz es un bug, no un dato. */
export const assertChartsAllowed = (moduleKey: InsightModule, charts: ChartSpecV1[]): void => {
  for (const chart of charts) {
    if (!canProduceFamily(chart.family, moduleKey)) {
      throw new Error(`El planner emitió ${chart.family} en ${moduleKey}, que la matriz familia × evidencia no autoriza (${chart.chartId}).`)
    }
  }
}
