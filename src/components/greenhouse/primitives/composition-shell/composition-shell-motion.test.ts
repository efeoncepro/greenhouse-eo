import { describe, expect, it } from 'vitest'

import { MOTION_DURATION_S } from '@/components/greenhouse/motion/core/tokens'

import {
  COMPOSITION_STAGGER_STEP_S,
  compositionInterruptibleLayoutTransition,
  compositionRegionReveal
} from './composition-shell-motion'

describe('compositionRegionReveal', () => {
  it('reduced-motion → estado final inmediato (never-hidden, sin transform ni delay)', () => {
    const m = compositionRegionReveal(3, false, true)

    expect(m.initial).toBe(false) // monta en estado final, contenido visible
    expect(m.animate).toEqual({ opacity: 1, y: 0 })
    expect(m.transition.duration).toBe(0)
    expect(m.transition.delay).toBeUndefined()
  })

  it('sin reduced → entrada con stagger derivado del índice (motion tokens)', () => {
    const m0 = compositionRegionReveal(0, false, false)
    const m2 = compositionRegionReveal(2, false, false)

    expect(m0.initial).toEqual({ opacity: 0, y: 8 })
    expect(m0.transition.duration).toBe(MOTION_DURATION_S.standard)
    expect(m0.transition.delay).toBe(0)
    expect(m2.transition.delay).toBe(2 * COMPOSITION_STAGGER_STEP_S)
  })

  it('condense → animate opacity target 0.92 (entra directo al estado condensado, sin doble animación)', () => {
    expect(compositionRegionReveal(0, true, false).animate.opacity).toBe(0.92)
    expect(compositionRegionReveal(0, true, true).animate.opacity).toBe(0.92)
    expect(compositionRegionReveal(0, false, false).animate.opacity).toBe(1)
  })

  it('índice negativo no produce delay negativo', () => {
    expect(compositionRegionReveal(-5, false, false).transition.delay).toBe(0)
  })
})

describe('compositionInterruptibleLayoutTransition', () => {
  it('reduced → snap (duration 0)', () => {
    expect(compositionInterruptibleLayoutTransition(true)).toEqual({ duration: 0 })
  })

  it('sin reduced → reflow de región con motion token medium', () => {
    const t = compositionInterruptibleLayoutTransition(false)

    expect(t.duration).toBe(MOTION_DURATION_S.medium)
    expect(t.ease).toBeDefined()
  })
})
