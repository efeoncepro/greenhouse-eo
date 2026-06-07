import { describe, expect, it } from 'vitest'

import {
  MOTION_DURATION_MS,
  MOTION_DURATION_S,
  MOTION_EASE,
  cssCubicBezier,
  motionCss,
  motionGsap,
  type MotionDurationToken
} from './tokens'

/**
 * Drift-guard for the motion token SoT. Mirrors `typography-drift.test.ts`: the
 * canonical scale is pinned here so a silent change to the values fails CI. When
 * the design-system governance approves a scale change, update BOTH this test
 * and DESIGN.md §Motion + V1 §Motion in the same PR.
 */

const CANONICAL_DURATION_MS: Record<MotionDurationToken, number> = {
  instant: 75,
  short: 150,
  standard: 200,
  medium: 300,
  long: 400,
  extended: 600
}

describe('motion tokens — duration scale (drift-guard)', () => {
  it('matches the canonical fixed scale {75,150,200,300,400,600}', () => {
    expect(MOTION_DURATION_MS).toEqual(CANONICAL_DURATION_MS)
  })

  it('derives seconds as ms / 1000 (no parallel literal to drift)', () => {
    for (const token of Object.keys(MOTION_DURATION_MS) as MotionDurationToken[]) {
      expect(MOTION_DURATION_S[token]).toBeCloseTo(MOTION_DURATION_MS[token] / 1000, 6)
    }
  })

  it('derives CSS duration strings as `${ms}ms`', () => {
    for (const token of Object.keys(MOTION_DURATION_MS) as MotionDurationToken[]) {
      expect(motionCss.duration[token]).toBe(`${MOTION_DURATION_MS[token]}ms`)
    }
  })
})

describe('motion tokens — easing', () => {
  it('pins the emphasized curve to cubic-bezier(0.2, 0, 0, 1)', () => {
    expect(MOTION_EASE.emphasized.cubicBezier).toEqual([0.2, 0, 0, 1])
    expect(motionCss.ease.emphasized).toBe('cubic-bezier(0.2, 0, 0, 1)')
  })

  it('renders cubic-bezier strings from control points', () => {
    expect(cssCubicBezier([0.4, 0, 0.2, 1])).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
  })

  it('gives every non-linear ease a `gh-` prefixed GSAP CustomEase id', () => {
    for (const [token, def] of Object.entries(MOTION_EASE)) {
      if (token === 'linear') {
        expect(def.gsapName).toBe('none')
        expect(def.cubicBezier).toBeNull()
      } else {
        expect(def.gsapName.startsWith('gh-')).toBe(true)
        expect(def.cubicBezier).not.toBeNull()
      }
    }
  })

  it('maps GSAP ease names 1:1 with MOTION_EASE definitions', () => {
    expect(motionGsap.ease.emphasized).toBe('gh-emphasized')
    expect(motionGsap.ease.standard).toBe('gh-standard')
    expect(motionGsap.ease.emphasizedAccelerate).toBe('gh-emphasized-accelerate')
    expect(motionGsap.ease.linear).toBe('none')
  })
})
