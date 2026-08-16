import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const db = vi.hoisted(() => ({
  query: vi.fn<(text: string, values?: unknown[]) => Promise<unknown[]>>().mockResolvedValue([])
}))

const broker = vi.hoisted(() => ({
  buildIdentity: vi.fn(async () => ({
    workspaceBindings: [
      { workspaceId: 'greenhouse-org:efeonce', displayName: 'Efeonce', kind: 'internal', isPrimary: true }
    ]
  }))
}))

vi.mock('@/lib/db', () => ({ query: db.query }))
vi.mock('./oauth-broker', () => ({
  buildBrokerSisterPlatformOAuthIdentityPayload: broker.buildIdentity,
  loadSisterPlatformOAuthClient: vi.fn(),
  recordSisterPlatformOAuthAuditEvent: vi.fn(async () => undefined)
}))

import {
  exchangeMcpGatewayToken,
  MCP_EXCHANGED_TOKEN_TTL_SECONDS,
  MCP_FUNDING_GREENHOUSE_SCOPE,
  MCP_FUNDING_INPUT_SCOPE,
  MCP_GATEWAY_OAUTH_CLIENT_ID,
  MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE,
  MCP_HIRING_INPUT_SCOPE,
  MCP_HIRING_OAUTH_CLIENT_ID,
  MCP_HIRING_REVIEW_OAUTH_CLIENT_ID,
  MCP_TALENT_POOL_GREENHOUSE_SCOPE,
  McpTokenExchangeError,
  RFC8693_ACCESS_TOKEN_TYPE,
  RFC8693_TOKEN_EXCHANGE_GRANT
} from './mcp-token-exchange'
import { parseSisterPlatformOAuthPolicy } from './oauth-policy'

const env = {
  NODE_ENV: 'test',
  GREENHOUSE_MCP_TOKEN_EXCHANGE_ENABLED: 'true',
  GREENHOUSE_MCP_TOKEN_EXCHANGE_AUDIENCE:
    'https://greenhouse.example.test/api/integrations/v1/sister-platforms/oauth/token',
  GREENHOUSE_MCP_GATEWAY_SERVICE_ACCOUNT_EMAILS: 'efeonce-mcp-gateway@efeonce-group.iam.gserviceaccount.com',
  GREENHOUSE_MCP_ENTRA_TENANT_ID: 'tenant-1',
  GREENHOUSE_MCP_ENTRA_AUDIENCE: 'api://mcp-resource',
  GREENHOUSE_MCP_ENTRA_AZP: 'mcp-client-app-id',
  GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS: MCP_GATEWAY_OAUTH_CLIENT_ID
} as unknown as NodeJS.ProcessEnv

const client = {
  oauthClientId: 'spoauth-client-mcp',
  consumerId: 'consumer-mcp',
  sisterPlatformKey: 'mcp',
  consumerName: 'Efeonce MCP',
  consumerStatus: 'active',
  consumerExpiresAt: null,
  clientId: MCP_GATEWAY_OAUTH_CLIENT_ID,
  clientName: 'Efeonce MCP Gateway',
  clientStatus: 'active',
  clientType: 'confidential',
  requireHumanSession: false,
  redirectUris: ['https://mcp.efeonce.org/oauth/callback'],
  allowedScopes: [MCP_FUNDING_GREENHOUSE_SCOPE],
  codeTtlSeconds: 300,
  accessTokenTtlSeconds: 300,
  requirePkce: true,
  issueIdentityInline: false,
  policy: {
    schemaVersion: '1',
    audience: { tenantTypes: ['efeonce_internal'] },
    requiredScopes: [MCP_FUNDING_GREENHOUSE_SCOPE],
    capabilityScopes: [MCP_FUNDING_GREENHOUSE_SCOPE],
    claims: { includeGreenhouseRoles: false },
    revocation: { mode: 'userinfo_revalidation', revalidateAfterSeconds: 60, requireOnPrivilegedAction: true }
  },
  metadata: { workspaceBindingProvider: 'globe' }
} as const

const tenant = {
  userId: 'user-1',
  email: 'operator@efeonce.cl',
  fullName: 'Operator',
  active: true,
  status: 'active',
  tenantType: 'efeonce_internal',
  clientId: 'efeonce',
  clientName: 'Efeonce',
  roleCodes: ['efeonce_admin'],
  authMode: 'microsoft_sso'
}

