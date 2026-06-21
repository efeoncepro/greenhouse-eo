// @vitest-environment jsdom

import { cleanup, fireEvent } from '@testing-library/react'
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
  organizations: 'Organizations',
  home: 'Home',
  documents: 'Documents',
  addDocument: 'Add Document',
  components: 'Components',
  moreRoutes: 'More routes',
  documentation: 'Documentation',
  buildingApplication: 'Building Your Application',
  dataFetching: 'Data Fetching',
  caching: 'Caching',
  revalidating: 'Revalidating'
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
    expect(nav).toHaveAttribute('data-motion', 'none')
    expect(nav).toHaveAttribute('data-hit-area', 'standard')
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
    expect(resolveGreenhouseBreadcrumbsSeparator({ separator: 'chevrons' })).toBe('chevrons')
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

  it('ports the shadcn chevrons breadcrumb pattern without exposing a parallel component API', () => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseBreadcrumbs
        kind='workbenchHierarchy'
        separator='chevrons'
        items={[
          { label: TEST_LABELS.home, href: '/home', iconClassName: 'tabler-home', labelVisuallyHidden: true },
          { label: TEST_LABELS.documents, href: '/documents', iconClassName: 'tabler-folder' },
          { label: TEST_LABELS.addDocument, iconClassName: 'tabler-file-text' }
        ]}
      />
    )

    const nav = getByRole('navigation')

    expect(nav).toHaveAttribute('data-separator', 'chevrons')
    expect(getByRole('link', { name: TEST_LABELS.home })).toHaveAttribute('href', '/home')
    expect(getByText(TEST_LABELS.home)).toHaveAttribute('data-label-visually-hidden', 'true')
    expect(nav.querySelectorAll('.tabler-chevrons-right')).toHaveLength(2)
    expect(getByText(TEST_LABELS.addDocument).closest('[aria-current]')).toHaveAttribute('aria-current', 'page')
  })

  it('supports the animated comfortable prompt pattern as an opt-in primitive capability', () => {
    const { getByRole } = renderWithTheme(
      <GreenhouseBreadcrumbs
        hitArea='comfortable'
        motion='subtle'
        separator='chevron'
        items={[
          { label: TEST_LABELS.home, href: '/home', iconClassName: 'tabler-home' },
          { label: TEST_LABELS.components, href: '/components', iconClassName: 'tabler-components' },
          { label: TEST_LABELS.breadcrumbs }
        ]}
      />
    )

    const nav = getByRole('navigation')

    expect(nav).toHaveAttribute('data-motion', 'subtle')
    expect(nav).toHaveAttribute('data-hit-area', 'comfortable')
    expect(nav.querySelectorAll('[data-breadcrumb-motion-item="true"]')).toHaveLength(3)
  })

  it('ports the shadcn ellipsis dropdown pattern through the canonical floating surface primitive', () => {
    const { getByRole } = renderWithTheme(
      <GreenhouseBreadcrumbs
        separator='chevron'
        items={[
          { label: TEST_LABELS.home, href: '/home', iconClassName: 'tabler-home' },
          {
            label: TEST_LABELS.moreRoutes,
            ariaLabel: TEST_LABELS.moreRoutes,
            overflowItems: [
              { label: TEST_LABELS.documentation, href: '/docs', iconClassName: 'tabler-book' },
              {
                label: TEST_LABELS.buildingApplication,
                href: '/docs/building-your-application',
                iconClassName: 'tabler-layout-dashboard'
              },
              { label: TEST_LABELS.dataFetching, href: '/docs/data-fetching', iconClassName: 'tabler-database' }
            ]
          },
          { label: TEST_LABELS.caching, href: '/docs/caching' },
          { label: TEST_LABELS.revalidating }
        ]}
      />
    )

    fireEvent.click(getByRole('button', { name: TEST_LABELS.moreRoutes }))

    expect(getByRole('menu', { name: TEST_LABELS.moreRoutes })).toHaveAttribute(
      'data-gh-floating-surface',
      'actionMenu'
    )
    expect(getByRole('menuitem', { name: TEST_LABELS.documentation })).toHaveAttribute('href', '/docs')
    expect(getByRole('menuitem', { name: TEST_LABELS.buildingApplication })).toHaveAttribute(
      'href',
      '/docs/building-your-application'
    )
    expect(getByRole('menuitem', { name: TEST_LABELS.dataFetching })).toHaveAttribute('href', '/docs/data-fetching')
  })
})
