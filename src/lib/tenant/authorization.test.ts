import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockGetTenantContext = vi.fn()
const mockGetSupervisorScopeForTenant = vi.fn()

vi.mock('@/lib/tenant/get-tenant-context', () => ({
  getTenantContext: (...args: unknown[]) => mockGetTenantContext(...args)
}))

vi.mock('@/lib/reporting-hierarchy/access', () => ({
  getSupervisorScopeForTenant: (...args: unknown[]) => mockGetSupervisorScopeForTenant(...args)
}))

import {
  requirePeopleTenantContext,
  requireTalentReviewTenantContext,
  resolveHrOrgChartAccessContext
} from '@/lib/tenant/authorization'

describe('requirePeopleTenantContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSupervisorScopeForTenant.mockResolvedValue({
      memberId: null,
      directReportCount: 0,
      delegatedSupervisorIds: [],
      visibleMemberIds: [],
      hasDirectReports: false,
      hasDelegatedAuthority: false,
      canAccessSupervisorPeople: false,
      canAccessSupervisorLeave: false
    })
  })

  it('allows people API access when the tenant has the explicit people view', async () => {
    mockGetTenantContext.mockResolvedValue({
      userId: 'user-1',
      clientId: 'efeonce',
      clientName: 'Efeonce',
      tenantType: 'efeonce_internal',
      roleCodes: ['hr_manager'],
      primaryRoleCode: 'hr_manager',
      routeGroups: ['hr'],
      authorizedViews: ['equipo.personas'],
      projectScopes: [],
      campaignScopes: [],
      businessLines: [],
      serviceModules: [],
      role: 'HR Manager',
      projectIds: [],
      featureFlags: [],
      timezone: 'America/Santiago',
      portalHomePath: '/hr',
      authMode: 'sso'
    })

    const result = await requirePeopleTenantContext()

    expect(result.tenant?.userId).toBe('user-1')
    expect(result.errorResponse).toBeNull()
  })

  it('rejects access when neither the people route group nor the explicit people view is present', async () => {
    mockGetTenantContext.mockResolvedValue({
      userId: 'user-2',
      clientId: 'efeonce',
      clientName: 'Efeonce',
      tenantType: 'efeonce_internal',
      roleCodes: ['hr_manager'],
      primaryRoleCode: 'hr_manager',
      routeGroups: ['hr'],
      authorizedViews: ['equipo.departamentos'],
      projectScopes: [],
      campaignScopes: [],
      businessLines: [],
      serviceModules: [],
      role: 'HR Manager',
      projectIds: [],
      featureFlags: [],
      timezone: 'America/Santiago',
      portalHomePath: '/hr',
      authMode: 'sso'
    })

    const result = await requirePeopleTenantContext()

    expect(result.tenant).toBeNull()
    expect(result.errorResponse?.status).toBe(403)
  })

  it('allows supervisor-scoped access when the tenant has visible subtree members but no broad people view', async () => {
    mockGetTenantContext.mockResolvedValue({
      userId: 'user-3',
      clientId: 'efeonce',
      clientName: 'Efeonce',
      tenantType: 'efeonce_internal',
      roleCodes: ['collaborator'],
      primaryRoleCode: 'collaborator',
      routeGroups: ['my'],
      authorizedViews: [],
      projectScopes: [],
      campaignScopes: [],
      businessLines: [],
      serviceModules: [],
      role: 'Collaborator',
      projectIds: [],
      featureFlags: [],
      timezone: 'America/Santiago',
      portalHomePath: '/my',
      authMode: 'sso',
      memberId: 'member-supervisor'
    })

    mockGetSupervisorScopeForTenant.mockResolvedValue({
      memberId: 'member-supervisor',
      directReportCount: 2,
      delegatedSupervisorIds: [],
      visibleMemberIds: ['member-supervisor', 'member-a', 'member-b'],
      hasDirectReports: true,
      hasDelegatedAuthority: false,
      canAccessSupervisorPeople: true,
      canAccessSupervisorLeave: true
    })

    const result = await requirePeopleTenantContext()

    expect(result.tenant?.userId).toBe('user-3')
    expect(result.errorResponse).toBeNull()
    expect(result.accessContext?.accessMode).toBe('supervisor')
    expect(result.accessContext?.supervisorScope?.visibleMemberIds).toContain('member-a')
  })
})

describe('resolveHrOrgChartAccessContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('grants supervisor-scoped org chart access when the tenant has subtree visibility', async () => {
    mockGetSupervisorScopeForTenant.mockResolvedValue({
      memberId: 'member-supervisor',
      directReportCount: 1,
      delegatedSupervisorIds: [],
      visibleMemberIds: ['member-supervisor', 'member-a'],
      hasDirectReports: true,
      hasDelegatedAuthority: false,
      canAccessSupervisorPeople: true,
      canAccessSupervisorLeave: false
    })

    const result = await resolveHrOrgChartAccessContext({
      userId: 'user-3',
      clientId: 'efeonce',
      clientName: 'Efeonce',
      tenantType: 'efeonce_internal',
      roleCodes: ['collaborator'],
      primaryRoleCode: 'collaborator',
      routeGroups: ['my'],
      authorizedViews: [],
      projectScopes: [],
      campaignScopes: [],
      businessLines: [],
      serviceModules: [],
      role: 'Collaborator',
      projectIds: [],
      featureFlags: [],
      timezone: 'America/Santiago',
      portalHomePath: '/hr',
      authMode: 'sso',
      memberId: 'member-supervisor'
    } as any)

    expect(result?.accessMode).toBe('supervisor')
    expect(result?.supervisorScope?.visibleMemberIds).toContain('member-a')
  })

  it('returns broad access when the tenant has the explicit org chart view', async () => {
    const result = await resolveHrOrgChartAccessContext({
      userId: 'user-1',
      clientId: 'efeonce',
      clientName: 'Efeonce',
      tenantType: 'efeonce_internal',
      roleCodes: ['hr_manager'],
      primaryRoleCode: 'hr_manager',
      routeGroups: ['hr'],
      authorizedViews: ['equipo.organigrama'],
      projectScopes: [],
      campaignScopes: [],
      businessLines: [],
      serviceModules: [],
      role: 'HR Manager',
      projectIds: [],
      featureFlags: [],
      timezone: 'America/Santiago',
      portalHomePath: '/hr',
      authMode: 'sso'
    } as any)

    expect(result).toEqual({
      accessMode: 'broad',
      supervisorScope: null
    })
    expect(mockGetSupervisorScopeForTenant).not.toHaveBeenCalled()
  })
})

describe('requireTalentReviewTenantContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows the admin talent review API when the tenant has the same view used by the sidebar', async () => {
    mockGetTenantContext.mockResolvedValue({
      userId: 'user-admin-team',
      clientId: 'efeonce',
      clientName: 'Efeonce',
      tenantType: 'efeonce_internal',
      roleCodes: ['operations_admin'],
      primaryRoleCode: 'operations_admin',
      routeGroups: ['admin'],
      authorizedViews: ['administracion.equipo'],
      projectScopes: [],
      campaignScopes: [],
      businessLines: [],
      serviceModules: [],
      role: 'Operations Admin',
      projectIds: [],
      featureFlags: [],
      timezone: 'America/Santiago',
      portalHomePath: '/admin',
      authMode: 'sso'
    })

    const result = await requireTalentReviewTenantContext()

    expect(result.tenant?.userId).toBe('user-admin-team')
    expect(result.errorResponse).toBeNull()
  })

  it('rejects the admin talent review API when neither the admin team view nor fallback access is present', async () => {
    mockGetTenantContext.mockResolvedValue({
      userId: 'user-no-team-view',
      clientId: 'efeonce',
      clientName: 'Efeonce',
      tenantType: 'efeonce_internal',
      roleCodes: ['finance_analyst'],
      primaryRoleCode: 'finance_analyst',
      routeGroups: ['finance'],
      authorizedViews: ['finanzas.resumen'],
      projectScopes: [],
      campaignScopes: [],
      businessLines: [],
      serviceModules: [],
      role: 'Finance Analyst',
      projectIds: [],
      featureFlags: [],
      timezone: 'America/Santiago',
      portalHomePath: '/finance',
      authMode: 'sso'
    })

    const result = await requireTalentReviewTenantContext()

    expect(result.tenant).toBeNull()
    expect(result.errorResponse?.status).toBe(403)
  })
})
