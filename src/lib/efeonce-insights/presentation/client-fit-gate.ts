/**
 * TASK-1957 — gate «apto para cliente»: recorre TODO texto visible del modelo web de una edición (el mismo plan que
 * imprimen los PDF) y falla ante lo que no puede llegar a un cliente. Nació de la revisión del operador del 2026-10-02
 * sobre ediciones reales de Berel y Sky: tablas internas como fuente, unidades en código, fechas ISO, diagnósticos de
 * adapter en los límites y gráficos sin información.
 *
 * Las reglas se DERIVAN del payload y del copy (`GH_INSIGHTS`), nunca de literales de un cliente: un segundo cliente no
 * tiene que editar el gate para pasar haciendo lo correcto (lección del segundo consumidor de arch-architect).
 */

import type { EvidenceFactV1 } from '../contracts/evidence'
import type { InsightWebChartV1, InsightWebModelV1 } from '../contracts/web-model'
import { BANDED_UNITS, MAGNITUDE_BAND } from '../editorial/deterministic-planner'
import { GH_INSIGHTS } from '@/lib/copy/insights'

export type ClientFitRule =
  | 'internal_identifier'
  | 'raw_unit_code'
  | 'raw_iso_date'
  | 'internal_limit_wording'
  | 'duplicated_limit'
  | 'chart_without_information'
  | 'count_without_denominator'
  | 'rank_as_bars_from_zero'
  | 'shared_axis_incomparable'

export interface ClientFitViolation {
  path: string
  rule: ClientFitRule
  /** El fragmento que dispara la regla, recortado. Nunca el modelo entero. */
  excerpt: string
}

/** Claves que llevan datos estructurados para el render (ids, códigos, instantes): no se leen como texto. */
const STRUCTURAL_KEYS = new Set([
  'module', 'unit', 'asOf', 'observation', 'absentReason', 'family', 'relation', 'kind', 'specVersion', 'modelVersion',
  'locale', 'href', 'variant', 'periodStart', 'periodEndExclusive', 'timeZone', 'issuedAt', 'asOfMax', 'expiresAt',
  'output', 'status', 'channelId', 'value',
  // TASK-1974 — enums de la tarjeta de cifra y de la pregunta de cada figura: datos para el render, no texto.
  'question', 'direction', 'tone',
  // Tarjeta con isotipo de canal (contrato AXIS 0.2.0): ids de plataforma que el consumer traduce a su isotipo.
  'platform', 'titlePlatforms'
])

const isStructuralKey = (key: string): boolean => STRUCTURAL_KEYS.has(key) || /Ids?$/.test(key)

/** esquema.tabla o identificador con guión bajo (`greenhouse_growth.seo_gsc_daily`, `metric_snapshots_monthly`). */
const SNAKE_IDENTIFIER = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/
/** identificador con punto entre minúsculas (`presence.gemini`, `ico_engine.x`); excluye decimales y abreviaturas. */
const DOTTED_IDENTIFIER = /\b[a-z][a-z0-9_]{1,}\.[a-z][a-z0-9_]{1,}\b/
const MATERIALIZED = /\(materialized\)/i
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/

const UNIT_CODES = new Set(Object.keys(GH_INSIGHTS.units))
/** Frases de diagnóstico del adapter: válidas en la evidencia interna, nunca en un límite de cliente. */
const INTERNAL_LIMIT_PHRASES = Object.values(GH_INSIGHTS.rejections as Readonly<Record<string, string>>)

const excerptOf = (text: string, match: RegExpMatchArray | null): string => {
  if (!match || match.index === undefined) return text.slice(0, 80)

  return text.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20)
}

/**
 * TASK-1962 — dominios PÚBLICOS que el informe nombra a propósito: los sitios que citan los motores (`cited_source.*`,
 * etiqueta = dominio que el Grader midió). Un dominio tiene forma de identificador con punto («chocale.cl»), pero es
 * contenido del cliente. Se enmascaran EXACTAMENTE esos dominios antes de buscar identificadores; cualquier otro token con
 * punto sigue siendo una fuga.
 */
const publicDomainsOf = (facts: readonly EvidenceFactV1[]): string[] =>
  [...new Set(facts.filter(fact => fact.metricId.startsWith('cited_source.')).map(fact => fact.label))].sort((a, b) => b.length - a.length)

const scanText = (path: string, raw: string, out: ClientFitViolation[], publicDomains: readonly string[] = []): void => {
  const text = publicDomains.reduce((masked, domain) => masked.split(domain).join(' '), raw)

  for (const pattern of [SNAKE_IDENTIFIER, DOTTED_IDENTIFIER, MATERIALIZED]) {
    const match = text.match(pattern)

    if (match) {
      out.push({ path, rule: 'internal_identifier', excerpt: excerptOf(text, match) })

      return
    }
  }

  if (UNIT_CODES.has(text.trim())) out.push({ path, rule: 'raw_unit_code', excerpt: text })

  const iso = text.match(ISO_DATE)

  if (iso) out.push({ path, rule: 'raw_iso_date', excerpt: excerptOf(text, iso) })
}

