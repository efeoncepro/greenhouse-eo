import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'

const broker = vi.hoisted(() => ({
  propose: vi.fn(),
  confirm: vi.fn()
}))

const recovery = vi.hoisted(() => ({
  status: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  reconcile: vi.fn()
}))

const oneShot = vi.hoisted(() => ({ execute: vi.fn() }))

const entitlement = vi.hoisted(() => ({ can: vi.fn(() => true) }))

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

vi.mock('@/lib/globe/credit-capacity-status', () => ({
  readGlobeCreditCapacityStatus: recovery.status,
  GlobeCreditCapacityStatusError: class GlobeCreditCapacityStatusError extends Error {}
}))
vi.mock('@/lib/globe/credit-funding-operations', () => ({
  listGlobeCreditFundingOperations: recovery.list,
  getGlobeCreditFundingOperation: recovery.get,
  reconcileGlobeCreditFundingOperation: recovery.reconcile,
  isGlobeCreditFundingOperationState: (value: string | undefined) => value === 'completed',
  GlobeCreditFundingOperationError: class GlobeCreditFundingOperationError extends Error {}
}))
vi.mock('@/lib/globe/credit-funding-one-shot-executor', () => ({
  executeOneShotGlobeCreditFunding: oneShot.execute
}))
vi.mock('@/lib/globe/credit-funding-one-shot-authority', () => ({
  GlobeCreditFundingAuthorityError: class GlobeCreditFundingAuthorityError extends Error {
    code: string

    constructor(code: string) {
      super(code)
      this.code = code
    }
  }
}))
vi.mock('@/lib/entitlements/runtime', () => ({ can: entitlement.can }))
vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: vi.fn(value => value)
}))

