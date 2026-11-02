/**
 * TASK-2095 — audiencia Rooms y cliente first-party de la CLI (enmienda D1-bis del carril de agentes).
 * Flujo in-process: registro de clientes → authorize con PKCE por loopback → consentimiento con step-up → token con
 * `aud` Rooms y 5 min → refresh rotativo con reuso → introspección por audiencia → revocación por la CLI.
 */

import { createHash, randomBytes } from 'node:crypto'

import { SignJWT, createLocalJWKSet, decodeJwt, exportJWK, generateKeyPair, jwtVerify } from 'jose'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/identity/external-access', () => ({ resolveExternalAccess: vi.fn() }))

import { buildPublishedJwks, type SigningKeyRecord } from '../keys'
import { ROOMS_CLI_CLIENT_ID, ROOMS_RESOURCE_CLIENT_ID, registerConfidentialClient, registerRoomsAgentClients } from './clients'
import { AUTH_SERVER_OAUTH_DEFAULTS, readAuthServerOAuthConfig, type AuthServerOAuthConfig } from './config'
import type { ConsentContextResolution } from './consent-context'
import type { GrantsVersionPort } from './grants'
import { createOAuthHandler, type OAuthHandler } from './handler'
import { headersFromRecord, type OAuthHttpRequest, type OAuthHttpResponse } from './http'
import { InMemoryOAuthStore } from './store/memory-store'
import type { AuthenticatedSubject } from './subject'

const ISSUER = 'https://auth.test.efeonce.org'
const MCP = 'https://mcp.efeonce.org/mcp'
const ROOMS = 'https://rooms.test.efeonce.org/api/v1'
const ROOMS_SCOPES = 'efeonce.mcp.rooms.read efeonce.mcp.rooms.author efeonce.mcp.rooms.release'
const LOOPBACK = 'http://127.0.0.1:53123/callback'
const CONTEXT_ID = '6f1c2a10-1b2c-4d5e-8f90-1234567890ab'

const baseConfig: AuthServerOAuthConfig = {
  issuer: ISSUER,
  oauthEnabled: true,
  environmentId: 'efeonce-auth',
  mcpAudience: MCP,
  roomsAudience: ROOMS,
  ...AUTH_SERVER_OAUTH_DEFAULTS,
  allowLocalhostAlias: true
}

const INTERNAL: AuthenticatedSubject = {
  subject: 'sub-internal-1',
  environmentId: 'efeonce-auth',
  authLevel: 'step_up',
  authTime: new Date('2026-11-01T11:59:00Z'),
  authorizationContextId: CONTEXT_ID,
  authorizationContextVersion: 2
}

const EXTERNAL: AuthenticatedSubject = { subject: 'sub-external-1', environmentId: 'efeonce-auth', authLevel: 'step_up', authTime: new Date('2026-11-01T11:59:00Z') }

const FORM_HEADERS = { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': '198.51.100.9' }

const pkce = () => {
  const verifier = randomBytes(48).toString('base64url')

  return { verifier, challenge: createHash('sha256').update(verifier).digest().toString('base64url') }
}

const request = (method: string, path: string, options: { headers?: Record<string, string>; body?: string } = {}): OAuthHttpRequest => ({
  method,
  url: new URL(path, ISSUER),
  headers: headersFromRecord(Object.fromEntries(Object.entries(options.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]))),
  body: options.body ?? ''
})

const form = (fields: Record<string, string>) => new URLSearchParams(fields).toString()
const json = (response: OAuthHttpResponse | null) => JSON.parse(response!.body)
const errorOf = (response: OAuthHttpResponse | null) => new URL(response!.headers.Location).searchParams.get('error')

type Harness = { handler: OAuthHandler; store: InMemoryOAuthStore; keys: SigningKeyRecord[]; setSubject: (s: AuthenticatedSubject | null) => void; grants: { lastAudience?: string }; clock: { now: Date }; resourceSecret: string }

