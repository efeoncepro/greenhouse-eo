/**
 * Data contract of the blog chart block (`efeoncepro/chart`, efeonce-editorial-blocks).
 *
 * The block stores this object in its `chart` attribute; render.php validates it again (fail-closed) and embeds it as
 * JSON next to an accessible table with the same numbers, so crawlers and answer engines read the data without running
 * JavaScript. The browser renderer only paints what this contract allows: one or a few series, one highlighted entity
 * (the accent of the post's line) and the rest as recessive context.
 */

export const EDITORIAL_CHART_KINDS = ['line', 'bar'] as const
export type EditorialChartKind = (typeof EDITORIAL_CHART_KINDS)[number]

export const EDITORIAL_CHART_FORMATS = ['number', 'percent', 'compact'] as const
export type EditorialChartFormat = (typeof EDITORIAL_CHART_FORMATS)[number]

export const EDITORIAL_CHART_LIMITS = { series: 4, categories: 36, label: 60 } as const

export type EditorialChartSeries = {
  name: string
  values: Array<number | null>
}

export type EditorialChart = {
  kind: EditorialChartKind
  categories: string[]
  series: EditorialChartSeries[]
  /** Index of the series that carries the accent; the others are context. Default 0. */
  emphasis?: number
  /** Index of the category marked with the sphere (line) or the accent bar (bar). Default: last (line), none (bar). */
  highlight?: number | null
  format?: EditorialChartFormat
  /** Suffix printed after values, e.g. " clics". `percent` already prints %. */
  unit?: string
}

export class EditorialChartError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

const isLabel = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= EDITORIAL_CHART_LIMITS.label

/** Validate an unknown value and return a normalized chart, or throw `EditorialChartError` with a stable code. */
export const parseEditorialChart = (input: unknown): EditorialChart => {
  if (!input || typeof input !== 'object') throw new EditorialChartError('chart_invalid')

  const raw = input as Record<string, unknown>
  const kind = raw.kind

  if (!EDITORIAL_CHART_KINDS.includes(kind as EditorialChartKind)) throw new EditorialChartError('chart_kind_invalid')

  const categories = raw.categories

  if (!Array.isArray(categories) || categories.length < 2 || categories.length > EDITORIAL_CHART_LIMITS.categories) {
    throw new EditorialChartError('chart_categories_invalid')
  }

  if (!categories.every(isLabel)) throw new EditorialChartError('chart_category_label_invalid')

  const series = raw.series

  if (!Array.isArray(series) || series.length < 1 || series.length > EDITORIAL_CHART_LIMITS.series) {
    throw new EditorialChartError('chart_series_invalid')
  }

  const normalizedSeries = series.map(item => {
    const s = (item ?? {}) as Record<string, unknown>

    if (!isLabel(s.name)) throw new EditorialChartError('chart_series_name_invalid')

    if (!Array.isArray(s.values) || s.values.length !== categories.length) {
      throw new EditorialChartError('chart_series_length_mismatch')
    }

    const values = s.values.map(v => {
      if (v === null) return null
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new EditorialChartError('chart_value_invalid')

      return v
    })

    return { name: s.name.trim(), values }
  })

  const emphasis = raw.emphasis === undefined ? 0 : raw.emphasis

  if (typeof emphasis !== 'number' || !Number.isInteger(emphasis) || emphasis < 0 || emphasis >= normalizedSeries.length) {
    throw new EditorialChartError('chart_emphasis_invalid')
  }

  const highlight = raw.highlight === undefined ? undefined : raw.highlight

  if (
    highlight !== undefined &&
    highlight !== null &&
    (typeof highlight !== 'number' || !Number.isInteger(highlight) || highlight < 0 || highlight >= categories.length)
  ) {
    throw new EditorialChartError('chart_highlight_invalid')
  }

  const format = raw.format === undefined ? 'number' : raw.format

  if (!EDITORIAL_CHART_FORMATS.includes(format as EditorialChartFormat)) throw new EditorialChartError('chart_format_invalid')

  const unit = raw.unit === undefined ? undefined : raw.unit

  if (unit !== undefined && (typeof unit !== 'string' || unit.length > 16)) throw new EditorialChartError('chart_unit_invalid')

  return {
    kind: kind as EditorialChartKind,
    categories: categories.map(c => c.trim()),
    series: normalizedSeries,
    emphasis,
    highlight: highlight as number | null | undefined,
    format: format as EditorialChartFormat,
    unit
  }
}

/** Format a value the same way the tooltip, the labels and the table do (es-CL). */
export const formatEditorialValue = (value: number | null, format: EditorialChartFormat = 'number', unit = ''): string => {
  if (value === null) return '—'

  if (format === 'percent') {
    return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value)} %`
  }

  if (format === 'compact') {
    // Spelled out instead of Intl's compact notation, which prints «5 K» in some browsers; same as EO_Chart::format_value.
    const abs = Math.abs(value)
    const one = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

    if (abs >= 1_000_000) return `${one.format(value / 1_000_000)} M${unit}`
    if (abs >= 1_000) return `${one.format(value / 1_000)} mil${unit}`

    return `${one.format(value)}${unit}`
  }

  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value)}${unit}`
}