const request = {
  requestUrl: env.GREENHOUSE_MCP_TOKEN_EXCHANGE_AUDIENCE!,
  workloadToken: 'google-id-token',
  grantType: RFC8693_TOKEN_EXCHANGE_GRANT,
  clientId: MCP_GATEWAY_OAUTH_CLIENT_ID,
  subjectToken: 'entra-access-token',
  subjectTokenType: RFC8693_ACCESS_TOKEN_TYPE,
  requestedTokenType: RFC8693_ACCESS_TOKEN_TYPE,
  requestedScope: MCP_FUNDING_GREENHOUSE_SCOPE,
  auditMetadata: { correlationId: 'correlation-1', ipHash: null, userAgentHash: null }
} as const

const baseDependencies = () => ({
  verifyGoogleIdToken: vi.fn(async () => ({
    audience: env.GREENHOUSE_MCP_TOKEN_EXCHANGE_AUDIENCE!,
    email: 'efeonce-mcp-gateway@efeonce-group.iam.gserviceaccount.com',
    emailVerified: true,
    subject: 'google-workload-subject'
  })),
  verifyEntraToken: vi.fn(async () => ({
    tenantId: 'tenant-1',
    objectId: 'oid-1',
    authorizedParty: 'mcp-client-app-id',
    scopes: [MCP_FUNDING_INPUT_SCOPE]
  })),
  resolveUser: vi.fn(async (): Promise<any> => tenant),
  loadClient: vi.fn(async (): Promise<any> => client),
  authorizeFunding: vi.fn(() => true),
  issueToken: vi.fn(async () => ({ accessTokenId: 'spoauth-token-1', accessToken: 'opaque-token' })),
  now: () => new Date('2026-08-01T12:00:00.000Z')
})

