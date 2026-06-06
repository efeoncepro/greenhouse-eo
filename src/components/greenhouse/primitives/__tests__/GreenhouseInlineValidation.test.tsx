// @vitest-environment jsdom

import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseInlineValidation from '../GreenhouseInlineValidation'
import type { GreenhouseInlineValidationState, GreenhouseInlineValidationVariant } from '../GreenhouseInlineValidation'

const states: GreenhouseInlineValidationState[] = ['idle', 'checking', 'valid', 'warning', 'error', 'blocked']
const variants: GreenhouseInlineValidationVariant[] = ['field', 'section', 'summary', 'asyncCheck']

afterEach(cleanup)

describe('GreenhouseInlineValidation', () => {
  it.each(states)('renders %s state with live region semantics', state => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseInlineValidation
        state={state}
        message='RUT validado'
        detail='La verificacion usa la fuente canonica.'
        meta='hace 2s'
        dataCapture={`inline-validation-${state}`}
      />
    )

    const region = getByRole(state === 'error' || state === 'blocked' ? 'alert' : 'status')

    expect(region).toHaveAttribute('data-state', state)
    expect(region).toHaveAttribute('data-variant', 'field')
    expect(region).toHaveAttribute('data-capture', `inline-validation-${state}`)
    expect(region).toHaveAttribute('aria-live', state === 'error' || state === 'blocked' ? 'assertive' : 'polite')
    expect(getByText('RUT validado')).toBeInTheDocument()
  })

  it.each(variants)('renders %s variant', variant => {
    const { getByRole } = renderWithTheme(
      <GreenhouseInlineValidation state='warning' variant={variant} message='Falta evidencia' ariaLabel={`validation-${variant}`} />
    )

    const region = getByRole('status')

    expect(region).toHaveAttribute('data-variant', variant)
    expect(region).toHaveAttribute('aria-label', `validation-${variant}`)
  })

  it('runs optional action handler', () => {
    const onAction = vi.fn()

    const { getByRole } = renderWithTheme(
      <GreenhouseInlineValidation state='error' message='No se pudo validar' actionLabel='Reintentar' onAction={onAction} />
    )

    fireEvent.click(getByRole('button', { name: 'Reintentar' }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
