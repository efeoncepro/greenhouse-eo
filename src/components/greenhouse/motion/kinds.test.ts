import { describe, expect, it } from 'vitest'

import { DEFAULT_MOTION_VARIANT, MOTION_KIND_TO_VARIANT, resolveVariant } from './kinds'

describe('resolveVariant', () => {
  it('prefers an explicit variant over kind', () => {
    expect(resolveVariant({ variant: 'stagger', kind: 'sectionReveal' })).toBe('stagger')
  })

  it('resolves a kind to its official variant', () => {
    expect(resolveVariant({ kind: 'listMount' })).toBe('stagger')
    expect(resolveVariant({ kind: 'sectionReveal' })).toBe('scrollReveal')
    expect(resolveVariant({ kind: 'heroIntro' })).toBe('timeline')
    expect(resolveVariant({ kind: 'panelEnter' })).toBe('entrance')
  })

  it('falls back to the safe default when neither is given', () => {
    expect(resolveVariant({})).toBe(DEFAULT_MOTION_VARIANT)
    expect(DEFAULT_MOTION_VARIANT).toBe('entrance')
  })

  it('maps every kind to a known variant', () => {
    for (const variant of Object.values(MOTION_KIND_TO_VARIANT)) {
      expect(['entrance', 'stagger', 'scrollReveal', 'timeline']).toContain(variant)
    }
  })
})