const createHarness = async (overrides: Partial<AuthServerOAuthConfig> = {}): Promise<Harness> => {
  const { privateKey, publicKey } = await generateKeyPair('ES256')
  const jwk = await exportJWK(publicKey)

  const keys: SigningKeyRecord[] = [{
    kid: 'kid-rooms', kmsKeyVersion: 'projects/p/locations/l/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1', algorithm: 'ES256',
    publicJwk: { kty: 'EC', crv: 'P-256', x: jwk.x as string, y: jwk.y as string }, state: 'active',
    activatedAt: new Date('2026-09-01T00:00:00Z'), retiringAt: null, retiredAt: null, createdBy: 'test'
  }]

  const config = { ...baseConfig, ...overrides }
  const store = new InMemoryOAuthStore()
  const clock = { now: new Date('2026-11-01T12:00:00Z') }
  const grants: { lastAudience?: string } = {}
  let subject: AuthenticatedSubject | null = null
  let resourceSecret = ''

  if (config.roomsAudience) {
    const registered = await registerRoomsAgentClients({ actor: 'test' }, { store, config, now: () => clock.now })

    resourceSecret = registered.resource.clientSecret ?? ''
  }

  const consent: ConsentContextResolution = { outcome: 'resolved', population: 'internal', authorityClass: 'internal_multi_org', organizations: [{ organizationName: 'Efeonce', capabilities: ['rooms'] }] } as ConsentContextResolution

  const handler = createOAuthHandler({
    store,
    config,
    signer: payload => new SignJWT(payload).setProtectedHeader({ alg: 'ES256', kid: 'kid-rooms', typ: 'JWT' }).sign(privateKey),
    subjectPort: { resolve: async () => subject },
    grantsPort: {
      resolve: async input => {
        grants.lastAudience = input.audience

        return { bound: true, grantsVersion: 2, profileId: 'prof-1', memberships: 1, authorizationContextVersion: input.authorizationContextId ? 2 : undefined } as Awaited<ReturnType<GrantsVersionPort['resolve']>>
      }
    },
    consentContextPort: { resolve: async () => consent },
    loadKeys: async () => keys,
    cimd: {
      resolveAddresses: async () => ['203.0.113.10'],
      fetcher: async url => ({ status: 200, etag: '"v1"', contentType: 'application/json', body: JSON.stringify({ client_id: url, client_name: 'CIMD Test Client', redirect_uris: ['http://127.0.0.1/callback'], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }) })
    },
    now: () => clock.now
  })

  return { handler, store, keys, setSubject: next => (subject = next), grants, clock, resourceSecret }
}

const authorizePath = (fields: { clientId?: string; scope?: string; resource?: string; challenge: string; redirect?: string }) =>
  `/oauth/authorize?${new URLSearchParams({
    response_type: 'code', client_id: fields.clientId ?? ROOMS_CLI_CLIENT_ID, redirect_uri: fields.redirect ?? LOOPBACK,
    scope: fields.scope ?? ROOMS_SCOPES, state: 'st-1', code_challenge: fields.challenge, code_challenge_method: 'S256',
    ...(fields.resource === undefined ? { resource: ROOMS } : fields.resource ? { resource: fields.resource } : {})
  })}`

const loginWithCli = async (h: Harness, scope = ROOMS_SCOPES) => {
  const { verifier, challenge } = pkce()
  const path = authorizePath({ challenge, scope })

  const consentPage = await h.handler(request('GET', path))

  expect(consentPage!.status).toBe(200)

  const allow = await h.handler(request('POST', '/oauth/consent', {
    headers: { ...FORM_HEADERS, origin: ISSUER, 'sec-fetch-site': 'same-origin' },
    body: form({ client_id: ROOMS_CLI_CLIENT_ID, scope, return_to: path, decision: 'allow', authorization_context_id: CONTEXT_ID, authorization_context_version: '2' })
  }))

  expect(allow!.status).toBe(302)
  const redirect = await h.handler(request('GET', path))

  expect(redirect!.status).toBe(302)
  const location = new URL(redirect!.headers.Location)

  expect(`${location.origin}${location.pathname}`).toBe(LOOPBACK)

  const token = await h.handler(request('POST', '/oauth/token', {
    headers: FORM_HEADERS,
    body: form({ grant_type: 'authorization_code', client_id: ROOMS_CLI_CLIENT_ID, code: location.searchParams.get('code')!, redirect_uri: LOOPBACK, code_verifier: verifier })
  }))

  expect(token!.status).toBe(200)

  return json(token) as { access_token: string; refresh_token: string; expires_in: number; scope: string }
}

const introspect = (h: Harness, token: string) =>
  h.handler(request('POST', '/oauth/introspect', {
    headers: { ...FORM_HEADERS, authorization: `Basic ${Buffer.from(`${ROOMS_RESOURCE_CLIENT_ID}:${h.resourceSecret}`).toString('base64')}` },
    body: form({ token })
  }))

