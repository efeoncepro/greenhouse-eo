import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const { FakeApiError } = vi.hoisted(() => ({
  FakeApiError: class FakeApiError extends Error {
    status: number
    constructor(status: number) {
      super(`api ${status}`)
      this.status = status
    }
  }
}))

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

const api = vi.hoisted(() => ({ listSearchConsoleSiteOptions: vi.fn() }))

vi.mock('../api-client', () => ({
  listSearchConsoleSiteOptions: api.listSearchConsoleSiteOptions,
  SearchConsoleApiError: FakeApiError
}))

const store = vi.hoisted(() => ({
  getSearchConsoleConnection: vi.fn(),
  upsertPendingSearchConsoleConnection: vi.fn(),
  setSearchConsoleConnectionProperty: vi.fn(),
  setSearchConsoleConnectionStatus: vi.fn(),
  disconnectSearchConsoleConnection: vi.fn()
}))

vi.mock('../connection-store', () => ({
  getSearchConsoleConnection: store.getSearchConsoleConnection,
  upsertPendingSearchConsoleConnection: store.upsertPendingSearchConsoleConnection,
  setSearchConsoleConnectionProperty: store.setSearchConsoleConnectionProperty,
  setSearchConsoleConnectionStatus: store.setSearchConsoleConnectionStatus,
  disconnectSearchConsoleConnection: store.disconnectSearchConsoleConnection
}))

const secrets = vi.hoisted(() => ({ createOrAddSecretVersion: vi.fn(), resolveSecretByRef: vi.fn() }))

vi.mock('@/lib/secrets/secret-manager', () => ({
  createOrAddSecretVersion: secrets.createOrAddSecretVersion,
  resolveSecretByRef: secrets.resolveSecretByRef
}))

vi.mock('../secret-naming', () => ({
  buildOperatorSearchConsoleSecretId: (userId: string) => `search-console-token-operator-${userId}`
}))

import {
  completeSearchConsoleConnection,
  disconnectSearchConsoleProperty,
  listSearchConsoleSitesForOrg,
  selectSearchConsoleProperty,
  startSearchConsoleConnection
} from '../command'

const OAUTH_CONFIG = { clientId: 'cid', clientSecret: 'sec', redirectUri: 'https://x/cb' }
const PENDING = { organizationId: 'org-a', status: 'pending', tokenSecretRef: 'search-console-token-operator-u', siteUrl: null }

beforeEach(() => {
  vi.clearAllMocks()
  flags.isSearchConsoleEnabled.mockReturnValue(true)
  oauth.resolveSearchConsoleOAuthConfig.mockResolvedValue(OAUTH_CONFIG)
})

describe('startSearchConsoleConnection', () => {
  it('ok: crea state (sin propiedad) y devuelve la consent URL', async () => {
    state.createSearchConsoleOAuthState.mockResolvedValue('raw-state')
    oauth.buildConsentUrl.mockReturnValue('https://accounts.google.com/consent?state=raw-state')
    const r = await startSearchConsoleConnection({ organizationId: 'org-a', userId: 'u' })

    expect(r).toEqual({ ok: true, consentUrl: 'https://accounts.google.com/consent?state=raw-state' })
    expect(state.createSearchConsoleOAuthState).toHaveBeenCalledWith({
      organizationId: 'org-a',
      createdByUserId: 'u',
      returnToPath: null
    })
  })

  it('disabled cuando el flag está OFF', async () => {
    flags.isSearchConsoleEnabled.mockReturnValue(false)
    const r = await startSearchConsoleConnection({ organizationId: 'org-a', userId: 'u' })

    expect(r).toEqual({ ok: false, errorCode: 'disabled' })
  })
})

