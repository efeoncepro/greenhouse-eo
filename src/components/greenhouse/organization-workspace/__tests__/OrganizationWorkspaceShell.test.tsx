// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import OrganizationWorkspaceShell from '../OrganizationWorkspaceShell'

import type {
  FacetContentProps,
  OrganizationFacet,
  OrganizationWorkspaceHeader,
  OrganizationWorkspaceKpis,
  OrganizationWorkspaceProjection
} from '../types'

const buildHeader = (overrides: Partial<OrganizationWorkspaceHeader> = {}): OrganizationWorkspaceHeader => ({
  organizationId: 'org-acme',
  organizationName: 'ACME Corp',
  publicId: 'PUB-ACME',
  industry: 'Tecnología',
  country: 'CL',
  status: 'active',
  active: true,
  hubspotCompanyId: '12345',
  spaceCount: 3,
  membershipCount: 8,
  ...overrides
})

const buildKpis = (overrides: Partial<OrganizationWorkspaceKpis> = {}): OrganizationWorkspaceKpis => ({
  revenueClp: 12_500_000,
  grossMarginPct: 38,
  headcountFte: 4.5,
  ...overrides
})

const buildProjection = (overrides: Partial<OrganizationWorkspaceProjection> = {}): OrganizationWorkspaceProjection => ({
  organizationId: 'org-acme',
  entrypointContext: 'agency',
  relationship: { kind: 'internal_admin', subjectUserId: 'user-1', organizationId: 'org-acme' },
  visibleFacets: ['identity', 'team', 'finance'],
  visibleTabs: [
    { facet: 'identity', label: 'Identidad' },
    { facet: 'team', label: 'Equipo' },
    { facet: 'finance', label: 'Finanzas' }
  ],
  defaultFacet: 'identity',
  allowedActions: [],
  fieldRedactions: {},
  degradedMode: false,
  degradedReason: null,
  cacheKey: 'user-1:org-acme:agency',
  computedAt: new Date('2026-05-08T00:00:00Z'),
  ...overrides
})

const renderShell = (
  overrides: {
    header?: Partial<OrganizationWorkspaceHeader>
    kpis?: Partial<OrganizationWorkspaceKpis> | null
    projection?: Partial<OrganizationWorkspaceProjection>
    activeFacet?: OrganizationFacet | null
    onFacetChange?: (facet: OrganizationFacet) => void
    children?: (facet: OrganizationFacet, ctx: FacetContentProps) => React.ReactNode
  } = {}
) => {
  const header = buildHeader(overrides.header)
  const kpis = overrides.kpis === null ? null : buildKpis(overrides.kpis ?? {})
  const projection = buildProjection(overrides.projection)
  const activeFacet = overrides.activeFacet === undefined ? projection.defaultFacet : overrides.activeFacet
  const onFacetChange = overrides.onFacetChange ?? vi.fn()
  const children = overrides.children ?? ((facet: OrganizationFacet) => <div data-testid='facet-content'>facet:{facet}</div>)

  return {
    ...renderWithTheme(
      <OrganizationWorkspaceShell
        organization={header}
        kpis={kpis}
        projection={projection}
        activeFacet={activeFacet}
        onFacetChange={onFacetChange}
      >
        {children}
      </OrganizationWorkspaceShell>
    ),
    onFacetChange
  }
}

describe('TASK-612 — OrganizationWorkspaceShell', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders header with org name + status chip + breadcrumb', () => {
    renderShell()

    expect(screen.getByText('ACME Corp')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    expect(screen.getByText('Organizaciones')).toBeInTheDocument()
  })

  it('renders 4 KPI cards from the kpis input', () => {
    renderShell()

    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('Margen bruto')).toBeInTheDocument()
    // 'Equipo' and 'Spaces' aparecen también como labels de tabs en la projection
    // por defecto del test, así que el match esperado es múltiple ocurrencia.
    expect(screen.getAllByText('Equipo').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Spaces').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('38%')).toBeInTheDocument()
    expect(screen.getByText('4.5 FTE')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('8 membresías')).toBeInTheDocument()
  })

  it('renders KPI dashes when kpis is null (degraded data, not degraded mode)', () => {
    renderShell({ kpis: null })

    // 3 KPI values become "—"; spaceCount stays as is.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
  })

  it('renders tabs from projection.visibleTabs', () => {
    renderShell()

    expect(screen.getByRole('tab', { name: 'Identidad' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Equipo' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Finanzas' })).toBeInTheDocument()
  })

  it('renders the children render-prop with activeFacet + ctx (organizationId, entrypoint, relationship)', () => {
    const captured: { ctx: FacetContentProps | null } = { ctx: null }

    renderShell({
      activeFacet: 'finance',
      children: (facet, ctx) => {
        captured.ctx = ctx

        return <div data-testid='facet-content'>facet:{facet}</div>
      }
    })

    expect(screen.getByTestId('facet-content')).toHaveTextContent('facet:finance')
    expect(captured.ctx).not.toBeNull()
    expect(captured.ctx?.organizationId).toBe('org-acme')
    expect(captured.ctx?.entrypointContext).toBe('agency')
    expect(captured.ctx?.relationship.kind).toBe('internal_admin')
  })

  it('passes fieldRedactions[activeFacet] to the children render-prop', () => {
    const captured: { ctx: FacetContentProps | null } = { ctx: null }

    renderShell({
      activeFacet: 'finance',
      projection: {
        fieldRedactions: { finance: ['revenuePerFte', 'totalCostClp'] }
      },
      children: (facet, ctx) => {
        captured.ctx = ctx

        return <div>facet:{facet}</div>
      }
    })

    expect(captured.ctx?.fieldRedactions).toEqual(['revenuePerFte', 'totalCostClp'])
  })

  it('renders empty-tabs message when visibleTabs is empty (but not degraded)', () => {
    renderShell({
      projection: { visibleTabs: [], defaultFacet: null },
      activeFacet: null
    })

    expect(screen.getByText('Sin secciones disponibles')).toBeInTheDocument()
  })

  it('renders degraded mode honest message when projection.degradedMode=true (relationship_lookup_failed)', () => {
    renderShell({
      projection: {
        degradedMode: true,
        degradedReason: 'relationship_lookup_failed',
        visibleFacets: [],
        visibleTabs: [],
        defaultFacet: null
      },
      activeFacet: null
    })

    expect(screen.getByText('Workspace en modo degradado')).toBeInTheDocument()
    expect(screen.getByText(/No pudimos resolver tu relación/)).toBeInTheDocument()
    // Degraded mode: no tabs visible, no children rendered.
    expect(screen.queryByTestId('facet-content')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('renders degraded mode for entitlements_lookup_failed reason', () => {
    renderShell({
      projection: {
        degradedMode: true,
        degradedReason: 'entitlements_lookup_failed',
        visibleFacets: [],
        visibleTabs: [],
        defaultFacet: null
      },
      activeFacet: null
    })

    expect(screen.getByText(/No pudimos cargar tus permisos/)).toBeInTheDocument()
  })

  it('renders degraded mode for no_facets_authorized reason', () => {
    renderShell({
      projection: {
        degradedMode: true,
        degradedReason: 'no_facets_authorized',
        visibleFacets: [],
        visibleTabs: [],
        defaultFacet: null
      },
      activeFacet: null
    })

    expect(screen.getByText(/No tenés acceso a ninguna sección/)).toBeInTheDocument()
  })

  it('does not crash when status is unknown (renders generic label)', () => {
    renderShell({ header: { status: 'frozen_zombie' } })

    expect(screen.getByText('Sin estado')).toBeInTheDocument()
  })
})
