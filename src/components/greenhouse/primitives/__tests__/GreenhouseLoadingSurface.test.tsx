// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseLoadingSurface from '../GreenhouseLoadingSurface'
import type { GreenhouseLoadingSurfaceVariant } from '../GreenhouseLoadingSurface'

const variants: GreenhouseLoadingSurfaceVariant[] = [
  'pageSkeleton',
  'panelSkeleton',
  'tableSkeleton',
  'inlineAction',
  'brandSplash',
  'aiThinking',
  'progressRail'
]

const customSteps = [
  { label: 'Context resolved', status: 'done' as const },
  { label: 'Evidence running', status: 'active' as const },
  { label: 'Result pending', status: 'pending' as const }
]

afterEach(cleanup)

describe('GreenhouseLoadingSurface', () => {
  it.each(variants)('renders %s as an accessible loading status', variant => {
    const { getByRole } = renderWithTheme(
      <GreenhouseLoadingSurface
        variant={variant}
        title={`Loading ${variant}`}
        description='Preparing the surface.'
        dataCapture={`test-${variant}`}
      />
    )

    const status = getByRole('status')

    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-label', `Loading ${variant}. Preparing the surface.`)
    expect(status).toHaveAttribute('data-capture', `test-${variant}`)
  })

  it('renders progress rail custom steps', () => {
    const { getByText } = renderWithTheme(
      <GreenhouseLoadingSurface
        variant='progressRail'
        title='Running checks'
        description='Moving through checkpoints.'
        steps={customSteps}
      />
    )

    expect(getByText('Context resolved')).toBeInTheDocument()
    expect(getByText('Evidence running')).toBeInTheDocument()
    expect(getByText('Result pending')).toBeInTheDocument()
  })

  it('renders when reduced motion is preferred', () => {
    const originalMatchMedia = window.matchMedia

    window.matchMedia = (query: string) =>
      ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      }) as MediaQueryList

    const { getByRole } = renderWithTheme(
      <GreenhouseLoadingSurface
        variant='aiThinking'
        title='Nexa reasoning'
        description='Checking context.'
      />
    )

    expect(getByRole('status')).toBeInTheDocument()
    window.matchMedia = originalMatchMedia
  })
})