describe('completeSearchConsoleConnection', () => {
  const consumed = { organizationId: 'org-a', createdByUserId: 'u', returnToPath: null }

  it('state_invalid cuando el state no resuelve', async () => {
    state.consumeSearchConsoleOAuthState.mockResolvedValue(null)
    const r = await completeSearchConsoleConnection({ rawState: 'x', code: 'c' })

    expect(r).toEqual({ ok: false, errorCode: 'state_invalid' })
  })

  it('oauth_failed cuando el exchange no trae refresh token', async () => {
    state.consumeSearchConsoleOAuthState.mockResolvedValue(consumed)
    oauth.exchangeCodeForTokens.mockResolvedValue({ refreshToken: null, accessToken: 'a', scopes: [] })
    const r = await completeSearchConsoleConnection({ rawState: 'x', code: 'c' })

    expect(r).toMatchObject({ ok: false, errorCode: 'oauth_failed' })
    expect(secrets.createOrAddSecretVersion).not.toHaveBeenCalled()
  })

  it('ok: guarda el token de OPERADOR y deja la conexión pending (NO verifica propiedad, NO token a PG)', async () => {
    state.consumeSearchConsoleOAuthState.mockResolvedValue(consumed)
    oauth.exchangeCodeForTokens.mockResolvedValue({ refreshToken: 'refresh-xyz', accessToken: 'a', scopes: [] })
    secrets.createOrAddSecretVersion.mockResolvedValue({ ok: true, secretId: 'search-console-token-operator-u' })
    store.upsertPendingSearchConsoleConnection.mockResolvedValue({ ...PENDING })

    const r = await completeSearchConsoleConnection({ rawState: 'x', code: 'c' })

    expect(r.ok).toBe(true)
    // Secret de operador (keyed por userId), NO per-org.
    expect(secrets.createOrAddSecretVersion).toHaveBeenCalledWith('search-console-token-operator-u', 'refresh-xyz')
    const upsertArg = store.upsertPendingSearchConsoleConnection.mock.calls[0][0]

    expect(upsertArg.tokenSecretRef).toBe('search-console-token-operator-u')
    expect(JSON.stringify(upsertArg)).not.toContain('refresh-xyz')
  })
})

describe('listSearchConsoleSitesForOrg', () => {
  it('not_connected si no hay conexión con token', async () => {
    store.getSearchConsoleConnection.mockResolvedValue(null)
    const r = await listSearchConsoleSitesForOrg('org-a')

    expect(r).toEqual({ ok: false, errorCode: 'not_connected' })
  })

  it('ok: devuelve el desplegable de propiedades', async () => {
    store.getSearchConsoleConnection.mockResolvedValue({ ...PENDING })
    secrets.resolveSecretByRef.mockResolvedValue('refresh')
    oauth.refreshAccessToken.mockResolvedValue('access')
    api.listSearchConsoleSiteOptions.mockResolvedValue([
      { siteUrl: 'sc-domain:berel.cl', permissionLevel: 'siteOwner' },
      { siteUrl: 'https://acme.com/', permissionLevel: 'siteFullUser' }
    ])
    const r = await listSearchConsoleSitesForOrg('org-a')

    expect(r.ok).toBe(true)
    if (r.ok) expect(r.sites).toHaveLength(2)
  })

  it('token_unhealthy + marca revoked cuando invalid_grant', async () => {
    store.getSearchConsoleConnection.mockResolvedValue({ ...PENDING })
    secrets.resolveSecretByRef.mockResolvedValue('refresh')
    oauth.refreshAccessToken.mockResolvedValue('access')
    api.listSearchConsoleSiteOptions.mockRejectedValue(new FakeApiError(403))
    const r = await listSearchConsoleSitesForOrg('org-a')

    expect(r).toEqual({ ok: false, errorCode: 'token_unhealthy' })
    expect(store.setSearchConsoleConnectionStatus).toHaveBeenCalledWith('org-a', 'revoked', 'invalid_grant')
  })
})

describe('selectSearchConsoleProperty', () => {
  beforeEach(() => {
    store.getSearchConsoleConnection.mockResolvedValue({ ...PENDING })
    secrets.resolveSecretByRef.mockResolvedValue('refresh')
    oauth.refreshAccessToken.mockResolvedValue('access')
    api.listSearchConsoleSiteOptions.mockResolvedValue([
      { siteUrl: 'sc-domain:berel.cl', permissionLevel: 'siteOwner' }
    ])
  })

  it('site_not_accessible si la propiedad no está en la lista de la cuenta', async () => {
    const r = await selectSearchConsoleProperty('org-a', 'https://ajeno.com/')

    expect(r).toEqual({ ok: false, errorCode: 'site_not_accessible' })
    expect(store.setSearchConsoleConnectionProperty).not.toHaveBeenCalled()
  })

  it('ok: ata la propiedad y marca active', async () => {
    store.setSearchConsoleConnectionProperty.mockResolvedValue({ ...PENDING, siteUrl: 'sc-domain:berel.cl', status: 'active' })
    const r = await selectSearchConsoleProperty('org-a', 'sc-domain:berel.cl')

    expect(r.ok).toBe(true)
    expect(store.setSearchConsoleConnectionProperty).toHaveBeenCalledWith('org-a', 'sc-domain:berel.cl')
  })
})

describe('disconnectSearchConsoleProperty', () => {
  it('not_connected cuando no hay conexión', async () => {
    store.getSearchConsoleConnection.mockResolvedValue(null)
    const r = await disconnectSearchConsoleProperty('org-a')

    expect(r).toEqual({ ok: false, errorCode: 'not_connected' })
  })
})
