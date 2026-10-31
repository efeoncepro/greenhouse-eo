import { describe, expect, it } from 'vitest'

import { EDITORIAL_CHART_KINDS, EditorialChartError, formatEditorialValue, KIND_SHAPES, parseEditorialChart, shareOf } from './contract'

const line = {
  kind: 'line',
  categories: ['May', 'Jun', 'Jul'],
  series: [
    { name: 'Con AEO', values: [1200, 1650, null] },
    { name: 'Sin AEO', values: [1180, 1240, 1210] }
  ],
  unit: ' clics'
}

const codeOf = (input: unknown) => {
  try {
    parseEditorialChart(input)

    return null
  } catch (error) {
    return error instanceof EditorialChartError ? error.code : 'unexpected'
  }
}

/** One valid chart per kind: the examples an author would paste. */
const VALID: Record<string, unknown> = {
  line,
  column: { kind: 'column', categories: ['T1', 'T2'], series: [{ name: '2025', values: [1, 2] }, { name: '2026', values: [2, 3] }], stacked: true },
  bar: { kind: 'bar', categories: ['A', 'B'], series: [{ name: 'Menciones', values: [34, 27] }], highlight: 1 },
  pie: { kind: 'pie', categories: ['Orgánico', 'Directo'], series: [{ name: 'Visitas', values: [48, 22] }] },
  funnel: { kind: 'funnel', categories: ['Visitas', 'Leads'], series: [{ name: 'Personas', values: [12000, 840] }] },
  'before-after': { kind: 'before-after', categories: ['Clics'], series: [{ name: 'Antes', values: [1200] }, { name: 'Después', values: [4350] }] },
  measure: { kind: 'measure', categories: ['te nombran'], series: [{ name: 'Porcentaje', values: [27] }] },
  'per-hundred': { kind: 'per-hundred', categories: ['sin clic'], series: [{ name: 'Valor', values: [65] }] },
  matrix: { kind: 'matrix', categories: ['FAQ', 'Rediseño'], series: [{ name: 'Esfuerzo', values: [3, 8] }, { name: 'Impacto', values: [6, 7] }] },
  venn: { kind: 'venn', categories: ['SEO', 'Contenido', 'Datos'], series: [], centerLabel: 'AEO' }
}

describe('parseEditorialChart', () => {
  it('accepts one valid chart of every kind', () => {
    expect(Object.keys(VALID).sort()).toEqual([...EDITORIAL_CHART_KINDS].sort())

    for (const kind of EDITORIAL_CHART_KINDS) expect(codeOf(VALID[kind]), kind).toBeNull()
  })

  it('normalizes defaults and keeps per-kind options only where they apply', () => {
    const chart = parseEditorialChart(line)

    expect(chart.emphasis).toBe(0)
    expect(chart.format).toBe('number')
    expect(chart.series[0].values).toEqual([1200, 1650, null])
    expect(parseEditorialChart(VALID.column).stacked).toBe(true)
    expect(parseEditorialChart({ ...line, stacked: true }).stacked).toBeUndefined()
    expect(parseEditorialChart(VALID.venn).centerLabel).toBe('AEO')
  })

  it('fails closed with a stable code per defect', () => {
    expect(codeOf(null)).toBe('chart_invalid')
    expect(codeOf({ ...line, kind: 'radar' })).toBe('chart_kind_invalid')
    expect(codeOf({ ...line, categories: ['Solo'] })).toBe('chart_categories_invalid')
    expect(codeOf({ ...line, series: [{ name: 'A', values: [1, 2] }] })).toBe('chart_series_length_mismatch')
    expect(codeOf({ ...line, series: [{ name: 'A', values: [1, '2', 3] }] })).toBe('chart_value_invalid')
    expect(codeOf({ ...line, series: Array(5).fill(line.series[1]) })).toBe('chart_series_invalid')
    expect(codeOf({ ...line, emphasis: 2 })).toBe('chart_emphasis_invalid')
    expect(codeOf({ ...line, highlight: 3 })).toBe('chart_highlight_invalid')
    expect(codeOf({ ...line, format: 'currency' })).toBe('chart_format_invalid')
  })

  it('enforces the shape and the value rules of each kind', () => {
    expect(codeOf({ ...(VALID.pie as object), series: [{ name: 'V', values: [48, null] }] })).toBe('chart_value_missing')
    expect(codeOf({ ...(VALID.pie as object), series: [{ name: 'V', values: [0, 0] }] })).toBe('chart_value_missing')
    expect(codeOf({ ...(VALID.funnel as object), series: [{ name: 'P', values: [10, -1] }] })).toBe('chart_value_negative')
    expect(codeOf({ ...(VALID.measure as object), series: [{ name: 'P', values: [120] }] })).toBe('chart_value_out_of_range')
    expect(codeOf({ ...(VALID.matrix as object), series: [{ name: 'E', values: [3, 11] }, { name: 'I', values: [6, 7] }] })).toBe(
      'chart_value_out_of_range'
    )
    expect(codeOf({ ...(VALID['before-after'] as object), series: [{ name: 'Antes', values: [1] }] })).toBe('chart_series_invalid')
    expect(codeOf({ ...(VALID.venn as object), categories: ['SEO', 'Contenido'] })).toBe('chart_categories_invalid')
    expect(codeOf({ ...(VALID.bar as object), series: [{ name: 'A', values: [1, 2] }, { name: 'B', values: [1, 2] }] })).toBe(
      'chart_series_invalid'
    )
  })

  it('declares a shape for every kind', () => {
    expect(Object.keys(KIND_SHAPES).sort()).toEqual([...EDITORIAL_CHART_KINDS].sort())
  })

  it('accepts a null highlight (bar chart with every bar in the accent)', () => {
    expect(parseEditorialChart({ ...(VALID.bar as object), highlight: null }).highlight).toBeNull()
  })
})

describe('formatEditorialValue', () => {
  it('prints es-CL numbers with the unit', () => {
    expect(formatEditorialValue(5120.5, 'number', ' clics')).toBe('5.120,5 clics')
    expect(formatEditorialValue(27, 'percent')).toBe('27 %')
    expect(formatEditorialValue(null)).toBe('—')
  })

  it('spells out compact numbers instead of «K»', () => {
    expect(formatEditorialValue(5000, 'compact')).toBe('5 mil')
    expect(formatEditorialValue(1_250_000, 'compact')).toBe('1,3 M')
    expect(formatEditorialValue(800, 'compact')).toBe('800')
  })
})

describe('shareOf', () => {
  it('returns each part as a percent of the total', () => {
    expect(shareOf([48, 22, 30])).toEqual([48, 22, 30])
    expect(shareOf([1, 3])).toEqual([25, 75])
    expect(shareOf([0, 0])).toEqual([0, 0])
  })
})
