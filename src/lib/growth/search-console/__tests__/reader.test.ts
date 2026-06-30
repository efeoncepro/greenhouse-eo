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

const store = vi.hoisted(() => ({
  getSearchConsoleConnection: vi.fn(),
  setSearchConsoleConnectionStatus: vi.fn()
}))

vi.mock('../connection-store', () => ({
  getSearchConsoleConnection: store.getSearchConsoleConnection,
  setSearchConsoleConnectionStatus: store.setSearchConsoleConnectionStatus
}))

const oauth = vi.hoisted(() => ({
  resolveSearchConsoleOAuthConfig: vi.fn(),
  refreshAccessToken: vi.fn()
}))

vi.mock('../oauth-client', () => ({
  resolveSearchConsoleOAuthConfig: oauth.resolveSearchConsoleOAuthConfig,
  refreshAccessToken: oauth.refreshAccessToken
}))

const api = vi.hoisted(() => ({ querySearchAnalytics: vi.fn() }))

vi.mock('../api-client', () => ({
  querySearchAnalytics: api.querySearchAnalytics,
  SearchConsoleApiError: FakeApiError
}))

const secrets = vi.hoisted(() => ({ resolveSecretByRef: vi.fn() }))

vi.mock('@/lib/secrets/secret-manager', () => ({ resolveSecretByRef: secrets.resolveSecretByRef }))

import { readSearchConsoleAnalytics } from '../reader'

const RANGE = { range: { startDate: '2026-06-01', endDate: '2026-06-28' } }

const ACTIVE = {
  organizationId: 'org-a',
  siteUrl: 'https://acme.com/',
  status: 'active' as const,
  tokenSecretRef: 'search-console-token-org-a',
  scopes: [],
  connectedByUserId: null,
  connectedAt: null,
  lastVerifiedAt: null,
  lastErrorCode: null
}

beforeEach(() => {
  vi.clearAllMocks()
  flags.isSearchConsoleEnabled.mockReturnValue(true)
  oauth.resolveSearchConsoleOAuthConfig.mockResolvedValue({ clientId: 'c', clientSecret: 's', redirectUri: 'r' })
})

describe('readSearchConsoleAnalytics', () => {
  it('disabled cuando el flag está OFF', async () => {
    flags.isSearchConsoleEnabled.mockReturnValue(false)
    const r = await readSearchConsoleAnalytics('org-a', RANGE)

    expect(r).toEqual({ ok: false, errorCode: 'disabled', status: null })
  })

  it('not_connected cuando no hay conexión activa', async () => {
    store.getSearchConsoleConnection.mockResolvedValue(null)
    const r = await readSearchConsoleAnalytics('org-a', RANGE)

    expect(r).toEqual({ ok: false, errorCode: 'not_connected', status: null })
  })

  it('tenant isolation: cada org resuelve SU propio token (scoped por organization_id)', async () => {
    store.getSearchConsoleConnection.mockImplementation(async (orgId: string) =>
      orgId === 'org-a' ? { ...ACTIVE } : { ...ACTIVE, organizationId: 'org-b', siteUrl: 'https://other.com/', tokenSecretRef: 'search-console-token-org-b' }
    )
    secrets.resolveSecretByRef.mockResolvedValue('refresh')
    oauth.refreshAccessToken.mockResolvedValue('access')
    api.querySearchAnalytics.mockResolvedValue([])

    await readSearchConsoleAnalytics('org-b', RANGE)
    expect(store.getSearchConsoleConnection).toHaveBeenCalledWith('org-b')
    expect(secrets.resolveSecretByRef).toHaveBeenCalledWith('search-console-token-org-b')
    expect(api.querySearchAnalytics).toHaveBeenCalledWith('access', 'https://other.com/', RANGE)
  })

  it('token_unhealthy + marca revoked cuando el secreto desapareció', async () => {
    store.getSearchConsoleConnection.mockResolvedValue({ ...ACTIVE })
    secrets.resolveSecretByRef.mockResolvedValue(null)
    const r = await readSearchConsoleAnalytics('org-a', RANGE)

    expect(r).toEqual({ ok: false, errorCode: 'token_unhealthy', status: 'revoked' })
    expect(store.setSearchConsoleConnectionStatus).toHaveBeenCalledWith('org-a', 'revoked', 'token_secret_missing')
  })

  it('honest degradation: invalid_grant (403) → revoked + token_unhealthy (no inventa filas)', async () => {
    store.getSearchConsoleConnection.mockResolvedValue({ ...ACTIVE })
    secrets.resolveSecretByRef.mockResolvedValue('refresh')
    oauth.refreshAccessToken.mockResolvedValue('access')
    api.querySearchAnalytics.mockRejectedValue(new FakeApiError(403))
    const r = await readSearchConsoleAnalytics('org-a', RANGE)

    expect(r).toEqual({ ok: false, errorCode: 'token_unhealthy', status: 'revoked' })
    expect(store.setSearchConsoleConnectionStatus).toHaveBeenCalledWith('org-a', 'revoked', 'invalid_grant')
  })

  it('ok: devuelve filas y refresca last_verified_at', async () => {
    store.getSearchConsoleConnection.mockResolvedValue({ ...ACTIVE })
    secrets.resolveSecretByRef.mockResolvedValue('refresh')
    oauth.refreshAccessToken.mockResolvedValue('access')
    api.querySearchAnalytics.mockResolvedValue([{ keys: ['kw'], clicks: 5, impressions: 100, ctr: 0.05, position: 3 }])
    const r = await readSearchConsoleAnalytics('org-a', RANGE)

    expect(r.ok).toBe(true)

    if (r.ok) {
      expect(r.rows).toHaveLength(1)
      expect(r.siteUrl).toBe('https://acme.com/')
    }

    expect(store.setSearchConsoleConnectionStatus).toHaveBeenCalledWith('org-a', 'active', null)
  })
})
