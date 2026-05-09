import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

const captureMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

const { resolveOrganizationWorkspaceProjection } = await import('./projection')
const { __clearAllProjectionCache, __getProjectionCacheSize } = await import('./cache')

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

const buildSubject = (overrides: Partial<TenantEntitlementSubject> = {}): TenantEntitlementSubject => ({
  userId: 'user-1',
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: ['internal', 'admin'],
  authorizedViews: ['gestion.organizaciones', 'finance.clients'],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  ...overrides
})

const buildResolverRow = (overrides: Record<string, unknown> = {}) => ({
  is_admin: false,
  assignment_id: null,
  member_id: null,
  client_id_assignment: null,
  role_title_override: null,
  start_date: null,
  end_date: null,
  client_id_portal: null,
  ...overrides
})

describe('TASK-611 — resolveOrganizationWorkspaceProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __clearAllProjectionCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('admin internal subject sees all 9 facets across agency entrypoint', async () => {
    mockQuery.mockResolvedValueOnce([buildResolverRow({ is_admin: true })])

    const result = await resolveOrganizationWorkspaceProjection({
      subject: buildSubject({ tenantType: 'efeonce_internal', roleCodes: ['efeonce_admin'], routeGroups: ['admin'] }),
      organizationId: 'org-acme',
      entrypointContext: 'agency'
    })

    expect(result.degradedMode).toBe(false)
    expect(result.relationship.kind).toBe('internal_admin')
    expect(result.visibleFacets).toEqual(
      expect.arrayContaining(['identity', 'spaces', 'team', 'economics', 'delivery', 'finance', 'crm', 'services', 'staffAug'])
    )
    expect(result.visibleFacets).toHaveLength(9)
    expect(result.defaultFacet).toBe('identity')
  })

  it('default facet for finance entrypoint is finance when authorized', async () => {
    mockQuery.mockResolvedValueOnce([buildResolverRow({ is_admin: true })])

    const result = await resolveOrganizationWorkspaceProjection({
      subject: buildSubject({ roleCodes: ['efeonce_admin'], routeGroups: ['admin'] }),
      organizationId: 'org-acme',
      entrypointContext: 'finance'
    })

    expect(result.defaultFacet).toBe('finance')
  })

  it('client_portal entrypoint defaults to identity (preferred order respected)', async () => {
    mockQuery.mockResolvedValueOnce([buildResolverRow({ client_id_portal: 'client-globe-sky' })])

    const result = await resolveOrganizationWorkspaceProjection({
      subject: buildSubject({
        userId: 'user-sky',
        tenantType: 'client',
        roleCodes: ['client_executive'],
        primaryRoleCode: 'client_executive',
        routeGroups: ['client'],
        authorizedViews: []
      }),
      organizationId: 'org-sky',
      entrypointContext: 'client_portal'
    })

    expect(result.relationship.kind).toBe('client_portal_user')
    expect(result.degradedMode).toBe(false)
    // Spec Apéndice A: client_portal_user con scope 'own' ve identity, team, delivery, services.
    // Default facet por entrypoint client_portal sigue el preferred order [identity, team, delivery, services].
    expect(result.defaultFacet).toBe('identity')
    expect(result.visibleFacets).toEqual(expect.arrayContaining(['identity', 'team', 'delivery', 'services']))
  })

  it('returns degraded mode when relationship resolver throws (PG failure)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'))

    const result = await resolveOrganizationWorkspaceProjection({
      subject: buildSubject(),
      organizationId: 'org-acme',
      entrypointContext: 'agency'
    })

    expect(result.degradedMode).toBe(true)
    expect(result.degradedReason).toBe('relationship_lookup_failed')
    expect(result.visibleFacets).toEqual([])
    expect(captureMock).toHaveBeenCalledWith(
      expect.any(Error),
      'identity',
      expect.objectContaining({
        tags: expect.objectContaining({ stage: 'relationship' })
      })
    )
  })

  it('returns degraded mode no_facets_authorized for unrelated_internal with no organization.* entitlements', async () => {
    mockQuery.mockResolvedValueOnce([buildResolverRow()])

    const result = await resolveOrganizationWorkspaceProjection({
      subject: buildSubject({
        userId: 'user-internal-bystander',
        tenantType: 'efeonce_internal',
        roleCodes: ['collaborator'],
        primaryRoleCode: 'collaborator',
        routeGroups: ['internal', 'my'],
        authorizedViews: []
      }),
      organizationId: 'org-acme',
      entrypointContext: 'agency'
    })

    expect(result.relationship.kind).toBe('unrelated_internal')
    expect(result.degradedMode).toBe(true)
    expect(result.degradedReason).toBe('no_facets_authorized')
  })

  it('caches result for 30s — second call within TTL does not hit DB again', async () => {
    mockQuery.mockResolvedValueOnce([buildResolverRow({ is_admin: true })])

    const subject = buildSubject({ roleCodes: ['efeonce_admin'], routeGroups: ['admin'] })

    const a = await resolveOrganizationWorkspaceProjection({
      subject,
      organizationId: 'org-acme',
      entrypointContext: 'agency'
    })

    const b = await resolveOrganizationWorkspaceProjection({
      subject,
      organizationId: 'org-acme',
      entrypointContext: 'agency'
    })

    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(b.cacheKey).toBe(a.cacheKey)
    expect(__getProjectionCacheSize()).toBe(1)
  })

  it('different entrypointContext produces different cache entries (separate projections)', async () => {
    mockQuery.mockResolvedValue([buildResolverRow({ is_admin: true })])

    const subject = buildSubject({ roleCodes: ['efeonce_admin'], routeGroups: ['admin'] })

    await resolveOrganizationWorkspaceProjection({
      subject,
      organizationId: 'org-acme',
      entrypointContext: 'agency'
    })

    await resolveOrganizationWorkspaceProjection({
      subject,
      organizationId: 'org-acme',
      entrypointContext: 'finance'
    })

    expect(__getProjectionCacheSize()).toBe(2)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('exposes computedAt as a Date and cacheKey including all 3 dimensions', async () => {
    mockQuery.mockResolvedValueOnce([buildResolverRow({ is_admin: true })])

    const result = await resolveOrganizationWorkspaceProjection({
      subject: buildSubject({ userId: 'user-zeta', roleCodes: ['efeonce_admin'], routeGroups: ['admin'] }),
      organizationId: 'org-acme',
      entrypointContext: 'admin'
    })

    expect(result.computedAt).toBeInstanceOf(Date)
    expect(result.cacheKey).toBe('user-zeta:org-acme:admin')
  })

  it('admin allowed actions include sensitive read/export/approve for identity + finance facets', async () => {
    mockQuery.mockResolvedValueOnce([buildResolverRow({ is_admin: true })])

    const result = await resolveOrganizationWorkspaceProjection({
      subject: buildSubject({ roleCodes: ['efeonce_admin'], routeGroups: ['admin'] }),
      organizationId: 'org-acme',
      entrypointContext: 'admin'
    })

    // Spec Apéndice A: efeonce_admin tiene grants 'all' a las 11 organization.* capabilities.
    // Las sensitive capabilities (organization.identity_sensitive, organization.finance_sensitive)
    // surfacean en allowedActions. finance_sensitive expone export + approve adicionalmente.
    const actionKeys = result.allowedActions.map(action => action.actionKey)

    expect(actionKeys).toContain('organization.identity_sensitive.read')
    expect(actionKeys).toContain('organization.finance_sensitive.read')
    expect(actionKeys).toContain('organization.finance_sensitive.export')
    expect(actionKeys).toContain('organization.finance_sensitive.approve')
  })
})
