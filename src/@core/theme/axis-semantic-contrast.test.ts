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

import { resolveSecondaryPalette } from './axis-secondary'
import { axisSemanticPalette, axisSemanticSubValues } from './axis-semantic'
import { AA_NORMAL_TEXT, contrastRatio } from './contrast'

const ROLES = ['success', 'warning', 'error', 'info'] as const

/** AXIS dark surface (charcoal `darkSemi` paper) — the bg `darkFg` text sits on. */
const DARK_SURFACE = '#25293c'
/** Non-text UI contrast floor (WCAG 1.4.11) — borders/hairlines target this, not 4.5. */
const AA_NON_TEXT = 3

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

describe('AXIS semantic sub-values contrast gate (WCAG 2.2 AA — TASK-1053 Fase B)', () => {
  // The tonal-by-default treatment: `ink` is TEXT on white AND on the role's own
  // `tint` → both must clear AA (4.5:1). `darkFg` is TEXT on the dark charcoal
  // surface → AA there. These break CI if a future tweak makes a tonal chip/alert
  // unreadable (the exact bug this Fase fixes: warning.main amber as text failed).
  it.each(ROLES)('%s: ink is AA (>=4.5:1) on white', role => {
    const { ink } = axisSemanticSubValues[role]
    const ratio = contrastRatio(ink, '#ffffff')

    expect(ratio, `${role}: ink ${ink} on white = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })

  it.each(ROLES)('%s: ink is AA (>=4.5:1) on its own tint surface', role => {
    const { ink, tint } = axisSemanticSubValues[role]
    const ratio = contrastRatio(ink, tint)

    expect(ratio, `${role}: ink ${ink} on tint ${tint} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT
    )
  })

  it.each(ROLES)('%s: darkFg is AA (>=4.5:1) on the dark charcoal surface', role => {
    const { darkFg } = axisSemanticSubValues[role]
    const ratio = contrastRatio(darkFg, DARK_SURFACE)

    expect(ratio, `${role}: darkFg ${darkFg} on ${DARK_SURFACE} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT
    )
  })

  it.each(ROLES)('%s: ink also clears the non-text floor on white (sanity)', role => {
    // ink doubles as an icon/border-strong color in some tonal compositions.
    const { ink } = axisSemanticSubValues[role]

    expect(contrastRatio(ink, '#ffffff')).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })
})

describe('AXIS secondary brand contrast gate (TASK-1053 A1b)', () => {
  // secondary.main drives tonal/outlined TEXT (~241 usages, 0 contained) → it is the
  // text/border color and must clear AA on white. The crisp green main (#4b8405) is
  // barely AA (4.56:1); this guard breaks CI if a future ramp tweak drops it below.
  it('secondary.main is AA (>=4.5:1) with its contrastText (white)', () => {
    const { main, contrastText } = resolveSecondaryPalette()
    const ratio = contrastRatio(main, contrastText)

    expect(
      ratio,
      `secondary: contrast(main ${main}, contrastText ${contrastText}) = ${ratio.toFixed(2)}:1 < ${AA_NORMAL_TEXT}`
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
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
