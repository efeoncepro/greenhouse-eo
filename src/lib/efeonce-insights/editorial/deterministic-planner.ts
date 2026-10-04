/**
 * TASK-1845 — planner DETERMINISTA: lectura factual del snapshot sin modelo. Es el fallback
 * obligatorio y la base que la IA acotada sólo puede reescribir (nunca recalcular). Cada
 * claim referencia sus factIds y escribe las cifras con `formatFactValue`.
 */

import type { ChartSpecV1 } from '../contracts/chart-spec'
import { isReferenceFact, type EvidenceFactV1, type EvidenceRejectionV1, type EvidenceSnapshotContentV1, type EvidenceSourceV1 } from '../contracts/evidence'
import { PLAN_TEXT_LIMITS, type EditorialPlanV1, type PlanActionV1, type PlanChapterV1, type PlanClaimV1, type PlanCoverV1, type PlanFigureReadingV1, type PlanTableV1 } from '../contracts/plan'
import type { InsightModule } from '../contracts/request'
import { assistantStatFigureFor, compositionChartsFor, engineStatFigureFor, statFigureFor, statReading, subsetChartsFor, withQuestion } from './criterion-figures'
import { canProduceFamily } from './family-evidence-matrix'
import { orderByQuestion } from './figure-selection'
import { assertChartsAllowed, bulletCharts, contextOfFacts, essentialsFor, humanFactSentence, LINE_MIN_POINTS, lineCharts, openingFor, printedChange, readingsFor, scopeLinesFor, summaryFindingsFor, type ChapterContext as ChapterContextV2 } from './editorial-v2'
import { asOfLabelOf, windowLabelOf } from '../presentation/vocabulary'
import { hasFigurePage } from '../render/figure-slots'
import { formatDeltaForUnit, formatFactValue } from './format'
import { GH_INSIGHTS } from '@/lib/copy/insights'

const MODULE_TITLES: Record<InsightModule, string> = {
  seo: GH_INSIGHTS.modules.seo.title,
  aeo: GH_INSIGHTS.modules.aeo.title,
  ico: GH_INSIGHTS.modules.ico.title
}

/**
 * Límites y metodología son texto que leen deck, informe y web tal cual: se redactan con copy
 * legible, nunca con el `metricId`, el `method.name` ni el nombre de la función lectora (eso queda
 * en el snapshot sellado). El `detail` del rechazo es diagnóstico del adapter —a veces en inglés o
 * con códigos— y tampoco entra al texto.
 *
 * TASK-1957 — y se dicen EN LENGUAJE DEL LECTOR (`GH_INSIGHTS.readerLimits`), una línea por tema: «la fuente no sirve
 * esta ventana» exponía el diagnóstico interno y, repetido para el período anterior, duplicaba el tema (revisión del
 * operador con Berel, 2026-10-02). La razón exacta sigue en `snapshot.rejections`.
 */
const READER = GH_INSIGHTS.readerLimits

const subjectOfRejection = (rejection: EvidenceRejectionV1): string =>
  (rejection.metricId ? GH_INSIGHTS.metrics[rejection.metricId] : undefined) ?? GH_INSIGHTS.modules[rejection.module].label

const currentLimitText = (reason: EvidenceRejectionV1['reason'], metricId: string | null): string =>
  reason === 'insufficient_data' || reason === 'no_data'
    ? READER.insufficientData
    : // TASK-1962 — Search Console sin conectar es algo que el cliente puede resolver (lo pide el plan), no un alcance.
      reason === 'not_connected' && (metricId === 'gsc' || metricId === 'ga4')
      ? READER.notConnected
      : READER.outOfScope

const limitsFor = (rejections: readonly EvidenceRejectionV1[]): string[] => {
  const bySubject = new Map<string, { current: EvidenceRejectionV1 | null; comparison: boolean }>()

  for (const rejection of rejections) {
    const subject = subjectOfRejection(rejection)
    const entry = bySubject.get(subject) ?? { current: null, comparison: false }

    if (rejection.scope === 'comparison') entry.comparison = true
    else entry.current ??= rejection
    bySubject.set(subject, entry)
  }

  // Si falta el período actual, la línea de comparación no se agrega: el tema ya está dicho.
  return [...bySubject].map(([subject, entry]) => `${subject}: ${entry.current ? currentLimitText(entry.current.reason, entry.current.metricId) : READER.noComparison}.`)
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

// TASK-1957 — la ventana se dice como fecha legible, nunca `2026-09-01 a 2026-09-21`.
const windowLabel = (fact: EvidenceFactV1, locale: string): string => windowLabelOf(fact.window, locale)

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

/**
 * TASK-1957 — métricas distintas de UN canal, todas con su período anterior: cada fila se lee en su propia escala
 * (`scale.perDimension`). Lo usan la elegibilidad (no se parten por magnitud) y el spec (lo declara).
 */
const isOwnScaleComparison = (facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>): boolean =>
  facts.length > 0
  && facts.every(fact => fact.value !== null && fact.comparisonFactId !== null && fact.comparisonFactId !== undefined && byId.get(fact.comparisonFactId)?.value != null)
  && new Set(facts.map(fact => fact.channelId ?? null)).size === 1

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
    scale: { kind: 'linear', baseline: 0, ...(series.length > 1 && isOwnScaleComparison(withValue, byId) ? { perDimension: true as const } : {}) },
    references: [],
    tabularEquivalent: {
      columns: series.length > 1 ? ['Métrica', 'Período anterior', 'Período'] : ['Métrica', 'Período'],
      rows: labelled.map(fact => (series.length > 1 ? [null, fact.comparisonFactId!, fact.factId] : [null, fact.factId]))
    }
  }
}

/**
 * TASK-1957 — elegibilidad de figuras. Una figura se emite sólo si informa (revisión del operador con Berel, 2026-10-02):
 *  - posición media (menor es mejor) nunca va en barras desde cero: su cambio lo dice la afirmación;
 *  - un conteo que es parte de un total («2 de 6») sólo se compara con otros del MISMO total y nunca junto a conteos
 *    sueltos; si no, va a la afirmación con su «n de m»;
 *  - sin varianza (todas las cifras iguales, sin cambio impreso) no hay figura: todas las barras a la misma altura no
 *    dicen nada; la afirmación lo dice en una frase;
 *  - métricas distintas de un canal con su período anterior se comparan fila por fila, cada una en su escala;
 *  - sólo cuando las cifras comparten eje (sin período anterior o por canal), las magnitudes incomparables se separan
 *    en bandas (impresiones lado a lado con keywords dejaban las keywords invisibles), y una banda de una cifra no es
 *    figura.
 */
export const MAGNITUDE_BAND = 10
/** Sólo las unidades SIN tope se separan por magnitud; un puntaje 0–100 o un porcentaje se comparan en su escala. */
export const BANDED_UNITS: ReadonlySet<string> = new Set(['count', 'visits_estimated', 'usd', 'clp', 'days'])
const NO_BAR_UNITS = new Set(['position'])

const isPartOfTotal = (fact: EvidenceFactV1): boolean =>
  fact.unit === 'count' && fact.value !== null && fact.numerator === fact.value && fact.denominator !== null && fact.denominator > 0

const peakOf = (fact: EvidenceFactV1, byId: Map<string, EvidenceFactV1>): number => {
  const previous = fact.comparisonFactId ? byId.get(fact.comparisonFactId)?.value ?? null : null

  return Math.max(Math.abs(fact.value ?? 0), Math.abs(previous ?? 0))
}

