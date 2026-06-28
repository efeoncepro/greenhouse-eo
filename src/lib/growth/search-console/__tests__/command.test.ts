import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const flags = vi.hoisted(() => ({ isSearchConsoleEnabled: vi.fn() }))

vi.mock('../flags', () => ({ isSearchConsoleEnabled: flags.isSearchConsoleEnabled }))

const oauth = vi.hoisted(() => ({
  buildConsentUrl: vi.fn(),
  exchangeCodeForTokens: vi.fn(),
  refreshAccessToken: vi.fn(),
  resolveSearchConsoleOAuthConfig: vi.fn()
}))

vi.mock('../oauth-client', () => ({
  buildConsentUrl: oauth.buildConsentUrl,
  exchangeCodeForTokens: oauth.exchangeCodeForTokens,
  refreshAccessToken: oauth.refreshAccessToken,
  resolveSearchConsoleOAuthConfig: oauth.resolveSearchConsoleOAuthConfig
}))

const state = vi.hoisted(() => ({
  createSearchConsoleOAuthState: vi.fn(),
  consumeSearchConsoleOAuthState: vi.fn()
}))

vi.mock('../state-store', () => ({
  createSearchConsoleOAuthState: state.createSearchConsoleOAuthState,
  consumeSearchConsoleOAuthState: state.consumeSearchConsoleOAuthState
}))

const api = vi.hoisted(() => ({ tokenCanAccessSite: vi.fn() }))

vi.mock('../api-client', () => ({ tokenCanAccessSite: api.tokenCanAccessSite }))

const store = vi.hoisted(() => ({
  getSearchConsoleConnection: vi.fn(),
  upsertActiveSearchConsoleConnection: vi.fn(),
  disconnectSearchConsoleConnection: vi.fn()
}))

vi.mock('../connection-store', () => ({
  getSearchConsoleConnection: store.getSearchConsoleConnection,
  upsertActiveSearchConsoleConnection: store.upsertActiveSearchConsoleConnection,
  disconnectSearchConsoleConnection: store.disconnectSearchConsoleConnection
}))

const secrets = vi.hoisted(() => ({ createOrAddSecretVersion: vi.fn() }))

vi.mock('@/lib/secrets/secret-manager', () => ({ createOrAddSecretVersion: secrets.createOrAddSecretVersion }))

vi.mock('../secret-naming', () => ({
  buildSearchConsoleSecretId: (org: string) => `search-console-token-${org}`
}))

import {
  completeSearchConsoleConnection,
  disconnectSearchConsoleProperty,
  startSearchConsoleConnection
} from '../command'

const OAUTH_CONFIG = { clientId: 'cid', clientSecret: 'sec', redirectUri: 'https://x/cb' }

beforeEach(() => {
  vi.clearAllMocks()
  flags.isSearchConsoleEnabled.mockReturnValue(true)
  oauth.resolveSearchConsoleOAuthConfig.mockResolvedValue(OAUTH_CONFIG)
})

describe('startSearchConsoleConnection', () => {
  it('disabled cuando el flag está OFF', async () => {
    flags.isSearchConsoleEnabled.mockReturnValue(false)
    const r = await startSearchConsoleConnection({ organizationId: 'org-a', siteUrl: 's', userId: 'u' })

    expect(r).toEqual({ ok: false, errorCode: 'disabled' })
  })

  it('not_configured cuando falta el OAuth client', async () => {
    oauth.resolveSearchConsoleOAuthConfig.mockResolvedValue(null)
    const r = await startSearchConsoleConnection({ organizationId: 'org-a', siteUrl: 's', userId: 'u' })

    expect(r).toEqual({ ok: false, errorCode: 'not_configured' })
  })

  it('ok: crea state y devuelve la consent URL', async () => {
    state.createSearchConsoleOAuthState.mockResolvedValue('raw-state')
    oauth.buildConsentUrl.mockReturnValue('https://accounts.google.com/consent?state=raw-state')
    const r = await startSearchConsoleConnection({ organizationId: 'org-a', siteUrl: 's', userId: 'u' })

    expect(r).toEqual({ ok: true, consentUrl: 'https://accounts.google.com/consent?state=raw-state' })
    expect(state.createSearchConsoleOAuthState).toHaveBeenCalledWith({
      organizationId: 'org-a',
      siteUrl: 's',
      createdByUserId: 'u',
      returnToPath: null
    })
  })
})

