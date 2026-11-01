import { generateKeyPair, jwtVerify, SignJWT } from 'jose'
import { describe, expect, it, vi } from 'vitest'

import { buildPkceChallenge, sha256Hex } from '../oauth/primitives'
import { InMemoryOAuthStore } from '../oauth/store/memory-store'
import { MemoryFirstPartyStore } from './memory-store'
import { createFirstPartyHandler, resolveFirstPartyLoginContext, type FirstPartyDeps } from './protocol'
import { registerFirstPartyClient } from './registry'
import type { FirstPartyIdentity } from './types'

const issuer = 'https://auth.example.test'
const callback = 'https://rooms.example.test/auth/callback'
const verifier = 'a'.repeat(64)

const request = (path: string, body?: Record<string, string>, authorization?: string) => ({
  url: new URL(path, issuer), method: body ? 'POST' : 'GET', body: body ? new URLSearchParams(body).toString() : '',
  headers: new Headers({ ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    ...(authorization ? { authorization } : {}) })
})

const fixture = async () => {
  let now = new Date('2026-10-25T12:00:00Z')
  const store = new MemoryFirstPartyStore()
  const auditStore = new InMemoryOAuthStore()
  const { privateKey, publicKey } = await generateKeyPair('ES256')
  const registered = await registerFirstPartyClient({ clientId: 'efeonce-rp-rooms-test', product: 'rooms', redirectUris: [callback], actor: 'test-operator' }, { store, now: () => now })
  const basic = 'Basic ' + Buffer.from(registered.client.clientId + ':' + registered.clientSecret).toString('base64')
  let identity: FirstPartyIdentity | null = { sessionHash: '1'.repeat(64), subject: 'opaque-person', profileId: 'profile-one', environmentId: 'efeonce-auth',
    authTime: new Date(now.getTime() - 60000), expiresAt: new Date(now.getTime() + 3600000) }

  const deps: FirstPartyDeps = { config: { enabled: true, issuer, environmentId: 'efeonce-auth' }, store, auditStore,
    identity: { resolveRequest: async () => identity, resolveSession: async () => identity },
    signer: payload => new SignJWT(payload).setProtectedHeader({ alg: 'ES256', kid: 'test-key' }).sign(privateKey), now: () => now }

  const handler = createFirstPartyHandler(deps)

  const authorizeUrl = (overrides: Record<string, string> = {}) => '/oauth/authorize?' + new URLSearchParams({ client_id: registered.client.clientId,
    response_type: 'code', redirect_uri: callback, scope: 'openid', state: 'state-secret', nonce: 'nonce-secret', code_challenge_method: 'S256',
    code_challenge: buildPkceChallenge(verifier), ...overrides })

  const issueCode = async () => {
    const response = await handler(request(authorizeUrl()))

    expect(response?.status).toBe(302)

    return new URL(response!.headers.Location).searchParams.get('code')!
  }

  const exchange = (code: string, extra: Record<string, string> = {}, credentials = basic) => handler(request('/oauth/token', {
    grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: callback, ...extra
  }, credentials))

  const introspect = (token: string, credentials = basic) => handler(request('/oauth/introspect', { token }, credentials))

  return { store, auditStore, deps, handler, publicKey, basic, registered, authorizeUrl, issueCode, exchange, introspect,
    setIdentity: (value: FirstPartyIdentity | null) => { identity = value }, identity: () => identity,
    advance: (seconds: number) => { now = new Date(now.getTime() + seconds * 1000) }, now: () => now }
}

