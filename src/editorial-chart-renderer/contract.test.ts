import { describe, expect, it } from 'vitest'

import { EditorialChartError, formatEditorialValue, parseEditorialChart } from './contract'

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

describe('parseEditorialChart', () => {
  it('normalizes a valid chart with defaults', () => {
    const chart = parseEditorialChart(line)

    expect(chart.emphasis).toBe(0)
    expect(chart.format).toBe('number')
    expect(chart.series[0].values).toEqual([1200, 1650, null])
  })

  it('fails closed with a stable code per defect', () => {
    expect(codeOf(null)).toBe('chart_invalid')
    expect(codeOf({ ...line, kind: 'pie' })).toBe('chart_kind_invalid')
    expect(codeOf({ ...line, categories: ['Solo'] })).toBe('chart_categories_invalid')
    expect(codeOf({ ...line, series: [{ name: 'A', values: [1, 2] }] })).toBe('chart_series_length_mismatch')
    expect(codeOf({ ...line, series: [{ name: 'A', values: [1, '2', 3] }] })).toBe('chart_value_invalid')
    expect(codeOf({ ...line, series: Array(5).fill(line.series[1]) })).toBe('chart_series_invalid')
    expect(codeOf({ ...line, emphasis: 2 })).toBe('chart_emphasis_invalid')
    expect(codeOf({ ...line, highlight: 3 })).toBe('chart_highlight_invalid')
    expect(codeOf({ ...line, format: 'currency' })).toBe('chart_format_invalid')
  })

  it('accepts a null highlight (bar chart with every bar in the accent)', () => {
    expect(parseEditorialChart({ ...line, kind: 'bar', highlight: null }).highlight).toBeNull()
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
