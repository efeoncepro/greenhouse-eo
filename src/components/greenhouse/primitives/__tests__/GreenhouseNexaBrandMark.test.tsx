// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseNexaAnimatedMark from '../GreenhouseNexaAnimatedMark'
import GreenhouseNexaBrandMark from '../GreenhouseNexaBrandMark'
import {
  GREENHOUSE_NEXA_BRAND_ASSETS,
  GREENHOUSE_NEXA_BRAND_SIZE_CONFIG,
  resolveGreenhouseNexaBrandKind
} from '../greenhouse-nexa-brand-controller'

afterEach(cleanup)

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
})
