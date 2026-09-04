/**
 * Flujo completo del emisor in-process (TASK-1829): metadata → DCR/CIMD → authorize (consent) → token
 * → JWT verificable con el JWKS → refresh rotativo → reuso detectado → revoke → introspect `active:false`.
 * Store en memoria + firmador P-256 local: el runtime real cambia sólo el store (PG) y el signer (KMS).
 */

import { createHash, randomBytes } from 'node:crypto'

import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, jwtVerify } from 'jose'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/identity/external-access', () => ({ resolveExternalAccess: vi.fn() }))

import { buildPublishedJwks, type SigningKeyRecord } from '../keys'
import { AUTH_SERVER_OAUTH_DEFAULTS, type AuthServerOAuthConfig } from './config'
import { createStaticGrantsPort } from './grants'
import { createOAuthHandler, type OAuthHandler } from './handler'
import { headersFromRecord, type OAuthHttpRequest, type OAuthHttpResponse } from './http'
import { InMemoryOAuthStore } from './store/memory-store'
import { createStaticSubjectPort, type AuthenticatedSubject } from './subject'

const ISSUER = 'https://auth.test.efeonce.org'
const AUDIENCE = 'https://mcp.efeonce.org/mcp'

const config: AuthServerOAuthConfig = {
  issuer: ISSUER,
  oauthEnabled: true,
  environmentId: 'efeonce-auth',
  mcpAudience: AUDIENCE,
  ...AUTH_SERVER_OAUTH_DEFAULTS,
  allowLocalhostAlias: true
}

const b64url = (buffer: Buffer) => buffer.toString('base64url')

const pkce = () => {
  const verifier = b64url(randomBytes(48))

  return { verifier, challenge: b64url(createHash('sha256').update(verifier).digest()) }
}

type Harness = {
  handler: OAuthHandler
  store: InMemoryOAuthStore
  keys: SigningKeyRecord[]
  publicKey: CryptoKey
  setSubject: (subject: AuthenticatedSubject | null) => void
  clock: { now: Date }
}

const createHarness = async (overrides: Partial<AuthServerOAuthConfig> = {}): Promise<Harness> => {
  const { privateKey, publicKey } = await generateKeyPair('ES256')
  const jwk = await exportJWK(publicKey)
  const kid = 'test-kid'

  const keys: SigningKeyRecord[] = [
    {
      kid,
      kmsKeyVersion: 'projects/p/locations/l/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1',
      algorithm: 'ES256',
      publicJwk: { kty: 'EC', crv: 'P-256', x: jwk.x as string, y: jwk.y as string },
      state: 'active',
      activatedAt: new Date('2026-09-01T00:00:00Z'),
      retiringAt: null,
      retiredAt: null,
      createdBy: 'test'
    }
  ]

  const store = new InMemoryOAuthStore()
  const clock = { now: new Date('2026-09-04T12:00:00Z') }
  let subject: AuthenticatedSubject | null = null

  const handler = createOAuthHandler({
    store,
    config: { ...config, ...overrides },
    signer: payload => new SignJWT(payload).setProtectedHeader({ alg: 'ES256', kid, typ: 'JWT' }).sign(privateKey),
    subjectPort: { resolve: async () => subject },
    grantsPort: createStaticGrantsPort({ bound: true, grantsVersion: 3, profileId: 'prof-1', memberships: 1 }),
    loadKeys: async () => keys,
    cimd: {
      resolveAddresses: async () => ['203.0.113.10'],
      fetcher: async url => ({
        status: 200,
        etag: '"v1"',
        contentType: 'application/json',
        body: JSON.stringify({
          client_id: url,
          client_name: 'CIMD Test Client',
          redirect_uris: ['http://127.0.0.1/callback', 'https://client.example/cb'],
          token_endpoint_auth_method: 'none',
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code']
        })
      })
    },
    now: () => clock.now
  })

  return { handler, store, keys, publicKey, setSubject: next => (subject = next), clock }
}

