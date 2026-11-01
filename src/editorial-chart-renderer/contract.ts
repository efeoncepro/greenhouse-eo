/**
 * Data contract of the blog chart block (`efeoncepro/chart`, efeonce-editorial-blocks).
 *
 * The block stores this object in its `chart` attribute; render.php validates it again (fail-closed, mirror in
 * `EO_Chart::validate`) and embeds it as JSON next to an accessible table with the same numbers, so crawlers and
 * answer engines read the data without running JavaScript. The browser renderer only paints what this contract
 * allows: one highlighted entity (the accent of the post's line) and the rest as recessive context.
 *
 * Every kind reads the same table — categories (first column) × series (the other columns) — so authors paste it
 * from a spreadsheet; `KIND_SHAPES` says how many of each a kind takes. The kinds cover the nine charts of the
 * Marketing con Manzanitas register in AXIS (measure, ranking, before-after, trend, parts, per-hundred, venn-3,
 * matrix-2x2, funnel), adapted to the web, plus grouped columns.
 */

export const EDITORIAL_CHART_KINDS = [
  'line',
  'column',
  'bar',
  'pie',
  'funnel',
  'before-after',
  'measure',
  'per-hundred',
  'matrix',
  'venn'
] as const

export type EditorialChartKind = (typeof EDITORIAL_CHART_KINDS)[number]

export const EDITORIAL_CHART_FORMATS = ['number', 'percent', 'compact'] as const
export type EditorialChartFormat = (typeof EDITORIAL_CHART_FORMATS)[number]

export const EDITORIAL_CHART_LIMITS = { label: 60, centerLabel: 40, unit: 16 } as const

type KindShape = {
  categories: readonly [number, number]
  series: readonly [number, number]
  /** Every value must be present (no gaps). */
  complete?: boolean
  /** Values must be ≥ 0. */
  nonNegative?: boolean
  /** Inclusive value range. */
  range?: readonly [number, number]
}

/** How much of the table each kind takes. Mirror: EO_Chart::SHAPES. */
export const KIND_SHAPES: Record<EditorialChartKind, KindShape> = {
  line: { categories: [2, 36], series: [1, 4] },
  column: { categories: [2, 24], series: [1, 4] },
  bar: { categories: [2, 16], series: [1, 1] },
  pie: { categories: [2, 8], series: [1, 1], complete: true, nonNegative: true },
  funnel: { categories: [2, 8], series: [1, 1], complete: true, nonNegative: true },
  'before-after': { categories: [1, 12], series: [2, 2], complete: true },
  measure: { categories: [1, 1], series: [1, 1], complete: true, range: [0, 100] },
  'per-hundred': { categories: [1, 1], series: [1, 1], complete: true, range: [0, 100] },
  matrix: { categories: [2, 12], series: [2, 2], complete: true, range: [0, 10] },
  venn: { categories: [3, 3], series: [0, 0] }
}

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
  /**
   * Index of the highlighted category: the sphere of a line, the accent bar/column/slice/stage/point, the accent row of
   * before-after. Default: last point (line); none (bar, column: every mark in the accent); the largest slice (pie).
   */
  highlight?: number | null
  format?: EditorialChartFormat
  /** Suffix printed after values, e.g. " clics". `percent` already prints %. */
  unit?: string
  /** Columns only: stack the series instead of grouping them. */
  stacked?: boolean
  /** Venn: the label of the center (where the three meet). */
  centerLabel?: string
}

export class EditorialChartError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

const isLabel = (value: unknown, max: number = EDITORIAL_CHART_LIMITS.label): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max

const inRange = (n: number, [min, max]: readonly [number, number]) => n >= min && n <= max

/** Validate an unknown value and return a normalized chart, or throw `EditorialChartError` with a stable code. */
export const parseEditorialChart = (input: unknown): EditorialChart => {
  if (!input || typeof input !== 'object') throw new EditorialChartError('chart_invalid')

  const raw = input as Record<string, unknown>
  const kind = raw.kind as EditorialChartKind

  if (!EDITORIAL_CHART_KINDS.includes(kind)) throw new EditorialChartError('chart_kind_invalid')

  const shape = KIND_SHAPES[kind]
  const categories = raw.categories

  if (!Array.isArray(categories) || !inRange(categories.length, shape.categories)) {
    throw new EditorialChartError('chart_categories_invalid')
  }

  if (!categories.every(c => isLabel(c))) throw new EditorialChartError('chart_category_label_invalid')

  const series = raw.series === undefined && shape.series[1] === 0 ? [] : raw.series

  if (!Array.isArray(series) || !inRange(series.length, shape.series)) {
    throw new EditorialChartError('chart_series_invalid')
  }

  const normalizedSeries = series.map(item => {
    const s = (item ?? {}) as Record<string, unknown>

    if (!isLabel(s.name)) throw new EditorialChartError('chart_series_name_invalid')

    if (!Array.isArray(s.values) || s.values.length !== categories.length) {
      throw new EditorialChartError('chart_series_length_mismatch')
    }

    const values = s.values.map(v => {
      if (v === null) {
        if (shape.complete) throw new EditorialChartError('chart_value_missing')

        return null
      }

      if (typeof v !== 'number' || !Number.isFinite(v)) throw new EditorialChartError('chart_value_invalid')
      if (shape.nonNegative && v < 0) throw new EditorialChartError('chart_value_negative')
      if (shape.range && !inRange(v, shape.range)) throw new EditorialChartError('chart_value_out_of_range')

      return v
    })

    return { name: s.name.trim(), values }
  })

  if (kind === 'pie' && normalizedSeries[0].values.every(v => v === 0)) throw new EditorialChartError('chart_value_missing')

  const emphasis = raw.emphasis === undefined ? 0 : raw.emphasis

  if (
    typeof emphasis !== 'number' ||
    !Number.isInteger(emphasis) ||
    emphasis < 0 ||
    (normalizedSeries.length > 0 && emphasis >= normalizedSeries.length) ||
    (normalizedSeries.length === 0 && emphasis !== 0)
  ) {
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

  const unit = raw.unit === undefined || raw.unit === '' ? undefined : raw.unit

  if (unit !== undefined && (typeof unit !== 'string' || unit.length > EDITORIAL_CHART_LIMITS.unit)) {
    throw new EditorialChartError('chart_unit_invalid')
  }

  if (raw.stacked !== undefined && typeof raw.stacked !== 'boolean') throw new EditorialChartError('chart_stacked_invalid')

  const centerLabel = raw.centerLabel === undefined || raw.centerLabel === '' ? undefined : raw.centerLabel

  if (centerLabel !== undefined && !isLabel(centerLabel, EDITORIAL_CHART_LIMITS.centerLabel)) {
    throw new EditorialChartError('chart_center_label_invalid')
  }

  const chart: EditorialChart = {
    kind,
    categories: categories.map(c => c.trim()),
    series: normalizedSeries,
    emphasis,
    highlight: highlight as number | null | undefined,
    format: format as EditorialChartFormat
  }

  if (unit !== undefined) chart.unit = unit
  if (kind === 'column' && raw.stacked === true) chart.stacked = true
  if (kind === 'venn' && centerLabel !== undefined) chart.centerLabel = (centerLabel as string).trim()

  return chart
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

/** Share of each value in the total, as a percent (pie labels, table). */
export const shareOf = (values: Array<number | null>): number[] => {
  const total = values.reduce<number>((sum, v) => sum + (v ?? 0), 0)

  return values.map(v => (total > 0 ? ((v ?? 0) / total) * 100 : 0))
}
