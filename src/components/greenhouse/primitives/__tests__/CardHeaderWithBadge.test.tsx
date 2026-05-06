// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import CardHeaderWithBadge from '../CardHeaderWithBadge'

afterEach(cleanup)

describe('CardHeaderWithBadge', () => {
  it('renders title alongside the badge value', () => {
    const { getByText } = renderWithTheme(
      <CardHeaderWithBadge title='Ítems de la cotización' badgeValue={5} />
    )

    expect(getByText('Ítems de la cotización')).toBeInTheDocument()
    expect(getByText('5')).toBeInTheDocument()
  })

  it('renders subheader when provided', () => {
    const { getByText } = renderWithTheme(
      <CardHeaderWithBadge title='Líneas' badgeValue={2} subheader='Agrega ítems desde el catálogo.' />
    )

    expect(getByText('Agrega ítems desde el catálogo.')).toBeInTheDocument()
  })

  it('renders the avatar icon when avatarIcon is provided', () => {
    const { container } = renderWithTheme(
      <CardHeaderWithBadge title='Ítems' badgeValue={0} avatarIcon='tabler-list-details' />
    )

    expect(container.querySelector('.tabler-list-details')).not.toBeNull()
  })

  it('omits the avatar slot when no avatarIcon is provided', () => {
    const { container } = renderWithTheme(
      <CardHeaderWithBadge title='Ítems' badgeValue={0} />
    )

    expect(container.querySelector('[class*="MuiCardHeader-avatar"]')).toBeNull()
  })

  it('renders the action slot', () => {
    const { getByTestId } = renderWithTheme(
      <CardHeaderWithBadge
        title='Ítems'
        badgeValue={3}
        action={<button type='button' data-testid='card-header-action'>Acción</button>}
      />
    )

    expect(getByTestId('card-header-action')).toBeInTheDocument()
  })

  it('accepts a ReactNode title and skips the canonical h6+badge composition', () => {
    const { getByTestId, queryByText } = renderWithTheme(
      <CardHeaderWithBadge
        title={<span data-testid='custom-title'>Custom title</span>}
        badgeValue={9}
      />
    )

    expect(getByTestId('custom-title')).toBeInTheDocument()
    expect(queryByText('9')).toBeNull()
  })
})
