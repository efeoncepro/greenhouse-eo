// @vitest-environment jsdom

import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import FinanceFacet from './FinanceFacet'

/**
 * TASK-613 Slice 6 — Tests del dispatch dual-entrypoint del FinanceFacet.
 *
 * El facet renderiza contenido distinto según `entrypointContext`:
 *  - 'finance' → FinanceClientsContent (rich legacy: 4 sub-tabs + 3 KPIs)
 *  - 'agency' | 'admin' | 'client_portal' → FinanceFacetAgencyContent
 *    (wrap del legacy OrganizationFinanceTab via useOrganizationDetail)
 *
 * Mockeamos los componentes hijos para aislar la decisión de dispatch — los
 * tests de los hijos (FinanceClientsContent, OrganizationFinanceTab) son
 * responsabilidad de sus propios specs.
 */

vi.mock('./FinanceClientsContent', () => ({
  default: ({ lookupId }: { lookupId: string }) => (
    <div data-testid='finance-clients-content'>finance-rich:{lookupId}</div>
  )
}))

vi.mock('./use-organization-detail', () => ({
  default: () => ({ status: 'loading', detail: null, error: null })
}))

vi.mock('@/views/greenhouse/organizations/tabs/OrganizationFinanceTab', () => ({
  default: () => <div data-testid='organization-finance-tab'>agency-finance-tab</div>
}))

const fakeProjection = {
  organizationId: 'org-001',
  entrypointContext: 'finance',
  relationship: 'internal_admin',
  defaultFacet: 'finance',
  visibleFacets: ['finance'],
  fieldRedactions: {},
  drawerCapabilities: {},
  degraded: { isDegraded: false, reasons: [] },
  resolvedAtISO: '2026-05-08T00:00:00.000Z'
} as never

const baseProps = {
  organizationId: 'org-001',
  relationship: 'internal_admin' as const,
  fieldRedactions: [],
  projection: fakeProjection
}

describe('FinanceFacet — TASK-613 dual-entrypoint dispatch', () => {
  beforeEach(() => {
    // Stub fetch para que useOrganizationDetail no haga side effects
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders FinanceClientsContent (rich legacy) when entrypointContext = "finance"', () => {
    renderWithTheme(<FinanceFacet {...baseProps} entrypointContext='finance' />)

    const rich = screen.getByTestId('finance-clients-content')

    expect(rich).toBeTruthy()
    expect(rich.textContent).toContain('finance-rich:org-001')
    expect(screen.queryByTestId('organization-finance-tab')).toBeNull()
  })

  it('renders Agency-flavored content (loading state) when entrypointContext = "agency"', () => {
    renderWithTheme(<FinanceFacet {...baseProps} entrypointContext='agency' />)

    expect(screen.queryByTestId('finance-clients-content')).toBeNull()
    // useOrganizationDetail mockeado en `loading` → spinner + label
  })

  it('renders Agency-flavored content when entrypointContext = "admin"', () => {
    renderWithTheme(<FinanceFacet {...baseProps} entrypointContext='admin' />)

    expect(screen.queryByTestId('finance-clients-content')).toBeNull()
  })

  it('renders Agency-flavored content when entrypointContext = "client_portal"', () => {
    renderWithTheme(<FinanceFacet {...baseProps} entrypointContext='client_portal' />)

    expect(screen.queryByTestId('finance-clients-content')).toBeNull()
  })
})
