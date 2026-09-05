import { describe, expect, it, vi } from 'vitest'

import { createPersonSession } from './sessions'
import { resolveStepUpPage, handleStepUpPage, STEP_UP_PAGE_PATH, type StepUpPageDeps } from './step-up-page'
import { createPersonAuthHandler } from './routes'
import { createInMemoryTotpCipher } from './totp-cipher'
import { AUTH_SERVER_PERSON_AUTH_DEFAULTS } from './config'
import { InMemoryPersonAuthStore } from './store/memory-store'

const issuer = 'https://auth.example'
const now = new Date('2026-09-05T12:00:00Z')

const returnTo =
  '/oauth/authorize?' +
  new URLSearchParams({
    client_id: 'client',
    state: 'a&"b',
    code_challenge: 'challenge',
    code_challenge_method: 'S256',
    resource: 'https://mcp.example/mcp'
  })

const fixture = async () => {
  const store = new InMemoryPersonAuthStore()
  const config = { ...AUTH_SERVER_PERSON_AUTH_DEFAULTS, personAuthEnabled: true }

  store.registerLink({
    linkId: 'link',
    subject: 'private-person',
    sourceSystem: 'external_idp:environment',
    active: true
  })

  const session = await createPersonSession({
    store,
    config,
    now,
    input: {
      subject: 'private-person',
      environmentId: 'environment',
      profileId: 'profile',
      linkId: 'link',
      amr: ['entra_oidc'],
      authTime: now,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    }
  })

  const deps: StepUpPageDeps = {
    store,
    config,
    issuer,
    environmentId: 'environment',
    expectedSourceSystem: 'external_idp:environment',
    now: () => now
  }

  const request = (target = returnTo) => ({
    method: 'GET',
    url: new URL(STEP_UP_PAGE_PATH + '?' + new URLSearchParams({ return_to: target }), issuer),
    headers: new Headers({ cookie: config.sessionCookieName + '=' + session.sessionId }),
    body: ''
  })


return { store, deps, session, request }
}

describe('step-up page read-only model and route', () => {
  it('preserves OAuth return and reads absent factors without enrolling or exposing identity', async () => {
    const f = await fixture()
    const enroll = vi.spyOn(f.store, 'upsertTotpEnrollment')
    const register = vi.spyOn(f.store, 'insertPasskeyCredential')

    expect(await resolveStepUpPage(f.request(), f.deps)).toEqual({
      status: 'ready',
      model: { returnTo, authLevel: 'primary', hasTotp: false, hasPasskey: false }
    })
    const page = await handleStepUpPage(f.request(), f.deps)

    expect(page.status).toBe(200)
    expect(page.body).not.toContain('private-person')
    expect(page.body).not.toContain(f.session.sessionId)
    expect(enroll).not.toHaveBeenCalled()
    expect(register).not.toHaveBeenCalled()
  })
  it('reports only active factors and excludes revoked or pending factors', async () => {
    const f = await fixture()

    await f.store.upsertTotpEnrollment({
      environmentId: 'environment',
      subject: 'private-person',
      secretCiphertext: new Uint8Array(),
      kmsKeyName: 'key',
      status: 'active',
      lastUsedStep: null,
      createdAt: now,
      confirmedAt: now,
      lastVerifiedAt: null,
      revokedAt: null,
      revokeReason: null
    })
    await f.store.insertPasskeyCredential({
      credentialId: 'cred',
      environmentId: 'environment',
      subject: 'private-person',
      publicKey: new Uint8Array(),
      counter: 0,
      transports: [],
      deviceName: null,
      deviceType: null,
      backedUp: false,
      aaguid: null,
      createdAt: now,
      lastUsedAt: null,
      revokedAt: null,
      revokeReason: null
    })
    expect(await resolveStepUpPage(f.request(), f.deps)).toMatchObject({ model: { hasTotp: true, hasPasskey: true } })
    await f.store.revokePasskeyCredential({ credentialId: 'cred', now, reason: 'test' })
    const enrollment = await f.store.getTotpEnrollment({ environmentId: 'environment', subject: 'private-person' })

    await f.store.upsertTotpEnrollment({ ...enrollment!, status: 'pending' })
    expect(await resolveStepUpPage(f.request(), f.deps)).toMatchObject({ model: { hasTotp: false, hasPasskey: false } })
  })
  it.each([
    'https://evil.example/oauth/authorize',
    '//evil.example/oauth/authorize',
    '/other',
    '/oauth/authorize#x',
    '/\\evil.example',
    ''
  ])('rejects unsafe return %s before reading factors', async target => {
    const f = await fixture()
    const read = vi.spyOn(f.store, 'getTotpEnrollment')

    expect(await resolveStepUpPage(f.request(target), f.deps)).toEqual({ status: 'invalid_return' })
    expect(read).not.toHaveBeenCalled()
  })
  it('rejects duplicate returns, revoked sessions, and unavailable factor stores', async () => {
    const f = await fixture()
    const request = f.request()

    request.url.searchParams.append('return_to', returnTo)
    expect(await resolveStepUpPage(request, f.deps)).toEqual({ status: 'invalid_return' })
    vi.spyOn(f.store, 'getTotpEnrollment').mockRejectedValueOnce(new Error('private error'))
    expect(await resolveStepUpPage(f.request(), f.deps)).toEqual({ status: 'unavailable' })
    await f.store.revokeSession({ sessionHash: f.session.record.sessionHash, now, reason: 'test' })
    expect(await resolveStepUpPage(f.request(), f.deps)).toEqual({ status: 'unauthenticated' })
  })
  it('routes GET through the real person handler and refuses POST', async () => {
    const f = await fixture()

    const handler = createPersonAuthHandler({
      ...f.deps,
      internalLoginEnabled: () => true,
      directory: { findByEmail: async () => null, findBySubject: async () => null },
      mailer: { send: async () => undefined },
      invitations: { accept: async () => ({ status: 'rejected', reason: 'not_found' }) },
      mintSubject: () => 'unused',
      rpId: 'auth.example',
      totpCipher: createInMemoryTotpCipher(),
      sleep: async () => undefined
    })

    expect((await handler(f.request()))?.status).toBe(200)
    expect((await handler({ ...f.request(), method: 'POST' }))?.status).toBe(405)
  })
})
