// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { createTheme } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import { axisTokens } from '@core/theme/axis-tokens'

import GreenhouseGradientBackground from '../gradient-background/GreenhouseGradientBackground'
import {
  buildGreenhouseGradientBackgroundCss,
  buildGreenhouseGradientBackgroundConfig,
  resolveGreenhouseGradientBackgroundKind,
  resolveGreenhouseGradientBackgroundVariant
} from '../gradient-background/greenhouse-gradient-background-controller'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('GreenhouseGradientBackground', () => {
  it('resolves semantic kinds to official variants', () => {
    expect(resolveGreenhouseGradientBackgroundKind('nexaAurora').variant).toBe('heroAurora')
    expect(resolveGreenhouseGradientBackgroundKind('efeonceBrand').variant).toBe('brandField')
    expect(resolveGreenhouseGradientBackgroundVariant('surfaceWash', 'nexaAurora')).toBe('surfaceWash')
  })

  it('builds a layered CSS gradient from theme tokens', () => {
    const theme = createTheme({ axis: axisTokens })
    const config = buildGreenhouseGradientBackgroundConfig({ theme, kind: 'axisSurface', intensity: 'medium' })

    expect(config.accentLayers).toHaveLength(3)
    expect(buildGreenhouseGradientBackgroundCss(config)).toContain('linear-gradient')
  })

  it('renders content with inspectable kind and variant attributes', () => {
    const { getByText } = renderWithTheme(
      <GreenhouseGradientBackground kind='nexaAurora' dataCapture='gradient-test' centerContent>
        <span>Gradient specimen</span>
      </GreenhouseGradientBackground>
    )

    const root = getByText('Gradient specimen').closest('[data-capture="gradient-test"]')

    expect(root).toHaveAttribute('data-kind', 'nexaAurora')
    expect(root).toHaveAttribute('data-variant', 'heroAurora')
  })
})
