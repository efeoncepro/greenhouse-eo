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
import { PLAN_ESSENTIALS_MAX } from '../contracts/plan'
import type { InsightModule } from '../contracts/request'
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

/** Posición del valor respecto de la meta, sin juicio: «sobre», «bajo» o «en». */
const againstTarget = (value: number, target: number): string =>
  value > target ? GH_INSIGHTS.reading.aboveTarget : value < target ? GH_INSIGHTS.reading.belowTarget : GH_INSIGHTS.reading.atTarget

const R = GH_INSIGHTS.reading

/** Variación de un hecho contra su comparable, en la unidad que imprime el documento (pp o %). Null sin comparable. */
const changeOf = (fact: EvidenceFactV1, byId: Map<string, EvidenceFactV1>, locale: string) => {
  const previous = fact.comparisonFactId ? byId.get(fact.comparisonFactId) : undefined

  if (!previous || fact.value === null || previous.value === null) return null

  const text = formatDeltaForUnit(fact.value, previous.value, fact.unit, locale)

  if (!text) return null

  // Magnitud comparable entre las dimensiones de UNA figura (misma unidad): pp si es porcentaje, relativa si no.
  const magnitude = fact.unit === 'percent' ? Math.abs(fact.value - previous.value) : Math.abs((fact.value - previous.value) / previous.value)

  return { previous, text, magnitude }
}

const bulletReading = (chart: ChartSpecV1, byId: Map<string, EvidenceFactV1>, locale: string): PlanFigureReadingV1 | null => {
  if (chart.data?.kind !== 'bullet') return null

  const lowerIsBetter = chart.data.direction === 'lower_is_better'

  const items = chart.data.items
    .map(item => ({ item, value: byId.get(item.valueFactId), target: byId.get(item.targetFactId) }))
    .filter((entry): entry is { item: (typeof entry)['item']; value: EvidenceFactV1; target: EvidenceFactV1 } => Boolean(entry.value && entry.target && entry.value.value !== null && entry.target.value !== null))

  if (items.length === 0) return null

  // Brecha en la dirección que empeora: positiva = no alcanzó la meta.
  const gap = (entry: (typeof items)[number]) => (lowerIsBetter ? entry.value.value! - entry.target.value! : entry.target.value! - entry.value.value!)
  const lead = [...items].sort((a, b) => gap(b) - gap(a))[0]!
  const missing = items.filter(entry => gap(entry) > 0)

  const metricId = chart.chartId.split('.').at(-1) ?? ''
  const leadChange = changeOf(lead.value, byId, locale)
  const metricName = GH_INSIGHTS.metrics[metricId]
  // «cumple la meta de entregas a tiempo»; sin nombre registrado, sólo «cumple la meta».
  const metricPhrase = metricName ? ` ${R.metricOf} ${metricName.charAt(0).toLowerCase()}${metricName.slice(1)}` : ''
  const phrase = (entry: (typeof items)[number]) => `${entry.item.label}: ${fmt(entry.value, locale)}, ${againstTarget(entry.value.value!, entry.target.value!)} ${fmt(entry.target, locale)}`

  // Conclusión = el hecho principal CONTRA SU META (nunca la comparación de períodos, que es otra figura). «Lo que
  // significa» sólo con varios spaces: con uno, repetiría la conclusión (hallazgo de 1846 en el PDF de Sky).
  return {
    chartId: chart.chartId,
    keyFigure: {
      factId: lead.value.factId,
      value: fmt(lead.value, locale),
      caption: claim(`${chart.chartId}.key`, `${GH_INSIGHTS.metrics[metricId] ?? chart.title} · ${lead.item.label}.`, [lead.value.factId])
    },
    // Hallazgo: cumple o no la meta (el ítem con mayor brecha manda).
    // Nombra la métrica: la conclusión también se lee fuera de su figura, en «Lo esencial del mes».
    conclusion: claim(`${chart.chartId}.conclusion`, `${lead.item.label} ${gap(lead) > 0 ? R.missesTarget : R.meetsTarget}${metricPhrase}: ${fmt(lead.value, locale)} (${R.targetShort} ${fmt(lead.target, locale)}).`, [lead.value.factId, lead.target.factId]),
    // Lo que significa: con varios spaces, cómo queda cada uno; con uno, dónde queda contra el período anterior.
    ...(items.length > 1
      ? { meaning: claim(`${chart.chartId}.meaning`, `${items.map(phrase).join('; ')}.`, items.flatMap(entry => [entry.value.factId, entry.target.factId])) }
      : leadChange
        ? { meaning: claim(`${chart.chartId}.meaning`, `${R.againstPrevious} (${fmt(leadChange.previous, locale)}), ${R.variation} ${leadChange.text}.`, [lead.value.factId, leadChange.previous.factId]) }
        : {}),
    nextStep:
      missing.length > 0
        ? claim(`${chart.chartId}.next`, `${GH_INSIGHTS.reading.nextStepGap} ${lead.item.label}: ${GH_INSIGHTS.reading.nextStepGapReason}`, [lead.value.factId])
        : null
  }
}

