/**
 * TASK-1845 — `ChartSpecV1` (browser-safe). Contrato de DATOS del gráfico: qué relación,
 * qué series, qué unidades y qué equivalente tabular. La librería visual y los catálogos
 * viven en TASK-1847; ningún componente visual nace aquí.
 *
 * Reglas (arquitectura §6): barras con origen cero; pie/donut sólo partes no superpuestas
 * de un mismo total; dispersión requiere observaciones pareadas; sin doble eje ni 3D.
 */

export const CHART_SPEC_VERSION = 'chart_spec_v1' as const

export const CHART_FAMILIES = ['bar', 'bar_grouped', 'bar_stacked', 'line', 'pie', 'donut', 'scatter'] as const
export type ChartFamily = (typeof CHART_FAMILIES)[number]

export const CHART_RELATIONS = ['comparison', 'trend', 'composition', 'distribution', 'correlation'] as const
export type ChartRelation = (typeof CHART_RELATIONS)[number]

export interface ChartSeriesV1 {
  seriesId: string
  label: string
  /** Cada punto referencia un hecho del snapshot; ninguna cifra vive sólo en el gráfico. */
  factIds: string[]
  unit: string
}

export interface ChartScaleV1 {
  kind: 'linear'
  /** Barras: SIEMPRE 0. Líneas: 0 o null (auto) declarado, nunca implícito. */
  baseline: 0 | null
}

export interface ChartReferenceV1 {
  label: string
  factId: string | null
  value: number | null
}

export interface ChartTabularEquivalentV1 {
  columns: string[]
  /** Filas como referencias a factIds (una celda = un hecho o null). */
  rows: Array<Array<string | null>>
}

export interface ChartSpecV1 {
  specVersion: typeof CHART_SPEC_VERSION
  chartId: string
  family: ChartFamily
  relation: ChartRelation
  title: string
  series: ChartSeriesV1[]
  dimensionLabels: string[]
  unit: string
  scale: ChartScaleV1
  references: ChartReferenceV1[]
  tabularEquivalent: ChartTabularEquivalentV1
}

const FAMILY_RELATIONS: Readonly<Record<ChartFamily, readonly ChartRelation[]>> = {
  bar: ['comparison', 'distribution'],
  bar_grouped: ['comparison'],
  bar_stacked: ['composition', 'comparison'],
  line: ['trend'],
  pie: ['composition'],
  donut: ['composition'],
  scatter: ['correlation']
}

export interface ChartSpecViolation {
  chartId: string
  rule: string
  detail: string
}

/** Validación estructural: familia↔relación, baseline de barras, pares en dispersión, factIds. */
export const validateChartSpec = (spec: ChartSpecV1, knownFactIds: ReadonlySet<string>): ChartSpecViolation[] => {
  const violations: ChartSpecViolation[] = []
  const push = (rule: string, detail: string) => violations.push({ chartId: spec.chartId, rule, detail })

  if (!FAMILY_RELATIONS[spec.family].includes(spec.relation)) {
    push('family_relation', `${spec.family} no representa ${spec.relation}`)
  }

  if (spec.family.startsWith('bar') && spec.scale.baseline !== 0) {
    push('bar_zero_baseline', 'las barras nacen en cero')
  }

  if ((spec.family === 'pie' || spec.family === 'donut') && spec.series.length !== 1) {
    push('composition_single_total', 'pie/donut requiere UNA serie de partes de un mismo total')
  }

  if (spec.family === 'scatter') {
    const lengths = new Set(spec.series.map(series => series.factIds.length))

    if (spec.series.length !== 2 || lengths.size !== 1) {
      push('scatter_paired_observations', 'dispersión requiere dos series con observaciones pareadas')
    }
  }

  if (spec.series.length === 0) push('series_required', 'sin series')

  for (const series of spec.series) {
    for (const factId of series.factIds) {
      if (!knownFactIds.has(factId)) push('unknown_fact', `serie ${series.seriesId} referencia ${factId} fuera del snapshot`)
    }
  }

  for (const row of spec.tabularEquivalent.rows) {
    for (const cell of row) {
      if (cell !== null && !knownFactIds.has(cell)) push('unknown_fact', `tabla referencia ${cell} fuera del snapshot`)
    }
  }

  return violations
}
