import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SisterPlatformOAuthPolicyV1 } from './oauth-policy'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockPgQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: async (fn: (client: { query: typeof mockPgQuery }) => Promise<unknown>) => fn({ query: mockPgQuery })
}))

const {
  authenticateSisterPlatformOAuthClient,
  assertSisterPlatformOAuthSessionProvenance,
  resolveSisterPlatformOAuthSessionAuthMode,
  upsertSisterPlatformOAuthClient,
  validateSisterPlatformAuthorizeRequest
} = await import('./oauth-broker')

const POLICY: SisterPlatformOAuthPolicyV1 = {
  schemaVersion: '1',
  audience: { tenantTypes: ['efeonce_internal'] },
  requiredScopes: ['openid', 'globe.credits.funding.propose'],
  capabilityScopes: ['globe.credits.funding.propose'],
  claims: { includeGreenhouseRoles: false },
  revocation: { mode: 'userinfo_revalidation', revalidateAfterSeconds: 60, requireOnPrivilegedAction: true }
}

const CLIENT_ROW = {
  oauth_client_id: 'spoauth-client-greenhouse-admin-cli',
  consumer_id: 'spc-greenhouse-admin-cli',
  sister_platform_key: 'greenhouse-admin-cli',
  consumer_name: 'Greenhouse Admin CLI OAuth',
  consumer_status: 'active',
  consumer_expires_at: null,
  client_id: 'greenhouse-admin-cli',
  client_name: 'Greenhouse Admin CLI',
  client_status: 'active',
  client_type: 'public' as const,
  require_human_session: true,
  redirect_uris: ['http://127.0.0.1/callback'],
  allowed_scopes: ['openid', 'profile', 'email', 'globe.credits.funding.propose'],
  code_ttl_seconds: 300,
  access_token_ttl_seconds: 300,
  require_pkce: true,
  issue_identity_inline: true,
  policy_json: POLICY,
  metadata_json: {}
}

const authorizeUrl = (redirectUri: string) => {
  const url = new URL('https://greenhouse.example/api/auth/sister-platforms/authorize')

  url.searchParams.set('client_id', 'greenhouse-admin-cli')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid globe.credits.funding.propose')
  url.searchParams.set('state', 'state')
  url.searchParams.set('nonce', 'nonce')
  url.searchParams.set('code_challenge', 'a'.repeat(43))
  url.searchParams.set('code_challenge_method', 'S256')

  return url
}

beforeEach(() => {
  process.env.GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED = 'true'
  process.env.GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS = 'greenhouse-admin-cli'
  mockQuery.mockReset()
  mockPgQuery.mockReset()
  mockQuery.mockResolvedValue([CLIENT_ROW])
})

describe('public OAuth client RFC 8252 loopback behavior', () => {
  it('allows an ephemeral port while keeping scheme, host, path and query exact', async () => {
    const result = await validateSisterPlatformAuthorizeRequest(authorizeUrl('http://127.0.0.1:43123/callback'))

    expect(result.redirectUri).toBe('http://127.0.0.1:43123/callback')
    expect(result.client.clientType).toBe('public')
  })

  it('accepts localhost only as the Vercel/Next normalized alias of a registered 127.0.0.1 loopback', async () => {
    const result = await validateSisterPlatformAuthorizeRequest(authorizeUrl('http://localhost:43123/callback'))

    expect(result.redirectUri).toBe('http://localhost:43123/callback')
    expect(result.client.redirectUris).toEqual(['http://127.0.0.1/callback'])
  })

  it.each([
    ['different loopback host', 'http://127.0.0.2:43123/callback'],
    ['different callback path', 'http://127.0.0.1:43123/other'],
    ['different query', 'http://127.0.0.1:43123/callback?extra=1']
  ])('rejects %s', async (_label, redirectUri) => {
    await expect(validateSisterPlatformAuthorizeRequest(authorizeUrl(redirectUri))).rejects.toMatchObject({
      errorCode: 'invalid_redirect_uri'
    })
  })

  it('keeps confidential clients exact-match, including the port', async () => {
    mockQuery.mockResolvedValueOnce([
      { ...CLIENT_ROW, client_type: 'confidential', redirect_uris: ['http://127.0.0.1:43123/callback'] }
    ])

    await expect(
      validateSisterPlatformAuthorizeRequest(authorizeUrl('http://127.0.0.1:43124/callback'))
    ).rejects.toMatchObject({ errorCode: 'invalid_redirect_uri' })
  })
})

