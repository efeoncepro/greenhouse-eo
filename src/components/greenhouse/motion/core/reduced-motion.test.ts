// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MOTION_MEDIA_CONDITIONS, prefersReducedMotion } from './reduced-motion'

const originalMatchMedia = window.matchMedia

const setMatchMedia = (reduced: boolean) => {
  // jsdom does not implement matchMedia, so assign rather than spy.
  window.matchMedia = ((query: string) =>
    ({
      matches: reduced && query === MOTION_MEDIA_CONDITIONS.reduced,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }) as unknown as MediaQueryList) as typeof window.matchMedia
}

describe('reduced-motion contract', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('exposes the canonical matchMedia conditions', () => {
    expect(MOTION_MEDIA_CONDITIONS.reduced).toBe('(prefers-reduced-motion: reduce)')
    expect(MOTION_MEDIA_CONDITIONS.ok).toBe('(prefers-reduced-motion: no-preference)')
  })

  it('returns true when the user prefers reduced motion', () => {
    setMatchMedia(true)
    expect(prefersReducedMotion()).toBe(true)
  })

  it('returns false when no preference is set', () => {
    setMatchMedia(false)
    expect(prefersReducedMotion()).toBe(false)
  })
})
