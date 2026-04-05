// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import AnimatedCounter from './AnimatedCounter'

const originalMatchMedia = window.matchMedia
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = '0px'
  readonly thresholds = [0]

  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve() {}
}

window.IntersectionObserver = MockIntersectionObserver

const mockReducedMotion = (matches: boolean) => {
  window.matchMedia = (query: string) =>
    ({
      matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    }) as MediaQueryList
}

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

describe('AnimatedCounter', () => {
  it('renders the final integer value immediately when reduced motion is preferred', () => {
    mockReducedMotion(true)

    const { getByText } = renderWithTheme(<AnimatedCounter value={42} format='integer' />)

    expect(getByText('42')).toBeInTheDocument()
  })

  it('renders the final currency value immediately when reduced motion is preferred', () => {
    mockReducedMotion(true)

    const { getByText } = renderWithTheme(<AnimatedCounter value={1250000} format='currency' />)

    expect(getByText('$1.250.000')).toBeInTheDocument()
  })

  it('renders the final percentage value immediately when reduced motion is preferred', () => {
    mockReducedMotion(true)

    const { getByText } = renderWithTheme(<AnimatedCounter value={94.5} format='percentage' />)

    expect(getByText('94.5%')).toBeInTheDocument()
  })
})
