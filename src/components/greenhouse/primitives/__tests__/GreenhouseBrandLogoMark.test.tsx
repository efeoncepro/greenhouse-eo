// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseBrandLogoMark from '../GreenhouseBrandLogoMark'
import {
  GREENHOUSE_BRAND_LOGO_KIND_CONFIG,
  resolveGreenhouseBrandLogoKind,
  resolveGreenhouseBrandLogoVariant
} from '../greenhouse-brand-logo-controller'

afterEach(() => {
  cleanup()
})

describe('GreenhouseBrandLogoMark', () => {
  it('maps the Gemini Figma logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(
      <GreenhouseBrandLogoMark kind='geminiLogotype' dataCapture='gemini-logotype' />
    )

    const mark = getByRole('img', { name: 'Gemini' })

    expect(mark).toHaveAttribute('data-kind', 'geminiLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(mark).toHaveAttribute('data-capture', 'gemini-logotype')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/gemini-logotype.svg')
    expect(queryByText('Gemini')).not.toBeInTheDocument()
  })

  it('keeps contained Gemini kinds as mark-only images', () => {
    const { getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='geminiOnBlue' />)

    const mark = getByRole('img', { name: 'Gemini' })

    expect(mark).toHaveAttribute('data-kind', 'geminiOnBlue')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(queryByText('Gemini')).not.toBeInTheDocument()
  })

  it('maps the Firefly logotype specimen to a lockup kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='fireflyLogotype' />)

    const mark = getByRole('img', { name: 'Adobe Firefly' })

    expect(mark).toHaveAttribute('data-kind', 'fireflyLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/adobe-firefly-logotype.png')
    expect(queryByText('Adobe Firefly')).not.toBeInTheDocument()
  })

  it('maps the Adobe logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='adobeLogotype' />)

    const mark = getByRole('img', { name: 'Adobe' })

    expect(mark).toHaveAttribute('data-kind', 'adobeLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/adobe-logotype.svg')
    expect(queryByText('Adobe')).not.toBeInTheDocument()
  })

  it('maps the Photoshop logotype specimen to a lockup kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='photoshopLogotype' />)

    const mark = getByRole('img', { name: 'Adobe Photoshop' })

    expect(mark).toHaveAttribute('data-kind', 'photoshopLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/adobe-photoshop-logotype.png')
    expect(queryByText('Adobe Photoshop')).not.toBeInTheDocument()
  })

  it('keeps Adobe compact marks as SVG assets', () => {
    const { container, getByRole } = renderWithTheme(<GreenhouseBrandLogoMark kind='afterEffectsOnDarkPurple' />)

    const mark = getByRole('img', { name: 'Adobe After Effects' })

    expect(mark).toHaveAttribute('data-kind', 'afterEffectsOnDarkPurple')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/adobe-after-effects-on-dark-purple.svg'
    )
  })

  it('maps the Illustrator logotype specimen to a lockup kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='illustratorLogotype' />)

    const mark = getByRole('img', { name: 'Adobe Illustrator' })

    expect(mark).toHaveAttribute('data-kind', 'illustratorLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/adobe-illustrator-logotype.png'
    )
    expect(queryByText('Adobe Illustrator')).not.toBeInTheDocument()
  })

  it('maps the After Effects logotype specimen to a lockup kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(
      <GreenhouseBrandLogoMark kind='afterEffectsLogotype' />
    )

    const mark = getByRole('img', { name: 'Adobe After Effects' })

    expect(mark).toHaveAttribute('data-kind', 'afterEffectsLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/adobe-after-effects-logotype.png'
    )
    expect(queryByText('Adobe After Effects')).not.toBeInTheDocument()
  })

  it('resolves kind defaults through the controller', () => {
    expect(resolveGreenhouseBrandLogoKind('geminiOnNeutral')).toBe(GREENHOUSE_BRAND_LOGO_KIND_CONFIG.geminiOnNeutral)
    expect(resolveGreenhouseBrandLogoKind('adobeOnPink')).toBe(GREENHOUSE_BRAND_LOGO_KIND_CONFIG.adobeOnPink)
    expect(resolveGreenhouseBrandLogoKind('fireflyOnPink')).toBe(GREENHOUSE_BRAND_LOGO_KIND_CONFIG.fireflyOnPink)
    expect(resolveGreenhouseBrandLogoKind('photoshopOnLightBlue')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.photoshopOnLightBlue
    )
    expect(resolveGreenhouseBrandLogoKind('illustratorOnYellow')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.illustratorOnYellow
    )
    expect(resolveGreenhouseBrandLogoKind('afterEffectsOnLightPurple')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.afterEffectsOnLightPurple
    )
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'geminiIsotype' })).toBe('isotype')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'adobeOnRed' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'fireflyOnRed' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'photoshopOnDarkBlue' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'illustratorOnBrown' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'afterEffectsOnDarkPurple' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'geminiIsotype', variant: 'lockup' })).toBe('lockup')
  })
})
