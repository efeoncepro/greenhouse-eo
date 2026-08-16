import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'

vi.mock('server-only', () => ({}))

const entitlement = vi.hoisted(() => ({ can: vi.fn(() => true) }))

const talentPool = vi.hoisted(() => ({
  search: vi.fn(),
  profile: vi.fn(),
  flags: vi.fn(() => ({ search: true, mcp: true }))
}))

const audit = vi.hoisted(() => ({ record: vi.fn(async () => undefined) }))

vi.mock('@/lib/entitlements/runtime', () => ({ can: entitlement.can }))
vi.mock('@/lib/hiring/talent-pool', () => ({
  searchTalentPool: talentPool.search,
  getTalentPoolProfile: talentPool.profile,
  recordDelegatedTalentPoolAccess: audit.record,
  talentPoolFlags: talentPool.flags
}))

const { getAppTalentPoolProfile, searchAppTalentPool } = await import('./app-hiring-talent-pool')

const context = (overrides: Partial<AppPlatformRequestContext> = {}): AppPlatformRequestContext => ({
  requestId: 'req-1',
  routeKey: 'platform.app.hiring.talent_pool.search',
  version: 'v1',
  tenant: {
    userId: 'user-1',
    clientId: '',
    clientName: '',
    tenantType: 'efeonce_internal',
    roleCodes: ['people_manager'],
    primaryRoleCode: 'people_manager',
    routeGroups: ['internal'],
    authorizedViews: ['hiring_talent_pool'],
    projectScopes: [],
    campaignScopes: [],
    businessLines: [],
    serviceModules: [],
    role: 'people_manager',
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
  oauthCapabilities: ['hiring.talent_pool.read'],
  oauthWorkspaceBindings: [],
  oauthSessionAuthMode: 'agent',
  oauthClientId: 'efeonce-mcp-hiring',
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

const delegatedRequest = (headers: HeadersInit = {}) =>
  new Request(
    'https://greenhouse.example.test/api/platform/app/hiring/talent-pool?query=content&capability=content_creation&capability=copywriting&seniority=mid&language=es&country=CL&availability=immediate&cursor=next-1&limit=25',
    {
      headers: {
        'x-greenhouse-purpose': 'talent_pool_candidate_review',
        'x-greenhouse-agent-host': 'codex',
        ...headers
      }
    }
  )

describe('API Platform delegated Talent Pool reader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    entitlement.can.mockReturnValue(true)
    talentPool.search.mockResolvedValue({ items: [], nextCursor: null })
    talentPool.profile.mockResolvedValue({ talentProfileId: 'talent-1' })
    talentPool.flags.mockReturnValue({ search: true, mcp: true })
  })

  it('forwards only bounded search filters after capability and delegated-context checks', async () => {
    await searchAppTalentPool({ context: context(), request: delegatedRequest() })

    expect(entitlement.can).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'hiring.talent_pool.read',
      'read',
      'tenant'
    )
    expect(talentPool.search).toHaveBeenCalledWith({
      query: 'content',
      capabilityKeys: ['content_creation', 'copywriting'],
      seniority: 'mid',
      languageCode: 'es',
      countryCode: 'CL',
      availability: 'immediate',
      cursor: 'next-1',
      cursorBinding: 'user-1:efeonce-mcp-hiring',
      limit: 25
    })
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'allowed',
        routeKind: 'search',
        reasonCode: 'authorized',
        purpose: 'talent_pool_candidate_review',
        agentHost: 'codex',
        actorUserId: 'user-1',
        oauthClientId: 'efeonce-mcp-hiring',
        talentProfileId: null
      })
    )
  })

  it('requires the delegated OAuth capability independently from the runtime entitlement', async () => {
    await expect(
      searchAppTalentPool({ context: context({ oauthCapabilities: [] }), request: delegatedRequest() })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'forbidden' })
    expect(talentPool.search).not.toHaveBeenCalled()
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'denied', reasonCode: 'delegated_scope_denied' })
    )
  })

  it.each([
    ['missing purpose', { 'x-greenhouse-purpose': '' }],
    ['wrong purpose', { 'x-greenhouse-purpose': 'general_browsing' }],
    ['missing host', { 'x-greenhouse-agent-host': '' }],
    ['invalid host', { 'x-greenhouse-agent-host': 'host with spaces' }]
  ])('denies %s before touching candidate data', async (_label, headers) => {
    await expect(searchAppTalentPool({ context: context(), request: delegatedRequest(headers) })).rejects.toMatchObject(
      { statusCode: 400, errorCode: 'invalid_delegated_context' }
    )
    expect(talentPool.search).not.toHaveBeenCalled()
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'denied', reasonCode: 'delegated_context_invalid' })
    )
  })

  it('keeps the same canonical reader available to first-party operator sessions', async () => {
    const request = new Request('https://greenhouse.example.test/api/platform/app/hiring/talent-pool?limit=10')

    await searchAppTalentPool({
      context: context({ authSource: 'first_party_app', oauthCapabilities: [] }),
      request
    })

    expect(talentPool.search).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }))
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('keeps the delegated route unavailable until both Talent Pool rollout flags are enabled', async () => {
    talentPool.flags.mockReturnValue({ search: true, mcp: false })

    await expect(searchAppTalentPool({ context: context(), request: delegatedRequest() })).rejects.toMatchObject({
      statusCode: 503,
      errorCode: 'service_unavailable'
    })
    expect(talentPool.search).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('loads profiles only by opaque canonical id after the same delegated checks', async () => {
    await getAppTalentPoolProfile({
      context: context(),
      request: delegatedRequest(),
      talentProfileId: 'talent-1'
    })

    expect(talentPool.profile).toHaveBeenCalledWith('talent-1')
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'allowed', routeKind: 'profile', talentProfileId: 'talent-1' })
    )
  })

  it('fails before all readers when the runtime entitlement is revoked', async () => {
    entitlement.can.mockReturnValue(false)

    await expect(searchAppTalentPool({ context: context(), request: delegatedRequest() })).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'forbidden'
    })
    expect(talentPool.search).not.toHaveBeenCalled()
    expect(talentPool.profile).not.toHaveBeenCalled()
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'denied', reasonCode: 'runtime_capability_denied' })
    )
  })
})