describe('public OAuth client authentication', () => {
  it('does not consult consumer token hashes and rejects a supplied secret', async () => {
    const client = {
      oauthClientId: CLIENT_ROW.oauth_client_id,
      consumerId: CLIENT_ROW.consumer_id,
      sisterPlatformKey: CLIENT_ROW.sister_platform_key,
      consumerName: CLIENT_ROW.consumer_name,
      consumerStatus: CLIENT_ROW.consumer_status,
      consumerExpiresAt: null,
      clientId: CLIENT_ROW.client_id,
      clientName: CLIENT_ROW.client_name,
      clientStatus: CLIENT_ROW.client_status,
      clientType: 'public' as const,
      requireHumanSession: true,
      redirectUris: CLIENT_ROW.redirect_uris,
      allowedScopes: CLIENT_ROW.allowed_scopes,
      codeTtlSeconds: 300,
      accessTokenTtlSeconds: 300,
      requirePkce: true,
      issueIdentityInline: true,
      policy: CLIENT_ROW.policy_json,
      metadata: {}
    }

    await expect(authenticateSisterPlatformOAuthClient({ client })).resolves.toBeNull()
    expect(mockQuery).not.toHaveBeenCalled()

    await expect(authenticateSisterPlatformOAuthClient({ client, clientSecret: 'unexpected' })).rejects.toMatchObject({
      errorCode: 'invalid_client'
    })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it.each([
    [{ provider: 'agent', authMode: 'agent' }],
    [{ provider: 'credentials', authMode: 'agent' }],
    [{ provider: 'agent', authMode: 'credentials' }],
    [undefined]
  ])('rejects non-human session provenance before code issuance: %j', provenance => {
    const client = {
      clientType: 'public' as const,
      requireHumanSession: true
    } as Parameters<typeof assertSisterPlatformOAuthSessionProvenance>[0]

    expect(() => assertSisterPlatformOAuthSessionProvenance(client, provenance)).toThrowError(
      expect.objectContaining({ errorCode: 'human_session_required' })
    )
  })

  it('accepts explicit human credentials provenance when configured', () => {
    const client = { clientType: 'public' as const, requireHumanSession: true } as Parameters<
      typeof assertSisterPlatformOAuthSessionProvenance
    >[0]

    expect(() =>
      assertSisterPlatformOAuthSessionProvenance(client, { provider: 'credentials', authMode: 'credentials' })
    ).not.toThrow()
  })

  it('accepts an agent session when the public client delegates provenance policy downstream', () => {
    const client = { clientType: 'public' as const, requireHumanSession: false } as Parameters<
      typeof assertSisterPlatformOAuthSessionProvenance
    >[0]

    expect(() =>
      assertSisterPlatformOAuthSessionProvenance(client, { provider: 'agent', authMode: 'agent' })
    ).not.toThrow()
  })

  it('classifies provider=agent as agent even when the account base mode is credentials', () => {
    expect(resolveSisterPlatformOAuthSessionAuthMode({ provider: 'agent', authMode: 'credentials' })).toBe('agent')
  })
})

describe('public OAuth client provisioning validation', () => {
  const input = {
    sisterPlatformConsumerId: 'spc-greenhouse-admin-cli',
    clientId: 'greenhouse-admin-cli',
    clientName: 'Greenhouse Admin CLI',
    clientType: 'public' as const,
    redirectUris: ['http://127.0.0.1/callback'],
    allowedScopes: ['openid', 'profile', 'email', 'globe.credits.funding.propose'],
    requirePkce: true,
    policy: CLIENT_ROW.policy_json
  }

  it('rejects public clients without PKCE before opening a transaction', async () => {
    await expect(upsertSisterPlatformOAuthClient({ ...input, requirePkce: false })).rejects.toMatchObject({
      errorCode: 'invalid_pkce_configuration'
    })
    expect(mockPgQuery).not.toHaveBeenCalled()
  })

  it('rejects localhost public callbacks before opening a transaction', async () => {
    await expect(
      upsertSisterPlatformOAuthClient({ ...input, redirectUris: ['http://localhost/callback'] })
    ).rejects.toMatchObject({ errorCode: 'invalid_redirect_uri' })
    expect(mockPgQuery).not.toHaveBeenCalled()
  })

  it('rejects changing an existing confidential client to public', async () => {
    mockPgQuery.mockResolvedValueOnce({
      rows: [{ oauth_client_id: 'spoauth-client-existing', client_type: 'confidential', require_human_session: false }]
    })

    await expect(upsertSisterPlatformOAuthClient(input)).rejects.toMatchObject({
      errorCode: 'invalid_client_configuration'
    })
    expect(mockPgQuery).toHaveBeenCalledTimes(1)
  })

  it('rejects changing an existing public client to confidential', async () => {
    mockPgQuery.mockResolvedValueOnce({
      rows: [{ oauth_client_id: 'spoauth-client-existing', client_type: 'public', require_human_session: true }]
    })

    await expect(
      upsertSisterPlatformOAuthClient({
        ...input,
        clientType: 'confidential',
        redirectUris: ['https://cli.example/callback']
      })
    ).rejects.toMatchObject({ errorCode: 'invalid_client_configuration' })
    expect(mockPgQuery).toHaveBeenCalledTimes(1)
  })
})
