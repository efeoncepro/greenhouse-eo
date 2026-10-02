/**
 * TASK-1845 — planner DETERMINISTA: lectura factual del snapshot sin modelo. Es el fallback
 * obligatorio y la base que la IA acotada sólo puede reescribir (nunca recalcular). Cada
 * claim referencia sus factIds y escribe las cifras con `formatFactValue`.
 */

import type { ChartSpecV1 } from '../contracts/chart-spec'
import { isReferenceFact, type EvidenceFactV1, type EvidenceRejectionV1, type EvidenceSnapshotContentV1, type EvidenceSourceV1 } from '../contracts/evidence'
import type { EditorialPlanV1, PlanChapterV1, PlanClaimV1, PlanCoverV1, PlanTableV1 } from '../contracts/plan'
import type { InsightModule } from '../contracts/request'
import { assertChartsAllowed, bulletCharts, contextOfFacts, essentialsFor, humanFactSentence, lineCharts, openingFor, printedChange, readingsFor, scopeLinesFor, summaryFindingsFor, type ChapterContext as ChapterContextV2 } from './editorial-v2'
import { asOfLabelOf, windowLabelOf } from '../presentation/vocabulary'
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

const currentLimitText = (reason: EvidenceRejectionV1['reason']): string =>
  reason === 'insufficient_data' || reason === 'no_data' ? READER.insufficientData : READER.outOfScope

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
  return [...bySubject].map(([subject, entry]) => `${subject}: ${entry.current ? currentLimitText(entry.current.reason) : READER.noComparison}.`)
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

/**
 * TASK-1957 — elegibilidad de figuras. Una figura se emite sólo si informa (revisión del operador con Berel, 2026-10-02):
 *  - posición media (menor es mejor) nunca va en barras desde cero: su cambio lo dice la afirmación;
 *  - un conteo que es parte de un total («2 de 6») sólo se compara con otros del MISMO total y nunca junto a conteos
 *    sueltos; si no, va a la afirmación con su «n de m»;
 *  - sin varianza (todas las cifras iguales, sin cambio impreso) no hay figura: todas las barras a la misma altura no
 *    dicen nada; la afirmación lo dice en una frase;
 *  - magnitudes incomparables no comparten eje lineal: se separan en bandas (impresiones lado a lado con keywords
 *    dejaban las keywords invisibles).
 */
const MAGNITUDE_BAND = 10
/** Sólo las unidades SIN tope se separan por magnitud; un puntaje 0–100 o un porcentaje se comparan en su escala. */
const BANDED_UNITS = new Set(['count', 'visits_estimated', 'usd', 'clp', 'days'])
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
    .filter(band => hasInformation(band, byId, locale))
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
const HEADLINE_METRICS = new Set(['share_of_model', 'sov.brand', 'citation_share'])

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
const chartGroupKeyOf = (moduleKey: InsightModule, fact: EvidenceFactV1): string => {
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
    const factClaims = facts.map(fact => claimFor(fact, byId, input.locale, v2Context))
    const uniformClaims: PlanClaimV1[] = []
    const charts: ChartSpecV1[] = []
    const byUnit = new Map<string, EvidenceFactV1[]>()

    // TASK-1957 — en AEO los porcentajes son indicadores DISTINTOS (tasa de mención por motor, Share of Voice frente a
    // competidores, Share of Model y citas): cada familia es su propia figura, con su título. El resto agrupa por unidad.
    for (const fact of facts) {
      const key = chartGroupKeyOf(moduleKey, fact)

      byUnit.set(key, [...(byUnit.get(key) ?? []), fact])
    }

    for (const [groupKey, unitFacts] of byUnit) {
      const [unit, family] = groupKey.split(':') as [string, string | undefined]
      const familyTitle = family ? GH_INSIGHTS.aeoFamilyTitles[family] : undefined
      const title = familyTitle ?? (GH_INSIGHTS.units[unit] ? `${GH_INSIGHTS.modules[moduleKey].label} · ${GH_INSIGHTS.units[unit]}` : GH_INSIGHTS.modules[moduleKey].label)
      const baseId = family && family !== 'single' ? `chart.${moduleKey}.${unit}.${family.replace(/_/g, '-')}` : `chart.${moduleKey}.${unit}`
      // Indicadores AEO distintos (Share of Model, citas) no se comparan entre sí en barras: son hallazgos con su base.
      const { groups, uniform } = family === 'single' ? { groups: [], uniform: null } : chartableGroupsFor(unit, unitFacts, byId, input.locale)

      groups.forEach((group, index) => {
        const chart = chartFor(moduleKey, group, byId, unit, index === 0 ? baseId : `${baseId}.${index + 1}`, title, editorialV2)

        if (chart) charts.push(chart)
      })

      const uniformClaim = uniform ? uniformClaimFor(moduleKey, uniform, input.locale) : null

      if (uniformClaim) uniformClaims.push(uniformClaim)
    }

    // TASK-1957 — roles: hallazgos materiales arriba, el resto respaldo. Las frases de figuras descartadas abren la lista.
    const claims = withRoles([...uniformClaims, ...factClaims], facts, byId, input.locale)

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
      // v2: la tabla es el respaldo de TODO el capítulo, no un resumen (revisión del operador, 2026-09-25).
      tables: facts.length > 0 ? [tableFor(`table.${moduleKey}`, editorialV2 ? `${MODULE_TITLES[moduleKey]}: ${GH_INSIGHTS.tableAllFigures}` : `${MODULE_TITLES[moduleKey]} · resumen`, facts, byId, input.locale)] : [],
      limits: limitsFor(rejections),
      ...(editorialV2 ? { opening: openingFor(moduleKey), readings: readingsFor(charts, byId, input.locale) } : {})
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
    actions: [],
    limits: limitsFor(snapshot.rejections),
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
