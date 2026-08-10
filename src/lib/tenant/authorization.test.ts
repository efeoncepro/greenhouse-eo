/* eslint-disable greenhouse/no-client-portal-view-visibility-bypass --
 * TASK-1685: el sujeto bajo prueba de este archivo ES `hasAuthorizedViewCode`, o sea el carril
 * de rol. Sus fixtures usan viewCodes `cliente.*` a propósito, porque el contrato que verifica
 * —el fail-closed de TASK-1678 para sesiones cliente con claim vacío— sólo se puede expresar
 * con una vista cliente. La regla prohíbe DECIDIR visibilidad de una vista cliente por el rol;
 * acá no se decide nada, se prueba el helper. Sigue vigente: el carril de rol existe y gobierna
 * el portal interno.
 */
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
  hasAnyAuthorizedViewCode,
  hasAuthorizedViewCode,
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

/**
 * TASK-1678 Slice 4 — el `fallback` de lista vacía no aplica a sesiones cliente.
 *
 * Sin esto, degradar la derivación hacia cerrado (devolver `[]` para un tenant `client`)
 * terminaba ABRIENDO todo: los layouts cliente pasan
 * `fallback: tenant.routeGroups.includes('client')`, que para todo cliente es `true`.
 * Es el amplificador que hacía inútil el resto del Slice 4.
 */
describe('empty-claim fallback (TASK-1678)', () => {
  const buildTenant = (overrides: Record<string, unknown>) => ({
    userId: 'user-x',
    clientId: 'cli-1',
    clientName: 'Cliente',
    tenantType: 'client',
    roleCodes: ['client_manager'],
    primaryRoleCode: 'client_manager',
    routeGroups: ['client'],
    authorizedViews: [] as string[],
    projectScopes: [],
    campaignScopes: [],
    businessLines: [],
    serviceModules: [],
    role: 'Client Manager',
    projectIds: [],
    featureFlags: [],
    timezone: 'America/Santiago',
    portalHomePath: '/home',
    authMode: 'sso',
    ...overrides
  })

  it('denies a client session with an empty claim even when the caller passes fallback=true', () => {
    const tenant = buildTenant({}) as never

    expect(hasAuthorizedViewCode({ tenant, viewCode: 'cliente.campanas', fallback: true })).toBe(false)
    expect(hasAnyAuthorizedViewCode({ tenant, viewCodes: ['cliente.campanas'], fallback: true })).toBe(false)
  })

  it('preserves the permissive baseline for an internal session with an empty claim', () => {
    // Sin esto, un fallo de la derivación dejaría a los operadores internos sin portal:
    // se cambia un fail-open del portal cliente por una caída de disponibilidad interna.
    const tenant = buildTenant({
      tenantType: 'efeonce_internal',
      roleCodes: ['hr_payroll'],
      routeGroups: ['internal', 'hr']
    }) as never

    expect(hasAuthorizedViewCode({ tenant, viewCode: 'equipo.nomina', fallback: true })).toBe(true)
    expect(hasAnyAuthorizedViewCode({ tenant, viewCodes: ['equipo.nomina'], fallback: true })).toBe(true)
  })

  it('still honors a non-empty client claim (the fallback is not the decision path)', () => {
    const tenant = buildTenant({ authorizedViews: ['cliente.campanas'] }) as never

    expect(hasAuthorizedViewCode({ tenant, viewCode: 'cliente.campanas', fallback: false })).toBe(true)
    expect(hasAuthorizedViewCode({ tenant, viewCode: 'cliente.equipo', fallback: true })).toBe(false)
  })
})