const hasInformation = (facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>, locale: string): boolean => {
  const values = facts.map(fact => fact.value).filter((value): value is number => value !== null)

  if (values.length === 0) return false
  if (facts.some(fact => printedChange(fact, byId, locale))) return true

  return values.length >= 2 && new Set(values).size > 1
}

export interface ChartableGroups {
  groups: EvidenceFactV1[][]
  /** Hechos que formaban una figura sin información (todas las cifras iguales): se dicen en una frase. */
  uniform: EvidenceFactV1[] | null
}

export const chartableGroupsFor = (unit: string, facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>, locale: string): ChartableGroups => {
  if (NO_BAR_UNITS.has(unit)) return { groups: [], uniform: null }

  let candidates = facts.filter(fact => fact.value !== null)
  const parts = candidates.filter(isPartOfTotal)

  // Un conteo parcial («21 de 31») sólo comparte figura con otros del MISMO total y sin conteos sueltos: junto a su
  // propio total (31) o a otro total, la barra «21» se leía sin su denominador. Si no, va a la afirmación con su «n de m».
  if (parts.length > 0 && (parts.length !== candidates.length || new Set(parts.map(fact => fact.denominator)).size > 1)) candidates = candidates.filter(fact => !isPartOfTotal(fact))

  if (candidates.length === 0) return { groups: [], uniform: null }
  if (!hasInformation(candidates, byId, locale)) return { groups: [], uniform: candidates.length >= 2 ? candidates : null }

  // Métricas distintas de UN canal, cada una con su período anterior, se dibujan fila por fila en su propia escala
  // (figura «comparación»: actual contra anterior por métrica). No comparten eje, así que la magnitud no las separa:
  // partirlas dejaba figuras de UNA barra, que no tienen página, y el capítulo perdía sus conclusiones (TASK-1957,
  // vista previa Berel 2026-10-02: «Lo esencial» quedaba vacío y la tesis caía en un puntaje).
  if (isOwnScaleComparison(candidates, byId)) return { groups: [candidates], uniform: null }

  // Bandas de magnitud: de mayor a menor, un hecho entra a la banda si su pico no es MAGNITUDE_BAND veces menor que
  // el mayor de la banda. El orden de las dimensiones dentro de cada banda conserva el del snapshot.
  const sorted = [...candidates].sort((a, b) => peakOf(b, byId) - peakOf(a, byId))
  const bands: EvidenceFactV1[][] = []

  for (const fact of sorted) {
    const band = bands.at(-1)
    const top = band ? peakOf(band[0]!, byId) : 0
    const peak = peakOf(fact, byId)

    // Un cero se lee en cualquier eje lineal desde cero: nunca abre una banda propia.
    if (band && (!BANDED_UNITS.has(unit) || peak === 0 || peak * MAGNITUDE_BAND >= top)) band.push(fact)
    else bands.push([fact])
  }

  const order = new Map(candidates.map((fact, index) => [fact.factId, index]))

  const groups = bands
    .map(band => [...band].sort((a, b) => order.get(a.factId)! - order.get(b.factId)!))
    // Una figura de una sola cifra no compara nada: esa cifra queda en su afirmación y en la tabla.
    .filter(band => band.length >= 2 && hasInformation(band, byId, locale))
    // La figura de la banda con el primer hecho del snapshot conserva el id histórico del capítulo.
    .sort((a, b) => order.get(a[0]!.factId)! - order.get(b[0]!.factId)!)

  return { groups, uniform: null }
}

/**
 * Afirmación de una figura descartada por no tener varianza, para mención por motor: la tasa (`mention_rate.*`, TASK-1957)
 * o el conteo «n de m» de snapshots previos (`presence.*`).
 */
const uniformClaimFor = (moduleKey: InsightModule, facts: EvidenceFactV1[], locale: string): PlanClaimV1 | null => {
  const first = facts[0]

  if (first && facts.every(fact => fact.metricId.startsWith('mention_rate.') && fact.value === first.value)) {
    return {
      claimId: `claim.${moduleKey}.uniform.mention_rate`,
      text: `${GH_INSIGHTS.reading.allRatesPrefix} ${formatFactValue(first.value, 'percent', locale)} ${GH_INSIGHTS.reading.allRatesTail}.`,
      factIds: facts.map(fact => fact.factId),
      role: 'finding'
    }
  }

  if (!first || !facts.every(fact => fact.metricId.startsWith('presence.') && isPartOfTotal(fact) && fact.denominator === first.denominator)) return null

  const value = `${formatFactValue(first.value, 'count', locale)} de ${formatFactValue(first.denominator, 'count', locale)}`

  return {
    claimId: `claim.${moduleKey}.uniform.${first.metricId}`,
    text: `${GH_INSIGHTS.reading.allEnginesMention} ${value} ${GH_INSIGHTS.reading.allEnginesMentionTail}.`,
    factIds: facts.map(fact => fact.factId),
    role: 'finding'
  }
}

/**
 * TASK-1957 — selección editorial: un hallazgo es un cambio MATERIAL en lo que el documento imprime; el resto es respaldo
 * para la tabla de todas las cifras. El umbral es por unidad (puntos porcentuales y posiciones son absolutos; el resto,
 * relativo). Se destacan a lo más `MAX_FINDINGS` por capítulo, los de mayor cambio.
 */
const MAX_FINDINGS = 5
const MATERIAL_CHANGE: Record<string, number> = { percent: 1, position: 0.5 }
const MATERIAL_RELATIVE_CHANGE = 0.05

const materialityOf = (fact: EvidenceFactV1, byId: Map<string, EvidenceFactV1>, locale: string): number | null => {
  const change = printedChange(fact, byId, locale)

  if (!change) return null

  const threshold = MATERIAL_CHANGE[fact.unit] ?? MATERIAL_RELATIVE_CHANGE

  return change.magnitude >= threshold ? change.magnitude / threshold : null
}

/**
 * Indicadores clave de visibilidad en motores de respuesta (skill seo-aeo §07): son hallazgos siempre que tengan valor,
 * aunque no haya período anterior con qué compararlos. El resto compite por materialidad.
 */
const HEADLINE_METRICS = new Set(['share_of_model', 'sov.brand', 'citation_share', 'ai_sessions'])

const withRoles = (claims: PlanClaimV1[], facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>, locale: string): PlanClaimV1[] => {
  const headline = new Set(facts.filter(fact => HEADLINE_METRICS.has(fact.metricId) && fact.value !== null).map(fact => `claim.${fact.factId}`))

  const ranked = facts
    .map(fact => ({ factId: fact.factId, score: materialityOf(fact, byId, locale) }))
    .filter((item): item is { factId: string; score: number } => item.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_FINDINGS)

  const findings = new Set([...headline, ...ranked.map(item => `claim.${item.factId}`)].slice(0, MAX_FINDINGS))

  return claims.map(claim => (claim.role ? claim : { ...claim, role: findings.has(claim.claimId) ? 'finding' : 'backing' }))
}

/** Clave de agrupación de figuras: unidad, y en AEO además la familia del indicador porcentual. */
/**
 * TASK-1957 — título de una figura que compara métricas: las nombra («Clics orgánicos, impresiones y keywords con
 * medición», o «CTR» si es una sola) en vez de «Visibilidad orgánica · Cantidad». Sólo si cabe en una línea; si no, el
 * título por unidad.
 */
