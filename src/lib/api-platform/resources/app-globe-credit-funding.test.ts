import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'

const broker = vi.hoisted(() => ({
  propose: vi.fn(),
  confirm: vi.fn()
}))

vi.mock('@/lib/globe/credit-administration-broker', () => ({
  proposeGlobeCreditFunding: broker.propose,
  confirmGlobeCreditFunding: broker.confirm,
  GlobeCreditFundingBrokerError: class GlobeCreditFundingBrokerError extends Error {
    code: string

    constructor(code: string) {
      super(code)
      this.code = code
    }
  }
}))

vi.mock('@/lib/entitlements/runtime', () => ({ can: vi.fn(() => true) }))
vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: vi.fn(value => value)
}))

const { confirmAppGlobeCreditFunding, proposeAppGlobeCreditFunding } = await import('./app-globe-credit-funding')

const context = (overrides: Partial<AppPlatformRequestContext> = {}): AppPlatformRequestContext => ({
  requestId: 'req-1',
  routeKey: 'platform.app.globe.credit_funding.propose',
  version: 'v1',
  tenant: {
    userId: 'user-1',
    clientId: '',
    clientName: '',
    tenantType: 'efeonce_internal',
    roleCodes: [],
    primaryRoleCode: '',
    routeGroups: ['internal'],
    authorizedViews: [],
    projectScopes: [],
    campaignScopes: [],
    businessLines: [],
    serviceModules: [],
    role: '',
    projectIds: [],
    timezone: 'America/Santiago',
    portalHomePath: '/',
    authMode: 'session',
    preferredLocale: 'es-CL',
    tenantDefaultLocale: 'es-CL',
    legacyLocale: 'es-CL',
    effectiveLocale: 'es-CL',
    featureFlags: []
  } as AppPlatformRequestContext['tenant'],
  appSessionId: null,
  authSource: 'sister_platform_oauth',
  oauthCapabilities: ['globe.credits.funding.propose', 'globe.credits.funding.confirm'],
  oauthSessionAuthMode: 'agent',
  rateLimit: {
    limitPerMinute: 120,
    limitPerHour: 5000,
    remainingPerMinute: 119,
    remainingPerHour: 4999,
    resetAt: new Date(Date.now() + 60_000).toISOString()
  },
  ...overrides
})

const proposeBody = {
  globeWorkspaceId: 'greenhouse-org:efeonce',
  poolId: 'pool-main',
  grantCredits: 100,
  periodStart: '2026-08-01T00:00:00.000Z',
  periodEnd: '2026-09-01T00:00:00.000Z'
}

describe('API Platform Globe credit funding resource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    broker.propose.mockResolvedValue({ proposalId: 'p-1', fingerprint: 'f-1', plan: {} })
    broker.confirm.mockResolvedValue({ state: 'completed' })
  })

  it('derives the actor from OAuth tenant and forwards the standard idempotency key', async () => {
    const request = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/propose', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'propose-key' }
    })

    await proposeAppGlobeCreditFunding({ context: context(), request, body: proposeBody })

    expect(broker.propose).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { userId: 'user-1', entitlement: 'platform.globe_credit_funding.propose', authMode: 'agent' },
        idempotencyKey: 'propose-key'
      })
    )
  })

  it('rejects cookie and first-party app sessions before checking the broker', async () => {
    const request = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/propose', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'propose-key' }
    })

    await expect(
      proposeAppGlobeCreditFunding({ context: context({ authSource: 'cookie_session' }), request, body: proposeBody })
    ).rejects.toMatchObject({ statusCode: 401, errorCode: 'missing_token' })
    await expect(
      proposeAppGlobeCreditFunding({ context: context({ authSource: 'first_party_app' }), request, body: proposeBody })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'forbidden' })
    expect(broker.propose).not.toHaveBeenCalled()
  })

  it('rejects missing OAuth capability before calling the broker', async () => {
    const request = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/propose', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'propose-key' }
    })

    await expect(
      proposeAppGlobeCreditFunding({ context: context({ oauthCapabilities: [] }), request, body: proposeBody })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'scope_not_allowed' })
    expect(broker.propose).not.toHaveBeenCalled()
  })

  it('uses a separate confirmation actor and idempotency key', async () => {
    const request = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/confirm', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'confirm-key' }
    })

    await confirmAppGlobeCreditFunding({
      context: context({ routeKey: 'platform.app.globe.credit_funding.confirm' }),
      request,
      body: { globeWorkspaceId: 'greenhouse-org:efeonce', proposalId: 'p-1', fingerprint: 'f-1' }
    })

    expect(broker.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { userId: 'user-1', entitlement: 'platform.globe_credit_funding.confirm', authMode: 'agent' },
        idempotencyKey: 'confirm-key',
        proposalId: 'p-1',
        fingerprint: 'f-1'
      })
    )
  })

  it('does not allow a first-party app bearer to confirm funding', async () => {
    const request = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/confirm', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'confirm-key' }
    })

    await expect(
      confirmAppGlobeCreditFunding({
        context: context({ authSource: 'first_party_app' }),
        request,
        body: { globeWorkspaceId: 'greenhouse-org:efeonce', proposalId: 'p-1', fingerprint: 'f-1' }
      })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'forbidden' })
    expect(broker.confirm).not.toHaveBeenCalled()
  })
})
