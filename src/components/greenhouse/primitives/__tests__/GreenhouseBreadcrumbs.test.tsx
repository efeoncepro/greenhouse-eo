// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseBreadcrumbs from '../GreenhouseBreadcrumbs'
import {
  resolveGreenhouseBreadcrumbsSeparator,
  resolveGreenhouseBreadcrumbsVariant
} from '../greenhouse-breadcrumbs-controller'

afterEach(cleanup)

const TEST_LABELS = {
  root: 'Greenhouse',
  designSystem: 'Design System',
  breadcrumbs: 'Breadcrumbs',
  agency: 'Agency',
  organizations: 'Organizations'
} as const

describe('GreenhouseBreadcrumbs', () => {
  it('renders linked ancestors and a current page with the canonical data contract', () => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseBreadcrumbs
        dataCapture='breadcrumbs-specimen'
        kind='pageHierarchy'
        items={[
          { label: TEST_LABELS.root, href: '/home', iconClassName: 'tabler-star-filled' },
          { label: TEST_LABELS.designSystem, href: '/design-system', iconClassName: 'tabler-star-filled' },
          { label: TEST_LABELS.breadcrumbs, iconClassName: 'tabler-star-filled' }
        ]}
      />
    )

    const nav = getByRole('navigation')

    expect(nav).toHaveAttribute('data-variant', 'default')
    expect(nav).toHaveAttribute('data-kind', 'pageHierarchy')
    expect(nav).toHaveAttribute('data-separator', 'slash')
    expect(nav).toHaveAttribute('data-capture', 'breadcrumbs-specimen')
    expect(getByRole('link', { name: TEST_LABELS.root })).toHaveAttribute('href', '/home')
    expect(getByText(TEST_LABELS.breadcrumbs).closest('[aria-current]')).toHaveAttribute('aria-current', 'page')
    expect(nav.querySelectorAll('.tabler-star-filled')).toHaveLength(3)
  })

  it('maps semantic kinds to functional variants and separators', () => {
    expect(resolveGreenhouseBreadcrumbsVariant({ kind: 'pageHierarchy' })).toBe('default')
    expect(resolveGreenhouseBreadcrumbsVariant({ kind: 'workbenchHierarchy' })).toBe('compact')
    expect(resolveGreenhouseBreadcrumbsSeparator({ kind: 'legacy' })).toBe('chevron')
    expect(resolveGreenhouseBreadcrumbsSeparator({ kind: 'designSystemSpecimen' })).toBe('slash')
  })

  it('allows compact workbench breadcrumbs without icons', () => {
    const { getByRole } = renderWithTheme(
      <GreenhouseBreadcrumbs
        kind='workbenchHierarchy'
        showIcons={false}
        items={[
          { label: TEST_LABELS.agency, href: '/agency' },
          { label: TEST_LABELS.organizations }
        ]}
      />
    )

    const nav = getByRole('navigation')

    expect(nav).toHaveAttribute('data-variant', 'compact')
    expect(nav.querySelector('.GreenhouseBreadcrumbs-icon')).not.toBeInTheDocument()
  })
})
