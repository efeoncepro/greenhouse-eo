/**
 * TASK-1507 Slice 3 — `updateSisterPlatformOAuthRedirectUris`.
 *
 * This primitive exists to move a live client's callback allowlist during a domain cutover, so the
 * cases that matter are the ones that would silently break SSO: dropping the URI that is still in
 * use, letting a wildcard through, emptying the list, or reporting success on a stale removal.
 *
 * Mocking pattern mirrors module-resolver.test.ts (vi.mock of 'server-only' + '@/lib/db').
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockPgQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: async (fn: (client: { query: typeof mockPgQuery }) => Promise<unknown>) =>
    fn({ query: mockPgQuery })
}))

const { SisterPlatformOAuthError, updateSisterPlatformOAuthRedirectUris } = await import('./oauth-broker')

const RUN_APP_URI = 'https://globe-studio-internal-818083690953.southamerica-west1.run.app/auth/callback'
const DOMAIN_URI = 'https://globe.efeoncepro.com/auth/callback'

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
  redirect_uris: [RUN_APP_URI],
  allowed_scopes: ['openid', 'profile', 'email', 'globe.studio.access'],
  code_ttl_seconds: 300,
  access_token_ttl_seconds: 300,
  require_pkce: true,
  issue_identity_inline: true,
  policy_json: {
    schemaVersion: '1',
    audience: { tenantTypes: ['efeonce_internal'] },
    requiredScopes: ['openid', 'globe.studio.access'],
    capabilityScopes: ['globe.studio.access'],
    claims: { includeGreenhouseRoles: false },
    revocation: { mode: 'userinfo_revalidation', revalidateAfterSeconds: 60, requireOnPrivilegedAction: true }
  },
  metadata_json: {}
}

/** The transaction reads `FOR UPDATE`, then writes; the reload afterwards goes through `query`. */
const primeTransaction = (redirectUris: string[]) => {
  mockPgQuery.mockReset()
  mockPgQuery
    .mockResolvedValueOnce({ rows: [{ oauth_client_id: CLIENT_ROW.oauth_client_id, redirect_uris: redirectUris }] })
    .mockResolvedValueOnce({ rows: [] })
}

/** Matches the write, not the `SELECT ... FOR UPDATE` that precedes it. */
const updateStatement = () =>
  mockPgQuery.mock.calls.find(call => String(call[0]).includes('UPDATE greenhouse_core.sister_platform_oauth_clients'))

beforeEach(() => {
  mockQuery.mockReset()
  mockPgQuery.mockReset()
  mockQuery.mockResolvedValue([CLIENT_ROW])
})

describe('updateSisterPlatformOAuthRedirectUris', () => {
  it('adds the new callback while keeping the one still in use', async () => {
    primeTransaction([RUN_APP_URI])

    const result = await updateSisterPlatformOAuthRedirectUris({ clientId: 'globe', add: [DOMAIN_URI] })

    expect(result.previousRedirectUris).toEqual([RUN_APP_URI])
    expect(result.redirectUris).toEqual([RUN_APP_URI, DOMAIN_URI])
    expect(result.changed).toBe(true)
    expect(updateStatement()?.[1]).toEqual([CLIENT_ROW.oauth_client_id, [RUN_APP_URI, DOMAIN_URI]])
  })

  it('writes only redirect_uris, never policy, scopes, TTLs or the consumer token', async () => {
    primeTransaction([RUN_APP_URI])

    await updateSisterPlatformOAuthRedirectUris({ clientId: 'globe', add: [DOMAIN_URI] })

    const statement = String(updateStatement()?.[0])

    expect(statement).toContain('redirect_uris')

    for (const column of ['policy_json', 'allowed_scopes', 'code_ttl_seconds', 'access_token_ttl_seconds', 'client_status']) {
      expect(statement).not.toContain(column)
    }
  })

  it('is idempotent — re-adding an allowed URI does not duplicate it', async () => {
    primeTransaction([RUN_APP_URI, DOMAIN_URI])

    const result = await updateSisterPlatformOAuthRedirectUris({ clientId: 'globe', add: [DOMAIN_URI] })

    expect(result.redirectUris).toEqual([RUN_APP_URI, DOMAIN_URI])
    expect(result.changed).toBe(false)
  })

  it('removes the legacy callback once the cutover is verified', async () => {
    primeTransaction([RUN_APP_URI, DOMAIN_URI])

    const result = await updateSisterPlatformOAuthRedirectUris({ clientId: 'globe', remove: [RUN_APP_URI] })

    expect(result.redirectUris).toEqual([DOMAIN_URI])
  })

  it('rejects a wildcard instead of persisting it', async () => {
    primeTransaction([RUN_APP_URI])

    await expect(
      updateSisterPlatformOAuthRedirectUris({ clientId: 'globe', add: ['https://*.efeoncepro.com/auth/callback'] })
    ).rejects.toMatchObject({ errorCode: 'invalid_redirect_uri' })
    expect(updateStatement()).toBeUndefined()
  })

  it('rejects a non-HTTPS callback outside localhost', async () => {
    primeTransaction([RUN_APP_URI])

    await expect(
      updateSisterPlatformOAuthRedirectUris({ clientId: 'globe', add: ['http://globe.efeoncepro.com/auth/callback'] })
    ).rejects.toBeInstanceOf(SisterPlatformOAuthError)
    expect(updateStatement()).toBeUndefined()
  })

  it('refuses to empty the allowlist', async () => {
    primeTransaction([RUN_APP_URI])

    await expect(
      updateSisterPlatformOAuthRedirectUris({ clientId: 'globe', remove: [RUN_APP_URI] })
    ).rejects.toMatchObject({ errorCode: 'missing_redirect_uri' })
    expect(updateStatement()).toBeUndefined()
  })

  it('fails loudly when removing a URI that is not allowlisted (stale caller view)', async () => {
    primeTransaction([RUN_APP_URI])

    await expect(
      updateSisterPlatformOAuthRedirectUris({ clientId: 'globe', remove: [DOMAIN_URI] })
    ).rejects.toMatchObject({ errorCode: 'invalid_redirect_uri' })
    expect(updateStatement()).toBeUndefined()
  })

  it('rejects adding and removing the same URI in one call', async () => {
    await expect(
      updateSisterPlatformOAuthRedirectUris({ clientId: 'globe', add: [DOMAIN_URI], remove: [DOMAIN_URI] })
    ).rejects.toMatchObject({ errorCode: 'invalid_redirect_uri' })
    expect(mockPgQuery).not.toHaveBeenCalled()
  })

  it('requires at least one change', async () => {
    await expect(updateSisterPlatformOAuthRedirectUris({ clientId: 'globe' })).rejects.toMatchObject({
      errorCode: 'invalid_request'
    })
    expect(mockPgQuery).not.toHaveBeenCalled()
  })

  it('404s on an unknown client instead of creating one', async () => {
    mockPgQuery.mockReset()
    mockPgQuery.mockResolvedValueOnce({ rows: [] })

    await expect(
      updateSisterPlatformOAuthRedirectUris({ clientId: 'unknown', add: [DOMAIN_URI] })
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'invalid_client' })
    expect(updateStatement()).toBeUndefined()
  })
})