const walk = (node: unknown, path: string, out: ClientFitViolation[], publicDomains: readonly string[] = []): void => {
  if (typeof node === 'string') {
    scanText(path, node, out, publicDomains)

    return
  }

  if (Array.isArray(node)) {
    node.forEach((item, index) => walk(item, `${path}[${index}]`, out, publicDomains))

    return
  }

  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (isStructuralKey(key)) continue
      // El ChartSpec es contrato de render: sus textos visibles (título, etiquetas de serie y dimensión) se revisan;
      // `scale`, `data` y `tabularEquivalent` llevan ids y números (la tabla visible es `chart.table`, ya resuelta).
      if (path.endsWith('.spec') && (key === 'scale' || key === 'data' || key === 'tabularEquivalent')) continue
      walk(value, path ? `${path}.${key}` : key, out, publicDomains)
    }
  }
}

const limitViolations = (path: string, limits: readonly string[], out: ClientFitViolation[]): void => {
  const seen = new Set<string>()

  limits.forEach((limit, index) => {
    // La razón (lo que va tras «Tema:») se compara ENTERA con la forma interna, actual o de comparación: una subcadena
    // confundía «sin datos suficientes» (lector) con «sin datos» (diagnóstico interno).
    const reason = limit.slice(limit.indexOf(':') + 1).trim().replace(/\.$/, '')
    const phrase = INTERNAL_LIMIT_PHRASES.find(item => reason === item || reason === `${GH_INSIGHTS.document.comparisonLimitPrefix} ${item}`)

    if (phrase) out.push({ path: `${path}[${index}]`, rule: 'internal_limit_wording', excerpt: limit.slice(0, 120) })

    // Mismo tema (lo que va antes de «:») dicho dos veces: actual y comparación se dicen en UNA línea.
    const subject = limit.split(':')[0]!.trim().toLowerCase()

    if (seen.has(subject)) out.push({ path: `${path}[${index}]`, rule: 'duplicated_limit', excerpt: limit.slice(0, 120) })
    seen.add(subject)
  })
}

const chartViolations = (path: string, chart: InsightWebChartV1, factsById: ReadonlyMap<string, EvidenceFactV1>, out: ClientFitViolation[]): void => {
  const spec = chart.spec

  if (spec.data) return

  const series = spec.series ?? []
  const values = series.flatMap(item => item.factIds.map(id => factsById.get(id)?.value ?? null)).filter((value): value is number => value !== null)

  // Sin varianza y sin cambio que mostrar: todas las barras a la misma altura no informan nada.
  if (values.length >= 2 && new Set(values).size === 1) out.push({ path, rule: 'chart_without_information', excerpt: spec.title })

  const current = series.at(-1)

  // Un conteo que es parte de un total sólo se grafica junto a otros del MISMO total (presencia por motor); mezclado
  // con conteos sueltos o con otro total, su barra se lee sin denominador. La regla es la misma del planner.
  const plotted = (current?.factIds ?? []).map(id => factsById.get(id)).filter((fact): fact is EvidenceFactV1 => Boolean(fact))
  const isPart = (fact: EvidenceFactV1) => fact.denominator !== null && fact.denominator > 0 && fact.numerator === fact.value
  const parts = plotted.filter(isPart)

  if (spec.unit === 'count' && parts.length > 0 && (parts.length !== plotted.length || new Set(parts.map(fact => fact.denominator)).size > 1)) {
    out.push({ path, rule: 'count_without_denominator', excerpt: spec.title })
  }

  // Magnitudes incomparables en UN eje (impresiones junto a keywords): la menor queda invisible. Sólo es válido si cada
  // dimensión declara su propia escala (`scale.perDimension`). Mismo umbral y unidades que el planner.
  const magnitudes = values.map(Math.abs).filter(value => value > 0)

  if ((spec.family === 'bar' || spec.family === 'bar_grouped') && !spec.scale.perDimension && BANDED_UNITS.has(spec.unit)
    && magnitudes.length >= 2 && Math.min(...magnitudes) * MAGNITUDE_BAND < Math.max(...magnitudes)) {
    out.push({ path, rule: 'shared_axis_incomparable', excerpt: spec.title })
  }

  // Posición media: menor es mejor; barras desde cero invierten la lectura.
  if (spec.unit === 'position' && (spec.family === 'bar' || spec.family === 'bar_grouped')) {
    out.push({ path, rule: 'rank_as_bars_from_zero', excerpt: spec.title })
  }
}

export interface ClientFitInput {
  model: InsightWebModelV1
  /** Título del informe que va en portada. */
  reportTitle?: string
  /** Hechos del snapshot sellado: el modelo web no trae numerador/denominador. */
  facts: readonly EvidenceFactV1[]
}

export const clientFitViolations = ({ model, reportTitle, facts }: ClientFitInput): ClientFitViolation[] => {
  const out: ClientFitViolation[] = []
  const factsById = new Map(facts.map(fact => [fact.factId, fact]))

  if (reportTitle !== undefined) scanText('header.reportTitle', reportTitle, out)

  walk(model, '', out, publicDomainsOf(facts))
  limitViolations('limits', model.limits, out)

  model.chapters.forEach((chapter, chapterIndex) => {
    limitViolations(`chapters[${chapterIndex}].limits`, chapter.limits, out)
    chapter.charts.forEach((chart, chartIndex) => chartViolations(`chapters[${chapterIndex}].charts[${chartIndex}]`, chart, factsById, out))
  })

  return out
}