const lineReading = (chart: ChartSpecV1, byId: Map<string, EvidenceFactV1>, locale: string): PlanFigureReadingV1 | null => {
  const firstMonth = chart.dimensionLabels[0]
  const lastMonth = chart.dimensionLabels.at(-1)

  const phrases = chart.series.flatMap(series => {
    const first = byId.get(series.factIds[0] ?? '')
    const last = byId.get(series.factIds.at(-1) ?? '')

    if (!first || !last || !firstMonth || !lastMonth) return []

    const direction = first.value === null || last.value === null || last.value === first.value ? R.held : last.value > first.value ? R.rose : R.fell

    return [{ series, first, last, text: `${series.label} ${direction}: ${R.lineFrom} ${fmt(first, locale)} ${R.lineIn} ${firstMonth} ${R.lineTo} ${fmt(last, locale)} ${R.lineIn} ${lastMonth}` }]
  })

  const lead = phrases[0]

  if (!lead) return null

  return {
    chartId: chart.chartId,
    keyFigure: { factId: lead.last.factId, value: fmt(lead.last, locale), caption: claim(`${chart.chartId}.key`, `${lead.series.label} · ${lastMonth}.`, [lead.last.factId]) },
    conclusion: claim(`${chart.chartId}.conclusion`, `${lead.text}.`, [lead.first.factId, lead.last.factId]),
    // Con una sola serie la lectura sería la conclusión otra vez: se omite.
    ...(phrases.length > 1 ? { meaning: claim(`${chart.chartId}.meaning`, `${phrases.map(phrase => phrase.text).join('; ')}.`, phrases.flatMap(phrase => [phrase.first.factId, phrase.last.factId])) } : {}),
    nextStep: null
  }
}

/**
 * Barras: la conclusión es la afirmación del hecho principal. Sin «Lo que significa»: repetir esa afirmación no es una
 * lectura (Berel p. 5, 2026-09-25); el panel queda para la redacción IA o humana.
 */