const METRICS_TITLE_MAX = 60

const metricsTitle = (group: EvidenceFactV1[]): string | null => {
  const labels = [...new Set(group.map(fact => fact.label))]
  const lower = (text: string) => (/^\p{Lu}\p{Ll}/u.test(text) ? `${text.charAt(0).toLocaleLowerCase('es')}${text.slice(1)}` : text)
  const names = labels.map((label, index) => (index === 0 ? label : lower(label)))
  const joined = names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} ${GH_INSIGHTS.reading.and} ${names.at(-1)}`

  return labels.length >= 1 && joined.length <= METRICS_TITLE_MAX ? joined : null
}

const chartGroupKeyOf = (moduleKey: InsightModule, fact: EvidenceFactV1): string => {
  // TASK-1957 — los puntajes internos del Grader (global y dimensiones) no se grafican en un informe de cliente: son
  // una lectura del método, no un indicador del mercado, y en barras se leían como notas (Berel: «lideran con 100»).
  // Quedan en la tabla de respaldo.
  if (moduleKey === 'aeo' && fact.unit === 'score') return 'score:single'
  // TASK-1962 — conteos AEO distintos (sitios citados, tipos de fuente, tono) son figuras propias, nunca una sola.
  if (moduleKey === 'aeo' && fact.unit === 'count' && isAeoSourceFact(fact)) return `count:${fact.metricId.split('.')[0]!}`
  // TASK-1962 — GA4: las visitas por asistente de IA son su propia figura (partes de un total, con isotipo por asistente) y
  // las visitas orgánicas al sitio no comparten eje con clics e impresiones de Search Console (otra fuente, otra unidad
  // de medida: sesiones, no clics).
  if (moduleKey === 'aeo' && fact.metricId.startsWith('ai_source.')) return `${fact.unit}:ai_source`
  if (moduleKey === 'seo' && fact.metricId.startsWith('site.')) return `${fact.unit}:site`
  if (moduleKey !== 'aeo' || fact.unit !== 'percent') return fact.unit

  const family = fact.metricId.includes('.') ? fact.metricId.split('.')[0]! : 'single'

  return `${fact.unit}:${family}`
}

const tableFor = (tableId: string, title: string, facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>, locale: string): PlanTableV1 => ({
  tableId,
  title,
  columns: ['Métrica', 'Período', 'Período anterior', 'Corte de la fuente'],
  rows: facts.map(fact => {
    const comparison = fact.comparisonFactId ? byId.get(fact.comparisonFactId) : null

    return [fact.label, formatFactValue(fact.value, fact.unit, locale), comparison ? formatFactValue(comparison.value, comparison.unit, locale) : '—', asOfLabelOf(fact.freshness.asOf, locale) ?? '—']
  })
})

/**
 * TASK-1962 — «¿por qué cambió?» (contrato de contenido, pregunta 2). Los hechos `driver.<consulta|página>.clicks` son
 * las consultas y páginas que más movieron los clics, cada una con su período anterior. Producen, por dimensión:
 *  - un hallazgo sobre la que más cambió, en lenguaje de descomposición («La consulta que más cambió fue…»), nunca de
 *    causa;
 *  - una figura sólo con las que comparten escala con la de mayor pico (dentro de `MAGNITUDE_BAND`): la portada con
 *    miles de clics no aplasta a páginas de decenas, y una figura de una barra no compara nada;
 * y una tabla única con todas, con las columnas de la tabla del capítulo para que el informe A4 la reconozca.
 * No entran a la tesis antes que el resultado (ver el rango de `.drivers.` en `conclusionsOf`).
 */
const isDriverFact = (fact: EvidenceFactV1): boolean => fact.metricId.startsWith('driver.')

/** TASK-1962 — clics por bloque de 7 días: su propia figura de línea, no hallazgos sueltos ni filas de la tabla general. */
const isWeeklyFact = (fact: EvidenceFactV1): boolean => fact.metricId.startsWith('clicks_week.')

/**
 * TASK-1962 — evolución semanal de clics (familia `line`, con página PDF de tendencia): este período contra el mismo
 * bloque del anterior. Sólo con ≥ 3 bloques medidos y todos con su par; si falta uno, una sola serie.
 */
const weeklyLineChart = (moduleKey: InsightModule, facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>): ChartSpecV1 | null => {
  const blocks = facts.filter(isWeeklyFact).sort((a, b) => Number(a.dimension?.block ?? 0) - Number(b.dimension?.block ?? 0))

  if (blocks.length < LINE_MIN_POINTS || blocks.some(fact => fact.value === null) || !canProduceFamily('line', moduleKey)) return null

  const previous = blocks.map(fact => (fact.comparisonFactId ? byId.get(fact.comparisonFactId) : undefined))
  const paired = previous.every(fact => fact && fact.value !== null)
  const chartId = `chart.${moduleKey}.line.clicks-week`
  const channel = blocks[0]!.channelId

  return {
    specVersion: 'chart_spec_v1',
    chartId,
    family: 'line',
    relation: 'trend',
    title: GH_INSIGHTS.figures.weeklyTitle,
    series: [
      { seriesId: `${chartId}.current`, label: GH_INSIGHTS.figures.currentLabel, factIds: blocks.map(fact => fact.factId), unit: 'count', ...(channel ? { channelId: channel } : {}) },
      ...(paired ? [{ seriesId: `${chartId}.previous`, label: GH_INSIGHTS.figures.previousLabel, factIds: previous.map(fact => fact!.factId), unit: 'count', ...(channel ? { channelId: channel } : {}) }] : [])
    ],
    dimensionLabels: blocks.map(fact => fact.label),
    unit: 'count',
    scale: { kind: 'linear', baseline: 0 },
    references: [],
    tabularEquivalent: {
      columns: ['Semana', GH_INSIGHTS.figures.currentLabel, ...(paired ? [GH_INSIGHTS.figures.previousLabel] : [])],
      rows: blocks.map((fact, index) => [null, fact.factId, ...(paired ? [previous[index]!.factId] : [])])
    }
  }
}

const isFullWeek = (fact: EvidenceFactV1): boolean => {
  const from = fact.dimension?.from
  const to = fact.dimension?.to

  return Boolean(from && to) && Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) >= 7
}

/** TASK-1962 — lectura propia de la línea semanal (la genérica nombraba la semana como sujeto: «1–7 sept: de…»). */
const weeklyReading = (chart: ChartSpecV1, byId: Map<string, EvidenceFactV1>, locale: string): PlanFigureReadingV1 | null => {
  const [current, previous] = chart.series.map(series => series.factIds.map(id => byId.get(id)!))
  // Los extremos de la lectura son bloques COMPLETOS de 7 días: el último bloque del mes puede ser de 2 o 3 días, y
  // compararlo con una semana entera se leía como caída («de 3.717 (1–7 sept) a 552 (29–30 sept)», Berel 2026-10-02).
  // La figura sigue mostrando el bloque corto con su etiqueta; sólo la frase lo deja fuera.
  const fullIndexes = (current ?? []).map((fact, index) => (isFullWeek(fact) ? index : -1)).filter(index => index >= 0)
  const firstIndex = fullIndexes[0]
  const lastIndex = fullIndexes.at(-1)

  if (firstIndex === undefined || lastIndex === undefined || firstIndex === lastIndex) return null

  const first = current?.[firstIndex]
  const last = current?.[lastIndex]

  if (!first || !last || first.value === null || last.value === null) return null

  const n = (fact: EvidenceFactV1) => formatFactValue(fact.value, 'count', locale)
  const R = GH_INSIGHTS.reading
  const verb = last.value > first.value ? R.roseMany : last.value < first.value ? R.fellMany : R.heldMany
  const conclusion = `${GH_INSIGHTS.figures.weeklyLead} ${verb} ${R.from} ${n(first)} (${first.label}) ${R.lineTo} ${n(last)} (${last.label}).`
  const before = previous?.[firstIndex]
  const after = previous?.[lastIndex]
  const meaning = before && after && before.value !== null && after.value !== null ? `${GH_INSIGHTS.figures.weeklyPrevious} ${n(before)} (${before.label}) ${R.lineTo} ${n(after)} (${after.label}).` : null

  if (conclusion.length > PLAN_TEXT_LIMITS.conclusion) return null

  return {
    chartId: chart.chartId,
    keyFigure: { factId: last.factId, value: n(last), caption: { claimId: `caption.${chart.chartId}`, text: last.label, factIds: [last.factId] } },
    conclusion: { claimId: `conclusion.${chart.chartId}`, text: conclusion, factIds: [first.factId, last.factId] },
    ...(meaning && meaning.length <= PLAN_TEXT_LIMITS.meaning ? { meaning: { claimId: `meaning.${chart.chartId}`, text: meaning, factIds: [before!.factId, after!.factId] } } : {}),
    nextStep: null
  }
}

/**
 * TASK-1962 — lo que el Grader ya mide y el informe no usaba: sitios citados y tipo de fuente («¿por qué?»: de dónde sale
 * lo que dicen los motores) y tono. Cada familia es su figura (`chartGroupKeyOf`) y un hallazgo propio con sus cifras;
 * no producen una frase por cifra («chocale.cl: 11» no es un hallazgo).
 */
const AEO_SOURCE_PREFIXES = ['cited_source.', 'source_type.', 'sentiment.']
const isAeoSourceFact = (fact: EvidenceFactV1): boolean => AEO_SOURCE_PREFIXES.some(prefix => fact.metricId.startsWith(prefix))

/**
 * TASK-1962 — lectura propia de las figuras AEO que la lectura genérica de barras dice mal («La cifra más alta es
 * chocale.cl: 11 de 246»): la conclusión es el mismo hallazgo de la familia; la cifra principal, su primer hecho.
 */
const AEO_READING_CHARTS: Record<string, string> = {
  'chart.aeo.count.source-type': 'claim.aeo.sources.type',
  'chart.aeo.count.sentiment': 'claim.aeo.sentiment',
  'chart.aeo.percent.sov': 'claim.aeo.sov'
}

/** TASK-1974 — la figura de composición lleva el hallazgo de su familia, sea dona, waffle o barras ordenadas. */
const aeoReadingClaimId = (chartId: string, claims: PlanClaimV1[]): string | undefined => {
  // Visitas por asistente: su hallazgo es «<asistente> trae … de …» (`aiSourceFinding`).
  if (/^chart\.aeo\.(?:parts|donut)\.ai-source$/.test(chartId)) return claims.find(item => item.claimId.startsWith('claim.aeo.ai_source.') && item.claimId.endsWith('.top'))?.claimId

  const composition = /^chart\.aeo\.(?:parts|waffle|donut)\.(source-type|sentiment)$/.exec(chartId)

  if (composition) return composition[1] === 'source-type' ? 'claim.aeo.sources.type' : 'claim.aeo.sentiment'

  return AEO_READING_CHARTS[chartId]
}

const aeoReadings = (charts: ChartSpecV1[], claims: PlanClaimV1[], byId: Map<string, EvidenceFactV1>, locale: string): PlanFigureReadingV1[] =>
  // Sólo figuras con página: una lectura sin página dejaría a «Lo esencial» citando algo que no se imprime.
  charts.filter(chart => hasFigurePage(chart, byId, locale)).flatMap(chart => {
    const claim = claims.find(item => item.claimId === aeoReadingClaimId(chart.chartId, claims))
    // La cifra principal de una composición es su parte principal, nunca el total que ya dice la tarjeta (regla (d)).
    const lead = claim ? byId.get((chart.family === 'donut' || chart.chartId.endsWith('.ai-source') ? claim.factIds[1] : undefined) ?? claim.factIds[0] ?? '') : undefined

    if (!claim || !lead || claim.text.length > PLAN_TEXT_LIMITS.conclusion) return []

    return [{
      chartId: chart.chartId,
      keyFigure: { factId: lead.factId, value: formatFactValue(lead.value, lead.unit, locale), caption: { claimId: `caption.${chart.chartId}`, text: lead.label, factIds: [lead.factId] } },
      conclusion: { claimId: `conclusion.${chart.chartId}`, text: claim.text, factIds: claim.factIds },
      nextStep: null
    }].filter(reading => reading.keyFigure.caption.text.length <= PLAN_TEXT_LIMITS.keyFigureCaption)
  })

/** Share of Voice en una frase: quién concentra las menciones y cuánto tiene la marca. */
const sovFinding = (facts: EvidenceFactV1[], locale: string): PlanClaimV1 | null => {
  const F = GH_INSIGHTS.aeoFindings
  const rows = facts.filter(fact => fact.metricId.startsWith('sov.') && fact.value !== null)
  const brand = rows.find(fact => fact.metricId === 'sov.brand')
  const leader = [...rows].sort((a, b) => b.value! - a.value!)[0]

  if (!brand || !leader) return null

  const pct = (fact: EvidenceFactV1) => formatFactValue(fact.value, 'percent', locale)

  return leader === brand || leader.value === brand.value
    ? { claimId: 'claim.aeo.sov', text: `${F.sovBrandLeads} ${pct(brand)}.`, factIds: [brand.factId], role: 'finding' }
    : { claimId: 'claim.aeo.sov', text: `${leader.label} ${F.sovLeader} ${pct(leader)} ${F.sovOfMentions} ${pct(brand)}.`, factIds: [leader.factId, brand.factId], role: 'finding' }
}

const aeoSourceFindings = (facts: EvidenceFactV1[], locale: string): PlanClaimV1[] => {
  const F = GH_INSIGHTS.aeoFindings
  const n = (value: number | null) => formatFactValue(value, 'count', locale)
  const lower = (text: string) => `${text.charAt(0).toLocaleLowerCase('es')}${text.slice(1)}`
  const claims: PlanClaimV1[] = []
  const top = facts.find(fact => fact.metricId === 'cited_source.1' && fact.value !== null)

  if (top && top.denominator) {
    claims.push({ claimId: 'claim.aeo.sources.top', text: `${F.topSource} «${top.label}»: ${n(top.value)} ${F.of} ${n(top.denominator)} ${F.citations}.`, factIds: [top.factId], role: 'finding' })
  }

  const types = facts.filter(fact => fact.metricId.startsWith('source_type.') && fact.metricId !== 'source_type.unknown' && fact.value !== null).sort((a, b) => b.value! - a.value!)
  const leadType = types[0]
  const owned = types.find(fact => fact.metricId === 'source_type.owned')

  if (leadType) {
    const text = owned && owned !== leadType && owned.value! < leadType.value!
      ? `${F.sourceTypeLead} ${lower(leadType.label)} (${n(leadType.value)}) ${F.sourceTypeThan} ${lower(owned.label)} (${n(owned.value)}).`
      : `${F.sourceTypeOnly} ${lower(leadType.label)} (${n(leadType.value)}).`

    claims.push({ claimId: 'claim.aeo.sources.type', text, factIds: [leadType.factId, ...(owned && owned !== leadType ? [owned.factId] : [])], role: 'finding' })
  }

  const positive = facts.find(fact => fact.metricId === 'sentiment.positive')
  const negative = facts.find(fact => fact.metricId === 'sentiment.negative')

  const sov = sovFinding(facts, locale)

  if (sov) claims.push(sov)

  if (positive && negative && positive.denominator) {
    claims.push({ claimId: 'claim.aeo.sentiment', text: `${F.sentimentLead} ${n(positive.denominator)} ${F.sentimentEvaluated}, ${n(positive.value)} ${F.sentimentPositive} ${n(negative.value)} ${F.sentimentNegative}.`, factIds: [positive.factId, negative.factId], role: 'finding' })
  }

  return claims
}

/** TASK-1962 — hechos que sólo sostienen el plan de acción (oportunidades de la cola SEO): no son hallazgos ni tabla. */
/**
 * TASK-1962 — visitas por asistente de IA: partes de un mismo total. La figura va completa o no va: si las bandas de
 * magnitud la parten (ChatGPT con 1.648 y Gemini con 30), mostrar sólo la banda chica escondía al asistente que más trae
 * (vista previa Berel, 2026-10-02). Sin período anterior por asistente: el cambio del total ya lo dice su hallazgo.
 */
const aiSourceGroups = (unit: string, facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>, locale: string): ChartableGroups => {
  const current = facts.filter(fact => fact.value !== null).map(fact => ({ ...fact, comparisonFactId: null }))
  const { groups } = chartableGroupsFor(unit, current, byId, locale)

  return { groups: groups.length === 1 && groups[0]!.length === current.length ? groups : [], uniform: null }
}

/**
 * TASK-1962 — de qué asistente de IA llegan las visitas (GA4): el asistente que más trae, con su parte del total. Es el
 * hallazgo aunque la figura por asistente no se dibuje (ChatGPT con 1.648 de 1.686 deja a los demás sin escala).
 */
const aiSourceFinding = (facts: EvidenceFactV1[], locale: string): PlanClaimV1 | null => {
  const total = facts.find(fact => fact.metricId === 'ai_sessions')
  const top = facts.filter(fact => fact.metricId.startsWith('ai_source.') && fact.value !== null).sort((a, b) => b.value! - a.value!)[0]

  if (!total || !top || total.value === null || total.value <= 0 || top.value === null) return null

  const R = GH_INSIGHTS.reading
  const lead = top.value * 2 > total.value ? R.aiTopSourceMost : R.aiTopSource

  return {
    claimId: `claim.${top.factId}.top`,
    text: `${top.label} ${lead} ${formatFactValue(top.value, 'count', locale)} ${R.of} ${formatFactValue(total.value, 'count', locale)}.`,
    // El total va primero: «Lo esencial» toma el primer hecho de un hallazgo, y el del asistente (con su período anterior)
    // se leía «ChatGPT: de 1.343 a 1.648 de 1.686». Con el total, la esencial es la de las visitas desde IA, sin repetir.
    factIds: [total.factId, top.factId],
    role: 'finding'
  }
}

/** TASK-1962 — hechos de GA4 (visitas al sitio): su propia tabla, no la de Search Console ni la del Grader. */
const isGa4Fact = (fact: EvidenceFactV1): boolean => fact.method.name === 'ga4_channel_sessions'

const isPlanFact = (fact: EvidenceFactV1): boolean => fact.metricId.startsWith('opportunity.')

/**
 * TASK-1962 — «¿qué recomendamos?»: una acción por oportunidad de la cola SEO, en su orden (la cola es la autoridad),
 * citando sus cifras. Sin techo estimado no se promete un número; sin posición, sólo el verbo y el sujeto.
 */
const actionsFor = (facts: EvidenceFactV1[], locale: string): PlanActionV1[] => {
  const P = GH_INSIGHTS.plan
  const byRank = new Map<string, EvidenceFactV1[]>()

  for (const fact of facts.filter(isPlanFact)) {
    const rank = fact.dimension?.rank ?? ''

    byRank.set(rank, [...(byRank.get(rank) ?? []), fact])
  }

  return [...byRank.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([rank, group]) => {
      const pick = (name: string) => group.find(fact => fact.metricId === `opportunity.${rank}.${name}`)
      const impressions = pick('impressions')
      const position = pick('position')
      const target = pick('target_position')
      const ceiling = pick('ceiling')
      const dims = (impressions ?? group[0])!.dimension ?? {}
      const verb = P.verbs[dims.verb ?? '']

      if (!verb || !dims.keyword) return []

      const where = !dims.page ? '' : dims.page === GH_INSIGHTS.reading.homePage ? ` ${P.inHome}` : ` ${P.in} ${dims.page}`
      const head = `${verb} «${dims.keyword}»${dims.verb === 'consolidate' ? '' : where}`
      const fmt = (fact: EvidenceFactV1) => formatFactValue(fact.value, fact.unit, locale)

      const state = dims.verb === 'optimize' && position && impressions ? `: ${P.isAt} ${fmt(position)} ${P.with} ${fmt(impressions)} ${P.impressions}` : ''
      const gain = state && target && ceiling ? `; ${P.atTarget} ${fmt(target)} ${P.wouldAdd} ${fmt(ceiling)} ${P.clicks}` : ''
      const cited = [impressions, position, target, ceiling].filter((fact): fact is EvidenceFactV1 => Boolean(fact) && Boolean(state))

      return [{ actionId: `action.seo.opportunity.${rank}`, text: `${head}${dims.verb === 'consolidate' && dims.page ? ` (${dims.page})` : ''}${state}${gain}.`, ownerRef: null, factIds: cited.map(fact => fact.factId) }]
    })
}

/**
 * TASK-1962 — «¿qué necesitamos de ustedes?»: lo único que el plan puede pedir sin una persona es una fuente que el
 * cliente tiene que conectar (Search Console). Lo que falta por configuración interna (análisis de IA, spaces) no es un
 * pedido al cliente; las peticiones de negocio las agrega una persona en la revisión.
 */
const askFor = (rejections: readonly EvidenceRejectionV1[], modules: InsightModule[]): PlanClaimV1 | null => {
  const missing = (metricId: string, module?: InsightModule) =>
    rejections.some(rejection => rejection.metricId === metricId && rejection.reason === 'not_connected' && rejection.scope !== 'comparison' && (!module || rejection.module === module) && modules.includes(rejection.module))

  const gsc = modules.includes('seo') && missing('gsc', 'seo')
  // TASK-1962 — Google Analytics 4 sin conectar también lo resuelve el cliente (lo leen SEO y AEO).
  const ga4 = missing('ga4')

  if (gsc && ga4) return { claimId: 'ask.connect_search_console_ga4', text: GH_INSIGHTS.plan.connectBoth, factIds: [] }
  if (gsc) return { claimId: 'ask.connect_search_console', text: GH_INSIGHTS.plan.connectSearchConsole, factIds: [] }
  if (ga4) return { claimId: 'ask.connect_ga4', text: GH_INSIGHTS.plan.connectGa4, factIds: [] }

  return null
}

const DRIVER_DIMENSIONS = [
  { dimension: 'query', lead: GH_INSIGHTS.reading.driverQueryLead, title: GH_INSIGHTS.figures.driversQueryTitle },
  { dimension: 'page', lead: GH_INSIGHTS.reading.driverPageLead, title: GH_INSIGHTS.figures.driversPageTitle }
] as const

const driverSectionFor = (moduleKey: InsightModule, facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>, locale: string, totalClicks?: EvidenceFactV1) => {
  const charts: ChartSpecV1[] = []
  const claims: PlanClaimV1[] = []
  const readings: PlanFigureReadingV1[] = []
  const rows: Array<Array<string | null>> = []
  const previousOf = (fact: EvidenceFactV1) => (fact.comparisonFactId ? byId.get(fact.comparisonFactId) : undefined)
  const fmtCount = (value: number | null) => formatFactValue(value, 'count', locale)

  for (const { dimension, lead, title } of DRIVER_DIMENSIONS) {
    const movers = facts
      .filter(fact => fact.metricId === `driver.${dimension}.clicks` && fact.value !== null && previousOf(fact)?.value != null)
      .sort((a, b) => Number(a.dimension?.rank ?? 0) - Number(b.dimension?.rank ?? 0))

    const top = movers[0]

    if (!top) continue

    const before = previousOf(top)!
    const delta = formatDeltaForUnit(top.value!, before.value!, 'count', locale)
    const verb = top.value! > before.value! ? GH_INSIGHTS.reading.rose : top.value! < before.value! ? GH_INSIGHTS.reading.fell : GH_INSIGHTS.reading.held

    const change = `${verb} ${GH_INSIGHTS.reading.from} ${fmtCount(before.value)} ${GH_INSIGHTS.reading.lineTo} ${fmtCount(top.value)} ${GH_INSIGHTS.reading.clicksWord}${delta ? ` (${delta})` : ''}`
    const named = `${lead} «${top.label}»: ${change}.`
    const factIds = [top.factId, before.factId]

    claims.push({ claimId: `claim.${moduleKey}.drivers.${dimension}`, text: named, factIds, role: 'finding' })

    const peak = (fact: EvidenceFactV1) => Math.max(Math.abs(fact.value!), Math.abs(previousOf(fact)!.value!))
    const topPeak = Math.max(...movers.map(peak))
    const band = movers.filter(fact => peak(fact) * MAGNITUDE_BAND >= topPeak)

    // TASK-1962 — las consultas se dicen en CASCADA (familia waterfall, «qué explica un cambio»): clics del período
    // anterior → aporte de cada consulta → resto → clics de este período. Los aportes los entrega el adapter y suman el
    // cambio exacto (misma tabla que el total). Sin página PDF: en el A4 quedan el hallazgo y la tabla.
    const deltas = dimension === 'query' ? facts.filter(fact => fact.metricId === 'driver.query.delta' && fact.value !== null) : []
    const previousTotal = totalClicks?.comparisonFactId ? byId.get(totalClicks.comparisonFactId) : undefined

    if (deltas.length >= 2 && totalClicks?.value != null && previousTotal?.value != null && canProduceFamily('waterfall', moduleKey)) {
      const ordered = [...deltas].sort((a, b) => (a.dimension?.rank === 'rest' ? 1 : b.dimension?.rank === 'rest' ? -1 : Number(a.dimension?.rank) - Number(b.dimension?.rank)))
      const chartId = `chart.${moduleKey}.drivers.${dimension}`

      // TASK-1975 — la cascada tiene su propia lectura (sin ella, la página repetía la conclusión de las cifras): la cifra
      // principal es el aporte de la consulta que más cambió (un hecho medido) y la conclusión la nombra, sin cifras nuevas.
      const named = ordered.filter(fact => fact.dimension?.rank !== 'rest')
      const top = [...named].sort((a, b) => Math.abs(b.value!) - Math.abs(a.value!))[0]

      if (top) {
        const gained = top.value! > 0
        const period = windowLabelOf(previousTotal.window, locale)
        const F = GH_INSIGHTS.figures

        readings.push({
          chartId,
          keyFigure: {
            factId: top.factId,
            value: fmtCount(top.value),
            caption: {
              claimId: `caption.${chartId}`,
              text: [F.waterfallCaption(gained, top.label, period), F.waterfallCaptionShort(gained, period)].find(text => text.length <= PLAN_TEXT_LIMITS.keyFigureCaption)!,
              factIds: [top.factId]
            }
          },
          conclusion: {
            claimId: `conclusion.${chartId}`,
            text: [F.waterfallConclusion(gained, top.label), F.waterfallConclusionShort(gained)].find(text => text.length <= PLAN_TEXT_LIMITS.conclusion)!,
            factIds: [top.factId]
          },
          nextStep: null
        })
      }

      charts.push({
        specVersion: 'chart_spec_v1',
        chartId,
        family: 'waterfall',
        relation: 'decomposition',
        title: GH_INSIGHTS.figures.driversWaterfallTitle,
        series: [],
        dimensionLabels: [GH_INSIGHTS.figures.previousTotal, ...ordered.map(fact => fact.label), GH_INSIGHTS.figures.currentTotal],
        unit: 'count',
        scale: { kind: 'linear', baseline: 0 },
        references: [],
        data: {
          kind: 'waterfall',
          steps: [
            { stepId: 'previous', label: GH_INSIGHTS.figures.previousTotal, factId: previousTotal.factId, isTotal: true },
            ...ordered.map(fact => ({ stepId: `delta.${fact.dimension?.rank}`, label: fact.label, factId: fact.factId, isTotal: false })),
            { stepId: 'current', label: GH_INSIGHTS.figures.currentTotal, factId: totalClicks.factId, isTotal: true }
          ]
        },
        tabularEquivalent: {
          columns: [GH_INSIGHTS.figures.driversQueryColumn, GH_INSIGHTS.reading.variation],
          rows: [[null, previousTotal.factId], ...ordered.map(fact => [null, fact.factId]), [null, totalClicks.factId]]
        }
      })
    } else if (band.length >= 2) {
      const chartId = `chart.${moduleKey}.drivers.${dimension}`
      const channel = band[0]!.channelId

      // La lectura de la figura dice lo MISMO que el hallazgo: «más cambió» es más clics movidos. La lectura genérica de
      // barras elige el mayor cambio relativo y nombraba otra página (/colores, -20,7 %) que el hallazgo (la portada).
      // Si la frase con el nombre no cabe en el molde, va sin el nombre: la figura ya lo muestra; nunca se recorta.
      const conclusion = [named, `${lead} ${change}.`].find(text => text.length <= PLAN_TEXT_LIMITS.conclusion)!

      readings.push({
        chartId,
        keyFigure: {
          factId: top.factId,
          value: fmtCount(top.value),
          caption: { claimId: `caption.${chartId}`, text: [`«${top.label}» · ${GH_INSIGHTS.reading.previousPeriod}: ${fmtCount(before.value)}`, `${GH_INSIGHTS.reading.previousPeriod}: ${fmtCount(before.value)}`].find(text => text.length <= PLAN_TEXT_LIMITS.keyFigureCaption)!, factIds }
        },
        conclusion: { claimId: `conclusion.${chartId}`, text: conclusion, factIds },
        nextStep: null
      })

      charts.push({
        specVersion: 'chart_spec_v1',
        chartId,
        family: 'bar_grouped',
        relation: 'comparison',
        title,
        series: [
          { seriesId: `${chartId}.previous`, label: GH_INSIGHTS.figures.previousLabel, factIds: band.map(fact => fact.comparisonFactId!), unit: 'count', ...(channel ? { channelId: channel } : {}) },
          { seriesId: `${chartId}.current`, label: GH_INSIGHTS.figures.currentLabel, factIds: band.map(fact => fact.factId), unit: 'count', ...(channel ? { channelId: channel } : {}) }
        ],
        dimensionLabels: band.map(fact => fact.label),
        unit: 'count',
        // Misma métrica (clics) en todas las barras: eje compartido, nunca una escala por fila.
        scale: { kind: 'linear', baseline: 0 },
        references: [],
        tabularEquivalent: {
          columns: [dimension === 'query' ? GH_INSIGHTS.figures.driversQueryColumn : GH_INSIGHTS.figures.driversPageColumn, GH_INSIGHTS.figures.previousLabel, GH_INSIGHTS.figures.currentLabel],
          rows: band.map(fact => [null, fact.comparisonFactId!, fact.factId])
        }
      })
    }

    for (const fact of movers) rows.push([fact.label, fmtCount(fact.value), fmtCount(previousOf(fact)!.value), asOfLabelOf(fact.freshness.asOf, locale) ?? '—'])
  }

  const tables: PlanTableV1[] = rows.length > 0
    ? [{ tableId: `table.${moduleKey}.drivers`, title: GH_INSIGHTS.figures.driversTableTitle, lead: GH_INSIGHTS.figures.driversTableLead, columns: [GH_INSIGHTS.figures.driversEntityColumn, 'Período', 'Período anterior', 'Corte de la fuente'], rows }]
    : []

  return { charts, claims, tables, readings }
}

/**
 * Reemplaza la lectura genérica de cada figura de causas por la del productor de causas (mismo criterio que el hallazgo).
 * Una figura SIN lectura genérica (la cascada: TASK-1975) recibe la del productor; antes se perdía y la página repetía la
 * conclusión de las cifras.
 */
const withDriverReadings = (readings: PlanFigureReadingV1[], driverReadings: PlanFigureReadingV1[]): PlanFigureReadingV1[] => {
  const byChart = new Map(driverReadings.map(reading => [reading.chartId, reading]))
  const present = new Set(readings.map(reading => reading.chartId))

  return [...readings.map(reading => byChart.get(reading.chartId) ?? reading), ...driverReadings.filter(reading => !present.has(reading.chartId))]
}

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
    const moduleFacts = snapshot.facts.filter(fact => fact.module === moduleKey && !comparisonIds.has(fact.factId) && !isReferenceFact(fact) && !isPlanFact(fact))
    // TASK-1962 — las causas (`driver.*`) tienen su propia sección; no compiten como hallazgo ni van a la tabla general.
    const facts = moduleFacts.filter(fact => !isDriverFact(fact) && !isWeeklyFact(fact))
    const drivers = editorialV2 ? driverSectionFor(moduleKey, moduleFacts.filter(isDriverFact), byId, input.locale, facts.find(fact => fact.metricId === 'clicks')) : null
    const weekly = editorialV2 ? weeklyLineChart(moduleKey, moduleFacts, byId) : null
    const referenceFacts = snapshot.facts.filter(fact => fact.module === moduleKey && isReferenceFact(fact) && !isPlanFact(fact))
    const rejections = snapshot.rejections.filter(rejection => rejection.module === moduleKey)
    const v2Context = editorialV2 ? contextOfFacts(facts) : null

    // TASK-1974 — criterio de selección (sólo v2): una métrica con meta va en bullet y en ninguna otra figura; las cifras
    // con nombre corto van en la tarjeta del capítulo; un hecho alimenta una sola figura.
    const targetMetrics = new Set(editorialV2 ? referenceFacts.filter(fact => fact.metricId.startsWith('target.')).map(fact => fact.metricId.slice('target.'.length)) : [])
    // Las barras apiladas toman sus segmentos y el total: la tarjeta no los repite.
    const subset = editorialV2 ? subsetChartsFor(moduleKey, facts, byId, input.locale) : { charts: [], taken: new Set<string>() }
    const stat = editorialV2 ? statFigureFor({ moduleKey, facts, byId, targetMetrics, takenFactIds: subset.taken }) : null
    // TASK-1990/1996 — tableros con isotipo por celda: mención por motor y visitas por asistente (con período anterior).
    const assistants = editorialV2 ? assistantStatFigureFor(moduleKey, facts, byId) : null
    const engines = editorialV2 ? engineStatFigureFor(moduleKey, facts, byId, new Set([...(stat?.items.map(item => item.factId) ?? []), ...subset.taken])) : null
    const stats = [stat, assistants, engines].filter((figure): figure is NonNullable<typeof figure> => figure !== null)
    // El tablero por motor sólo existe cuando todas las tasas son iguales: no hay barras que dibujar y la frase uniforme
    // («…en el 33,3 % de las respuestas de cada motor») sigue siendo su lectura. Sus hechos siguen ese camino.
    const inStat = new Set([...[stat, assistants].flatMap(figure => figure?.items.map(item => item.factId) ?? []), ...subset.taken])

    // TASK-1957 — las dimensiones internas del Grader (claridad de entidad, dominio de categoría…) son lecturas del
    // método, no indicadores para el cliente: no se dicen ni van como tarjeta; quedan en la tabla de respaldo.
    const factClaims = facts
      .filter(fact => !(moduleKey === 'aeo' && (fact.metricId.startsWith('dimension.') || isAeoSourceFact(fact) || fact.metricId.startsWith('ai_source.'))))
      .map(fact => claimFor(fact, byId, input.locale, v2Context))
      // TASK-1962 — con v2, el Share of Voice de la marca lo dice la frase que lo compara con el líder: la cifra suelta
      // («Tu marca: 25,0 %») queda como respaldo.
      .map(claim => (editorialV2 && moduleKey === 'aeo' && claim.factIds.length === 1 && byId.get(claim.factIds[0]!)?.metricId === 'sov.brand' ? { ...claim, role: 'backing' as const } : claim))
      .concat(moduleKey === 'aeo' && editorialV2 ? aeoSourceFindings(facts, input.locale) : [])
      .concat(moduleKey === 'aeo' && editorialV2 ? ((claim => (claim ? [claim] : []))(aiSourceFinding(facts, input.locale))) : [])

    const uniformClaims: PlanClaimV1[] = []
    const charts: ChartSpecV1[] = []
    const byUnit = new Map<string, EvidenceFactV1[]>()

    // TASK-1957 — en AEO los porcentajes son indicadores DISTINTOS (tasa de mención por motor, Share of Voice frente a
    // competidores, Share of Model y citas): cada familia es su propia figura, con su título. El resto agrupa por unidad.
    for (const fact of facts) {
      // TASK-1962 — «sin clasificar» es la parte que el Grader no pudo tipificar: va a la tabla, no encabeza la figura.
      // Los sitios citados tampoco van en columnas: un dominio es una sola palabra («greatplacetowork.com.mx») que la
      // figura no puede partir y el render falla cerrado (Berel, 2026-10-02). Van en su hallazgo y en la tabla.
      // El tono y el tipo de fuente son partes de un todo: van en su figura de composición (`compositionChartsFor`, TASK-1974).
      if (fact.metricId.startsWith('source_type.') || fact.metricId.startsWith('sentiment.') || fact.metricId.startsWith('cited_source.')) continue
      if (inStat.has(fact.factId) || targetMetrics.has(fact.metricId)) continue
      // Con v2 las visitas por asistente son la figura de composición de su total (`compositionChartsFor`) o su tablero.
      if (editorialV2 && fact.metricId.startsWith('ai_source.')) continue

      const key = chartGroupKeyOf(moduleKey, fact)

      byUnit.set(key, [...(byUnit.get(key) ?? []), fact])
    }

    for (const [groupKey, unitFacts] of byUnit) {
      const [unit, family] = groupKey.split(':') as [string, string | undefined]
      const familyTitle = family ? GH_INSIGHTS.aeoFamilyTitles[family] : undefined
      const title = familyTitle ?? (GH_INSIGHTS.units[unit] ? `${GH_INSIGHTS.modules[moduleKey].label} · ${GH_INSIGHTS.units[unit]}` : GH_INSIGHTS.modules[moduleKey].label)
      const baseId = family && family !== 'single' ? `chart.${moduleKey}.${unit}.${family.replace(/_/g, '-')}` : `chart.${moduleKey}.${unit}`
      // Indicadores AEO distintos (Share of Model, citas) no se comparan entre sí en barras: son hallazgos con su base.
      const { groups, uniform } = family === 'single' ? { groups: [], uniform: null } : family === 'ai_source' ? aiSourceGroups(unit, unitFacts, byId, input.locale) : chartableGroupsFor(unit, unitFacts, byId, input.locale)

      groups.forEach((group, index) => {
        const chart = chartFor(moduleKey, group, byId, unit, index === 0 ? baseId : `${baseId}.${index + 1}`, familyTitle ?? metricsTitle(group) ?? title, editorialV2)

        if (chart) charts.push(chart)
      })

      const uniformClaim = uniform ? uniformClaimFor(moduleKey, uniform, input.locale) : null

      if (uniformClaim) uniformClaims.push(uniformClaim)
    }

    // TASK-1957 — roles: hallazgos materiales arriba, el resto respaldo. Las frases de figuras descartadas abren la lista.
    const claims = [...withRoles([...uniformClaims, ...factClaims], facts, byId, input.locale), ...(drivers?.claims ?? [])]

    charts.push(...(weekly ? [weekly] : []), ...(drivers?.charts ?? []), ...(editorialV2 ? [...compositionChartsFor(moduleKey, facts, null, { aiSourceAsCards: assistants !== null }), ...subset.charts] : []))

    if (editorialV2) {
      // TASK-1974 — una métrica con meta va SÓLO en bullet (la meta gana, regla 2): su línea mensual repetiría el hecho
      // del mes actual. La evolución queda para las métricas sin meta.
      charts.push(...bulletCharts(moduleKey, facts, referenceFacts), ...lineCharts(moduleKey, facts.filter(fact => !targetMetrics.has(fact.metricId))))
      assertChartsAllowed(moduleKey, charts)
    }

    // TASK-1974 — cada figura declara su pregunta y el capítulo sigue el orden del criterio (§5.2).
    const ordered = editorialV2 ? orderByQuestion(charts.map(withQuestion)) : charts
    const statReadings = stats.flatMap(figure => ((reading => (reading ? [reading] : []))(statReading(figure, byId, input.locale))))

    if (claims[0]) summary.push({ ...claims[0], claimId: `summary.${claims[0].claimId}` })

    chapters.push({
      chapterId: `chapter.${moduleKey}`,
      module: moduleKey,
      title: MODULE_TITLES[moduleKey],
      claims,
      ...(stats.length > 0 ? { stats } : {}),
      charts: ordered,
      // v2: la tabla es el respaldo de TODO el capítulo, no un resumen (revisión del operador, 2026-09-25).
      tables: [
        ...((main => (main.length > 0 ? [tableFor(`table.${moduleKey}`, editorialV2 ? `${MODULE_TITLES[moduleKey]}: ${GH_INSIGHTS.tableAllFigures}` : `${MODULE_TITLES[moduleKey]} · resumen`, main, byId, input.locale)] : []))(facts.filter(fact => !isAeoSourceFact(fact) && !isGa4Fact(fact)))),
        // TASK-1962 — lo que mide GA4 (visitas al sitio) en su propia tabla: es otra fuente y otra unidad (sesiones).
        ...((siteFacts => (siteFacts.length > 0 ? [{ ...tableFor(`table.${moduleKey}.ga4`, GH_INSIGHTS.ga4.tableTitle[moduleKey] ?? GH_INSIGHTS.ga4.tableTitle.seo!, siteFacts, byId, input.locale), lead: GH_INSIGHTS.ga4.tableLead }] : []))(facts.filter(isGa4Fact))),
        // TASK-1962 — fuentes, tipos y tono del Grader en su propia tabla: no inflan la de los indicadores.
        ...((sourceFacts => (sourceFacts.length > 0 ? [{ ...tableFor(`table.${moduleKey}.sources`, GH_INSIGHTS.aeoFindings.tableTitle, sourceFacts, byId, input.locale), lead: GH_INSIGHTS.aeoFindings.tableLead }] : []))(facts.filter(isAeoSourceFact))),
        ...(drivers?.tables ?? [])
      ],
      limits: limitsFor(rejections),
      ...(editorialV2 ? { opening: openingFor(moduleKey), readings: [...statReadings, ...withDriverReadings(readingsFor(ordered, byId, input.locale), [...(drivers?.readings ?? []), ...(moduleKey === 'aeo' ? aeoReadings(ordered, claims, byId, input.locale) : []), ...((reading => (reading ? [reading] : []))(weekly ? weeklyReading(weekly, byId, input.locale) : null))])] } : {})
    })
  }

  const references = snapshot.facts
    .filter(fact => !comparisonIds.has(fact.factId) && !isReferenceFact(fact))
    .map(fact => ({ referenceId: `ref.${fact.factId}`, label: `${fact.label} (${windowLabel(fact, input.locale)})`, evidenceRef: fact.evidenceRef }))

  // TASK-1888 — con v2 la tesis del resumen y su bajada son hallazgos del informe; sin hallazgos, la afirmación v1.
  const findings = editorialV2 ? summaryFindingsFor(chapters, byId, input.locale) : []
  const executiveSummary = findings.length > 0 ? findings : summary

  return {
    planVersion: 'editorial_plan_v1',
    locale: input.locale,
    executiveSummary,
    chapters,
    // TASK-1962 — plan de acción determinista desde fuentes dueñas (hoy, la cola SEO); sin contrato v2, vacío como antes.
    actions: editorialV2 ? actionsFor(snapshot.facts, input.locale) : [],
    limits: limitsFor(snapshot.rejections),
    methodology: unique(snapshot.sources.map(source => methodologyFor(source, input.locale))),
    references,
    // TASK-1888 — campos v2: sólo con el contrato encendido; un plan v1 no los trae.
    ...(editorialV2
      ? {
          essentials: essentialsFor(chapters, byId, input.locale, findings),
          scopeLines: scopeLinesFor(input.modules),
          ...((ask => (ask ? { ask } : {}))(askFor(snapshot.rejections, input.modules))),
          ...(input.cover ? { cover: input.cover } : {})
        }
      : {})
  }
}
