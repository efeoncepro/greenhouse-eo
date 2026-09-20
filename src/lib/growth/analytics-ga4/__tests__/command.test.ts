import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const flags = vi.hoisted(() => ({ isGa4Enabled: vi.fn() }))

const oauth = vi.hoisted(() => ({
  resolveGa4OAuthConfig: vi.fn(),
  exchangeGa4Code: vi.fn(),
  buildGa4ConsentUrl: vi.fn(),
  refreshGa4AccessToken: vi.fn()
}))

const state = vi.hoisted(() => ({ consumeGa4OAuthState: vi.fn(), createGa4OAuthState: vi.fn() }))
const secrets = vi.hoisted(() => ({ createOrAddSecretVersion: vi.fn(), resolveSecretByRef: vi.fn() }))

const store = vi.hoisted(() => ({
  getGa4Connection: vi.fn(),
  upsertPendingGa4Connection: vi.fn(),
  setGa4Property: vi.fn(),
  setGa4ConnectionStatus: vi.fn(),
  disconnectGa4Connection: vi.fn()
}))

const api = vi.hoisted(() => ({ listAccountSummaries: vi.fn() }))

vi.mock('../flags', () => flags)
vi.mock('../oauth-client', () => oauth)
vi.mock('../state-store', () => state)
vi.mock('../connection-store', () => store)
vi.mock('@/lib/secrets/secret-manager', () => secrets)
vi.mock('@/lib/growth/ga4/api-client', () => ({
  Ga4AdminClient: class { listAccountSummaries = api.listAccountSummaries },
  Ga4ApiError: class extends Error { status = 403 }
}))

import { completeGa4Connection, selectGa4Property } from '../command'

beforeEach(() => {
  vi.clearAllMocks()
  flags.isGa4Enabled.mockReturnValue(true)
  oauth.resolveGa4OAuthConfig.mockResolvedValue({ clientId: 'id', clientSecret: 'secret', redirectUri: 'https://greenhouse.test/cb' })
})

describe('GA4 connection authorization', () => {
  it('rejects a callback consumed by a different operator before exchanging the code', async () => {
    state.consumeGa4OAuthState.mockResolvedValue({ organizationId: 'org-a', userId: 'operator-a' })

    expect(await completeGa4Connection('state', 'code', 'operator-b')).toEqual({ ok: false, errorCode: 'state_invalid' })
    expect(oauth.exchangeGa4Code).not.toHaveBeenCalled()
  })

  it('rejects a token that lacks the GA4 read-only scope before saving it', async () => {
    state.consumeGa4OAuthState.mockResolvedValue({ organizationId: 'org-a', userId: 'operator-a' })
    oauth.exchangeGa4Code.mockResolvedValue({ refreshToken: 'private-token', scopes: ['https://www.googleapis.com/auth/analytics.edit'] })

    expect(await completeGa4Connection('state', 'code', 'operator-a')).toEqual({
      ok: false, errorCode: 'oauth_failed', organizationId: 'org-a'
    })
    expect(secrets.createOrAddSecretVersion).not.toHaveBeenCalled()
  })

  it('only binds a property returned for the connected Google account', async () => {
    store.getGa4Connection.mockResolvedValue({ organizationId: 'org-a', status: 'pending', tokenSecretRef: 'ga4-token-org-a' })
    secrets.resolveSecretByRef.mockResolvedValue('private-token')
    api.listAccountSummaries.mockResolvedValue([{ displayName: 'Account', properties: [{ propertyId: '123', displayName: 'Allowed' }] }])

    expect(await selectGa4Property('org-a', '999')).toEqual({ ok: false, errorCode: 'property_not_accessible' })
    expect(store.setGa4Property).not.toHaveBeenCalled()
  })
})
