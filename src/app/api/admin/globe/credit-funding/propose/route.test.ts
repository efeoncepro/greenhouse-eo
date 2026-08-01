import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({ getServerAuthSession: vi.fn() }))
vi.mock('@/lib/tenant/get-tenant-context', () => ({ getTenantContext: vi.fn() }))
vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: (tenant: unknown) => tenant
}))
vi.mock('@/lib/entitlements/runtime', () => ({ can: vi.fn(() => true) }))
vi.mock('@/lib/globe/credit-administration-broker', () => ({
  proposeGlobeCreditFunding: vi.fn(async () => ({ proposalId: 'proposal-1', fingerprint: 'fp-1' })),
  GlobeCreditFundingBrokerError: class GlobeCreditFundingBrokerError extends Error {}
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/globe/client', () => ({
  GreenhouseGlobeConfigurationError: class GreenhouseGlobeConfigurationError extends Error {}
}))
vi.mock('@/lib/sister-platforms/oauth-workspace-bindings', () => ({
  resolveGlobeOAuthWorkspaceBindings: vi.fn(),
  hasGlobeOAuthWorkspaceBinding: vi.fn()
}))

import { getServerAuthSession } from '@/lib/auth'
import { proposeGlobeCreditFunding } from '@/lib/globe/credit-administration-broker'
import {
  hasGlobeOAuthWorkspaceBinding,
  resolveGlobeOAuthWorkspaceBindings
} from '@/lib/sister-platforms/oauth-workspace-bindings'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import { POST } from './route'

const tenant = {
  userId: 'operator-42',
  authMode: 'sso',
  clientId: 'efeonce',
  clientName: 'Efeonce',
  tenantType: 'efeonce_internal' as const,
  roleCodes: ['admin'],
  primaryRoleCode: 'admin',
  routeGroups: [],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  role: 'admin',
  projectIds: [],
  featureFlags: [],
  timezone: 'UTC',
  portalHomePath: '/admin',
  preferredLocale: null,
  tenantDefaultLocale: null,
  legacyLocale: null,
  effectiveLocale: 'es-CL' as const
}

const request = (workspaceId = 'greenhouse-org:efeonce') =>
  new Request('https://greenhouse.test/api/admin/globe/credit-funding/propose', {
    method: 'POST',
    headers: { 'x-idempotency-key': 'propose-key-1', 'content-type': 'application/json' },
    body: JSON.stringify({
      globeWorkspaceId: workspaceId,
      poolId: 'pool-august',
      grantCredits: 100,
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-09-01T00:00:00.000Z'
    })
  })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerAuthSession).mockResolvedValue({
    user: { ...tenant, id: tenant.userId, provider: 'google' }
  } as never)
  vi.mocked(getTenantContext).mockResolvedValue(tenant)
  vi.mocked(resolveGlobeOAuthWorkspaceBindings).mockResolvedValue([
    { workspaceId: 'greenhouse-org:efeonce', displayName: 'Efeonce', kind: 'internal', isPrimary: true }
  ])
  vi.mocked(hasGlobeOAuthWorkspaceBinding).mockImplementation(
    (bindings, workspaceId) => bindings.some(binding => binding.workspaceId === workspaceId)
  )
})

describe('POST /api/admin/globe/credit-funding/propose — workspace binding', () => {
  it('proposes funding for an active bound workspace', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(proposeGlobeCreditFunding).toHaveBeenCalledWith(
      expect.objectContaining({ globeWorkspaceId: 'greenhouse-org:efeonce' })
    )
  })

  it('rejects a syntactically valid but unbound workspace', async () => {
    const response = await POST(request('globe-workspace:other'))

    expect(response.status).toBe(403)
    expect(proposeGlobeCreditFunding).not.toHaveBeenCalled()
  })
})