const request = (method: string, path: string, options: { headers?: Record<string, string>; body?: string } = {}): OAuthHttpRequest => ({
  method,
  url: new URL(path, ISSUER),
  headers: headersFromRecord(Object.fromEntries(Object.entries(options.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]))),
  body: options.body ?? ''
})

const form = (fields: Record<string, string>) => new URLSearchParams(fields).toString()

const FORM_HEADERS = { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': '198.51.100.7' }

const json = (response: OAuthHttpResponse | null) => JSON.parse(response!.body)

const PERSON: AuthenticatedSubject = { subject: 'sub-opaque-1', environmentId: 'efeonce-auth', authLevel: 'primary', authTime: new Date('2026-09-04T11:59:00Z') }

describe('auth-server OAuth flow (in-process)', () => {
  let h: Harness

  beforeEach(async () => {
    h = await createHarness()
  })

  it('publishes RFC 8414 + OIDC metadata with issuer identical to the origin and CIMD support', async () => {
    const as = json(await h.handler(request('GET', '/.well-known/oauth-authorization-server')))

    expect(as.issuer).toBe(ISSUER)
    expect(as.client_id_metadata_document_supported).toBe(true)
    expect(as.code_challenge_methods_supported).toEqual(['S256'])
    expect(as.subject_types_supported).toEqual(['public'])
    expect(as.authorization_endpoint).toBe(`${ISSUER}/oauth/authorize`)
    expect(as.token_endpoint).toBe(`${ISSUER}/oauth/token`)
    expect(as.registration_endpoint).toBe(`${ISSUER}/oauth/register`)
    expect(as.revocation_endpoint).toBe(`${ISSUER}/oauth/revoke`)
    expect(as.introspection_endpoint).toBe(`${ISSUER}/oauth/introspect`)
    expect(as.jwks_uri).toBe(`${ISSUER}/.well-known/jwks.json`)
    expect(as.scopes_supported).not.toContain('efeonce.mcp.seo.write')

    const oidc = json(await h.handler(request('GET', '/.well-known/openid-configuration')))

    expect(oidc.issuer).toBe(ISSUER)
    expect(oidc.id_token_signing_alg_values_supported).toEqual(['ES256'])
  })

  it('answers 404 on the whole surface when the flag is off', async () => {
    const off = await createHarness({ oauthEnabled: false })

    expect((await off.handler(request('GET', '/.well-known/oauth-authorization-server')))!.status).toBe(404)
    expect((await off.handler(request('POST', '/oauth/token', { headers: FORM_HEADERS, body: form({ grant_type: 'x' }) })))!.status).toBe(404)
    expect(await off.handler(request('GET', '/healthz'))).toBeNull()
  })

  const runCodeFlow = async (clientId: string, redirectUri: string, scopes = 'efeonce.mcp.read') => {
    const { verifier, challenge } = pkce()
    const state = 'st-' + randomBytes(4).toString('hex')

    const authorizeUrl = `/oauth/authorize?${new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      resource: AUDIENCE
    })}`

    // Sin consentimiento → pantalla de consentimiento (200, formulario a /oauth/consent).
    const consentPage = await h.handler(request('GET', authorizeUrl))

    expect(consentPage!.status).toBe(200)
    expect(consentPage!.body).toContain('action="/oauth/consent"')

    const allow = await h.handler(
      request('POST', '/oauth/consent', {
        headers: { ...FORM_HEADERS, origin: ISSUER, 'sec-fetch-site': 'same-origin' },
        body: form({ client_id: clientId, scope: scopes, return_to: authorizeUrl, decision: 'allow' })
      })
    )

    expect(allow!.status).toBe(302)
    expect(allow!.headers.Location).toBe(`${ISSUER}${authorizeUrl}`)

    const redirect = await h.handler(request('GET', authorizeUrl))

    expect(redirect!.status).toBe(302)

    const location = new URL(redirect!.headers.Location)

    expect(location.searchParams.get('state')).toBe(state)
    expect(location.searchParams.get('iss')).toBe(ISSUER)

    const code = location.searchParams.get('code')!

    expect(code.startsWith('efc_')).toBe(true)

    const token = await h.handler(
      request('POST', '/oauth/token', {
        headers: FORM_HEADERS,
        body: form({ grant_type: 'authorization_code', client_id: clientId, code, redirect_uri: location.origin + location.pathname, code_verifier: verifier })
      })
    )

    return { token, code, verifier, redirectUri: location.origin + location.pathname, state }
  }

  it('DCR client completes code + PKCE, receives an ES256 JWT verifiable with the JWKS, refreshes, and reuse revokes the family', async () => {
    h.setSubject(PERSON)

    const registered = await h.handler(
      request('POST', '/oauth/register', {
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.7' },
        body: JSON.stringify({ client_name: 'Claude Code', redirect_uris: ['http://localhost/callback'], grant_types: ['authorization_code', 'refresh_token'], token_endpoint_auth_method: 'none' })
      })
    )

    expect(registered!.status).toBe(201)

    const dcr = json(registered)

    expect(dcr.token_endpoint_auth_method).toBe('none')
    expect(dcr.client_id.startsWith('dcr-')).toBe(true)

    // Loopback con puerto efímero y alias localhost (decisión 2026-09-04).
    const { token } = await runCodeFlow(dcr.client_id, 'http://localhost:53211/callback')

    expect(token!.status).toBe(200)

    const body = json(token)

    expect(body.token_type).toBe('Bearer')
    expect(body.expires_in).toBe(900)
    expect(body.scope).toBe('efeonce.mcp.read')
    expect(body.refresh_token.startsWith('efr_')).toBe(true)

    // Verificación con el JWKS publicado (mismo camino que el gateway en TASK-1831).
    const jwks = createLocalJWKSet(buildPublishedJwks(h.keys))
    const verified = await jwtVerify(body.access_token, jwks, { issuer: ISSUER, audience: AUDIENCE, currentDate: h.clock.now })

    expect(verified.protectedHeader.alg).toBe('ES256')
    expect(verified.protectedHeader.kid).toBe('test-kid')
    expect(verified.payload.sub).toBe(PERSON.subject)
    expect(verified.payload.azp).toBe(dcr.client_id)
    expect(verified.payload.scope).toBe('efeonce.mcp.read')
    expect(verified.payload.gv).toBe(3)
    expect(typeof verified.payload.jti).toBe('string')
    expect(verified.payload.exp! - verified.payload.iat!).toBe(900)

    // Refresh rota; el anterior queda inservible y su reuso revoca la familia.
    const refreshed = await h.handler(
      request('POST', '/oauth/token', { headers: FORM_HEADERS, body: form({ grant_type: 'refresh_token', client_id: dcr.client_id, refresh_token: body.refresh_token }) })
    )

    expect(refreshed!.status).toBe(200)

    const second = json(refreshed)

    expect(second.refresh_token).not.toBe(body.refresh_token)

    const reuse = await h.handler(
      request('POST', '/oauth/token', { headers: FORM_HEADERS, body: form({ grant_type: 'refresh_token', client_id: dcr.client_id, refresh_token: body.refresh_token }) })
    )

    expect(reuse!.status).toBe(400)
    expect(json(reuse).error).toBe('invalid_grant')
    expect(h.store.audit.some(e => e.eventType === 'refresh_reuse')).toBe(true)

    // Familia entera revocada: el refresh nuevo también murió.
    const afterReuse = await h.handler(
      request('POST', '/oauth/token', { headers: FORM_HEADERS, body: form({ grant_type: 'refresh_token', client_id: dcr.client_id, refresh_token: second.refresh_token }) })
    )

    expect(json(afterReuse).error).toBe('invalid_grant')
    expect([...h.store.accessTokens.values()].every(t => t.revokedAt !== null)).toBe(true)
  })

  it('CIMD client (URL client_id) completes the flow; code reuse revokes the tokens of the first exchange', async () => {
    h.setSubject(PERSON)

    const clientId = 'https://client.example/oauth/client-metadata.json'
    const { token, code, verifier, redirectUri } = await runCodeFlow(clientId, 'http://127.0.0.1:4444/callback')

    expect(token!.status).toBe(200)
    expect(h.store.cimd.get(clientId)?.status).toBe('valid')
    expect(h.store.clients.get(clientId)?.registrationKind).toBe('cimd')

    const replay = await h.handler(
      request('POST', '/oauth/token', {
        headers: FORM_HEADERS,
        body: form({ grant_type: 'authorization_code', client_id: clientId, code, redirect_uri: redirectUri, code_verifier: verifier })
      })
    )

    expect(json(replay).error).toBe('invalid_grant')
    expect(h.store.audit.some(e => e.eventType === 'code_reuse')).toBe(true)
    expect([...h.store.accessTokens.values()].every(t => t.revokedAt !== null)).toBe(true)
  })

  it('rejects plain PKCE, localhost for hosted clients, non-exact https and unknown clients before redirecting', async () => {
    h.setSubject(PERSON)

    const { challenge } = pkce()
    const clientId = 'https://client.example/oauth/client-metadata.json'
    const base = { response_type: 'code', client_id: clientId, state: 's', code_challenge: challenge }

    const plain = await h.handler(request('GET', `/oauth/authorize?${new URLSearchParams({ ...base, redirect_uri: 'https://client.example/cb', code_challenge_method: 'plain' })}`))

    expect(plain!.status).toBe(302)
    expect(new URL(plain!.headers.Location).searchParams.get('error')).toBe('invalid_request')

    const nonExact = await h.handler(request('GET', `/oauth/authorize?${new URLSearchParams({ ...base, redirect_uri: 'https://client.example/cb/', code_challenge_method: 'S256' })}`))

    expect(nonExact!.status).toBe(400)
    expect(nonExact!.headers['Content-Type']).toContain('text/html')

    const unknown = await h.handler(request('GET', `/oauth/authorize?${new URLSearchParams({ ...base, client_id: 'nope', redirect_uri: 'https://client.example/cb', code_challenge_method: 'S256' })}`))

    expect(unknown!.status).toBe(401)

    // Cliente confidencial pre-registrado: `localhost` por nombre rechazado en el registro.
    const { registerConfidentialClient } = await import('./clients')

    await expect(
      registerConfidentialClient({ clientName: 'Hosted', redirectUris: ['http://localhost:3000/cb'], actor: 'test' }, { store: h.store, config })
    ).rejects.toMatchObject({ code: 'invalid_redirect_uri' })
  })

  it('never issues a token without an active consent row and requires step-up for write scopes', async () => {
    h.setSubject(PERSON)

    const clientId = 'https://client.example/oauth/client-metadata.json'
    const { token, code, verifier, redirectUri } = await runCodeFlow(clientId, 'http://127.0.0.1:4444/callback')

    expect(token!.status).toBe(200)

    // Revocar el consentimiento mata las familias vivas; un code nuevo sin consent no se canjea.
    const { revokeClientConsent } = await import('./consent')

    await revokeClientConsent({ subject: PERSON.subject, environmentId: 'efeonce-auth', clientId, scopes: null, reason: 'test revoke', actor: 'admin', via: 'admin' }, { store: h.store })

    expect(h.store.consents.every(c => c.status === 'revoked')).toBe(true)

    // Sin consent activo el store no devuelve nada → authorize vuelve a mostrar consentimiento.
    const again = await h.handler(request('GET', `/oauth/authorize?${new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: 'http://127.0.0.1:4444/callback', scope: 'efeonce.mcp.read', state: 's', code_challenge: pkce().challenge, code_challenge_method: 'S256' })}`))

    expect(again!.status).toBe(200)
    expect(again!.body).toContain('action="/oauth/consent"')

    // Test negativo del invariante: un code ya emitido cuyo consent desapareció NO se canjea.
    await h.store.insertAuthorizationCode({
      codeHash: createHash('sha256').update('efc_manual').digest('hex'),
      clientId,
      subject: PERSON.subject,
      environmentId: 'efeonce-auth',
      grantId: 'grt-manual',
      redirectUri,
      scopes: ['efeonce.mcp.read'],
      codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
      codeChallengeMethod: 'S256',
      nonce: null,
      authTime: PERSON.authTime,
      grantsVersion: 3,
      expiresAt: new Date(h.clock.now.getTime() + 60_000),
      consumedAt: null,
      createdAt: h.clock.now,
      ipHash: null,
      correlationId: null
    })

    const noConsent = await h.handler(
      request('POST', '/oauth/token', { headers: FORM_HEADERS, body: form({ grant_type: 'authorization_code', client_id: clientId, code: 'efc_manual', redirect_uri: redirectUri, code_verifier: verifier }) })
    )

    expect(json(noConsent).error).toBe('invalid_grant')
    expect(code).toBeTruthy()

    // Scope de escritura con authLevel primary → step-up (403) antes del consentimiento.
    const stepUp = await h.handler(request('GET', `/oauth/authorize?${new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: 'http://127.0.0.1:4444/callback', scope: 'efeonce.mcp.read efeonce.mcp.seo.write', state: 's', code_challenge: pkce().challenge, code_challenge_method: 'S256' })}`))

    expect(stepUp!.status).toBe(403)
  })

  it('revoke + introspect: a revoked access token introspects active:false; public clients cannot introspect', async () => {
    h.setSubject(PERSON)

    const { registerConfidentialClient } = await import('./clients')

    const confidential = await registerConfidentialClient(
      { clientName: 'ChatGPT connector', redirectUris: ['https://chat.example/cb'], actor: 'test', tokenEndpointAuthMethod: 'client_secret_basic' },
      { store: h.store, config }
    )

    const basic = 'Basic ' + Buffer.from(`${confidential.client.clientId}:${confidential.clientSecret}`).toString('base64')
    const { token } = await runCodeFlowConfidential(h, confidential.client.clientId, basic)
    const body = json(token)

    const active = await h.handler(request('POST', '/oauth/introspect', { headers: { ...FORM_HEADERS, authorization: basic }, body: form({ token: body.access_token }) }))

    expect(json(active)).toMatchObject({ active: true, sub: PERSON.subject, client_id: confidential.client.clientId, gv: 3 })

    const revoked = await h.handler(request('POST', '/oauth/revoke', { headers: { ...FORM_HEADERS, authorization: basic }, body: form({ token: body.access_token, token_type_hint: 'access_token' }) }))

    expect(revoked!.status).toBe(200)

    const inactive = await h.handler(request('POST', '/oauth/introspect', { headers: { ...FORM_HEADERS, authorization: basic }, body: form({ token: body.access_token }) }))

    expect(json(inactive)).toEqual({ active: false })

    const refreshInactive = await h.handler(request('POST', '/oauth/introspect', { headers: { ...FORM_HEADERS, authorization: basic }, body: form({ token: body.refresh_token }) }))

    expect(json(refreshInactive)).toEqual({ active: false })

    // Secret incorrecto → invalid_client con WWW-Authenticate.
    const badSecret = 'Basic ' + Buffer.from(`${confidential.client.clientId}:wrong`).toString('base64')
    const denied = await h.handler(request('POST', '/oauth/introspect', { headers: { ...FORM_HEADERS, authorization: badSecret }, body: form({ token: body.access_token }) }))

    expect(denied!.status).toBe(401)
    expect(denied!.headers['WWW-Authenticate']).toContain('Basic')

    // Cliente público → no puede introspectar.
    const publicDenied = await h.handler(request('POST', '/oauth/introspect', { headers: FORM_HEADERS, body: form({ token: body.access_token, client_id: 'https://client.example/oauth/client-metadata.json' }) }))

    expect(json(publicDenied).error).toBe('invalid_client')
  })

  it('unauthenticated subject → login_required page; prompt=none → redirect error; unbound subject → access_denied', async () => {
    h.setSubject(null)

    const clientId = 'https://client.example/oauth/client-metadata.json'
    const params = { response_type: 'code', client_id: clientId, redirect_uri: 'https://client.example/cb', scope: 'efeonce.mcp.read', state: 's', code_challenge: pkce().challenge, code_challenge_method: 'S256' }

    const page = await h.handler(request('GET', `/oauth/authorize?${new URLSearchParams(params)}`))

    expect(page!.status).toBe(401)
    expect(page!.body).toContain('<svg')

    const none = await h.handler(request('GET', `/oauth/authorize?${new URLSearchParams({ ...params, prompt: 'none' })}`))

    expect(new URL(none!.headers.Location).searchParams.get('error')).toBe('login_required')

    const unbound = await createHarness()

    unbound.setSubject(PERSON)
    await unbound.store.grantConsents({ subject: PERSON.subject, environmentId: 'efeonce-auth', clientId, scopes: ['efeonce.mcp.read'], grantedVia: 'admin', grantedBy: 'test', now: new Date() })

    const grantsDenied = createOAuthHandler({
      store: unbound.store,
      config,
      signer: async () => 'x',
      subjectPort: createStaticSubjectPort(PERSON),
      grantsPort: createStaticGrantsPort({ bound: false, outcome: 'unbound', profileId: null }),
      loadKeys: async () => unbound.keys,
      cimd: { resolveAddresses: async () => ['203.0.113.10'], fetcher: async url => ({ status: 200, etag: null, contentType: 'application/json', body: JSON.stringify({ client_id: url, redirect_uris: ['https://client.example/cb'] }) }) }
    })

    const deniedRedirect = await grantsDenied(request('GET', `/oauth/authorize?${new URLSearchParams(params)}`))

    expect(new URL(deniedRedirect!.headers.Location).searchParams.get('error')).toBe('access_denied')
  })

  it('rate-limits the token endpoint per IP after the configured burst', async () => {
    const tight = await createHarness({ tokenRateLimitPerIp: 2 })
    const hit = () => tight.handler(request('POST', '/oauth/token', { headers: FORM_HEADERS, body: form({ grant_type: 'authorization_code', client_id: 'nope', code: 'x', redirect_uri: 'y', code_verifier: 'z' }) }))

    expect((await hit())!.status).toBe(401)
    expect((await hit())!.status).toBe(401)
    expect((await hit())!.status).toBe(429)
    expect(tight.store.audit.some(e => e.eventType === 'rate_limited')).toBe(true)
  })
})

/** Flujo para cliente confidencial (secret por Basic) reutilizando el harness. */
const runCodeFlowConfidential = async (h: Harness, clientId: string, basic: string) => {
  const { verifier, challenge } = pkce()
  const authorizeUrl = `/oauth/authorize?${new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: 'https://chat.example/cb', scope: 'efeonce.mcp.read', state: 's', code_challenge: challenge, code_challenge_method: 'S256' })}`

  await h.handler(request('POST', '/oauth/consent', { headers: { ...FORM_HEADERS, origin: ISSUER }, body: form({ client_id: clientId, scope: 'efeonce.mcp.read', return_to: authorizeUrl, decision: 'allow' }) }))

  const redirect = await h.handler(request('GET', authorizeUrl))
  const code = new URL(redirect!.headers.Location).searchParams.get('code')!

  const token = await h.handler(
    request('POST', '/oauth/token', { headers: { ...FORM_HEADERS, authorization: basic }, body: form({ grant_type: 'authorization_code', code, redirect_uri: 'https://chat.example/cb', code_verifier: verifier }) })
  )

  return { token }
}
