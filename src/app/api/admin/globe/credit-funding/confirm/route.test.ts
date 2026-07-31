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

import { getServerAuthSession } from '@/lib/auth'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { confirmGlobeCreditFunding } from '@/lib/globe/credit-administration-broker'

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
})

describe('POST /api/admin/globe/credit-funding/confirm — agent provenance gate', () => {
  it('rejects agent provider before the funding broker and emits a sanitized audit event', async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(sessionFor() as never)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toMatchObject({ code: 'globe_funding_agent_confirmation_forbidden', actionable: false })
    expect(confirmGlobeCreditFunding).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'greenhouse.globe_credit_funding.confirm_blocked',
        reason: 'agent_auth_provenance',
        userId: 'operator-42',
        provider: 'agent',
        authMode: 'agent'
      })
    )

    warn.mockRestore()
  })

  it('rejects authMode agent even when provider is not agent', async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(sessionFor({ provider: 'credentials' }) as never)

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(confirmGlobeCreditFunding).not.toHaveBeenCalled()
  })

  it('allows a non-agent session to reach the confirm broker', async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(sessionFor({ provider: 'google', authMode: 'sso' }) as never)

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(confirmGlobeCreditFunding).toHaveBeenCalledOnce()
  })
})