describe('MCP RFC8693 token exchange', () => {
  beforeEach(() => vi.clearAllMocks())

  it('narrows a verified Entra subject to the one Greenhouse funding capability for five minutes', async () => {
    const dependencies = baseDependencies()
    const result = await exchangeMcpGatewayToken(request, dependencies, env)

    expect(result).toEqual({
      accessTokenId: 'spoauth-token-1',
      accessToken: 'opaque-token',
      correlationId: 'correlation-1',
      expiresIn: MCP_EXCHANGED_TOKEN_TTL_SECONDS,
      scope: MCP_FUNDING_GREENHOUSE_SCOPE
    })
    expect(dependencies.resolveUser).toHaveBeenCalledWith('tenant-1', 'oid-1')
    expect(dependencies.issueToken).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'correlation-1',
        expiresAt: '2026-08-01T12:05:00.000Z',
        entraTenantId: 'tenant-1',
        entraObjectId: 'oid-1'
      })
    )
  })

  it('mints an independent delegated Talent Pool read token without requiring a Globe workspace', async () => {
    const hiringClient = {
      ...client,
      oauthClientId: 'spoauth-client-mcp-hiring',
      clientId: MCP_HIRING_OAUTH_CLIENT_ID,
      clientName: 'Efeonce MCP Hiring reader',
      allowedScopes: [MCP_TALENT_POOL_GREENHOUSE_SCOPE],
      policy: {
        ...client.policy,
        requiredScopes: [MCP_TALENT_POOL_GREENHOUSE_SCOPE],
        capabilityScopes: [MCP_TALENT_POOL_GREENHOUSE_SCOPE],
        revocation: { ...client.policy.revocation, revalidateAfterSeconds: 15 }
      },
      metadata: { resourceFamily: 'hiring' }
    }

    const dependencies = {
      ...baseDependencies(),
      verifyEntraToken: vi.fn(async () => ({
        tenantId: 'tenant-1',
        objectId: 'oid-1',
        authorizedParty: 'mcp-client-app-id',
        scopes: [MCP_HIRING_INPUT_SCOPE]
      })),
      loadClient: vi.fn(async (): Promise<any> => hiringClient),
      authorizeTalentPool: vi.fn(() => true)
    }

    const hiringRequest = {
      ...request,
      clientId: MCP_HIRING_OAUTH_CLIENT_ID,
      requestedScope: MCP_TALENT_POOL_GREENHOUSE_SCOPE
    }

    const hiringEnv = {
      ...env,
      GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS: `${MCP_GATEWAY_OAUTH_CLIENT_ID},${MCP_HIRING_OAUTH_CLIENT_ID}`
    }

    expect(() => parseSisterPlatformOAuthPolicy(hiringClient.policy)).not.toThrow()

    await expect(exchangeMcpGatewayToken(hiringRequest, dependencies, hiringEnv)).resolves.toMatchObject({
      scope: MCP_TALENT_POOL_GREENHOUSE_SCOPE,
      expiresIn: MCP_EXCHANGED_TOKEN_TTL_SECONDS
    })
    expect(dependencies.authorizeFunding).not.toHaveBeenCalled()
    expect(dependencies.authorizeTalentPool).toHaveBeenCalledOnce()
    expect(dependencies.issueToken).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedScope: MCP_TALENT_POOL_GREENHOUSE_SCOPE,
        requireWorkspaceBinding: false
      })
    )
  })

  it('mints candidate review through a distinct exact client and never substitutes Talent Pool authorization', async () => {
    const reviewClient = {
      ...client,
      oauthClientId: 'spoauth-client-mcp-hiring-review',
      clientId: MCP_HIRING_REVIEW_OAUTH_CLIENT_ID,
      allowedScopes: [MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE],
      policy: {
        ...client.policy,
        requiredScopes: [MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE],
        capabilityScopes: [MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE],
        revocation: { ...client.policy.revocation, revalidateAfterSeconds: 15 }
      },
      metadata: { resourceFamily: 'hiring' }
    }

    const dependencies = {
      ...baseDependencies(),
      verifyEntraToken: vi.fn(async () => ({
        tenantId: 'tenant-1',
        objectId: 'oid-1',
        authorizedParty: 'mcp-client-app-id',
        scopes: [MCP_HIRING_INPUT_SCOPE]
      })),
      loadClient: vi.fn(async (): Promise<any> => reviewClient),
      authorizeTalentPool: vi.fn(() => true),
      authorizeCandidateReview: vi.fn(() => true)
    }

    const reviewEnv = {
      ...env,
      GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS:
        `${MCP_GATEWAY_OAUTH_CLIENT_ID},${MCP_HIRING_REVIEW_OAUTH_CLIENT_ID}`
    }

    await expect(
      exchangeMcpGatewayToken(
        {
          ...request,
          clientId: MCP_HIRING_REVIEW_OAUTH_CLIENT_ID,
          requestedScope: MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE
        },
        dependencies,
        reviewEnv
      )
    ).resolves.toMatchObject({ scope: MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE })
    expect(dependencies.authorizeCandidateReview).toHaveBeenCalledOnce()
    expect(dependencies.authorizeTalentPool).not.toHaveBeenCalled()
    expect(dependencies.issueToken).toHaveBeenCalledWith(
      expect.objectContaining({ requestedScope: MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE })
    )
  })

  it('persists only a hash, the exact scope, agent provenance and a five-minute expiry', async () => {
    const dependencies = baseDependencies()
    const productionIssuerDependencies = { ...dependencies, issueToken: undefined }
    const result = await exchangeMcpGatewayToken(request, productionIssuerDependencies, env)

    const insert = db.query.mock.calls.find(call => String(call[0]).includes('sister_platform_oauth_access_tokens'))

    expect(insert).toBeDefined()
    expect(insert?.[1]).toEqual(
      expect.arrayContaining([['globe.credits.funding.ensure'], 'correlation-1', '2026-08-01T12:05:00.000Z'])
    )
    expect(String(insert?.[1]?.[10])).toContain('"sessionAuthMode":"agent"')
    expect(String(insert?.[1])).not.toContain(result.accessToken)
    expect(result.accessToken).toMatch(/^gh_mcp_[A-Za-z0-9_-]+$/)
  })

  it.each([
    ['wrong workload audience', { audience: 'https://wrong.example.test' }],
    ['unverified workload email', { emailVerified: false }],
    ['service account outside allowlist', { email: 'other@efeonce-group.iam.gserviceaccount.com' }]
  ])('denies %s', async (_label, override) => {
    const dependencies = baseDependencies()

    dependencies.verifyGoogleIdToken.mockResolvedValue({
      audience: env.GREENHOUSE_MCP_TOKEN_EXCHANGE_AUDIENCE!,
      email: 'efeonce-mcp-gateway@efeonce-group.iam.gserviceaccount.com',
      emailVerified: true,
      subject: 'google-workload-subject',
      ...override
    })

    await expect(exchangeMcpGatewayToken(request, dependencies, env)).rejects.toMatchObject({
      code: 'invalid_client',
      statusCode: 401
    })
    expect(dependencies.issueToken).not.toHaveBeenCalled()
  })

  it.each([
    ['tenant', { tenantId: 'other-tenant' }],
    ['oid', { objectId: '' }],
    ['azp', { authorizedParty: 'other-app' }],
    ['scope', { scopes: ['efeonce.mcp.base'] }]
  ])('denies an Entra token with an invalid %s claim', async (_label, override) => {
    const dependencies = baseDependencies()

    dependencies.verifyEntraToken.mockResolvedValue({
      tenantId: 'tenant-1',
      objectId: 'oid-1',
      authorizedParty: 'mcp-client-app-id',
      scopes: [MCP_FUNDING_INPUT_SCOPE],
      ...override
    })

    await expect(exchangeMcpGatewayToken(request, dependencies, env)).rejects.toMatchObject({
      code: 'invalid_grant'
    })
  })

  it.each(['issuer', 'audience', 'expiry'])(
    'denies an Entra token when signature verification rejects %s',
    async () => {
      const dependencies = baseDependencies()

      dependencies.verifyEntraToken.mockRejectedValue(new Error('jwt verification rejected'))

      await expect(exchangeMcpGatewayToken(request, dependencies, env)).rejects.toMatchObject({
        code: 'invalid_grant'
      })
    }
  )

  it('fails closed for an inactive actor or missing exact oid binding without email fallback', async () => {
    const inactive = baseDependencies()

    inactive.resolveUser.mockResolvedValue({ ...tenant, active: false } as never)

    await expect(exchangeMcpGatewayToken(request, inactive, env)).rejects.toMatchObject({
      code: 'user_not_eligible'
    })

    const missing = baseDependencies()

    missing.resolveUser.mockResolvedValue(null)
    await expect(exchangeMcpGatewayToken(request, missing, env)).rejects.toMatchObject({
      code: 'identity_not_bound'
    })
  })

  it('revalidates the Greenhouse funding entitlement before minting', async () => {
    const dependencies = baseDependencies()

    dependencies.authorizeFunding.mockReturnValue(false)

    await expect(exchangeMcpGatewayToken(request, dependencies, env)).rejects.toMatchObject({
      code: 'user_not_eligible',
      statusCode: 403
    })
    expect(dependencies.issueToken).not.toHaveBeenCalled()
  })

  it('fails closed for missing feature/config, wrong endpoint audience, or a broadened output scope', async () => {
    const dependencies = baseDependencies()

    await expect(
      exchangeMcpGatewayToken(request, dependencies, { NODE_ENV: 'test' } as NodeJS.ProcessEnv)
    ).rejects.toMatchObject({
      code: 'exchange_disabled'
    })
    await expect(
      exchangeMcpGatewayToken({ ...request, requestUrl: 'https://greenhouse.example.test/wrong' }, dependencies, env)
    ).rejects.toMatchObject({ code: 'invalid_request' })
    await expect(
      exchangeMcpGatewayToken(
        { ...request, requestedScope: `${MCP_FUNDING_GREENHOUSE_SCOPE} other.scope` },
        dependencies,
        env
      )
    ).rejects.toMatchObject({ code: 'scope_not_allowed' })
  })

  it('requires the exact active confidential federated client and environment allowlist', async () => {
    const dependencies = baseDependencies()

    dependencies.loadClient.mockResolvedValue({ ...client, clientStatus: 'suspended' } as never)

    await expect(exchangeMcpGatewayToken(request, dependencies, env)).rejects.toMatchObject({
      code: 'invalid_client'
    })

    await expect(
      exchangeMcpGatewayToken(request, baseDependencies(), {
        ...env,
        GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS: 'greenhouse-admin-cli'
      })
    ).rejects.toMatchObject({ code: 'invalid_client' })
  })

  it('propagates a missing workspace binding as a denied exchange', async () => {
    const dependencies = baseDependencies()

    dependencies.issueToken.mockRejectedValue(new McpTokenExchangeError('identity_not_bound', 403))

    await expect(exchangeMcpGatewayToken(request, dependencies, env)).rejects.toMatchObject({
      code: 'identity_not_bound',
      statusCode: 403
    })
  })
})
