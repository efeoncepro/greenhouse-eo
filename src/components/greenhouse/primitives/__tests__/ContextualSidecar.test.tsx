// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import ContextualSidecar from '../ContextualSidecar'

afterEach(cleanup)

describe('ContextualSidecar', () => {
  it('renders as an accessible complementary region', () => {
    const { getByRole } = renderWithTheme(
      <ContextualSidecar title='Detalle operacional' subtitle='Caso OF-1028' icon='tabler-layout-sidebar-right'>
        <p>Contenido del panel</p>
      </ContextualSidecar>
    )

    const sidecar = getByRole('complementary', { name: 'Detalle operacional' })

    expect(sidecar).toHaveAttribute('data-sidecar-kind', 'inspector')
    expect(sidecar).toHaveAttribute('data-sidecar-variant', 'inspector')
    expect(sidecar).toHaveTextContent('Caso OF-1028')
  })

  it('maps semantic kinds to official functional variants', () => {
    const { getByRole, rerender } = renderWithTheme(
      <ContextualSidecar title='Formulario' kind='form'>
        <p>Contenido</p>
      </ContextualSidecar>
    )

    expect(getByRole('complementary', { name: 'Formulario' })).toHaveAttribute('data-sidecar-variant', 'composer')

    rerender(
      <ContextualSidecar title='Review' kind='review'>
        <p>Contenido</p>
      </ContextualSidecar>
    )

    expect(getByRole('complementary', { name: 'Review' })).toHaveAttribute('data-sidecar-variant', 'inspector')

    rerender(
      <ContextualSidecar title='AI' kind='review' variant='assistant'>
        <p>Contenido</p>
      </ContextualSidecar>
    )

    expect(getByRole('complementary', { name: 'AI' })).toHaveAttribute('data-sidecar-variant', 'assistant')
  })

  it('exposes busy and error states', () => {
    const { getByRole, rerender } = renderWithTheme(
      <ContextualSidecar title='Panel' state='loading'>
        <p>Cargando</p>
      </ContextualSidecar>
    )

    expect(getByRole('complementary', { name: 'Panel' })).toHaveAttribute('aria-busy', 'true')

    rerender(
      <ContextualSidecar title='Panel' state='error' errorMessage='No se pudo cargar el detalle'>
        <p>Contenido</p>
      </ContextualSidecar>
    )

    expect(getByRole('alert')).toHaveTextContent('No se pudo cargar el detalle')
  })

  it('invokes the close handler through the canonical close control', () => {
    const onClose = vi.fn()

    const { getByRole } = renderWithTheme(
      <ContextualSidecar title='Panel' onClose={onClose}>
        <p>Contenido</p>
      </ContextualSidecar>
    )

    fireEvent.click(getByRole('button', { name: 'Cerrar panel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
