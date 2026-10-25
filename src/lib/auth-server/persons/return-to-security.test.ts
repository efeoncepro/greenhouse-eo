import { describe, expect, it } from 'vitest'

import { sanitizeReturnTo } from './magic-link'
import { createPersonAuthHandler } from './routes'
import { AUTH_SERVER_PERSON_AUTH_DEFAULTS } from './config'
import { InMemoryPersonAuthStore } from './store/memory-store'
import { createInMemoryTotpCipher } from './totp-cipher'

/** Independent protocol review 2026-10-25: relative text is not necessarily an origin-safe URL. */
describe('return_to parser security', () => {
  it.each(Array.from({ length: 32 }, (_, code) => code).concat(Array.from({ length: 33 }, (_, index) => 127 + index)))(
    'rejects control code point U+%s before normalization', code => {
      const control = String.fromCharCode(code)

      expect(sanitizeReturnTo(`/${control}/redirect.example.invalid`)).toBeNull()
      expect(sanitizeReturnTo(`${control}/oauth/authorize`)).toBeNull()
      expect(sanitizeReturnTo(`/oauth/authorize?state=a${control}b`)).toBeNull()
    }
  )
  it.each(['//redirect.example.invalid', '/\\redirect.example.invalid', '/a/..//redirect.example.invalid',
    '/%2e//redirect.example.invalid', '/a/%2e%2e//redirect.example.invalid', 'https://redirect.example.invalid',
    ' /\t/redirect.example.invalid ', '/oauth/authorize?x=\\redirect.example.invalid'])(
    'rejects external or ambiguous destination %j', value => {
      expect(sanitizeReturnTo(value)).toBeNull()
    }
  )
  it.each(['/oauth/authorize?client_id=efeonce-rp-rooms&first_party_request=synthetic',
    '/oauth/authorize?state=a%2Bb&nonce=synthetic#section', '/ruta/área?texto=sesión',
    '/\uFF0F/redirect.example.invalid', '/%2f%2fredirect.example.invalid', '/%09/redirect.example.invalid'])(
    'keeps an accepted destination on the issuer origin %j', value => {
      const result = sanitizeReturnTo(value)

      expect(result).not.toBeNull()
      expect(new URL(result!, 'https://auth.example.test').origin).toBe('https://auth.example.test')
      expect(result).not.toMatch(/^\/\//)
      expect(result).toBe(sanitizeReturnTo(result))
    }
  )
  it('preserves exact legitimate authorize parameters and normalizes only URL syntax', () => {
    const continuation = '/oauth/authorize?client_id=efeonce-rp-rooms&first_party_request=efpt_synthetic'

    expect(sanitizeReturnTo(continuation)).toBe(continuation)
    expect(sanitizeReturnTo(' /safe/../oauth/authorize?state=one%2Btwo ')).toBe('/oauth/authorize?state=one%2Btwo')
  })
})


it.each([false, true])('magic-link router rejects TAB without losing authentication (previously persisted=%s)', async previouslyPersisted => {
  const issuer = 'https://auth.example.test'
  const store = new InMemoryPersonAuthStore()
  const sent: { url: string }[] = []
  const person = { linkId: 'link-test', profileId: 'profile-test', subject: 'subject-test', email: 'synthetic@example.test' }

  store.registerLink({ linkId: person.linkId, subject: person.subject, sourceSystem: 'external_idp:test', active: true })

  const handler = createPersonAuthHandler({ store, config: { ...AUTH_SERVER_PERSON_AUTH_DEFAULTS, personAuthEnabled: true },
    internalLoginEnabled: () => false,
    directory: { findByEmail: async () => person, findBySubject: async () => person },
    mailer: { send: async value => { sent.push(value) } },
    invitations: { accept: async () => ({ status: 'rejected', reason: 'not_found' }) },
    mintSubject: () => 'unused', environmentId: 'test', expectedSourceSystem: 'external_idp:test', issuer,
    rpId: 'auth.example.test', totpCipher: createInMemoryTotpCipher(), now: () => new Date(), sleep: async () => {} })

  const request = (path: string, values: Record<string, string>) => ({ url: new URL(path, issuer), method: 'POST',
    headers: new Headers({ origin: issuer, 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': '127.0.0.1' }),
    body: new URLSearchParams(values).toString() })

  await handler(request('/auth/magic-link/request', { email: person.email, return_to: '/\t/redirect.example.invalid' }))
  await new Promise(resolve => setImmediate(resolve))
  expect(sent).toHaveLength(1)

  if (previouslyPersisted) {
    for (const record of store.magicLinks.values()) record.returnTo = '/\t/redirect.example.invalid'
  }

  const token = new URL(sent[0].url).pathname.slice('/m/'.length)
  const result = await handler(request('/auth/magic-link/consume', { token }))

  expect(result?.status).toBe(200)
  expect(result?.headers.Location).toBeUndefined()
  expect(result?.headers['Set-Cookie']).toBeDefined()
})
