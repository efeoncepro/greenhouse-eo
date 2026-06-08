/**
 * GreenhouseKpiDelta direction logic (TASK-1053 Fase B Slice B2).
 * Pins the good/bad resolver: up is good unless `invert`; sub-threshold = neutral.
 */
import { describe, expect, it } from 'vitest'

import { resolveKpiDeltaDirection } from './GreenhouseKpiDelta'

describe('resolveKpiDeltaDirection', () => {
  it('up is positive, down is negative (default)', () => {
    expect(resolveKpiDeltaDirection(12.4, 0, false)).toBe('positive')
    expect(resolveKpiDeltaDirection(-5, 0, false)).toBe('negative')
  })

  it('zero is neutral', () => {
    expect(resolveKpiDeltaDirection(0, 0, false)).toBe('neutral')
  })

  it('invert flips good/bad (churn/latency: up is bad)', () => {
    expect(resolveKpiDeltaDirection(12.4, 0, true)).toBe('negative')
    expect(resolveKpiDeltaDirection(-5, 0, true)).toBe('positive')
  })

  it('sub-threshold magnitude is neutral regardless of sign', () => {
    expect(resolveKpiDeltaDirection(0.3, 0.5, false)).toBe('neutral')
    expect(resolveKpiDeltaDirection(-0.4, 0.5, false)).toBe('neutral')
    expect(resolveKpiDeltaDirection(0.6, 0.5, false)).toBe('positive')
  })
})
