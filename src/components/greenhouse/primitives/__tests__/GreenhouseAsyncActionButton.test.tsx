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

    if (state === 'loading') {
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toBeDisabled()
    }
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
