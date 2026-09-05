import { SignJWT, generateKeyPair, jwtVerify } from 'jose'
import { describe, expect, it, vi } from 'vitest'

import { AUTH_SERVER_OAUTH_DEFAULTS } from './config'
import { createStaticGrantsPort } from './grants'
import { headersFromRecord } from './http'
import { sha256Hex } from './primitives'
import { InMemoryOAuthStore } from './store/memory-store'
import type { OAuthClientRecord } from './store/port'
import { handleToken, type TokenDeps } from './token'
import { issueInitialTokenSet } from './tokens'

const read = 'efeonce.mcp.read'
const write = 'efeonce.mcp.seo.write'
const now = new Date('2026-09-05T12:00:00Z')

async function fixture() {
  const store = new InMemoryOAuthStore()
  const keys = await generateKeyPair('ES256')

  const client: OAuthClientRecord = {
    clientId: 'scope-policy-client',
    registrationKind: 'preregistered',
    clientType: 'public',
    clientName: 'Scope policy client',
    redirectUris: ['https://client.example/cb'],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    tokenEndpointAuthMethod: 'none',
    clientSecretHash: null,
    allowedScopes: [read, write],
    status: 'active',
    metadata: {},
    createdBy: 'test',
    createdAt: now,
    updatedAt: now
  }

  await store.upsertClient(client)

  const grant = {
    client,
    subject: 'test-subject',
    environmentId: 'test-env',
    scopes: [read, write],
    authorizationContextId: null,
    grantId: 'test-grant',
    grantsVersion: 2,
    authTime: now,
    now
  }

  await store.grantConsents({ ...grant, clientId: client.clientId, grantedVia: 'test', grantedBy: 'test' })

  const deps: TokenDeps = {
    store,
    config: {
      ...AUTH_SERVER_OAUTH_DEFAULTS,
      issuer: 'https://auth.example',
      environmentId: grant.environmentId,
      mcpAudience: 'https://mcp.example/mcp',
      oauthEnabled: true,
      allowLocalhostAlias: false
    },
    signer: vi.fn(payload => new SignJWT(payload).setProtectedHeader({ alg: 'ES256' }).sign(keys.privateKey)),
    grantsPort: createStaticGrantsPort({ bound: true, grantsVersion: 2, profileId: 'profile', memberships: 1 }),
    cimd: {
      resolveAddresses: async () => [],
      fetcher: async () => {
        throw new Error('unexpected CIMD')
      }
    },
    now: () => now
  }

  const post = (fields: Record<string, string>) =>
    handleToken(
      {
        method: 'POST',
        url: new URL('/oauth/token', deps.config.issuer),
        headers: headersFromRecord({ 'content-type': 'application/x-www-form-urlencoded' }),
        body: new URLSearchParams({ client_id: client.clientId, ...fields }).toString()
      },
      deps
    )

  const restrict = () => store.upsertClient({ ...client, allowedScopes: [read] })

  return { store, deps, grant, post, restrict, keys }
}

describe('current client scope policy at token issuance', () => {
  it('denies a previously authorized write code after the client becomes read-only, before signing or token persistence', async () => {
    const h = await fixture()
    const verifier = 'v'.repeat(43)
    const { createHash } = await import('node:crypto')

    await h.store.insertAuthorizationCode({
      ...h.grant,
      codeHash: sha256Hex('code'),
      clientId: h.grant.client.clientId,
      redirectUri: h.grant.client.redirectUris[0],
      codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
      codeChallengeMethod: 'S256',
      nonce: null,
      expiresAt: new Date(now.getTime() + 60_000),
      consumedAt: null,
      createdAt: now,
      ipHash: null,
      correlationId: null
    })
    await h.restrict()
    const insertAccess = vi.spyOn(h.store, 'insertAccessToken')
    const insertRefresh = vi.spyOn(h.store, 'insertRefreshToken')

    const response = await h.post({
      grant_type: 'authorization_code',
      code: 'code',
      code_verifier: verifier,
      redirect_uri: h.grant.client.redirectUris[0]
    })

    expect(response.status).toBe(400)
    expect(JSON.parse(response.body).error).toBe('invalid_scope')
    expect(h.deps.signer).not.toHaveBeenCalled()
    expect(insertAccess).not.toHaveBeenCalled()
    expect(insertRefresh).not.toHaveBeenCalled()
  })

  it('rejects retaining write on refresh but permits an explicit read-only subset without revoking existing tokens', async () => {
    const h = await fixture()
    const original = await issueInitialTokenSet(h.deps, h.grant)

    vi.mocked(h.deps.signer).mockClear()
    await h.restrict()
    const rotate = vi.spyOn(h.store, 'rotateRefreshToken')
    const denied = await h.post({ grant_type: 'refresh_token', refresh_token: original.refresh_token })

    expect(JSON.parse(denied.body).error).toBe('invalid_scope')
    expect(denied.status).toBe(400)
    expect(h.deps.signer).not.toHaveBeenCalled()
    expect(rotate).not.toHaveBeenCalled()
    expect((await h.store.getRefreshToken(sha256Hex(original.refresh_token)))?.status).toBe('active')
    expect((await h.store.getAccessToken(original.jti))?.revokedAt).toBeNull()
    const narrowed = await h.post({ grant_type: 'refresh_token', refresh_token: original.refresh_token, scope: read })
    const body = JSON.parse(narrowed.body)

    expect(narrowed.status).toBe(200)
    expect(body.scope).toBe(read)
    const verified = await jwtVerify(body.access_token, h.keys.publicKey, { currentDate: now })

    expect(verified.payload.scope).toBe(read)
    expect(verified.payload.auth_time).toBe(now.getTime() / 1000)
    expect((await h.store.getRefreshToken(sha256Hex(body.refresh_token)))?.scopes).toEqual([read])
    expect((await h.store.getAccessToken(original.jti))?.revokedAt).toBeNull()
  })
})
