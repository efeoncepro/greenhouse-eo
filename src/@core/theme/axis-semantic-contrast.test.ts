/**
 * Semantic contrast gate (TASK-1053 Fase A1a).
 *
 * The color layer becomes mechanically guarded (like typography/elevation): this
 * test fails CI the moment a semantic role's solid fill + its text color drops
 * below WCAG 2.2 AA. It is the contrast counterpart of `axis-semantic-drift.test.ts`
 * (which pins the hex VALUES); this one pins their READABILITY.
 *
 * Scope A1a = the values shipped now: `main` (fill) + `contrastText` (onFill) per
 * role, mode-agnostic (axisRamp is constant across light/darkSemi; contrastText is
 * fixed). Fase B1 will extend this with ink/tint/border/dark-fg once those sub-values
 * land (see TASK-1053 §"Scope vs secuencia").
 */
import { describe, expect, it } from 'vitest'

import { axisSemanticPalette } from './axis-semantic'
import { AA_NORMAL_TEXT, contrastRatio } from './contrast'

const ROLES = ['success', 'warning', 'error', 'info'] as const

describe('AXIS semantic contrast gate (WCAG 2.2 AA — TASK-1053 A1a)', () => {
  it.each(ROLES)('%s: contrastText is AA (>=4.5:1) on its solid main fill', role => {
    const { main, contrastText } = axisSemanticPalette[role]
    const ratio = contrastRatio(main, contrastText)

    expect(
      ratio,
      `${role}: contrast(main ${main}, contrastText ${contrastText}) = ${ratio.toFixed(2)}:1 < ${AA_NORMAL_TEXT}`
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })

  it('warning uses dark ink (never white) — white-on-amber would fail AA', () => {
    const { main, contrastText } = axisSemanticPalette.warning

    expect(contrastText.toLowerCase()).not.toBe('#ffffff')
    expect(contrastRatio(main, '#ffffff')).toBeLessThan(AA_NORMAL_TEXT)
  })
})

describe('contrast helper sanity', () => {
  it('black/white is the max 21:1', () => {
    expect(Math.round(contrastRatio('#000000', '#ffffff'))).toBe(21)
  })
  it('identical colors are 1:1', () => {
    expect(contrastRatio('#157f47', '#157f47')).toBeCloseTo(1, 5)
  })
})