const barReading = (chart: ChartSpecV1, byId: Map<string, EvidenceFactV1>, locale: string, claims: PlanClaimV1[]): PlanFigureReadingV1 | null => {
  const current = chart.series.at(-1)
  const facts = (current?.factIds ?? []).map(id => byId.get(id)).filter((fact): fact is EvidenceFactV1 => Boolean(fact && fact.value !== null))
  const first = facts[0]

  if (!first) return null

  const changes = facts.map(fact => ({ fact, change: changeOf(fact, byId, locale) })).filter(entry => entry.change !== null)
  const biggest = [...changes].sort((a, b) => b.change!.magnitude - a.change!.magnitude)[0]
  const highest = [...facts].sort((a, b) => (b.value as number) - (a.value as number))[0]!

  // Hallazgo: con período anterior, el mayor cambio de la figura (selección, sin cifras nuevas); sin él, la cifra más
  // alta cuando hay varias. Con un solo hecho sin comparable, su propia afirmación.
  const changeClause = (entry: NonNullable<typeof biggest>) => `${valueText(entry.fact, locale)} (${R.previousPeriod} ${fmt(entry.change!.previous, locale)}, ${R.variation} ${entry.change!.text})`

  const direction = (entry: NonNullable<typeof biggest>) =>
    entry.fact.value === entry.change!.previous.value ? R.held : entry.fact.unit === 'position' ? R.changed : entry.fact.value! > entry.change!.previous.value! ? R.rose : R.fell

  const conclusion: PlanClaimV1 | null = biggest && changes.length > 1
    ? claim(`${chart.chartId}.conclusion`, `${R.largestChange} ${biggest.fact.label}: ${changeClause(biggest)}.`, [biggest.fact.factId, biggest.change!.previous.factId])
    : biggest
      ? claim(`${chart.chartId}.conclusion`, `${biggest.fact.label} ${direction(biggest)}: ${changeClause(biggest)}.`, [biggest.fact.factId, biggest.change!.previous.factId])
      : facts.length > 1
      ? claim(`${chart.chartId}.conclusion`, `${R.highest} ${highest.label}: ${valueText(highest, locale)}.`, [highest.factId])
      : (() => {
          const own = claims.find(item => item.factIds[0] === first.factId)

          return own ? { ...own, claimId: `${chart.chartId}.conclusion` } : null
        })()

  if (!conclusion) return null

  const key = biggest?.fact ?? (facts.length > 1 ? highest : first)

  return {
    chartId: chart.chartId,
    keyFigure: { factId: key.factId, value: fmt(key, locale), caption: claim(`${chart.chartId}.key`, `${key.label}.`, [key.factId]) },
    conclusion,
    nextStep: null
  }
}

export const readingsFor = (charts: ChartSpecV1[], byId: Map<string, EvidenceFactV1>, locale: string, claims: PlanClaimV1[]): PlanFigureReadingV1[] =>
  charts.flatMap(chart => {
    const reading = chart.family === 'bullet' ? bulletReading(chart, byId, locale) : chart.family === 'line' ? lineReading(chart, byId, locale) : barReading(chart, byId, locale, claims)

    return reading ? [reading] : []
  })

// ─── Plan ────────────────────────────────────────────────────────────────────────────────────────

export const openingFor = (moduleKey: InsightModule): PlanClaimV1 => ({ claimId: `opening.${moduleKey}`, text: GH_INSIGHTS.chapterOpenings[moduleKey], factIds: [] })

export const scopeLinesFor = (modules: InsightModule[]): string[] => modules.map(moduleKey => GH_INSIGHTS.scopeLines[moduleKey])

/**
 * «Lo esencial del mes»: hasta 5 hallazgos, alternando capítulos (el primero de cada uno, luego el segundo…) para que
 * ningún módulo se coma el resumen. Primero las conclusiones de sus figuras (hallazgos: meta cumplida o no, mayor
 * cambio, tendencia); si no alcanzan, las afirmaciones con dato como respaldo. Sin repetir textos.
 */
export const essentialsFor = (chapters: PlanChapterV1[], byId: Map<string, EvidenceFactV1>): PlanClaimV1[] => {
  const candidates = chapters.map(chapter => [
    ...(chapter.readings ?? []).flatMap(reading => (reading.conclusion ? [reading.conclusion] : [])),
    ...chapter.claims.filter(item => item.factIds[0] !== undefined && byId.get(item.factIds[0])?.value !== null)
  ])

  const essentials: PlanClaimV1[] = []
  const seen = new Set<string>()

  for (let round = 0; essentials.length < PLAN_ESSENTIALS_MAX && candidates.some(list => list.length > round); round += 1) {
    for (const list of candidates) {
      const item = list[round]

      if (!item || essentials.length >= PLAN_ESSENTIALS_MAX || seen.has(item.text)) continue
      seen.add(item.text)
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
