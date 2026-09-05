import { createHash } from 'node:crypto'

import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose'
import { describe, expect, it, vi } from 'vitest'

import { createEntraOidcClient, createInternalLoginFlow, type InternalLoginTransaction } from './oidc'

const NOW = new Date('2026-09-05T13:00:00Z')

const config = {
  tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  clientId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  issuer: 'https://login.microsoftonline.com/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/v2.0',
  redirectUri: 'https://auth.example/auth/internal/callback'
}

describe('corporate upstream identity', () => {
  it('validates a signed ID token and ignores email/roles/MFA as authority', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const jwk = await exportJWK(publicKey)

    const claims = {
      tid: config.tenantId,
      oid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      nonce: 'nonce',
      auth_time: NOW.getTime() / 1000,
      email: 'not-an-anchor@example.org',
      roles: ['admin'],
      amr: ['mfa']
    }

    const mint = (override = {}) =>
      new SignJWT({
        ...claims,
        iss: config.issuer,
        aud: config.clientId,
        sub: 'pairwise-sub',
        iat: NOW.getTime() / 1000,
        exp: NOW.getTime() / 1000 + 600,
        ...override
      })
        .setProtectedHeader({ alg: 'RS256', kid: 'test' })
        .sign(privateKey)

    let token = await mint()
    const fetcher = vi.fn(async () => Response.json({ id_token: token, access_token: 'discarded' }))

    const client = createEntraOidcClient({
      config,
      now: () => NOW,
      getClientSecret: async () => 'test-only',
      fetch: fetcher,
      verificationKey: createLocalJWKSet({ keys: [{ ...jwk, kid: 'test' }] })
    })

    const input = { code: 'code', nonce: 'nonce', codeVerifier: 'verifier', now: NOW }

    expect(await client.exchange(input)).toEqual({
      issuer: config.issuer,
      tenantId: config.tenantId,
      objectId: claims.oid,
      authTime: NOW
    })

    for (const override of [
      { nonce: 'other' },
      { tid: 'other' },
      { azp: 'other' },
      { auth_time: NOW.getTime() / 1000 - 601 },
      { iat: NOW.getTime() / 1000 + 60 },
      { aud: [config.clientId, 'another-client'] }
    ]) {
      token = await mint(override)
      await expect(client.exchange(input)).rejects.toThrow('upstream_rejected')
    }

    const url = new URL(client.authorizationUrl({ state: 's', nonce: 'n', codeChallenge: 'c' }))

    expect(url.searchParams.get('scope')).toBe('openid profile')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('rejects invalid signatures, malformed JSON and bounded oversized upstream bodies without leaking them', async () => {
    const { publicKey } = await generateKeyPair('RS256')
    const jwk = await exportJWK(publicKey)
    const { privateKey: attackerKey } = await generateKeyPair('RS256')

    const token = await new SignJWT({ nonce: 'nonce' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .sign(attackerKey)

    let response = Response.json({ id_token: token })

    const client = createEntraOidcClient({
      config,
      now: () => NOW,
      getClientSecret: async () => 'test-only',
      fetch: async () => response,
      verificationKey: createLocalJWKSet({ keys: [{ ...jwk, kid: 'test' }] })
    })

    const input = { code: 'sensitive-code', nonce: 'nonce', codeVerifier: 'verifier', now: NOW }

    await expect(client.exchange(input)).rejects.toThrow('upstream_rejected')
    response = new Response('private malformed response')
    await expect(client.exchange(input)).rejects.toThrow('upstream_rejected')
    response = new Response('x'.repeat(65537))
    await expect(client.exchange(input)).rejects.toThrow('upstream_rejected')
  })

  it('validates against time after exchange crosses a second, without accepting tokens expired in transit', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const jwk = await exportJWK(publicKey)
    const arrival = new Date(NOW.getTime() + 698)
    let clock = arrival
    const mintedAt = NOW.getTime() / 1000 + 1
    let expiry = mintedAt + 600

    const client = createEntraOidcClient({
      config,
      now: () => clock,
      getClientSecret: async () => 'test-only',
      verificationKey: createLocalJWKSet({ keys: [{ ...jwk, kid: 'test' }] }),
      fetch: async () => {
        const token = await new SignJWT({
          iss: config.issuer,
          aud: config.clientId,
          sub: 'pairwise',
          tid: config.tenantId,
          oid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          nonce: 'nonce',
          iat: mintedAt,
          auth_time: mintedAt,
          exp: expiry
        })
          .setProtectedHeader({ alg: 'RS256', kid: 'test' })
          .sign(privateKey)

        clock = new Date(NOW.getTime() + 1500)

        return Response.json({ id_token: token })
      }
    })

    const input = { code: 'private-code', nonce: 'nonce', codeVerifier: 'private-verifier', now: arrival }

    await expect(client.exchange(input)).resolves.toMatchObject({ authTime: new Date(mintedAt * 1000) })
    // No clock tolerance or lifetime extension: expires exactly at validation's second.
    expiry = mintedAt
    await expect(client.exchange(input)).rejects.toMatchObject({
      code: 'upstream_rejected',
      diagnostic: 'jwt_validation_failed'
    })
  })

  it('exposes only bounded diagnostics for token response and exchange failures', async () => {
    let response = new Response('private-code and token', { status: 400 })

    const client = createEntraOidcClient({
      config,
      now: () => NOW,
      getClientSecret: async () => 'private-secret',
      fetch: async () => response
    })

    const input = { code: 'private-code', nonce: 'nonce', codeVerifier: 'private-verifier', now: NOW }

    for (const [next, diagnostic] of [
      [response, 'token_exchange_rejected'],
      [new Response('private malformed body'), 'token_response_invalid'],
      [Response.json({ access_token: 'private-token' }), 'token_response_invalid']
    ] as const) {
      response = next
      const error = await client.exchange(input).catch(error => error)

      expect(error).toMatchObject({ message: 'upstream_rejected', diagnostic })
      expect(JSON.stringify(error)).not.toContain('private')
    }
  })

  it('pins tenant/endpoints and rejects unsafe redirect configuration', () => {
    for (const override of [
      { tenantId: 'common' },
      { issuer: 'https://attacker.example' },
      { redirectUri: 'http://auth.example/auth/internal/callback' }
    ]) {
      expect(() =>
        createEntraOidcClient({ config: { ...config, ...override }, getClientSecret: async () => 'test' })
      ).toThrow('configuration_invalid')
    }
  })

  it('rejects stale, corrupted, expired transactions and an OFF switch during exchange', async () => {
    let transaction: InternalLoginTransaction | null = null
    let enabled = true
    let authTime = NOW
    let disableDuringExchange = false

    const exchange = vi.fn(async () => {
      if (disableDuringExchange) enabled = false

      return { issuer: config.issuer, tenantId: config.tenantId, objectId: 'person', authTime }
    })

    const flow = createInternalLoginFlow({
      issuer: 'https://auth.example',
      enabled: () => enabled,
      now: () => NOW,
      store: {
        insert: async t => {
          transaction = t
        },
        consume: async () => transaction
      },
      upstream: { authorizationUrl: ({ state }) => `https://login.example?state=${state}`, exchange }
    })

    const begin = async () => {
      const result = await flow.start('/oauth/authorize?client_id=client-A')

      return {
        state: new URL(result.location).searchParams.get('state')!,
        browserBinding: result.browserBinding,
        code: 'code'
      }
    }

    let input = await begin()

    transaction!.expiresAt = new Date(NOW.getTime() - 1)
    await expect(flow.complete(input)).rejects.toThrow('transaction_invalid')
    input = await begin()
    transaction!.createdAt = new Date('invalid')
    await expect(flow.complete(input)).rejects.toThrow('transaction_invalid')
    input = await begin()
    transaction!.returnTo = 'https://attacker.example/oauth/authorize'
    await expect(flow.complete(input)).rejects.toThrow('transaction_invalid')
    expect(exchange).not.toHaveBeenCalled()
    input = await begin()
    authTime = new Date(NOW.getTime() - 61000)
    await expect(flow.complete(input)).rejects.toThrow('upstream_rejected')
    input = await begin()
    authTime = NOW
    disableDuringExchange = true
    await expect(flow.complete(input)).rejects.toThrow('configuration_invalid')
    await expect(flow.start('/oauth/authorize')).rejects.toThrow('configuration_invalid')
  })

  it('binds callback to browser, consumes once and prevents open redirects', async () => {
    const records = new Map<string, InternalLoginTransaction>()

    const exchange = vi.fn(async () => ({
      issuer: config.issuer,
      tenantId: config.tenantId,
      objectId: 'person',
      authTime: NOW
    }))

    const flow = createInternalLoginFlow({
      issuer: 'https://auth.example',
      enabled: () => true,
      now: () => NOW,
      store: {
        insert: async t => {
          records.set(t.id, t)
        },
        consume: async ({ id, browserBindingHash, now }) => {
          const t = records.get(id)

          if (!t || t.browserBindingHash !== browserBindingHash || t.expiresAt <= now) return null
          records.delete(id)

          return t
        }
      },
      upstream: { authorizationUrl: ({ state }) => `https://login.example?state=${state}`, exchange }
    })

    await expect(flow.start('https://attacker.example/oauth/authorize')).rejects.toThrow('transaction_invalid')
    const started = await flow.start('/oauth/authorize?client_id=client-A')
    const state = new URL(started.location).searchParams.get('state')!
    const transaction = records.get(state)!

    expect(transaction.browserBindingHash).toBe(createHash('sha256').update(started.browserBinding).digest('hex'))
    await expect(flow.complete({ state, browserBinding: 'x'.repeat(43), code: 'code' })).rejects.toThrow(
      'transaction_invalid'
    )
    expect(exchange).not.toHaveBeenCalled()

    const results = await Promise.allSettled(
      [1, 2].map(() => flow.complete({ state, browserBinding: started.browserBinding, code: 'code' }))
    )

    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(exchange).toHaveBeenCalledTimes(1)
  })
})