describe('completeSearchConsoleConnection', () => {
  const consumed = { organizationId: 'org-a', siteUrl: 'https://acme.com/', createdByUserId: 'u', returnToPath: null }

  it('state_invalid cuando el state no resuelve (forjado/reusado/expirado)', async () => {
    state.consumeSearchConsoleOAuthState.mockResolvedValue(null)
    const r = await completeSearchConsoleConnection({ rawState: 'x', code: 'c' })

    expect(r).toEqual({ ok: false, errorCode: 'state_invalid' })
  })

  it('oauth_failed cuando el code exchange no trae refresh token', async () => {
    state.consumeSearchConsoleOAuthState.mockResolvedValue(consumed)
    oauth.exchangeCodeForTokens.mockResolvedValue({ refreshToken: null, accessToken: 'a', scopes: [] })
    const r = await completeSearchConsoleConnection({ rawState: 'x', code: 'c' })

    expect(r).toEqual({ ok: false, errorCode: 'oauth_failed', returnToPath: null })
    expect(secrets.createOrAddSecretVersion).not.toHaveBeenCalled()
  })

  it('site_not_accessible cuando el token no puede ver la propiedad elegida', async () => {
    state.consumeSearchConsoleOAuthState.mockResolvedValue(consumed)
    oauth.exchangeCodeForTokens.mockResolvedValue({ refreshToken: 'r', accessToken: 'a', scopes: [] })
    api.tokenCanAccessSite.mockResolvedValue(false)
    const r = await completeSearchConsoleConnection({ rawState: 'x', code: 'c' })

    expect(r).toEqual({ ok: false, errorCode: 'site_not_accessible', returnToPath: null })
    expect(secrets.createOrAddSecretVersion).not.toHaveBeenCalled()
  })

  it('secret_write_failed cuando Secret Manager no acepta el write (grant IAM faltante)', async () => {
    state.consumeSearchConsoleOAuthState.mockResolvedValue(consumed)
    oauth.exchangeCodeForTokens.mockResolvedValue({ refreshToken: 'r', accessToken: 'a', scopes: [] })
    api.tokenCanAccessSite.mockResolvedValue(true)
    secrets.createOrAddSecretVersion.mockResolvedValue({ ok: false, errorCode: 'permission_denied' })
    const r = await completeSearchConsoleConnection({ rawState: 'x', code: 'c' })

    expect(r).toEqual({ ok: false, errorCode: 'secret_write_failed', returnToPath: null })
    expect(store.upsertActiveSearchConsoleConnection).not.toHaveBeenCalled()
  })

  it('ok: escribe el token a Secret Manager y hace upsert active (token NUNCA a PG)', async () => {
    state.consumeSearchConsoleOAuthState.mockResolvedValue(consumed)
    oauth.exchangeCodeForTokens.mockResolvedValue({
      refreshToken: 'refresh-xyz',
      accessToken: 'a',
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    })
    api.tokenCanAccessSite.mockResolvedValue(true)
    secrets.createOrAddSecretVersion.mockResolvedValue({ ok: true, secretId: 'search-console-token-org-a' })
    store.upsertActiveSearchConsoleConnection.mockResolvedValue({
      organizationId: 'org-a',
      siteUrl: 'https://acme.com/',
      status: 'active',
      tokenSecretRef: 'search-console-token-org-a'
    })

    const r = await completeSearchConsoleConnection({ rawState: 'x', code: 'c' })

    expect(r.ok).toBe(true)
    expect(secrets.createOrAddSecretVersion).toHaveBeenCalledWith('search-console-token-org-a', 'refresh-xyz')
    // El upsert recibe el ref del secreto, NUNCA el token crudo.
    const upsertArg = store.upsertActiveSearchConsoleConnection.mock.calls[0][0]

    expect(upsertArg.tokenSecretRef).toBe('search-console-token-org-a')
    expect(JSON.stringify(upsertArg)).not.toContain('refresh-xyz')
  })

  it('ok: conserva returnToPath validado para que la route pueda redirigir al panel', async () => {
    state.consumeSearchConsoleOAuthState.mockResolvedValue({
      ...consumed,
      returnToPath: '/agency/clients/org-a/lifecycle'
    })
    oauth.exchangeCodeForTokens.mockResolvedValue({
      refreshToken: 'refresh-xyz',
      accessToken: 'a',
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    })
    api.tokenCanAccessSite.mockResolvedValue(true)
    secrets.createOrAddSecretVersion.mockResolvedValue({ ok: true, secretId: 'search-console-token-org-a' })
    store.upsertActiveSearchConsoleConnection.mockResolvedValue({
      organizationId: 'org-a',
      siteUrl: 'https://acme.com/',
      status: 'active',
      tokenSecretRef: 'search-console-token-org-a'
    })

    const r = await completeSearchConsoleConnection({ rawState: 'x', code: 'c' })

    expect(r).toMatchObject({ ok: true, returnToPath: '/agency/clients/org-a/lifecycle' })
  })
})

describe('disconnectSearchConsoleProperty', () => {
  it('not_connected cuando no hay conexión', async () => {
    store.getSearchConsoleConnection.mockResolvedValue(null)
    const r = await disconnectSearchConsoleProperty('org-a')

    expect(r).toEqual({ ok: false, errorCode: 'not_connected' })
  })

  it('ok: marca revoked', async () => {
    store.getSearchConsoleConnection
      .mockResolvedValueOnce({ organizationId: 'org-a', status: 'active', tokenSecretRef: 'ref' })
      .mockResolvedValueOnce({ organizationId: 'org-a', status: 'revoked', tokenSecretRef: null })
    store.disconnectSearchConsoleConnection.mockResolvedValue(true)
    const r = await disconnectSearchConsoleProperty('org-a')

    expect(r.ok).toBe(true)
    expect(store.disconnectSearchConsoleConnection).toHaveBeenCalledWith('org-a')
  })
})
