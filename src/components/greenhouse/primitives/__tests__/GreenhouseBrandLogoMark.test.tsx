// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

  it('keeps the Gemini logotype as the exact Figma SVG export', () => {
    const asset = readFileSync(join(process.cwd(), 'public/images/logos/axis/gemini-logotype.svg'), 'utf8')

    expect(asset).toContain('viewBox="0 0 220 46"')
    expect(asset).toContain('fill="url(#pattern0_12344_8)"')
    expect(asset).toContain('data:image/png;base64')
    expect(asset).toContain('fill="black"')
    expect(asset).not.toContain('#4285F4')
    expect(asset).not.toContain('#44414D')
  })

  it('keeps the Gemini chromatic marks as layered Figma exports instead of a simplified gradient', () => {
    const isotype = readFileSync(join(process.cwd(), 'public/images/logos/axis/gemini-isotype.svg'), 'utf8')
    const onBlue = readFileSync(join(process.cwd(), 'public/images/logos/axis/gemini-on-blue.svg'), 'utf8')
    const onNeutral = readFileSync(join(process.cwd(), 'public/images/logos/axis/gemini-on-neutral.svg'), 'utf8')

    for (const [name, asset] of [
      ['isotype', isotype],
      ['onBlue', onBlue],
      ['onNeutral', onNeutral]
    ] as const) {
      expect(asset, name).toContain('mask-type:luminance')
      expect(asset, name).toContain('#5495FB')
      expect(asset, name).toContain('#24B970')
      expect(asset, name).toContain('#F94544')
      expect(asset, name).toContain('#F5BB19')
      expect(asset, name).not.toContain('gemini-isotype-gradient')
    }
  })

  it('keeps contained Gemini kinds as mark-only images', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='geminiOnBlue' />)

    const mark = getByRole('img', { name: 'Gemini' })

    expect(mark).toHaveAttribute('data-kind', 'geminiOnBlue')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/gemini-on-blue.svg')
    expect(queryByText('Gemini')).not.toBeInTheDocument()
  })

  it('keeps the Gemini Figma isotype as an asset separate from the logotype', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='geminiIsotype' />)

    const mark = getByRole('img', { name: 'Gemini' })

    expect(mark).toHaveAttribute('data-kind', 'geminiIsotype')
    expect(mark).toHaveAttribute('data-variant', 'isotype')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/gemini-isotype.svg')
    expect(container.querySelector('linearGradient')).not.toBeInTheDocument()
    expect(queryByText('Gemini')).not.toBeInTheDocument()
  })

  it('maps the GPT logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='gptLogotype' />)
    const asset = readFileSync(join(process.cwd(), 'public/images/logos/axis/gpt-logotype.svg'), 'utf8')

    const mark = getByRole('img', { name: 'ChatGPT' })

    expect(mark).toHaveAttribute('data-kind', 'gptLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/gpt-logotype.svg')
    expect(asset).toContain('viewBox="0 0 339.3982238769531 91.0694580078125"')
    expect(asset).toContain('#15A17F')
    expect(asset).toContain('#0E100F')
    expect(asset).not.toContain('data:image')
    expect(asset).not.toContain('<image')
    expect(queryByText('ChatGPT')).not.toBeInTheDocument()
  })

  it('keeps GPT compact marks as pure SVG assets', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='gptOnBlack' />)

    const compactAssets = ['gpt-isotype.svg', 'gpt-on-black.svg', 'gpt-on-neutral.svg'].map(fileName =>
      readFileSync(join(process.cwd(), `public/images/logos/axis/${fileName}`), 'utf8')
    )

    const mark = getByRole('img', { name: 'ChatGPT' })

    expect(mark).toHaveAttribute('data-kind', 'gptOnBlack')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/gpt-on-black.svg')

    for (const asset of compactAssets) {
      expect(asset).not.toContain('data:image')
      expect(asset).not.toContain('<image')
      expect(asset).not.toContain('.png')
    }

    expect(queryByText('ChatGPT')).not.toBeInTheDocument()
  })

  it('requires every brand-logo kind to be asset-backed with no local label fallback', () => {
    for (const [kind, config] of Object.entries(GREENHOUSE_BRAND_LOGO_KIND_CONFIG)) {
      expect(config.assetSrc, kind).toBeTruthy()
      expect('label' in config, kind).toBe(false)
    }
  })

  it('maps the Firefly logotype specimen to a lockup kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='fireflyLogotype' />)

    const mark = getByRole('img', { name: 'Adobe Firefly' })

    expect(mark).toHaveAttribute('data-kind', 'fireflyLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/adobe-firefly-logotype.png'
    )
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

  it('maps the Adobe Express logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='expressLogotype' />)

    const mark = getByRole('img', { name: 'Adobe Express' })

    expect(mark).toHaveAttribute('data-kind', 'expressLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/adobe-express-logotype.svg'
    )
    expect(queryByText('Adobe Express')).not.toBeInTheDocument()
  })

  it('keeps Adobe Express compact marks as SVG assets', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='expressOnBlack' />)

    const mark = getByRole('img', { name: 'Adobe Express' })

    expect(mark).toHaveAttribute('data-kind', 'expressOnBlack')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/adobe-express-on-black.svg'
    )
    expect(queryByText('Adobe Express')).not.toBeInTheDocument()
  })

  it('canonizes the Adobe Express full color isotype inside the black badge as its own kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(
      <GreenhouseBrandLogoMark kind='expressFullColorOnBlack' />
    )

    const asset = readFileSync(
      join(process.cwd(), 'public/images/logos/axis/adobe-express-full-color-on-black.svg'),
      'utf8'
    )

    const mark = getByRole('img', { name: 'Adobe Express' })

    expect(mark).toHaveAttribute('data-kind', 'expressFullColorOnBlack')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/adobe-express-full-color-on-black.svg'
    )
    expect(asset).toContain('<circle cx="25" cy="25" r="25" fill="#000B1D"/>')
    expect(asset).toContain('data:image/png;base64')

    expect(asset).toContain('express-full-color-on-black-clip')
    expect(queryByText('Adobe Express')).not.toBeInTheDocument()
  })

  it('maps the Photoshop logotype specimen to a lockup kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='photoshopLogotype' />)

    const mark = getByRole('img', { name: 'Adobe Photoshop' })

    expect(mark).toHaveAttribute('data-kind', 'photoshopLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/adobe-photoshop-logotype.png'
    )
    expect(queryByText('Adobe Photoshop')).not.toBeInTheDocument()
  })

  it('maps the Premiere logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='premiereLogotype' />)

    const mark = getByRole('img', { name: 'Adobe Premiere Pro' })

    expect(mark).toHaveAttribute('data-kind', 'premiereLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/adobe-premiere-logotype.svg'
    )
    expect(queryByText('Adobe Premiere Pro')).not.toBeInTheDocument()
  })

  it('keeps Adobe compact marks as SVG assets', () => {
    const { container, getByRole } = renderWithTheme(<GreenhouseBrandLogoMark kind='premiereOnDarkPurple' />)

    const mark = getByRole('img', { name: 'Adobe Premiere Pro' })

    expect(mark).toHaveAttribute('data-kind', 'premiereOnDarkPurple')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/adobe-premiere-on-dark-purple.svg'
    )
  })

  it('maps the Illustrator logotype specimen to a lockup kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(
      <GreenhouseBrandLogoMark kind='illustratorLogotype' />
    )

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

  it('maps the Envato logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='envatoLogotype' />)

    const mark = getByRole('img', { name: 'Envato' })

    expect(mark).toHaveAttribute('data-kind', 'envatoLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/envato-logotype.svg')
    expect(queryByText('Envato')).not.toBeInTheDocument()
  })

  it('keeps Envato compact marks as SVG assets', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='envatoOnGreen' />)

    const mark = getByRole('img', { name: 'Envato' })

    expect(mark).toHaveAttribute('data-kind', 'envatoOnGreen')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/envato-on-green.svg')
    expect(queryByText('Envato')).not.toBeInTheDocument()
  })

  it('maps the Shutterstock logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(
      <GreenhouseBrandLogoMark kind='shutterstockLogotype' />
    )

    const mark = getByRole('img', { name: 'Shutterstock' })

    expect(mark).toHaveAttribute('data-kind', 'shutterstockLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/shutterstock-logotype.svg'
    )
    expect(queryByText('Shutterstock')).not.toBeInTheDocument()
  })

  it('keeps Shutterstock compact marks as SVG assets', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='shutterstockOnRed' />)

    const mark = getByRole('img', { name: 'Shutterstock' })

    expect(mark).toHaveAttribute('data-kind', 'shutterstockOnRed')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/shutterstock-on-red.svg')
    expect(queryByText('Shutterstock')).not.toBeInTheDocument()
  })

  it('maps the Higgsfield logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='higgsfieldLogotype' />)
    const asset = readFileSync(join(process.cwd(), 'public/images/logos/axis/higgsfield-logotype.svg'), 'utf8')

    const mark = getByRole('img', { name: 'Higgsfield' })

    expect(mark).toHaveAttribute('data-kind', 'higgsfieldLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/higgsfield-logotype.svg'
    )
    expect(asset).toContain('viewBox="0 0 223 44"')
    expect(asset).toContain('fill="black"')
    expect(queryByText('Higgsfield')).not.toBeInTheDocument()
  })

  it('keeps Higgsfield compact marks as SVG assets', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='higgsfieldOnGreen' />)

    const mark = getByRole('img', { name: 'Higgsfield' })

    expect(mark).toHaveAttribute('data-kind', 'higgsfieldOnGreen')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/higgsfield-on-green.svg')
    expect(queryByText('Higgsfield')).not.toBeInTheDocument()
  })

  it('maps the Magnific logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='magnificLogotype' />)
    const asset = readFileSync(join(process.cwd(), 'public/images/logos/axis/magnific-logotype.svg'), 'utf8')

    const mark = getByRole('img', { name: 'Magnific' })

    expect(mark).toHaveAttribute('data-kind', 'magnificLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/magnific-logotype.svg')
    expect(asset).toContain('viewBox="0 0 267 44"')
    expect(asset).toContain('fill="black"')
    expect(queryByText('Magnific')).not.toBeInTheDocument()
  })

  it('keeps Magnific compact marks as SVG assets', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='magnificOnBlack' />)

    const mark = getByRole('img', { name: 'Magnific' })

    expect(mark).toHaveAttribute('data-kind', 'magnificOnBlack')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/magnific-on-black.svg')
    expect(queryByText('Magnific')).not.toBeInTheDocument()
  })

  it('maps the ElevenLabs logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='elevenLabsLogotype' />)
    const asset = readFileSync(join(process.cwd(), 'public/images/logos/axis/elevenlabs-logotype.svg'), 'utf8')

    const mark = getByRole('img', { name: 'ElevenLabs' })

    expect(mark).toHaveAttribute('data-kind', 'elevenLabsLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/elevenlabs-logotype.svg')
    expect(asset).toContain('viewBox="0 0 297 40"')
    expect(asset).toContain('fill="black"')
    expect(queryByText('ElevenLabs')).not.toBeInTheDocument()
  })

  it('keeps ElevenLabs compact marks as SVG assets', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='elevenLabsOnBlack' />)

    const mark = getByRole('img', { name: 'ElevenLabs' })

    expect(mark).toHaveAttribute('data-kind', 'elevenLabsOnBlack')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/elevenlabs-on-black.svg')
    expect(queryByText('ElevenLabs')).not.toBeInTheDocument()
  })

  it('maps the Claude logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='claudeLogotype' />)
    const asset = readFileSync(join(process.cwd(), 'public/images/logos/axis/claude-logotype.svg'), 'utf8')

    const mark = getByRole('img', { name: 'Claude' })

    expect(mark).toHaveAttribute('data-kind', 'claudeLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/claude-logotype.svg')
    expect(asset).toContain('viewBox="0 0 233.005 50.0053"')
    expect(asset).toContain('#D97757')
    expect(asset).toContain('fill="var(--fill-0, black)"')
    expect(queryByText('Claude')).not.toBeInTheDocument()
  })

  it('keeps Claude compact marks as SVG assets', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='claudeOnDarkOrange' />)

    const mark = getByRole('img', { name: 'Claude' })

    expect(mark).toHaveAttribute('data-kind', 'claudeOnDarkOrange')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/images/logos/axis/claude-on-dark-orange.svg'
    )
    expect(queryByText('Claude')).not.toBeInTheDocument()
  })

  it('maps the Microsoft Teams logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='teamsLogotype' />)
    const asset = readFileSync(join(process.cwd(), 'public/images/logos/axis/teams-logotype.svg'), 'utf8')

    const mark = getByRole('img', { name: 'Microsoft Teams' })

    expect(mark).toHaveAttribute('data-kind', 'teamsLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/teams-logotype.svg')
    expect(asset).toContain('viewBox="0 0 251 50"')
    expect(asset).toContain('#4B59CC')
    expect(asset).toContain('#515AC8')
    expect(asset).not.toContain('data:image')
    expect(asset).not.toContain('<image')
    expect(queryByText('Microsoft Teams')).not.toBeInTheDocument()
  })

  it('keeps Microsoft Teams compact marks as pure SVG assets', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='teamsOnDarkPurple' />)

    const compactAssets = [
      'teams-isotype.svg',
      'teams-on-dark-purple.svg',
      'teams-on-neutral.svg',
      'teams-on-light-purple.svg'
    ].map(fileName => readFileSync(join(process.cwd(), `public/images/logos/axis/${fileName}`), 'utf8'))

    const mark = getByRole('img', { name: 'Microsoft Teams' })

    expect(mark).toHaveAttribute('data-kind', 'teamsOnDarkPurple')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/teams-on-dark-purple.svg')

    for (const asset of compactAssets) {
      expect(asset).toContain('<svg')
      expect(asset).not.toContain('data:image')
      expect(asset).not.toContain('<image')
      expect(asset).not.toContain('.png')
    }

    expect(queryByText('Microsoft Teams')).not.toBeInTheDocument()
  })

  it('maps the Notion logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='notionLogotype' />)
    const asset = readFileSync(join(process.cwd(), 'public/images/logos/axis/notion-logotype.svg'), 'utf8')

    const mark = getByRole('img', { name: 'Notion' })

    expect(mark).toHaveAttribute('data-kind', 'notionLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/notion-logotype.svg')
    expect(asset).toContain('viewBox="0 0 172 50"')
    expect(asset).toContain('fill="#040404"')
    expect(asset).toContain('fill="black"')
    expect(asset).not.toContain('data:image')
    expect(asset).not.toContain('<image')
    expect(queryByText('Notion')).not.toBeInTheDocument()
  })

  it('keeps Notion compact marks as pure SVG assets', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='notionOnBlack' />)

    const compactAssets = ['notion-isotype.svg', 'notion-on-black.svg', 'notion-on-neutral.svg'].map(fileName =>
      readFileSync(join(process.cwd(), `public/images/logos/axis/${fileName}`), 'utf8')
    )

    const mark = getByRole('img', { name: 'Notion' })

    expect(mark).toHaveAttribute('data-kind', 'notionOnBlack')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/notion-on-black.svg')

    for (const asset of compactAssets) {
      expect(asset).toContain('<svg')
      expect(asset).not.toContain('data:image')
      expect(asset).not.toContain('<image')
      expect(asset).not.toContain('.png')
    }

    expect(queryByText('Notion')).not.toBeInTheDocument()
  })

  it('maps the HubSpot logotype specimen to a lockup SVG kind', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='hubspotLogotype' />)
    const asset = readFileSync(join(process.cwd(), 'public/images/logos/axis/hubspot-logotype.svg'), 'utf8')

    const mark = getByRole('img', { name: 'HubSpot' })

    expect(mark).toHaveAttribute('data-kind', 'hubspotLogotype')
    expect(mark).toHaveAttribute('data-variant', 'lockup')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/hubspot-logotype.svg')
    expect(asset).toContain('viewBox="0 0 177 50"')
    expect(asset).toContain('#FF5C35')
    expect(asset).not.toContain('data:image')
    expect(asset).not.toContain('<image')
    expect(queryByText('HubSpot')).not.toBeInTheDocument()
  })

  it('keeps HubSpot compact marks as pure SVG assets', () => {
    const { container, getByRole, queryByText } = renderWithTheme(<GreenhouseBrandLogoMark kind='hubspotOnOrange' />)

    const compactAssets = [
      'hubspot-isotype.svg',
      'hubspot-on-orange.svg',
      'hubspot-on-neutral.svg',
      'hubspot-on-light-orange.svg'
    ].map(fileName => readFileSync(join(process.cwd(), `public/images/logos/axis/${fileName}`), 'utf8'))

    const mark = getByRole('img', { name: 'HubSpot' })

    expect(mark).toHaveAttribute('data-kind', 'hubspotOnOrange')
    expect(mark).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/images/logos/axis/hubspot-on-orange.svg')

    for (const asset of compactAssets) {
      expect(asset).toContain('<svg')
      expect(asset).not.toContain('data:image')
      expect(asset).not.toContain('<image')
      expect(asset).not.toContain('.png')
    }

    expect(queryByText('HubSpot')).not.toBeInTheDocument()
  })

  it('resolves kind defaults through the controller', () => {
    expect(resolveGreenhouseBrandLogoKind('geminiOnNeutral')).toBe(GREENHOUSE_BRAND_LOGO_KIND_CONFIG.geminiOnNeutral)
    expect(resolveGreenhouseBrandLogoKind('gptOnNeutral')).toBe(GREENHOUSE_BRAND_LOGO_KIND_CONFIG.gptOnNeutral)
    expect(resolveGreenhouseBrandLogoKind('adobeOnPink')).toBe(GREENHOUSE_BRAND_LOGO_KIND_CONFIG.adobeOnPink)
    expect(resolveGreenhouseBrandLogoKind('expressOnNeutral')).toBe(GREENHOUSE_BRAND_LOGO_KIND_CONFIG.expressOnNeutral)
    expect(resolveGreenhouseBrandLogoKind('expressFullColorOnBlack')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.expressFullColorOnBlack
    )
    expect(resolveGreenhouseBrandLogoKind('fireflyOnPink')).toBe(GREENHOUSE_BRAND_LOGO_KIND_CONFIG.fireflyOnPink)
    expect(resolveGreenhouseBrandLogoKind('photoshopOnLightBlue')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.photoshopOnLightBlue
    )
    expect(resolveGreenhouseBrandLogoKind('premiereOnLightPurple')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.premiereOnLightPurple
    )
    expect(resolveGreenhouseBrandLogoKind('illustratorOnYellow')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.illustratorOnYellow
    )
    expect(resolveGreenhouseBrandLogoKind('afterEffectsOnLightPurple')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.afterEffectsOnLightPurple
    )
    expect(resolveGreenhouseBrandLogoKind('envatoOnLightGreen')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.envatoOnLightGreen
    )
    expect(resolveGreenhouseBrandLogoKind('shutterstockOnPink')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.shutterstockOnPink
    )
    expect(resolveGreenhouseBrandLogoKind('higgsfieldOnNeutral')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.higgsfieldOnNeutral
    )
    expect(resolveGreenhouseBrandLogoKind('magnificOnNeutral')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.magnificOnNeutral
    )
    expect(resolveGreenhouseBrandLogoKind('elevenLabsOnNeutral')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.elevenLabsOnNeutral
    )
    expect(resolveGreenhouseBrandLogoKind('claudeOnLightOrange')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.claudeOnLightOrange
    )
    expect(resolveGreenhouseBrandLogoKind('teamsOnLightPurple')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.teamsOnLightPurple
    )
    expect(resolveGreenhouseBrandLogoKind('notionOnNeutral')).toBe(GREENHOUSE_BRAND_LOGO_KIND_CONFIG.notionOnNeutral)
    expect(resolveGreenhouseBrandLogoKind('hubspotOnLightOrange')).toBe(
      GREENHOUSE_BRAND_LOGO_KIND_CONFIG.hubspotOnLightOrange
    )
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'geminiIsotype' })).toBe('isotype')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'gptOnBlack' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'adobeOnRed' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'expressOnBlack' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'expressFullColorOnBlack' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'fireflyOnRed' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'photoshopOnDarkBlue' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'premiereOnDarkPurple' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'illustratorOnBrown' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'afterEffectsOnDarkPurple' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'envatoOnGreen' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'shutterstockOnRed' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'higgsfieldOnGreen' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'magnificOnBlack' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'elevenLabsOnBlack' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'claudeOnDarkOrange' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'teamsOnDarkPurple' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'notionOnBlack' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'notionLogotype' })).toBe('lockup')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'hubspotOnOrange' })).toBe('contained')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'hubspotLogotype' })).toBe('lockup')
    expect(resolveGreenhouseBrandLogoVariant({ kind: 'geminiIsotype', variant: 'lockup' })).toBe('lockup')
  })
})
