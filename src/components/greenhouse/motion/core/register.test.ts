import { gsap } from 'gsap'
import { describe, expect, it } from 'vitest'

import { ensureMotionRegistered } from './register'
import { MOTION_EASE } from './tokens'

describe('ensureMotionRegistered', () => {
  it('registers the canonical Greenhouse eases as resolvable GSAP eases', () => {
    ensureMotionRegistered()

    for (const [token, def] of Object.entries(MOTION_EASE)) {
      if (token === 'linear') continue
      const ease = gsap.parseEase(def.gsapName)

      expect(typeof ease).toBe('function')
      // A real ease maps 0→0 and 1→1.
      expect(ease(0)).toBeCloseTo(0, 5)
      expect(ease(1)).toBeCloseTo(1, 5)
    }
  })

  it('is idempotent — calling it repeatedly does not throw', () => {
    expect(() => {
      ensureMotionRegistered()
      ensureMotionRegistered()
      ensureMotionRegistered()
    }).not.toThrow()
  })
})
