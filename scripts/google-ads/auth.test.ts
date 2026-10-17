import { mkdtemp, writeFile, chmod, symlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { GOOGLE_ADS_PROFILE as profile, GOOGLE_ADS_SCOPE } from '../../src/lib/growth/google-ads/contracts'

const mocks = vi.hoisted(() => ({ getAccessToken: vi.fn(), getTokenInfo: vi.fn() }))

vi.mock('google-auth-library', () => ({ OAuth2Client: class { setCredentials() {} getAccessToken = mocks.getAccessToken; getTokenInfo = mocks.getTokenInfo } }))

import { credentialTokenProvider, privateJson, validateCredential } from './auth'

const credential = () => validateCredential({ type: 'authorized_user', client_id: profile.clientId, client_secret: 'synthetic-private', refresh_token: 'synthetic-refresh', subject: 'synthetic-subject', authorized_email: profile.authorizedEmail, target_customer_id: profile.customerId, cloud_project: profile.cloudProject })

afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks() })

describe('Ads OAuth principal and scope verification', () => {
  it('checks fresh Google userinfo, scope and audience, then caches only in process', async () => {
    mocks.getAccessToken.mockResolvedValue({ token: 'synthetic-access' })
    mocks.getTokenInfo.mockResolvedValue({ aud: profile.clientId, scopes: [GOOGLE_ADS_SCOPE] })
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ email: profile.authorizedEmail, email_verified: true, sub: 'synthetic-subject' })))

    vi.stubGlobal('fetch', fetchMock)
    const provider = credentialTokenProvider(credential())

    expect(await provider()).toBe('synthetic-access')
    expect(await provider()).toBe('synthetic-access')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mocks.getAccessToken).toHaveBeenCalledTimes(1)
  })

  it.each([
    { email: 'other@example.com', email_verified: true, sub: 'synthetic-subject' },
    { email: profile.authorizedEmail, email_verified: false, sub: 'synthetic-subject' },
    { email: profile.authorizedEmail, email_verified: true, sub: 'another-subject' }
  ])('rejects unauthorized identity without trusting the file: %j', async identity => {
    mocks.getAccessToken.mockResolvedValue({ token: 'synthetic-access' })
    mocks.getTokenInfo.mockResolvedValue({ aud: profile.clientId, scopes: [GOOGLE_ADS_SCOPE] })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(identity))))
    await expect(credentialTokenProvider(credential())()).rejects.toMatchObject({ code: 'OAUTH_PRINCIPAL_MISMATCH', exitCode: 3 })
  })

  it.each([{ aud: 'other', scopes: [GOOGLE_ADS_SCOPE] }, { aud: profile.clientId, scopes: [] }])('rejects wrong audience or scope %j', async info => {
    mocks.getAccessToken.mockResolvedValue({ token: 'synthetic-access' })
    mocks.getTokenInfo.mockResolvedValue(info)
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)
    await expect(credentialTokenProvider(credential())()).rejects.toMatchObject({ code: 'OAUTH_SCOPE_OR_AUDIENCE_MISMATCH' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('drops all raw OAuth exception details', async () => {
    mocks.getAccessToken.mockRejectedValue(new Error('synthetic-private-refresh-token'))
    await expect(credentialTokenProvider(credential())()).rejects.toMatchObject({ message: 'OAUTH_REFRESH_OR_IDENTITY_FAILED' })
  })
})

describe('Private input files', () => {
  it('requires owner-only mode and rejects symlinks', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ads-private-'))

    try {
      const path = join(dir, 'input.json')

      await writeFile(path, '{}', { mode: 0o600 })
      expect(await privateJson(path)).toEqual({})
      await chmod(path, 0o644)
      await expect(privateJson(path)).rejects.toMatchObject({ code: 'PRIVATE_FILE_REQUIRES_OWNER_MODE_0600' })
      await chmod(path, 0o600)
      await symlink(path, join(dir, 'symlink.json'))
      await expect(privateJson(join(dir, 'symlink.json'))).rejects.toMatchObject({ code: 'PRIVATE_JSON_UNAVAILABLE' })
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
})
