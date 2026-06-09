// TASK-1041 — el adapter deriva del SoT (theme), no hardcodea tamaños.

import { describe, it, expect } from 'vitest'
import type { Theme } from '@mui/material/styles'

import { getChartTypographyFromTheme } from './chart-typography'

// Theme mínimo simulando lo que el SoT alimenta al runtime.
const makeTheme = (overrides?: {
  fontFamily?: string
  captionSize?: string
  captionWeight?: number
  subtitleSize?: string
  subtitleWeight?: number
  textSecondary?: string
  textPrimary?: string
}): Theme =>
  ({
    typography: {
      fontFamily: overrides?.fontFamily ?? 'Geist, sans-serif',
      caption: { fontSize: overrides?.captionSize ?? '0.8125rem', fontWeight: overrides?.captionWeight ?? 400 },
      subtitle1: { fontSize: overrides?.subtitleSize ?? '0.875rem', fontWeight: overrides?.subtitleWeight ?? 600 }
    },
    palette: {
      text: { secondary: overrides?.textSecondary ?? '#6b6b6b', primary: overrides?.textPrimary ?? '#111111' }
    }
  }) as unknown as Theme

describe('getChartTypographyFromTheme (TASK-1041)', () => {
  it('usa la fontFamily del theme (Geist), no una hardcodeada', () => {
    const t = getChartTypographyFromTheme(makeTheme({ fontFamily: 'CustomFont, sans' }))

    expect(t.fontFamily).toBe('CustomFont, sans')
    expect(t.axisLabel.fontFamily).toBe('CustomFont, sans')
    expect(t.title.fontFamily).toBe('CustomFont, sans')
  })

  it('deriva el fontSize del caption del SoT (rem→px), no un literal', () => {
    // caption 0.8125rem = 13px
    expect(getChartTypographyFromTheme(makeTheme()).axisLabel.fontSize).toBe(13)
    // Cambiar la escala del SoT cambia el output → es derivación, no hardcode
    expect(getChartTypographyFromTheme(makeTheme({ captionSize: '1rem' })).axisLabel.fontSize).toBe(16)
    expect(getChartTypographyFromTheme(makeTheme({ captionSize: '0.75rem' })).legend.fontSize).toBe(12)
  })

  it('el título deriva de subtitle1 del SoT (14/600)', () => {
    const t = getChartTypographyFromTheme(makeTheme())

    expect(t.title.fontSize).toBe(14)
    expect(t.title.fontWeight).toBe(600)
  })

  it('resuelve colores desde palette.text (secondary para ejes, primary para título)', () => {
    const t = getChartTypographyFromTheme(makeTheme({ textSecondary: '#aaa', textPrimary: '#000' }))

    expect(t.axisLabel.color).toBe('#aaa')
    expect(t.legend.color).toBe('#aaa')
    expect(t.title.color).toBe('#000')
  })

  it('axis/legend/tooltip/dataLabel comparten el estilo de caption del SoT', () => {
    const t = getChartTypographyFromTheme(makeTheme())

    for (const role of [t.axisLabel, t.legend, t.tooltip, t.dataLabel]) {
      expect(role.fontSize).toBe(13)
      expect(role.fontWeight).toBe(400)
    }
  })

  it('cae a px sensatos si una variante del theme falta (defensivo)', () => {
    const broken = { typography: { fontFamily: 'X' }, palette: {} } as unknown as Theme
    const t = getChartTypographyFromTheme(broken)

    expect(t.axisLabel.fontSize).toBe(13) // fallback caption
    expect(t.title.fontSize).toBe(14) // fallback subtitle
    expect(t.fontFamily).toBe('X')
  })
})