const {
  confirmAppGlobeCreditFunding,
  ensureAppGlobeCreditFunding,
  getAppGlobeCreditCapacityStatus,
  getAppGlobeCreditFundingOperation,
  listAppGlobeCreditFundingOperations,
  previewAppGlobeCreditFunding,
  proposeAppGlobeCreditFunding,
  reconcileAppGlobeCreditFundingOperation
} = await import('./app-globe-credit-funding')

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
  oauthCapabilities: [
    'globe.credits.funding.propose',
    'globe.credits.funding.confirm',
    'globe.credits.funding.read',
    'globe.credits.funding.reconcile',
    'globe.credits.funding.ensure'
  ],
  oauthWorkspaceBindings: [
    {
      workspaceId: 'greenhouse-org:efeonce',
      displayName: 'Efeonce',
      kind: 'internal',
      isPrimary: true
    }
  ],
  oauthSessionAuthMode: 'agent',
  oauthClientId: 'greenhouse-admin-cli',
  oauthAccessTokenId: 'spoauth-token-1',
  oauthCorrelationId: 'oauth-correlation-1',
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
    recovery.status.mockResolvedValue({ schemaVersion: '1', state: 'ready' })
    recovery.list.mockResolvedValue({ schemaVersion: '1', items: [] })
    recovery.get.mockResolvedValue({ schemaVersion: '1', operationId: 'op-1' })
    recovery.reconcile.mockResolvedValue({ schemaVersion: '1', operationId: 'op-1', state: 'reconciled' })
    oneShot.execute.mockResolvedValue({ authorityId: 'authority-1', outcome: 'completed' })
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

  it('executes one-shot ensure with OAuth actor, token evidence and bound workspaces', async () => {
    await ensureAppGlobeCreditFunding({ context: context(), body: { authorityId: 'authority-1' } })

    expect(entitlement.can).toHaveBeenCalledWith(
      expect.anything(),
      'platform.globe_credit_funding.ensure',
      'execute',
      'all'
    )
    expect(oneShot.execute).toHaveBeenCalledWith({
      authorityId: 'authority-1',
      executorUserId: 'user-1',
      executorOauthClientId: 'greenhouse-admin-cli',
      oauthAccessTokenId: 'spoauth-token-1',
      actorAuthMode: 'agent',
      correlationId: 'oauth-correlation-1',
      allowedGlobeWorkspaceIds: ['greenhouse-org:efeonce']
    })
  })

  it('preserves an authenticated human OAuth mode for exact authority binding', async () => {
    await ensureAppGlobeCreditFunding({
      context: context({ oauthSessionAuthMode: 'microsoft_sso' }),
      body: { authorityId: 'authority-1' }
    })

    expect(oneShot.execute).toHaveBeenCalledWith(
      expect.objectContaining({ actorAuthMode: 'microsoft_sso', executorUserId: 'user-1' })
    )
  })

  it('refuses one-shot ensure without authenticated OAuth provenance', async () => {
    await expect(
      ensureAppGlobeCreditFunding({
        context: context({ oauthSessionAuthMode: 'unknown' }),
        body: { authorityId: 'authority-1' }
      })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'forbidden' })
    expect(oneShot.execute).not.toHaveBeenCalled()
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

  it('rejects a workspace that is not bound to the OAuth session', async () => {
    const request = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/propose', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'propose-key' }
    })

    await expect(
      proposeAppGlobeCreditFunding({
        context: context(),
        request,
        body: { ...proposeBody, globeWorkspaceId: 'globe-workspace:other' }
      })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'binding_not_active' })
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

  it('does not confirm funding for an unbound workspace', async () => {
    const request = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/confirm', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'confirm-key' }
    })

    await expect(
      confirmAppGlobeCreditFunding({
        context: context({ routeKey: 'platform.app.globe.credit_funding.confirm' }),
        request,
        body: { globeWorkspaceId: 'globe-workspace:other', proposalId: 'p-1', fingerprint: 'f-1' }
      })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'binding_not_active' })
    expect(broker.confirm).not.toHaveBeenCalled()
  })

  it('reads capacity status with the read scope, entitlement and bound workspace', async () => {
    const request = new Request(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/status?globeWorkspaceId=greenhouse-org%3Aefeonce&requestedCredits=250&projectId=project-1'
    )

    await expect(getAppGlobeCreditCapacityStatus({ context: context(), request })).resolves.toEqual({
      status: { schemaVersion: '1', state: 'ready' }
    })
    expect(entitlement.can).toHaveBeenCalledWith(expect.anything(), 'platform.globe_credit_funding.read', 'read', 'all')
    expect(recovery.status).toHaveBeenCalledWith({
      globeWorkspaceId: 'greenhouse-org:efeonce',
      requestedCredits: 250,
      projectId: 'project-1'
    })
  })

  it('rejects capacity reads when the bearer lacks the dedicated read scope', async () => {
    const request = new Request(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/status?globeWorkspaceId=greenhouse-org%3Aefeonce&requestedCredits=250'
    )

    await expect(
      getAppGlobeCreditCapacityStatus({
        context: context({ oauthCapabilities: ['globe.credits.funding.propose'] }),
        request
      })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'scope_not_allowed' })
    expect(recovery.status).not.toHaveBeenCalled()
  })

  it('uses the same pure capacity reader for preview and rejects an unbound workspace', async () => {
    await expect(
      previewAppGlobeCreditFunding({
        context: context(),
        body: { globeWorkspaceId: 'globe-workspace:other', requestedCredits: 50 }
      })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'binding_not_active' })
    expect(recovery.status).not.toHaveBeenCalled()
  })

  it('lists and gets authoritative operations without accepting caller identity', async () => {
    const listRequest = new Request(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/operations?globeWorkspaceId=greenhouse-org%3Aefeonce&limit=25&state=completed'
    )

    const getRequest = new Request(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/operations/op-1?globeWorkspaceId=greenhouse-org%3Aefeonce'
    )

    await listAppGlobeCreditFundingOperations({ context: context(), request: listRequest })
    await getAppGlobeCreditFundingOperation({ context: context(), request: getRequest, operationId: 'op-1' })

    expect(recovery.list).toHaveBeenCalledWith({
      globeWorkspaceId: 'greenhouse-org:efeonce',
      limit: 25,
      state: 'completed'
    })
    expect(recovery.get).toHaveBeenCalledWith({ globeWorkspaceId: 'greenhouse-org:efeonce', operationId: 'op-1' })
  })

  it('reconciles through the command primitive with a mandatory idempotency key', async () => {
    const request = new Request(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/operations/op-1/reconcile',
      { method: 'POST', headers: { 'Idempotency-Key': 'reconcile-key' } }
    )

    await reconcileAppGlobeCreditFundingOperation({
      context: context(),
      request,
      operationId: 'op-1',
      body: { globeWorkspaceId: 'greenhouse-org:efeonce', actor: 'forged' }
    })

    expect(entitlement.can).toHaveBeenCalledWith(
      expect.anything(),
      'platform.globe_credit_funding.reconcile',
      'execute',
      'all'
    )
    expect(recovery.reconcile).toHaveBeenCalledWith({
      globeWorkspaceId: 'greenhouse-org:efeonce',
      operationId: 'op-1',
      idempotencyKey: 'reconcile-key'
    })
  })
})
