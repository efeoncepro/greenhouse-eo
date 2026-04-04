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

  it('renders static icon when animatedIcon is provided but reduced motion is preferred', () => {
    // With matchMedia mocked to prefer reduced motion, should fall back to static icon
    const originalMatchMedia = window.matchMedia

    window.matchMedia = (query: string) =>
      ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      }) as MediaQueryList

    const { container } = renderWithTheme(
      <EmptyState
        icon='tabler-inbox'
        animatedIcon='/animations/empty-inbox.json'
        title='Sin datos'
        description='No hay registros.'
      />
    )

    // Should show the static icon fallback
    expect(container.querySelector('.tabler-inbox')).toBeInTheDocument()
    window.matchMedia = originalMatchMedia
  })
})
