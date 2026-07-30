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

    // Anclas de valor: lo único capaz de detectar que AXIS cambió un color de chart.
    expect(axisChart.categorical).toHaveLength(6)
    expect(axisChart.categorical[0]).toBe('#5145e0')
    expect(axisChart.categoricalDark[0]).toBe('#7b72f0')
    expect(Object.keys(axisChart.directional)).toEqual(['positive', 'caution', 'negative', 'neutral'])
    expect(axisChart.directional.negative).toBe('#ff4d49')
    expect(axisChart.directionalDark.negative).toBe('#ff6e6b')
  })

  /**
   * Post-inversión, `axis-chart.ts` es un re-export puro, así que comparar sus valores
   * contra el paquete compara el paquete CONSIGO MISMO: un aserto que no puede fallar.
   * Lo que sí puede fallar —y es la regresión real— es que alguien reemplace el
   * re-export por una copia local con los mismos valores: `toEqual` lo dejaría pasar.
   *
   * `toBe` compara IDENTIDAD de referencia, no valor. Una copia rompe el test aunque
   * sea idéntica hex por hex, que es exactamente lo que queremos vigilar ahora que el
   * valor tiene un solo dueño.
   */
  it('keeps the chart adapter a pure re-export, not a local copy', () => {
    expect(axisChartCategorical).toBe(axisChart.categorical)
    expect(axisChartCategoricalDark).toBe(axisChart.categoricalDark)
    expect(axisChartDirectional).toBe(axisChart.directional)
    expect(axisChartDirectionalDark).toBe(axisChart.directionalDark)
  })

  it('keeps the motion scale consistent with the shared duration contract', () => {
    expect(Object.keys(efeonceTokens.motion).sort()).toEqual(['fast', 'slow', 'standard'])
  })
})
