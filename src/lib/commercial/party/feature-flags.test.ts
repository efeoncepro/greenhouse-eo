import { describe, expect, it } from 'vitest'

import { isUnifiedPartySelectorEnabled } from './feature-flags'

describe('isUnifiedPartySelectorEnabled', () => {
  it('returns false when there are no feature flags', () => {
    expect(isUnifiedPartySelectorEnabled()).toBe(false)
    expect(isUnifiedPartySelectorEnabled([])).toBe(false)
  })

  it('returns true for the canonical task flag', () => {
    expect(isUnifiedPartySelectorEnabled(['GREENHOUSE_PARTY_SELECTOR_UNIFIED'])).toBe(true)
  })

  it('accepts normalized fallback codes', () => {
    expect(isUnifiedPartySelectorEnabled(['greenhouse_party_selector_unified'])).toBe(true)
    expect(isUnifiedPartySelectorEnabled(['party_selector_unified'])).toBe(true)
  })

  it('ignores unrelated flags', () => {
    expect(isUnifiedPartySelectorEnabled(['SOME_OTHER_FLAG'])).toBe(false)
  })
})
