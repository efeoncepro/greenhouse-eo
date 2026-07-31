import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  decodeAppAccessToken: vi.fn(),
  resolveAppSessionTenant: vi.fn(),
  resolveOAuthUserinfo: vi.fn(),
  getTenantAccessRecordByUserId: vi.fn(),
  getTenantContext: vi.fn(),
  query: vi.fn(),
  recordRequestLog: vi.fn()
}))

vi.mock('@/lib/api-platform/core/app-sessions', () => ({
  decodeAppAccessToken: mocks.decodeAppAccessToken,
  resolveAppSessionTenant: mocks.resolveAppSessionTenant,
  revokeFirstPartyAppSession: vi.fn()
}))
vi.mock('@/lib/sister-platforms/oauth-broker', () => ({
  getOAuthRequestAuditMetadata: vi.fn(() => ({ correlationId: 'corr-1' })),
  resolveSisterPlatformOAuthUserinfo: mocks.resolveOAuthUserinfo,
  SisterPlatformOAuthError: class SisterPlatformOAuthError extends Error {
    statusCode: number

    constructor(message: string, options?: { statusCode?: number }) {
      super(message)
      this.statusCode = options?.statusCode ?? 400
    }
  }
}))
vi.mock('@/lib/tenant/access', () => ({ getTenantAccessRecordByUserId: mocks.getTenantAccessRecordByUserId }))
vi.mock('@/lib/tenant/get-tenant-context', () => ({ getTenantContext: mocks.getTenantContext }))
vi.mock('@/lib/db', () => ({ query: mocks.query }))
vi.mock('@/lib/api-platform/core/request-logging', () => ({
  getApiPlatformIpHash: vi.fn(() => null),
  getApiPlatformUserAgentHash: vi.fn(() => null),
  recordApiPlatformRequestLog: mocks.recordRequestLog
}))

const { runAppReadRoute } = await import('./app-auth')

const tenant = {
  userId: 'human-1',
  clientId: '',
  clientName: '',
  tenantType: 'efeonce_internal',
  roleCodes: ['EFEONCE_ADMIN'],
  primaryRoleCode: 'EFEONCE_ADMIN',
  routeGroups: ['internal'],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  role: 'EFEONCE_ADMIN',
  projectIds: [],
  featureFlags: [],
  timezone: 'America/Santiago',
  portalHomePath: '/home',
  authMode: 'credentials',
  preferredLocale: 'es-CL',
  tenantDefaultLocale: 'es-CL',
  legacyLocale: 'es-CL',
  effectiveLocale: 'es-CL'
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.query.mockResolvedValue([{ requests_last_minute: 0, requests_last_hour: 0 }])
  mocks.recordRequestLog.mockResolvedValue(undefined)
})

describe('API Platform app bearer authentication', () => {
  it('accepts a revalidated sister-platform OAuth token and exposes only its capabilities', async () => {
    mocks.decodeAppAccessToken.mockRejectedValue(new Error('not_first_party_app_token'))
    mocks.resolveOAuthUserinfo.mockResolvedValue({
      identity: {
        sub: 'greenhouse:user:human-1',
        capabilities: ['globe.credits.funding.propose', 'globe.credits.funding.confirm']
      }
    })
    mocks.getTenantAccessRecordByUserId.mockResolvedValue(tenant)

    const response = await runAppReadRoute({
      request: new Request('https://greenhouse.test/api/platform/app/test', {
        headers: { authorization: 'Bearer oauth-token' }
      }),
      routeKey: 'platform.app.test',
      handler: async context => ({
        data: {
          authSource: context.authSource,
          appSessionId: context.appSessionId,
          capabilities: context.oauthCapabilities
        }
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        authSource: 'sister_platform_oauth',
        appSessionId: null,
        capabilities: ['globe.credits.funding.propose', 'globe.credits.funding.confirm']
      }
    })
    expect(mocks.getTenantAccessRecordByUserId).toHaveBeenCalledWith('human-1')
  })

  it('keeps first-party app tokens on their existing session lane', async () => {
    mocks.decodeAppAccessToken.mockResolvedValue({ sid: 'app-session-1', sub: 'human-1' })
    mocks.resolveAppSessionTenant.mockResolvedValue(tenant)

    const response = await runAppReadRoute({
      request: new Request('https://greenhouse.test/api/platform/app/test', {
        headers: { authorization: 'Bearer app-token' }
      }),
      routeKey: 'platform.app.test',
      handler: async context => ({ data: { authSource: context.authSource, appSessionId: context.appSessionId } })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: { authSource: 'first_party_app', appSessionId: 'app-session-1' }
    })
    expect(mocks.resolveOAuthUserinfo).not.toHaveBeenCalled()
  })

  it('rejects an OAuth identity whose subject is outside the Greenhouse user namespace', async () => {
    mocks.decodeAppAccessToken.mockRejectedValue(new Error('not_first_party_app_token'))
    mocks.resolveOAuthUserinfo.mockResolvedValue({
      identity: { sub: 'external:user:1', capabilities: ['globe.credits.funding.confirm'] }
    })

    const response = await runAppReadRoute({
      request: new Request('https://greenhouse.test/api/platform/app/test', {
        headers: { authorization: 'Bearer oauth-token' }
      }),
      routeKey: 'platform.app.test',
      handler: async () => ({ data: { unexpected: true } })
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ errors: [{ code: 'invalid_token' }] })
  })
})
