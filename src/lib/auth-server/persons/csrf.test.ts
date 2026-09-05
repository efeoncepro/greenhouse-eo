import { describe, expect, it, vi } from 'vitest'

import { createPersonAuthHandler } from './routes'
import { AUTH_SERVER_PERSON_AUTH_DEFAULTS } from './config'
import { InMemoryPersonAuthStore } from './store/memory-store'
import { createInMemoryTotpCipher } from './totp-cipher'

const issuer = 'https://auth.efeonce.org'

const paths = [
  '/auth/magic-link/consume',
  '/auth/passkeys/authenticate/start',
  '/auth/passkeys/authenticate/finish',
  '/auth/passkeys/register/start',
  '/auth/passkeys/register/finish',
  '/auth/passkeys/step-up/start',
  '/auth/passkeys/step-up/finish',
  '/auth/totp/enroll/start',
  '/auth/totp/enroll/finish',
  '/auth/totp/verify',
  '/auth/session/logout'
]

const fixture = () => {
  const store = new InMemoryPersonAuthStore()
  const sessionRead = vi.spyOn(store, 'getSessionWithLink')
  const revoke = vi.spyOn(store, 'revokeSession')

  const handler = createPersonAuthHandler({
    store,
    config: { ...AUTH_SERVER_PERSON_AUTH_DEFAULTS, personAuthEnabled: true },
    directory: { findBySubject: async () => null, findByEmail: async () => null },
    mailer: { send: async () => undefined },
    invitations: { accept: async () => ({ status: 'rejected', reason: 'not_found' }) },
    mintSubject: () => 'unused',
    environmentId: 'efeonce-auth',
    expectedSourceSystem: 'external_idp:efeonce-auth',
    issuer,
    rpId: 'auth.efeonce.org',
    internalLoginEnabled: () => false,
    totpCipher: createInMemoryTotpCipher(),
    now: () => new Date(),
    sleep: async () => undefined
  })

  return {
    store,
    sessionRead,
    revoke,
    call: (path: string, headers: Record<string, string>) =>
      handler({
        method: 'POST',
        url: new URL(path, issuer),
        headers: new Headers({
          'content-type': 'application/json',
          cookie: '__Host-efeonce_auth=opaque-cookie',
          ...headers
        }),
        body: '{}'
      })
  }
}

describe('cookie mutations reject cross-origin before session or command work', () => {
  it.each(paths)('guards %s against sibling, cross-site, opaque or absent origin evidence', async path => {
    const f = fixture()

    const cases: Record<string, string>[] = [
      { origin: 'https://portal.efeonce.org' },
      { origin: 'https://evil.example' },
      { origin: 'null' },
      { origin: '' },
      { origin: issuer + ', https://evil.example' },
      { origin: issuer + '/' },
      { origin: issuer, 'sec-fetch-site': 'cross-site' },
      { origin: issuer, 'sec-fetch-site': 'same-site' },
      { 'sec-fetch-site': 'same-origin' },
      {},
      { referer: 'https://evil.example/path' },
      { origin: 'null', referer: issuer + '/page' }
    ]

    for (const headers of cases) {
      expect((await f.call(path, headers))?.status).toBe(403)
    }

    expect(f.sessionRead).not.toHaveBeenCalled()
    expect(f.revoke).not.toHaveBeenCalled()
    expect(f.store.attempts).toEqual([])
  })
  it('accepts exact Origin or same-origin Referer, but never Fetch Metadata alone', async () => {
    const f = fixture()

    const cases: Record<string, string>[] = [
      { origin: issuer },
      { origin: issuer, 'sec-fetch-site': 'same-origin' },
      { referer: issuer + '/login/step-up' }
    ]

    for (const headers of cases) {
      expect((await f.call('/auth/totp/verify', headers))?.status).toBe(401)
    }

    // 401 comes from the session resolver: accepted provenance does not authenticate a caller.
    expect(f.sessionRead).toHaveBeenCalledTimes(3)
  })
  it('does not alter the unauthenticated email request contract', async () => {
    const f = fixture()

    expect((await f.call('/auth/magic-link/request', {}))?.status).toBe(400)
  })
})