describe('TASK-1834 first-party OIDC authority', () => {
  it('signs minimal audience-bound identity; opaque handle validates live identity without MCP consent or grants', async () => {
    const h = await fixture()
    const response = await h.exchange(await h.issueCode())
    const tokens = JSON.parse(response!.body)

    expect(response?.status).toBe(200)
    expect(tokens).toMatchObject({ token_type: 'Bearer', expires_in: 300, scope: 'openid' })
    expect(tokens.refresh_token).toBeUndefined()
    expect(tokens.access_token).toMatch(/^efpa_/)
    const { payload } = await jwtVerify(tokens.id_token, h.publicKey, { issuer, audience: h.registered.client.clientId, currentDate: h.now() })

    expect(Object.keys(payload).sort()).toEqual(['iss','sub','aud','iat','exp','auth_time','nonce'].sort())
    expect(payload).toMatchObject({ sub: 'opaque-person', nonce: 'nonce-secret' })
    expect(JSON.parse((await h.introspect(tokens.access_token))!.body)).toMatchObject({ active: true, iss: issuer, aud: h.registered.client.clientId, sub: payload.sub })
    expect(h.auditStore.consents).toHaveLength(0)
    expect(h.auditStore.accessTokens.size).toBe(0)
    h.setIdentity(null)
    expect(JSON.parse((await h.introspect(tokens.access_token))!.body)).toEqual({ active: false })
  })

  it('OFF does not query first-party tables and does not intercept normal MCP requests', async () => {
    const h = await fixture()

    h.deps.config.enabled = false
    const spy = vi.spyOn(h.store, 'getClient').mockRejectedValue(new Error('table not migrated'))

    expect((await h.handler(request(h.authorizeUrl())))?.status).toBe(400)
    expect(await h.handler(request('/oauth/authorize?client_id=mcp-client'))).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it.each<Record<string, string>>([{ scope: 'efeonce.mcp.read' }, { resource: 'https://mcp.efeonce.org/mcp' }, { scope: 'openid efeonce.mcp.read' },
    { nonce: '' }, { state: '' }, { code_challenge_method: 'plain' }, { redirect_uri: 'https://evil.test/callback' }])('denies incompatible authorization %j', async override => {
    const h = await fixture()

    expect((await h.handler(request(h.authorizeUrl(override))))?.status).toBe(400)
    expect(h.store.codes.size).toBe(0)
  })

  it('stores a trusted login continuation, checks fresh auth and consumes it once', async () => {
    const h = await fixture()
    const response = await h.handler(request(h.authorizeUrl({ prompt: 'login' })))
    const login = new URL(response!.headers.Location, issuer)
    const continuation = login.searchParams.get('return_to')!

    expect(login.pathname).toBe('/login')
    expect(continuation).toContain('first_party_request=')
    expect(await resolveFirstPartyLoginContext(continuation, h.deps)).toEqual({ product: 'rooms', displayName: 'Rooms', returnUrl: 'https://rooms.example.test' })
    expect((await h.handler(request(continuation)))!.headers.Location).toContain('/login?')
    h.setIdentity({ ...h.identity()!, sessionHash: '2'.repeat(64), authTime: h.now() })
    expect((await h.handler(request(continuation)))!.headers.Location).toContain(callback)
    expect((await h.handler(request(continuation)))!.status).toBe(400)
    expect(await resolveFirstPartyLoginContext('/oauth/authorize?client_id=efeonce-rp-rooms-test&redirect_uri=https://evil.test', h.deps)).toBeNull()
  })

  it.each<Record<string, string>>([{ prompt: 'login' }, { max_age: '0' }])('requires a changed session even when authentication occurred in the same second: %j', async overrides => {
    const h = await fixture()

    h.setIdentity({ ...h.identity()!, authTime: h.now() })
    const response = await h.handler(request(h.authorizeUrl(overrides)))
    const continuation = new URL(response!.headers.Location, issuer).searchParams.get('return_to')!

    expect(continuation).toContain('first_party_request=')
    expect((await h.handler(request(continuation)))!.headers.Location).toContain('/login?')
    h.setIdentity({ ...h.identity()!, sessionHash: '2'.repeat(64) })
    expect((await h.handler(request(continuation)))!.headers.Location).toContain(callback)
  })

  it('rechecks max_age after a continuation waits for its authentication', async () => {
    const h = await fixture()

    h.setIdentity(null)
    const response = await h.handler(request(h.authorizeUrl({ max_age: '10' })))
    const continuation = new URL(response!.headers.Location, issuer).searchParams.get('return_to')!

    h.setIdentity({ sessionHash: '2'.repeat(64), subject: 'opaque-person', profileId: 'profile-one', environmentId: 'efeonce-auth', authTime: h.now(), expiresAt: new Date(h.now().getTime() + 3600000) })
    h.advance(11)
    expect((await h.handler(request(continuation)))!.headers.Location).toContain('/login?')
    h.setIdentity({ ...h.identity()!, sessionHash: '3'.repeat(64), authTime: h.now() })
    expect((await h.handler(request(continuation)))!.headers.Location).toContain(callback)
  })

  it('prompt none without a session returns login_required to the exact RP with state and issuer', async () => {
    const h = await fixture()

    h.setIdentity(null)
    const response = await h.handler(request(h.authorizeUrl({ prompt: 'none' })))
    const target = new URL(response!.headers.Location)

    expect(target.origin + target.pathname).toBe(callback)
    expect(Object.fromEntries(target.searchParams)).toEqual({ error: 'login_required', state: 'state-secret', iss: issuer })
  })

  it('denies a changed identity, wrong verifier and expired code at token exchange', async () => {
    const h = await fixture()
    const revoked = await h.issueCode()
    const identity = h.identity()

    h.setIdentity(null)
    expect((await h.exchange(revoked))?.status).toBe(400)
    h.setIdentity(identity)
    expect((await h.exchange(await h.issueCode(), { code_verifier: 'b'.repeat(64) }))?.status).toBe(400)
    const expired = await h.issueCode()

    h.advance(301)
    expect((await h.exchange(expired))?.status).toBe(400)
  })

  it('isolates a second relying party, denial of cross-audience identity and selective revoke', async () => {
    const h = await fixture()
    const second = await registerFirstPartyClient({ clientId: 'efeonce-rp-second', product: 'synthetic-rp', redirectUris: ['https://other.test/callback'], actor: 'test' }, { store: h.store })
    const secondBasic = 'Basic ' + Buffer.from(second.client.clientId + ':' + second.clientSecret).toString('base64')
    const tokens = JSON.parse((await h.exchange(await h.issueCode()))!.body)

    await expect(jwtVerify(tokens.id_token, h.publicKey, { issuer, audience: second.client.clientId, currentDate: h.now() })).rejects.toThrow()
    expect(JSON.parse((await h.introspect(tokens.access_token, secondBasic))!.body)).toEqual({ active: false })
    await h.handler(request('/oauth/revoke', { token: tokens.access_token }, secondBasic))
    expect(JSON.parse((await h.introspect(tokens.access_token))!.body).active).toBe(true)
    await h.handler(request('/oauth/revoke', { token: tokens.access_token }, h.basic))
    expect(JSON.parse((await h.introspect(tokens.access_token))!.body).active).toBe(false)
    const codeA = await h.issueCode()

    expect((await h.exchange(codeA, {}, secondBasic))?.status).toBe(400)
    expect((await h.exchange(codeA))?.status).toBe(200)
    const secondAuthorize = await h.handler(request(h.authorizeUrl({ client_id: second.client.clientId, redirect_uri: second.client.redirectUris[0] })))
    const secondCode = new URL(secondAuthorize!.headers.Location).searchParams.get('code')!
    const secondTokens = JSON.parse((await h.exchange(secondCode, { redirect_uri: second.client.redirectUris[0] }, secondBasic))!.body)

    expect((await jwtVerify(secondTokens.id_token, h.publicKey, { issuer, audience: second.client.clientId, currentDate: h.now() })).payload.sub).toBe('opaque-person')
    expect(JSON.parse((await h.introspect(secondTokens.access_token, secondBasic))!.body).aud).toBe(second.client.clientId)
    expect(JSON.parse((await h.introspect(secondTokens.access_token))!.body)).toEqual({ active: false })
  })

  it('revokes on code replay and prevents a concurrent replay from preceding a late handle insertion', async () => {
    const h = await fixture()
    const code = await h.issueCode()
    let release!: () => void
    let signing!: () => void
    const started = new Promise<void>(resolve => { signing = resolve })
    const paused = new Promise<void>(resolve => { release = resolve })
    const original = h.deps.signer

    h.deps.signer = async payload => { signing(); await paused;

return original(payload) }

    const first = h.exchange(code)

    await started
    expect((await h.exchange(code))?.status).toBe(400)
    release()
    expect((await first)?.status).toBe(400)
    expect(h.store.handles.size).toBe(0)
    expect(h.store.codes.get(sha256Hex(code))?.invalidatedAt).toBeTruthy()
  })

  it('registration is immutable/idempotent and audit does not contain secrets', async () => {
    const h = await fixture()
    const again = await registerFirstPartyClient({ clientId: h.registered.client.clientId, product: 'rooms', redirectUris: [callback], actor: 'test' }, { store: h.store })

    await expect(registerFirstPartyClient({ clientId: 'efeonce-rp-prototype', product: '__proto__' as 'rooms', redirectUris: [callback], actor: 'test' }, { store: h.store })).rejects.toThrow()
    expect(again).toMatchObject({ created: false, clientSecret: null })
    expect(h.store.registrationAudit).toHaveLength(1)
    expect(JSON.stringify(h.store.registrationAudit)).not.toContain(h.registered.clientSecret!)
    await expect(registerFirstPartyClient({ clientId: h.registered.client.clientId, product: 'rooms', redirectUris: ['https://other.test/callback'], actor: 'test' }, { store: h.store })).rejects.toThrow()
  })
})
