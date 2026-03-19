// @vitest-environment jsdom

import Button from '@mui/material/Button'
import { describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('renders the main copy and optional action', () => {
    const { getByRole, getByText } = renderWithTheme(
      <EmptyState
        title='Sin campañas activas'
        description='Todavía no hay iniciativas visibles para este space.'
        action={<Button>Crear campaña</Button>}
      />
    )

    expect(getByText('Sin campañas activas')).toBeInTheDocument()
    expect(getByText('Todavía no hay iniciativas visibles para este space.')).toBeInTheDocument()
    expect(getByRole('button', { name: 'Crear campaña' })).toBeInTheDocument()
  })

  it('uses the provided icon class when present', () => {
    const { container } = renderWithTheme(
      <EmptyState icon='tabler-bolt' title='Sin señal' description='No hay datos todavía.' />
    )

    expect(container.querySelector('.tabler-bolt')).toBeInTheDocument()
  })
})
