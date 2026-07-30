/** Greenhouse consumer gate for the AXIS-owned portable color contract. */
import { describe, expect, it } from 'vitest'

import { axisChart, axisNeutral, axisRamp, axisSemanticHex, efeonceTokens } from '@efeoncepro/axis-tokens'

import { axisChartCategorical, axisChartCategoricalDark, axisChartDirectional, axisChartDirectionalDark } from './axis-chart'

const COMPATIBILITY_ROLES: Record<string, string> = {
  action: axisRamp.primary[500], actionStrong: axisRamp.primary[800], accent: axisRamp.secondary[500],
  focus: axisRamp.primary[500], success: axisSemanticHex.success, warning: axisSemanticHex.warning, danger: axisSemanticHex.error
}

const NEUTRAL_ROLES = ['surface', 'canvas', 'text', 'textMuted', 'border'] as const

describe('Greenhouse consumes AXIS package tokens (ownership inversion)', () => {
  it('preserves the 0.1.x compatibility shape', () => {
    expect(Object.keys(efeonceTokens.color).sort()).toEqual([...Object.keys(COMPATIBILITY_ROLES), ...NEUTRAL_ROLES].sort())

    for (const [role, value] of Object.entries(COMPATIBILITY_ROLES)) {
      expect(efeonceTokens.color[role as keyof typeof efeonceTokens.color]).toBe(value)
    }
  })

  it('discovers and validates the complete portable color contract', () => {
    expect(Object.keys(axisRamp)).toEqual(['primary', 'secondary', 'info', 'success', 'warning', 'error', 'gray'])
    expect(axisNeutral.light.bodyBg).toBe('#f8f7fa')
    expect(axisNeutral.dark.bodyBg).toBe('#25293c')
    expect(axisSemanticHex.error).toBe('#dc2e39')
    expect(axisChart.categorical).toEqual([...axisChartCategorical])
    expect(axisChart.categoricalDark).toEqual([...axisChartCategoricalDark])
    expect(axisChart.directional).toEqual({ ...axisChartDirectional })
    expect(axisChart.directionalDark).toEqual({ ...axisChartDirectionalDark })
  })

  it('keeps the motion scale consistent with the shared duration contract', () => {
    expect(Object.keys(efeonceTokens.motion).sort()).toEqual(['fast', 'slow', 'standard'])
  })
})
