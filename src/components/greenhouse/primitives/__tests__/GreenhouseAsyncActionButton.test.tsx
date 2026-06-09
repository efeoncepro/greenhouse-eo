// @vitest-environment jsdom

import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseAsyncActionButton from '../GreenhouseAsyncActionButton'
import type { GreenhouseAsyncActionState } from '../GreenhouseAsyncActionButton'

const states: GreenhouseAsyncActionState[] = ['idle', 'loading', 'success', 'error']
const idleLabel = 'Guardar'
const submitLabel = 'Enviar'
const approveLabel = 'Aprobar'

afterEach(cleanup)

describe('GreenhouseAsyncActionButton', () => {
  it.each(states)('renders %s state with accessible feedback', state => {
    const { getByRole } = renderWithTheme(
      <GreenhouseAsyncActionButton
        state={state}
        loadingLabel='Guardando'
        successLabel='Guardado'
        errorLabel='Reintentar'
        statusLabel={`Estado ${state}`}
      >
        {idleLabel}
      </GreenhouseAsyncActionButton>
    )

    const button = getByRole('button')

    expect(button).toHaveAttribute('data-state', state)
    expect(button).toHaveAttribute('aria-live', 'polite')
    expect(button).toHaveAttribute('data-kind', 'primaryAction')
    expect(button).toHaveAttribute('data-variant', 'solid')

    if (state === 'loading') {
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toBeDisabled()
    }
  })

  it('maps legacy MUI button props to the GreenhouseButton contract', () => {
    const { getByRole } = renderWithTheme(
      <GreenhouseAsyncActionButton state='idle' variant='tonal' color='secondary' kind='secondaryAction'>
        {submitLabel}
      </GreenhouseAsyncActionButton>
    )

    const button = getByRole('button', { name: submitLabel })

    expect(button).toHaveAttribute('data-variant', 'label')
    expect(button).toHaveAttribute('data-tone', 'secondary')
    expect(button).toHaveAttribute('data-kind', 'secondaryAction')
  })

  it('allows the canonical button variant and tone to override legacy props', () => {
    const { getByRole } = renderWithTheme(
      <GreenhouseAsyncActionButton state='error' variant='contained' color='primary' greenhouseVariant='outlined' tone='warning'>
        {submitLabel}
      </GreenhouseAsyncActionButton>
    )

    const button = getByRole('button', { name: submitLabel })

    expect(button).toHaveAttribute('data-variant', 'outlined')
    expect(button).toHaveAttribute('data-tone', 'warning')
  })

  it('does not disable loading state when disableWhileLoading is false', () => {
    const onClick = vi.fn()

    const { getByRole } = renderWithTheme(
      <GreenhouseAsyncActionButton state='loading' disableWhileLoading={false} onClick={onClick}>
        {submitLabel}
      </GreenhouseAsyncActionButton>
    )

    const button = getByRole('button')

    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('respects explicit disabled prop', () => {
    const { getByRole } = renderWithTheme(
      <GreenhouseAsyncActionButton state='idle' disabled>
        {approveLabel}
      </GreenhouseAsyncActionButton>
    )

    expect(getByRole('button')).toBeDisabled()
  })
})
