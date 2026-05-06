// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import EntitySummaryDock from '../EntitySummaryDock'

afterEach(cleanup)

describe('EntitySummaryDock', () => {
  it('renders the centerSlot when provided', () => {
    const { getByTestId, getByRole } = renderWithTheme(
      <EntitySummaryDock
        ariaLabel='Resumen del documento'
        centerSlot={<span data-testid='dock-center'>Total $1.000</span>}
        primaryCta={{ label: 'Guardar', onClick: () => {} }}
      />
    )

    expect(getByRole('status')).toHaveAttribute('aria-label', 'Resumen del documento')
    expect(getByTestId('dock-center')).toHaveTextContent('Total $1.000')
  })

  it('falls back to emptyStateMessage when centerSlot is absent', () => {
    const { getByText } = renderWithTheme(
      <EntitySummaryDock
        ariaLabel='Resumen'
        emptyStateMessage='Agrega ítems para ver el total.'
        primaryCta={{ label: 'Guardar', onClick: () => {} }}
      />
    )

    expect(getByText('Agrega ítems para ver el total.')).toBeInTheDocument()
  })

  it('renders simulationError as an alert above the layout', () => {
    const { getByRole } = renderWithTheme(
      <EntitySummaryDock
        ariaLabel='Resumen'
        simulationError='Error al simular precios.'
        primaryCta={{ label: 'Guardar', onClick: () => {} }}
      />
    )

    expect(getByRole('alert')).toHaveTextContent('Error al simular precios.')
  })

  it('invokes primaryCta.onClick when the primary button is pressed', () => {
    const onClick = vi.fn()

    const { getByRole } = renderWithTheme(
      <EntitySummaryDock
        ariaLabel='Resumen'
        primaryCta={{ label: 'Emitir', onClick }}
      />
    )

    fireEvent.click(getByRole('button', { name: 'Emitir' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disables the primary CTA and exposes disabledReason via aria-describedby', () => {
    const { getByRole, getByText } = renderWithTheme(
      <EntitySummaryDock
        ariaLabel='Resumen'
        primaryCta={{
          label: 'Emitir',
          onClick: () => {},
          disabled: true,
          disabledReason: 'Faltan ítems en la cotización.'
        }}
        id='test-dock'
      />
    )

    const button = getByRole('button', { name: 'Emitir' })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-describedby', 'test-dock-cta-reason')
    expect(getByText('Faltan ítems en la cotización.')).toBeInTheDocument()
  })

  it('renders secondaryCta when provided and triggers its onClick', () => {
    const onSecondary = vi.fn()

    const { getByRole } = renderWithTheme(
      <EntitySummaryDock
        ariaLabel='Resumen'
        primaryCta={{ label: 'Emitir', onClick: () => {} }}
        secondaryCta={{ label: 'Guardar borrador', onClick: onSecondary }}
      />
    )

    fireEvent.click(getByRole('button', { name: 'Guardar borrador' }))
    expect(onSecondary).toHaveBeenCalledTimes(1)
  })
})
