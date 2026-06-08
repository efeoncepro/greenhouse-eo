/**
 * Greenhouse semantic feedback drift-guard (TASK-1053 Fase B).
 *
 * Pins the curated sub-value HEXES (the SoT) + asserts the factory composes the
 * mode-resolved tonal triple correctly. Counterpart of
 * `axis-semantic-contrast.test.ts` (which pins their READABILITY). If a future
 * edit changes a sub-value, this breaks CI — forcing the 3-layer parity update
 * (SoT + DESIGN.md §Color + V1 §8) in the same PR, same rule as color/typography.
 */
import { describe, expect, it } from 'vitest'

import { axisSemanticPalette, axisSemanticSubValues } from '@core/theme/axis-semantic'

import { greenhouseSemanticTokens } from './greenhouse-semantic-tokens'

const ROLES = ['success', 'warning', 'error', 'info'] as const

// The approved Restraint v1 sub-values (curated, AA-verified). Changing any value
// here is intentional and MUST move DESIGN.md §Color + V1 §8 in the same PR.
const EXPECTED_SUBVALUES = {
  success: { ink: '#11703f', tint: '#e7f6ee', border: '#bce6cf', darkFg: '#5fc891' },
  warning: { ink: '#8a5a00', tint: '#fff4d6', border: '#f5d98a', darkFg: '#e8b84b' },
  error: { ink: '#c01d27', tint: '#fdecec', border: '#f5c2c4', darkFg: '#f08a8f' },
  info: { ink: '#155cad', tint: '#e8f1fd', border: '#c2dbf7', darkFg: '#6fb0f0' }
} as const

describe('greenhouse semantic sub-values SoT (TASK-1053 Fase B)', () => {
  it.each(ROLES)('%s sub-values match the approved Restraint v1 hexes', role => {
    expect(axisSemanticSubValues[role]).toEqual(EXPECTED_SUBVALUES[role])
  })
})

describe('greenhouseSemanticTokens factory composition', () => {
  it.each(ROLES)('%s light: fill/onFill = palette main/contrastText', role => {
    const token = greenhouseSemanticTokens('light')[role]

    expect(token.fill).toBe(axisSemanticPalette[role].main)
    expect(token.onFill).toBe(axisSemanticPalette[role].contrastText)
  })

  it.each(ROLES)('%s light: tonal triple = tint / ink / border', role => {
    const token = greenhouseSemanticTokens('light')[role]
    const sub = EXPECTED_SUBVALUES[role]

    expect(token.tonalSurface).toBe(sub.tint)
    expect(token.tonalText).toBe(sub.ink)
    expect(token.tonalBorder).toBe(sub.border)
  })

  it.each(ROLES)('%s dark: tonal text = darkFg; surface/border = color-mix of darkFg', role => {
    const token = greenhouseSemanticTokens('dark')[role]
    const sub = EXPECTED_SUBVALUES[role]

    expect(token.tonalText).toBe(sub.darkFg)
    expect(token.tonalSurface).toBe(`color-mix(in oklch, ${sub.darkFg} 16%, var(--mui-palette-background-paper))`)
    expect(token.tonalBorder).toBe(`color-mix(in oklch, ${sub.darkFg} 36%, transparent)`)
  })

  it('exposes exactly the four feedback roles', () => {
    expect(Object.keys(greenhouseSemanticTokens('light')).sort()).toEqual(['error', 'info', 'success', 'warning'])
  })
})
