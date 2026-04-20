// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import PricingCatalogNavCard from './PricingCatalogNavCard'

afterEach(cleanup)

describe('PricingCatalogNavCard', () => {
  it('renders label, count, and icon', () => {
    const { getByText, container } = renderWithTheme(
      <PricingCatalogNavCard
        href='/admin/pricing/roles'
        label='Roles vendibles'
        count={33}
        icon='tabler-briefcase'
      />
    )

    expect(getByText('Roles vendibles')).toBeInTheDocument()
    expect(getByText('33')).toBeInTheDocument()
    expect(container.querySelector('.tabler-briefcase')).toBeInTheDocument()
  })

  it('navigates to the provided href via anchor element', () => {
    const { getByRole } = renderWithTheme(
      <PricingCatalogNavCard
        href='/admin/pricing/tools'
        label='Catálogo de herramientas'
        count={26}
        icon='tabler-tool'
      />
    )

    const link = getByRole('link')

    expect(link).toHaveAttribute('href', '/admin/pricing/tools')
  })

  it('exposes an accessible label combining label and count', () => {
    const { getByLabelText } = renderWithTheme(
      <PricingCatalogNavCard
        href='/admin/pricing/services'
        label='Servicios empaquetados'
        count={7}
        icon='tabler-package'
      />
    )

    expect(getByLabelText('Servicios empaquetados, 7')).toBeInTheDocument()
  })

  it('renders em-dash placeholder when count is undefined', () => {
    const { getByText } = renderWithTheme(
      <PricingCatalogNavCard
        href='/admin/pricing/audit'
        label='Historial de cambios'
        icon='tabler-history'
      />
    )

    expect(getByText('—')).toBeInTheDocument()
  })

  it('renders optional description under label', () => {
    const { getByText } = renderWithTheme(
      <PricingCatalogNavCard
        href='/admin/pricing/roles'
        label='Roles vendibles'
        count={33}
        icon='tabler-briefcase'
        description='Catálogo canónico de roles'
      />
    )

    expect(getByText('Catálogo canónico de roles')).toBeInTheDocument()
  })

  it('formats numeric counts using es-CL locale', () => {
    const { getByText } = renderWithTheme(
      <PricingCatalogNavCard
        href='/admin/pricing/roles'
        label='Roles vendibles'
        count={1234}
        icon='tabler-briefcase'
      />
    )

    expect(getByText('1.234')).toBeInTheDocument()
  })
})
