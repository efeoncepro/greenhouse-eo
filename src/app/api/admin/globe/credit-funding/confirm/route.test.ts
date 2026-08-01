import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({ getServerAuthSession: vi.fn() }))
vi.mock('@/lib/tenant/get-tenant-context', () => ({ getTenantContext: vi.fn() }))
vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: (tenant: unknown) => tenant
}))
vi.mock('@/lib/entitlements/runtime', () => ({ can: vi.fn(() => true) }))
vi.mock('@/lib/globe/credit-administration-broker', () => ({
  confirmGlobeCreditFunding: vi.fn(async () => ({ confirmed: true })),
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
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { confirmGlobeCreditFunding } from '@/lib/globe/credit-administration-broker'
import {
  hasGlobeOAuthWorkspaceBinding,
  resolveGlobeOAuthWorkspaceBindings
} from '@/lib/sister-platforms/oauth-workspace-bindings'

import { POST } from './route'

const tenant = {
  userId: 'operator-42',
  authMode: 'agent',
  clientId: 'client-1',
  clientName: 'Greenhouse',
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

const sessionFor = (overrides: Record<string, unknown> = {}) => ({
  user: {
    ...tenant,
    id: tenant.userId,
    provider: 'agent',
    ...overrides
  }
})

const request = () =>
  new Request('https://greenhouse.test/api/admin/globe/credit-funding/confirm', {
    method: 'POST',
    headers: { 'x-idempotency-key': 'confirm-key-1', 'content-type': 'application/json' },
    body: JSON.stringify({ globeWorkspaceId: 'workspace-1', proposalId: 'proposal-1', fingerprint: 'fp-1' })
  })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getTenantContext).mockResolvedValue(tenant)
  vi.mocked(resolveGlobeOAuthWorkspaceBindings).mockResolvedValue([
    { workspaceId: 'workspace-1', displayName: 'Workspace 1', kind: 'internal', isPrimary: true }
  ])
  vi.mocked(hasGlobeOAuthWorkspaceBinding).mockReturnValue(true)
})

describe('POST /api/admin/globe/credit-funding/confirm — delegated agent provenance', () => {
  it('forwards an authenticated agent mode to the policy-enforcing broker', async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(sessionFor() as never)

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(confirmGlobeCreditFunding).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: {
          userId: 'operator-42',
          entitlement: 'platform.globe_credit_funding.confirm',
          authMode: 'agent'
        }
      })
    )
  })

  it('preserves non-agent provenance for the same policy boundary', async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(sessionFor({ provider: 'google', authMode: 'sso' }) as never)

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(confirmGlobeCreditFunding).toHaveBeenCalledWith(
      expect.objectContaining({ actor: expect.objectContaining({ authMode: 'sso' }) })
    )
  })

  it('rejects confirmation when the session is not bound to the requested workspace', async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(sessionFor() as never)
    vi.mocked(hasGlobeOAuthWorkspaceBinding).mockReturnValue(false)

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(confirmGlobeCreditFunding).not.toHaveBeenCalled()
  })
})
