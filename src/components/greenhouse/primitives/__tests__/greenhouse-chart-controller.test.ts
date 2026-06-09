import { describe, expect, it } from 'vitest'

import { GREENHOUSE_CHART_CHROME_TOKENS } from '../greenhouse-chart-controller'

describe('greenhouse-chart-controller', () => {
  it('centralizes reusable chart card chrome tokens', () => {
    expect(GREENHOUSE_CHART_CHROME_TOKENS.card).toEqual({
      compactMaxInlineSize: 554,
      wideMaxInlineSize: 746
    })
    expect(GREENHOUSE_CHART_CHROME_TOKENS.icon).toMatchObject({
      container: 38,
      metric: 22,
      segment: 24,
      tab: 22
    })
    expect(GREENHOUSE_CHART_CHROME_TOKENS.chart.barRadius).toBe(6)
    expect(GREENHOUSE_CHART_CHROME_TOKENS.opacity.border).toBe(0.72)
  })
})
