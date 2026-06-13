// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { createTheme } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import { axisTokens } from '@core/theme/axis-tokens'

import { GREENHOUSE_NEXA_BRAND_COLORS } from '../greenhouse-nexa-brand-controller'
import GreenhouseBorderBeam from '../border-beam/GreenhouseBorderBeam'
import GreenhouseShinyBorder from '../border-beam/GreenhouseShinyBorder'
import GreenhouseSpectrumBeam from '../border-beam/GreenhouseSpectrumBeam'
import GreenhouseSpotlightCard from '../border-beam/GreenhouseSpotlightCard'
import {
  buildGreenhouseBorderBeamConfig,
  buildGreenhouseBorderBeamGradient,
  resolveGreenhouseBorderBeamKind,
  resolveGreenhouseBorderBeamVariant
} from '../border-beam/greenhouse-border-beam-controller'

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

describe('GreenhouseBorderBeam', () => {
  it('resolves semantic kinds to official variants', () => {
    expect(resolveGreenhouseBorderBeamKind('promptDock').variant).toBe('interactive')
    expect(resolveGreenhouseBorderBeamKind('asyncOperation').variant).toBe('progress')
    expect(resolveGreenhouseBorderBeamVariant('ambient', 'asyncOperation')).toBe('ambient')
  })

  it('builds a conic border beam from theme tokens', () => {
    const theme = createTheme({ axis: axisTokens })
    const config = buildGreenhouseBorderBeamConfig({ theme, kind: 'nexaSurface', intensity: 'medium' })

    expect(config.colorFrom).toBe(theme.axis.ramp.secondary[500])
    expect(buildGreenhouseBorderBeamGradient(config)).toContain('conic-gradient')
  })

  it('builds the spectrum effect without raw prompt hex colors', () => {
    const theme = createTheme({ axis: axisTokens })
    const config = buildGreenhouseBorderBeamConfig({ theme, kind: 'promptDock', effect: 'spectrum', intensity: 'strong' })

    expect(config.effect).toBe('spectrum')
    expect(config.spectrumPalette).toBe('axis')
    expect(config.spectrumColors).toContain(theme.axis.ramp.primary[500])
    expect(buildGreenhouseBorderBeamGradient(config)).toContain('linear-gradient')
  })

  it('builds the spectrum effect with the Nexa brand palette', () => {
    const theme = createTheme({ axis: axisTokens })

    const config = buildGreenhouseBorderBeamConfig({
      theme,
      kind: 'nexaSurface',
      effect: 'spectrum',
      spectrumPalette: 'nexa',
      intensity: 'strong'
    })

    expect(config.spectrumPalette).toBe('nexa')
    expect(config.spectrumColors).toContain(GREENHOUSE_NEXA_BRAND_COLORS.electricTeal)
    expect(buildGreenhouseBorderBeamGradient(config)).toContain('linear-gradient')
  })

  it('renders as an inspectable decorative overlay', () => {
    const { container } = renderWithTheme(
      <div style={{ position: 'relative', borderRadius: 8 }}>
        <GreenhouseBorderBeam kind='asyncOperation' dataCapture='border-beam-test' />
      </div>
    )

    const root = container.querySelector('[data-capture="border-beam-test"]')

    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root).toHaveAttribute('data-kind', 'asyncOperation')
    expect(root).toHaveAttribute('data-variant', 'progress')
  })

  it('exposes the spectrum effect as a standalone effect primitive', () => {
    const { container } = renderWithTheme(
      <div style={{ position: 'relative', borderRadius: 8 }}>
        <GreenhouseSpectrumBeam kind='promptDock' dataCapture='spectrum-beam-test' active />
      </div>
    )

    const root = container.querySelector('[data-capture="spectrum-beam-test"]')

    expect(root).toHaveAttribute('data-effect', 'spectrum')
    expect(root).toHaveAttribute('data-kind', 'promptDock')
  })

  it('renders the shiny border effect as a tokenized button surface', () => {
    const { container, getByRole } = renderWithTheme(
      <GreenhouseShinyBorder asButton dataCapture='shiny-border-test'>
        See Projects
      </GreenhouseShinyBorder>
    )

    const button = getByRole('button', { name: 'See Projects' })

    expect(button).toHaveAttribute('data-capture', 'shiny-border-test')
    expect(button).toHaveAttribute('data-shiny-border', 'true')
    expect(container.querySelector('[data-gh-shiny-corner-glow]')).toBeInTheDocument()
    expect(container.querySelector('[data-gh-shiny-content]')).toHaveTextContent('See Projects')
  })

  it('renders spotlight cards with prompt colors and a Nexa brand kind', () => {
    const { container, getByText } = renderWithTheme(
      <>
        <GreenhouseSpotlightCard kind='nexaBrand' dataCapture='spotlight-card-test'>
          <span>Nexa spotlight</span>
        </GreenhouseSpotlightCard>
        <GreenhouseSpotlightCard kind='nexaBrandCore' dataCapture='spotlight-card-core-test' />
        <GreenhouseSpotlightCard kind='nexaBrandSignal' dataCapture='spotlight-card-signal-test' />
        <GreenhouseSpotlightCard kind='nexaBrandGlass' dataCapture='spotlight-card-glass-test' />
      </>
    )

    const card = container.querySelector('[data-capture="spotlight-card-test"]')
    const brandKinds = ['nexaBrand', 'nexaBrandCore', 'nexaBrandSignal', 'nexaBrandGlass']

    expect(card).toHaveAttribute('data-gh-spotlight-card')
    expect(card).toHaveAttribute('data-kind', 'nexaBrand')
    expect(container.querySelector('[data-gh-spotlight-aura]')).toBeInTheDocument()
    expect(getByText('Nexa spotlight')).toBeInTheDocument()

    brandKinds.forEach(kind => {
      expect(container.querySelector(`[data-kind="${kind}"]`)).toBeInTheDocument()
    })
  })
})
