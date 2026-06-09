// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseNexaAnimatedAskBadge from '../GreenhouseNexaAnimatedAskBadge'
import GreenhouseNexaAnimatedMark from '../GreenhouseNexaAnimatedMark'
import GreenhouseNexaBrandMark from '../GreenhouseNexaBrandMark'
import {
  GREENHOUSE_NEXA_BRAND_ASSETS,
  GREENHOUSE_NEXA_BRAND_SIZE_CONFIG,
  resolveGreenhouseNexaBrandKind
} from '../greenhouse-nexa-brand-controller'

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

describe('GreenhouseNexaBrandMark', () => {
  it('renders the ask-Nexa badge kind with the canonical label and asset', () => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseNexaBrandMark kind='askNexaBadge' dataCapture='nexa-badge' />
    )

    const badge = getByRole('img', { name: 'Pregúntale a Nexa' })
    const icon = badge.querySelector('img')

    expect(badge).toHaveAttribute('data-kind', 'askNexaBadge')
    expect(badge).toHaveAttribute('data-capture', 'nexa-badge')
    expect(getByText('Pregúntale a Nexa')).toBeInTheDocument()
    expect(icon).toHaveAttribute('src', GREENHOUSE_NEXA_BRAND_ASSETS.badge)
  })

  it('keeps mark-only kinds as branded icons without prompt text', () => {
    const { getByRole, queryByText } = renderWithTheme(<GreenhouseNexaBrandMark kind='inlineMark' />)

    const mark = getByRole('img', { name: 'Nexa' })

    expect(mark).toHaveAttribute('data-kind', 'inlineMark')
    expect(queryByText('Pregúntale a Nexa')).not.toBeInTheDocument()
  })

  it('resolves askNexaBadge as the default kind', () => {
    expect(resolveGreenhouseNexaBrandKind().label).toBe('Pregúntale a Nexa')
  })

  it('uses control-label typography for the pill text', () => {
    expect(GREENHOUSE_NEXA_BRAND_SIZE_CONFIG.small.textVariant).toBe('button')
    expect(GREENHOUSE_NEXA_BRAND_SIZE_CONFIG.medium.textVariant).toBe('button')
  })

  it('keeps the animated mark resilient when no Rive asset is configured yet', () => {
    const { getByRole } = renderWithTheme(<GreenhouseNexaAnimatedMark kind='badgeIcon' ariaLabel='Nexa animada' />)

    const mark = getByRole('img', { name: 'Nexa animada' })

    expect(mark).toHaveAttribute('data-kind', 'badgeIcon')
  })

  it('uses the GSAP fallback when ambient moments are enabled without a Rive asset', () => {
    const { getByRole } = renderWithTheme(<GreenhouseNexaAnimatedMark ambientMoments ariaLabel='Nexa ambient' />)

    const mark = getByRole('img', { name: 'Nexa ambient' })

    expect(mark).toHaveAttribute('data-kind', 'nexa-gsap-blink-mark')
  })

  it('renders the animated ask badge as a separate primitive from the static badge', () => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseNexaAnimatedAskBadge dataCapture='nexa-animated-badge' />
    )

    const badge = getByRole('img', { name: 'Pregúntale a Nexa' })

    expect(badge).toHaveAttribute('data-kind', 'askNexaAnimatedBadge')
    expect(badge).toHaveAttribute('data-capture', 'nexa-animated-badge')
    expect(getByText('Pregúntale a Nexa')).toBeInTheDocument()
  })
})
