import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockPgQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: async (fn: (client: { query: typeof mockPgQuery }) => Promise<unknown>) => fn({ query: mockPgQuery })
}))

const { OAUTH_ACCESS_TOKEN_TTL_MAX_SECONDS, updateSisterPlatformOAuthTokenTtls } = await import('./oauth-broker')

const CLIENT_ROW = {
  oauth_client_id: 'spoauth-client-globe',
  consumer_id: 'spc-globe',
  sister_platform_key: 'globe',
  consumer_name: 'Efeonce Globe Internal Studio',
  consumer_status: 'active',
  consumer_expires_at: null,
  client_id: 'globe',
  client_name: 'Efeonce Globe Internal Studio',
  client_status: 'active',
  redirect_uris: ['https://globe.efeoncepro.com/auth/callback'],
  allowed_scopes: ['openid', 'profile', 'email', 'globe.studio.access'],
  code_ttl_seconds: 300,
  access_token_ttl_seconds: OAUTH_ACCESS_TOKEN_TTL_MAX_SECONDS,
  require_pkce: true,
  issue_identity_inline: true,
  policy_json: {
    schemaVersion: '1',
    audience: { tenantTypes: ['efeonce_internal'] },
    requiredScopes: ['openid', 'globe.studio.access'],
    capabilityScopes: ['globe.studio.access'],
    claims: { includeGreenhouseRoles: false },
    revocation: { mode: 'userinfo_revalidation', revalidateAfterSeconds: 300, requireOnPrivilegedAction: true }
  },
  metadata_json: {}
}

const updateStatement = () =>
  mockPgQuery.mock.calls.find(call => String(call[0]).includes('UPDATE greenhouse_core.sister_platform_oauth_clients'))

beforeEach(() => {
  mockQuery.mockReset()
  mockPgQuery.mockReset()
  mockQuery.mockResolvedValue([CLIENT_ROW])
})

describe('updateSisterPlatformOAuthTokenTtls', () => {
  it('updates only OAuth token TTL columns for an existing client', async () => {
    mockPgQuery.mockResolvedValueOnce({
      rows: [
        {
          oauth_client_id: CLIENT_ROW.oauth_client_id,
          code_ttl_seconds: 300,
          access_token_ttl_seconds: 300
        }
      ]
    })

    const result = await updateSisterPlatformOAuthTokenTtls({
      clientId: 'globe',
      accessTokenTtlSeconds: OAUTH_ACCESS_TOKEN_TTL_MAX_SECONDS
    })

    const update = updateStatement()
    const statement = String(update?.[0])

    expect(result.previousAccessTokenTtlSeconds).toBe(300)
    expect(result.accessTokenTtlSeconds).toBe(OAUTH_ACCESS_TOKEN_TTL_MAX_SECONDS)
    expect(result.changed).toBe(true)
    expect(update?.[1]).toEqual([CLIENT_ROW.oauth_client_id, 300, OAUTH_ACCESS_TOKEN_TTL_MAX_SECONDS])
    expect(statement).toContain('code_ttl_seconds')
    expect(statement).toContain('access_token_ttl_seconds')

    for (const untouched of ['redirect_uris', 'allowed_scopes', 'policy_json', 'client_status', 'metadata_json']) {
      expect(statement).not.toContain(untouched)
    }
  })

  it('rejects access token TTLs longer than the working-session maximum', async () => {
    await expect(
      updateSisterPlatformOAuthTokenTtls({
        clientId: 'globe',
        accessTokenTtlSeconds: OAUTH_ACCESS_TOKEN_TTL_MAX_SECONDS + 1
      })
    ).rejects.toMatchObject({ errorCode: 'invalid_ttl' })
    expect(updateStatement()).toBeUndefined()
  })
})
