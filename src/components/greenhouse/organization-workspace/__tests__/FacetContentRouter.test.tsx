// @vitest-environment jsdom

import type { ReactElement } from 'react'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

// Mock next/dynamic so tests don't try to network-load the lazy modules.
// Returns a synchronous component that displays which facet was requested.
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: () => ReactElement }>) => {
    return function MockedFacet() {
      // Call the loader's import path indirectly by inspecting the function body.
      const loaderSrc = loader.toString()

      const match = loaderSrc.match(/facets\/(\w+)Facet/)

      const tag = match?.[1] ?? 'unknown'

      return <div data-testid={`facet-${tag.toLowerCase()}`}>mock-{tag}</div>
    }
  }
}))

const FacetContentRouter = (await import('../FacetContentRouter')).default

import type { FacetContentProps, OrganizationFacet } from '../types'

const buildProps = (facet: OrganizationFacet): FacetContentProps & { facet: OrganizationFacet } => ({
  facet,
  organizationId: 'org-acme',
  entrypointContext: 'agency',
  relationship: { kind: 'internal_admin', subjectUserId: 'user-1', organizationId: 'org-acme' },
  fieldRedactions: [],
  projection: {
    organizationId: 'org-acme',
    entrypointContext: 'agency',
    relationship: { kind: 'internal_admin', subjectUserId: 'user-1', organizationId: 'org-acme' },
    visibleFacets: [facet],
    visibleTabs: [],
    defaultFacet: facet,
    allowedActions: [],
    fieldRedactions: {},
    degradedMode: false,
    degradedReason: null,
    cacheKey: 'k',
    computedAt: new Date()
  }
})

describe('TASK-612 — FacetContentRouter', () => {
  afterEach(() => {
    cleanup()
  })

  const facets: OrganizationFacet[] = [
    'identity',
    'spaces',
    'team',
    'economics',
    'delivery',
    'finance',
    'crm',
    'services',
    'staffAug'
  ]

  for (const facet of facets) {
    it(`dispatches to the ${facet} facet via lazy registry`, async () => {
      renderWithTheme(<FacetContentRouter {...buildProps(facet)} />)

      // Lowercase tag matches the mocked component's testid.
      const expectedTag = facet.toLowerCase()

      await waitFor(() => {
        expect(screen.getByTestId(`facet-${expectedTag}`)).toBeInTheDocument()
      })
    })
  }

  it('renders empty state when facet is unknown (defense-in-depth)', () => {
    // Cast intentional — el shell debería pasar solo facets canónicos pero el router
    // protege ante casos edge (drift de typing en consumer).
    renderWithTheme(
      <FacetContentRouter
        {...buildProps('identity')}
        facet={'rogueFacetName' as OrganizationFacet}
      />
    )

    expect(
      screen.queryByTestId(/^facet-/)
    ).not.toBeInTheDocument()
  })
})
