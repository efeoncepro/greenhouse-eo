import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockGetTenantContext = vi.fn()

vi.mock('@/lib/tenant/get-tenant-context', () => ({
  getTenantContext: (...args: unknown[]) => mockGetTenantContext(...args)
}))

import { requirePeopleTenantContext } from '@/lib/tenant/authorization'

describe('requirePeopleTenantContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
