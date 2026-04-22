// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import ContextChip from '../ContextChip'

afterEach(cleanup)

const baseSelectProps = {
  icon: 'tabler-building',
  label: 'Organización',
  options: [
    { value: 'org-1', label: 'Acme Corp' },
    { value: 'org-2', label: 'Globex' }
  ],
  onSelectChange: vi.fn()
}

describe('ContextChip', () => {
  it('renders the label and placeholder when empty (prominence=primary, default)', () => {
    const { getByText } = renderWithTheme(
      <ContextChip {...baseSelectProps} value={null} placeholder='Seleccionar organización' />
    )

    expect(getByText('Organización')).toBeInTheDocument()
    expect(getByText('Seleccionar organización')).toBeInTheDocument()
  })

  it('renders blocking-empty status with warning-tinted icon and required hint', () => {
    const { container, getByText } = renderWithTheme(
      <ContextChip
        {...baseSelectProps}
        value={null}
        placeholder='Vincular deal'
        status='blocking-empty'
        requiredHint='Requerido'
      />
    )

    expect(container.querySelector('.tabler-alert-circle')).toBeTruthy()
    expect(getByText('Requerido')).toBeInTheDocument()
  })

  it('does not show chevron when status=locked', () => {
    const { container } = renderWithTheme(
      <ContextChip {...baseSelectProps} value='Acme' status='locked' />
    )

    expect(container.querySelector('.tabler-chevron-down')).toBeNull()
    expect(container.querySelector('.tabler-lock')).toBeTruthy()
  })

  it('renders inline prominence without the boxed label+value stack', () => {
    const { container, queryByText } = renderWithTheme(
      <ContextChip
        {...baseSelectProps}
        value='CLP'
        prominence='inline'
        label='Moneda'
      />
    )

    // Inline prominence: label is set via aria-labelledby on the button, not rendered as overline above value
    expect(queryByText('Moneda')).toBeNull()

    // The value is shown inline
    expect(container.textContent).toContain('CLP')
  })

  it('exposes aria-expanded and aria-haspopup on the trigger button', () => {
    const { getByRole } = renderWithTheme(
      <ContextChip {...baseSelectProps} value='Acme' />
    )

    // aria-labelledby wins over aria-label when both present; accessible name
    // resolves to the overline label the primitive renders.
    const button = getByRole('button', { name: /Organización/ })

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-haspopup', 'listbox')
  })

  it('renders a required asterisk when required=true on primary prominence', () => {
    const { container } = renderWithTheme(
      <ContextChip {...baseSelectProps} value={null} required />
    )

    // The asterisk is inside a <span> with color=error.main — look for the raw '*' char
    expect(container.textContent).toContain('*')
  })

  it('accepts fullWidth without breaking the render', () => {
    // fullWidth swaps the inline sx to `width: '100%'` + `maxWidth: 'none'`.
    // We can't reliably read emotion-injected CSS in jsdom, so we verify the
    // component renders without throwing and exposes the button role as usual.
    const { getByRole, rerender } = renderWithTheme(
      <ContextChip {...baseSelectProps} value='Acme' fullWidth />
    )

    expect(getByRole('button', { name: /Organización/ })).toBeInTheDocument()

    // Toggling fullWidth back off should not crash either.
    rerender(<ContextChip {...baseSelectProps} value='Acme' fullWidth={false} />)
    expect(getByRole('button', { name: /Organización/ })).toBeInTheDocument()
  })
})
