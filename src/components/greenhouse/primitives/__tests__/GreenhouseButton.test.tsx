// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseButton from '../GreenhouseButton'
import {
  GREENHOUSE_BUTTON_SIZE_TOKENS,
  resolveGreenhouseButtonTone,
  resolveGreenhouseButtonVariant
} from '../greenhouse-button-controller'
import { controlText } from '@/components/theme/typography-tokens'

afterEach(cleanup)

describe('GreenhouseButton', () => {
  it('exposes the canonical variant, tone, kind and capture contract', () => {
    const { getByRole } = renderWithTheme(
      <GreenhouseButton
        variant='solid'
        tone='success'
        kind='primaryAction'
        dataCapture='button-approve'
        leadingIconClassName='tabler-check'
      >
        Aprobar
      </GreenhouseButton>
    )

    const button = getByRole('button', { name: 'Aprobar' })

    expect(button).toHaveAttribute('data-variant', 'solid')
    expect(button).toHaveAttribute('data-tone', 'success')
    expect(button).toHaveAttribute('data-kind', 'primaryAction')
    expect(button).toHaveAttribute('data-capture', 'button-approve')
    expect(button.querySelector('.tabler-check')).toBeInTheDocument()
  })

  it('accepts React icon slots for composed primitives', () => {
    const { getByRole } = renderWithTheme(
      <GreenhouseButton
        kind='secondaryAction'
        leadingIcon={<span data-testid='leading-icon' aria-hidden='true' />}
        trailingIcon={<span data-testid='trailing-icon' aria-hidden='true' />}
      >
        Sincronizar
      </GreenhouseButton>
    )

    const button = getByRole('button', { name: 'Sincronizar' })

    expect(button.querySelector('[data-testid="leading-icon"]')).toBeInTheDocument()
    expect(button.querySelector('[data-testid="trailing-icon"]')).toBeInTheDocument()
  })

  it('maps semantic kinds to safe default variants and tones', () => {
    expect(resolveGreenhouseButtonVariant({ kind: 'primaryAction' })).toBe('solid')
    expect(resolveGreenhouseButtonVariant({ kind: 'inlineAction' })).toBe('text')
    expect(resolveGreenhouseButtonTone({ kind: 'destructiveAction' })).toBe('error')
    expect(resolveGreenhouseButtonTone({ kind: 'secondaryAction' })).toBe('secondary')
  })

  it('pins the AXIS button size contract used by the lab and primitive', () => {
    expect(GREENHOUSE_BUTTON_SIZE_TOKENS.large).toEqual({
      minBlockSize: 48,
      iconSize: 20,
      labelFontSize: controlText.lg,
      labelToken: 'controlText.lg'
    })
    expect(GREENHOUSE_BUTTON_SIZE_TOKENS.medium).toEqual({
      minBlockSize: 38,
      iconSize: 16,
      labelFontSize: controlText.md,
      labelToken: 'controlText.md'
    })
    expect(GREENHOUSE_BUTTON_SIZE_TOKENS.small).toEqual({
      minBlockSize: 30,
      iconSize: 14,
      labelFontSize: controlText.sm,
      labelToken: 'controlText.sm'
    })
  })
})