describe('TASK-2095 — Rooms audience and first-party CLI client', () => {
  let h: Harness

  beforeEach(async () => {
    h = await createHarness()
  })

  it('issues a 5-minute Rooms token to an internal person through the CLI client, verifiable with the JWKS', async () => {
    h.setSubject(INTERNAL)
    const tokens = await loginWithCli(h)

    expect(tokens.expires_in).toBe(300)
    expect(tokens.scope).toBe(ROOMS_SCOPES)
    const { payload } = await jwtVerify(tokens.access_token, createLocalJWKSet(buildPublishedJwks(h.keys)), { issuer: ISSUER, audience: ROOMS, currentDate: h.clock.now })

    expect(payload.aud).toBe(ROOMS)
    expect(payload.azp).toBe(ROOMS_CLI_CLIENT_ID)
    expect(payload.sub).toBe(INTERNAL.subject)
    expect((payload.exp as number) - (payload.iat as number)).toBe(300)
    expect(payload.act).toBeUndefined()
    expect(h.grants.lastAudience).toBe(ROOMS)
  })

  it('rotates the refresh token and burns the whole family on reuse', async () => {
    h.setSubject(INTERNAL)
    const first = await loginWithCli(h)
    const refresh = (token: string) => h.handler(request('POST', '/oauth/token', { headers: FORM_HEADERS, body: form({ grant_type: 'refresh_token', client_id: ROOMS_CLI_CLIENT_ID, refresh_token: token }) }))

    const rotated = await refresh(first.refresh_token)

    expect(rotated!.status).toBe(200)
    const second = json(rotated)

    expect(second.refresh_token).not.toBe(first.refresh_token)
    expect(decodeJwt(second.access_token).aud).toBe(ROOMS)
    expect(second.expires_in).toBe(300)

    const reused = await refresh(first.refresh_token)

    expect(reused!.status).toBe(400)
    expect(json(reused).error).toBe('invalid_grant')
    expect((await refresh(second.refresh_token))!.status).toBe(400)
    expect(json(await introspect(h, second.access_token)).active).toBe(false)
  })

  it('lets the Rooms resource server introspect only Rooms tokens, with the real audience', async () => {
    h.setSubject(INTERNAL)
    const rooms = await loginWithCli(h)
    const active = json(await introspect(h, rooms.access_token))

    expect(active).toMatchObject({ active: true, aud: ROOMS, client_id: ROOMS_CLI_CLIENT_ID, sub: INTERNAL.subject })

    const refreshView = json(await introspect(h, rooms.refresh_token))

    expect(refreshView).toMatchObject({ active: true, aud: ROOMS })

    // A gateway token (MCP audience) through a confidential MCP client: Rooms never sees it as active.
    const mcpClient = await registerConfidentialClient({ clientName: 'MCP test client', redirectUris: ['https://client.example/cb'], actor: 'test', allowedScopes: ['efeonce.mcp.read'] }, { store: h.store, config: baseConfig })
    const { verifier, challenge } = pkce()
    const path = authorizePath({ clientId: mcpClient.client.clientId, scope: 'efeonce.mcp.read', resource: MCP, challenge, redirect: 'https://client.example/cb' })

    h.setSubject({ ...INTERNAL, authLevel: 'primary' })
    await h.handler(request('POST', '/oauth/consent', { headers: { ...FORM_HEADERS, origin: ISSUER, 'sec-fetch-site': 'same-origin' }, body: form({ client_id: mcpClient.client.clientId, scope: 'efeonce.mcp.read', return_to: path, decision: 'allow', authorization_context_id: CONTEXT_ID, authorization_context_version: '2' }) }))
    const code = new URL((await h.handler(request('GET', path)))!.headers.Location).searchParams.get('code')!

    const mcpToken = json(await h.handler(request('POST', '/oauth/token', {
      headers: { ...FORM_HEADERS, authorization: `Basic ${Buffer.from(`${mcpClient.client.clientId}:${mcpClient.clientSecret}`).toString('base64')}` },
      body: form({ grant_type: 'authorization_code', code, redirect_uri: 'https://client.example/cb', code_verifier: verifier })
    })))

    expect(decodeJwt(mcpToken.access_token).aud).toBe(MCP)
    expect(json(await introspect(h, mcpToken.access_token))).toEqual({ active: false })
  })

  it('revokes the family when the CLI logs out (public client, no secret)', async () => {
    h.setSubject(INTERNAL)
    const tokens = await loginWithCli(h)
    const revoked = await h.handler(request('POST', '/oauth/revoke', { headers: FORM_HEADERS, body: form({ client_id: ROOMS_CLI_CLIENT_ID, token: tokens.refresh_token, token_type_hint: 'refresh_token' }) }))

    expect(revoked!.status).toBe(200)
    expect(json(await introspect(h, tokens.access_token)).active).toBe(false)
  })

  it('never gives Rooms classes to a client with an open allow-list (CIMD/DCR)', async () => {
    h.setSubject(INTERNAL)
    const response = await h.handler(request('GET', authorizePath({ clientId: 'https://client.example/cimd.json', challenge: pkce().challenge, redirect: LOOPBACK })))

    expect(errorOf(response)).toBe('invalid_scope')
  })

  it('rejects mixing classes of two audiences and a resource that does not match the classes', async () => {
    h.setSubject(INTERNAL)

    const cimd = 'https://client.example/cimd.json'

    expect(errorOf(await h.handler(request('GET', authorizePath({ clientId: cimd, scope: 'efeonce.mcp.read', resource: ROOMS, challenge: pkce().challenge }))))).toBe('invalid_target')
    expect(errorOf(await h.handler(request('GET', authorizePath({ scope: 'efeonce.mcp.rooms.read', resource: MCP, challenge: pkce().challenge }))))).toBe('invalid_target')

    const mixedClient = await registerConfidentialClient({ clientName: 'Mixed client', redirectUris: ['https://client.example/cb'], actor: 'test', allowedScopes: ['efeonce.mcp.read', 'efeonce.mcp.rooms.read'] }, { store: h.store, config: baseConfig })

    expect(errorOf(await h.handler(request('GET', authorizePath({ clientId: mixedClient.client.clientId, scope: 'efeonce.mcp.read efeonce.mcp.rooms.read', resource: '', challenge: pkce().challenge, redirect: 'https://client.example/cb' }))))).toBe('invalid_scope')
  })

  it('denies Rooms tokens to an external person (no internal authorization context)', async () => {
    h.setSubject(EXTERNAL)
    const response = await h.handler(request('GET', authorizePath({ challenge: pkce().challenge })))

    expect(errorOf(response)).toBe('access_denied')
  })

  it('requires step-up before consenting Rooms write classes', async () => {
    h.setSubject({ ...INTERNAL, authLevel: 'primary' })
    const response = await h.handler(request('GET', authorizePath({ challenge: pkce().challenge })))

    expect(response!.status).toBe(403)
  })

  it('keeps the Rooms audience off without AUTH_SERVER_ROOMS_AUDIENCE', async () => {
    const off = await createHarness({ roomsAudience: null })

    off.setSubject(INTERNAL)
    const response = await off.handler(request('GET', authorizePath({ clientId: 'https://client.example/cimd.json', scope: 'efeonce.mcp.read', challenge: pkce().challenge })))

    expect(errorOf(response)).toBe('invalid_target')
    await expect(registerRoomsAgentClients({ actor: 'test' }, { store: off.store, config: { ...baseConfig, roomsAudience: null } })).rejects.toMatchObject({ code: 'invalid_target' })
  })

  it('registers both clients idempotently and never re-issues the resource secret', async () => {
    const again = await registerRoomsAgentClients({ actor: 'test' }, { store: h.store, config: baseConfig })

    expect(again.cli.created).toBe(false)
    expect(again.resource.created).toBe(false)
    expect(again.resource.clientSecret).toBeNull()
    expect(again.cli.client).toMatchObject({ clientType: 'public', tokenEndpointAuthMethod: 'none', allowedScopes: ['efeonce.mcp.rooms.read', 'efeonce.mcp.rooms.author', 'efeonce.mcp.rooms.release', 'efeonce.mcp.rooms.access'] })
    expect(again.resource.client.metadata.introspection_audience).toBe(ROOMS)
  })

  it('reads the audience from the environment and validates it', () => {
    expect(readAuthServerOAuthConfig({ AUTH_SERVER_ROOMS_AUDIENCE: 'https://efeonce-rooms.vercel.app/api/v1/' }).roomsAudience).toBe('https://efeonce-rooms.vercel.app/api/v1')
    expect(readAuthServerOAuthConfig({}).roomsAudience).toBeNull()
    expect(() => readAuthServerOAuthConfig({ AUTH_SERVER_ROOMS_AUDIENCE: 'http://rooms.example' })).toThrow()
  })
})
