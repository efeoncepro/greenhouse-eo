import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'

import { createRemoteJWKSet, jwtVerify } from 'jose'

import { expect, gotoWithTransientRetries, test } from '../fixtures/auth'

const ENABLED = process.env.EXTERNAL_CANARY_E2E_ENABLED === 'true'
const ISSUER = process.env.AUTH_SERVER_CANARY_ISSUER ?? ''
const RESOURCE = process.env.MCP_CANARY_RESOURCE_URL ?? ''
const STORAGE_STATE = process.env.AUTH_SERVER_CANARY_STORAGE_STATE ?? '.auth/auth-server-canary.json'
const BASE_SCOPE = 'efeonce.mcp.read'

const startLoopbackCallbackListener = async () => {
  let resolveCallback!: (url: string) => void

  const callbackUrl = new Promise<string>(resolve => {
    resolveCallback = resolve
  })

  const server = createServer((request, response) => {
    const incoming = new URL(request.url ?? '/', 'http://127.0.0.1')

    if (incoming.pathname !== '/callback') {
      response.writeHead(404).end()

      return
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8'
    })
    response.end('OAuth callback captured by the TASK-1832 loopback listener.')

    const address = server.address()

    if (address && typeof address !== 'string') {
      resolveCallback(`http://127.0.0.1:${address.port}${incoming.pathname}${incoming.search}`)
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address()

  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('TASK-1832 loopback listener did not expose a TCP port')
  }

  return {
    callbackUrl,
    redirectUri: `http://127.0.0.1:${address.port}/callback`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        if (!server.listening) {
          resolve()

          return
        }

        server.close(error => (error ? reject(error) : resolve()))
      })
  }
}

test.describe('TASK-1832 external OAuth canary', () => {
  test.skip(!ENABLED, 'Requires an approved smoke_test fixture and an authenticated canary storage state')

  test('DCR + PKCE + consent + MCP read + refresh rotation + OAuth family revocation', async ({
    browser,
    request
  }, testInfo) => {
    expect(ISSUER, 'AUTH_SERVER_CANARY_ISSUER is required').toMatch(/^https:\/\//)
    expect(RESOURCE, 'MCP_CANARY_RESOURCE_URL is required').toMatch(/^https:\/\//)

    const issuer = new URL(ISSUER).origin
    const resource = new URL(RESOURCE).toString()
    const metadataResponse = await request.get(`${issuer}/.well-known/oauth-authorization-server`)

    expect(metadataResponse.status()).toBe(200)

    const metadata = (await metadataResponse.json()) as Record<string, unknown>

    expect(metadata).toMatchObject({
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      revocation_endpoint: `${issuer}/oauth/revoke`,
      jwks_uri: `${issuer}/.well-known/jwks.json`
    })
    expect(metadata.code_challenge_methods_supported).toContain('S256')

    const context = await browser.newContext({ storageState: STORAGE_STATE })
    const page = await context.newPage()
    const callbackListener = await startLoopbackCallbackListener()
    const { redirectUri } = callbackListener

    try {
      const registration = await request.post(String(metadata.registration_endpoint), {
        data: {
          client_name: 'TASK-1832 Playwright canary',
          software_id: 'task-1832-canary-20260906-a',
          software_version: 'task-1832-playwright-v1',
          redirect_uris: [redirectUri],
          grant_types: ['authorization_code', 'refresh_token'],
          token_endpoint_auth_method: 'none'
        }
      })

      expect(registration.status()).toBe(201)

      const client = (await registration.json()) as { client_id?: string }

      expect(client.client_id).toBeTruthy()

      const verifier = randomBytes(48).toString('base64url')
      const challenge = createHash('sha256').update(verifier).digest('base64url')
      const state = randomBytes(24).toString('base64url')
      const authorize = new URL(String(metadata.authorization_endpoint))

      authorize.search = new URLSearchParams({
        response_type: 'code',
        client_id: client.client_id!,
        redirect_uri: redirectUri,
        scope: BASE_SCOPE,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        resource
      }).toString()

      await gotoWithTransientRetries(page, authorize.toString())

      const allow = page.locator('button[name="decision"][value="allow"]')

      await expect(
        allow,
        'The approved canary storage state must resolve to the consent page; a login or error page is not certification evidence'
      ).toBeVisible()
      await expect(page.locator('[data-capture="id-redirect-host"] code')).toHaveText(new URL(redirectUri).host)

      await allow.click()

      const callbackUrlRaw = await Promise.race([
        callbackListener.callbackUrl,
        page.waitForTimeout(10_000).then(() => {
          throw new Error('TASK-1832 loopback listener did not receive the OAuth callback')
        })
      ])

      const callbackUrl = new URL(callbackUrlRaw)

      expect(callbackUrl.searchParams.get('state')).toBe(state)
      expect(callbackUrl.searchParams.get('iss')).toBe(issuer)

      const token = await request.post(String(metadata.token_endpoint), {
        form: {
          grant_type: 'authorization_code',
          client_id: client.client_id!,
          code: callbackUrl.searchParams.get('code')!,
          redirect_uri: redirectUri,
          code_verifier: verifier
        }
      })

      expect(token.status()).toBe(200)

      const initial = (await token.json()) as { access_token?: string; refresh_token?: string }

      expect(initial.access_token).toBeTruthy()
      expect(initial.refresh_token).toBeTruthy()

      const jwks = createRemoteJWKSet(new URL(String(metadata.jwks_uri)))
      const verified = await jwtVerify(initial.access_token!, jwks, { issuer, audience: resource })

      expect(verified.payload.azp).toBe(client.client_id)
      expect(verified.payload.scope).toContain(BASE_SCOPE)
      expect(verified.payload.gv).toEqual(expect.any(Number))

      const mcpHeaders = {
        Authorization: `Bearer ${initial.access_token}`,
        Accept: 'application/json, text/event-stream'
      }

      const initialize = await request.post(resource, {
        headers: mcpHeaders,
        data: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'task-1832-playwright-canary', version: '1.0.0' }
          }
        }
      })

      expect(initialize.status()).toBe(200)
      expect(await initialize.text()).toContain('"result"')

      const toolsList = await request.post(resource, {
        headers: mcpHeaders,
        data: { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }
      })

      expect(toolsList.status()).toBe(200)
      expect(await toolsList.text()).toContain('get_seo_entitlement')

      const entitlement = await request.post(resource, {
        headers: mcpHeaders,
        data: {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'get_seo_entitlement', arguments: {} }
        }
      })

      expect(entitlement.status()).toBe(200)

      const refresh = await request.post(String(metadata.token_endpoint), {
        form: {
          grant_type: 'refresh_token',
          client_id: client.client_id!,
          refresh_token: initial.refresh_token!,
          scope: BASE_SCOPE
        }
      })

      expect(refresh.status()).toBe(200)

      const rotated = (await refresh.json()) as { access_token?: string; refresh_token?: string }

      expect(rotated.access_token).toBeTruthy()
      expect(rotated.refresh_token).toBeTruthy()
      expect(rotated.refresh_token).not.toBe(initial.refresh_token)

      const rotatedClaims = await jwtVerify(rotated.access_token!, jwks, { issuer, audience: resource })

      expect(rotatedClaims.payload.sub).toBe(verified.payload.sub)

      const revoke = await request.post(String(metadata.revocation_endpoint), {
        form: {
          client_id: client.client_id!,
          token: rotated.refresh_token!,
          token_type_hint: 'refresh_token'
        }
      })

      expect(revoke.status()).toBe(200)

      const revokedRefresh = await request.post(String(metadata.token_endpoint), {
        form: {
          grant_type: 'refresh_token',
          client_id: client.client_id!,
          refresh_token: rotated.refresh_token!
        }
      })

      expect(revokedRefresh.status()).toBe(400)
      await expect(revokedRefresh.json()).resolves.toMatchObject({ error: 'invalid_grant' })

      const logout = await context.request.post(`${issuer}/auth/session/logout`, {
        headers: { 'Content-Type': 'application/json', Origin: issuer },
        data: {}
      })

      expect(logout.status()).toBe(200)

      const sessionAfterLogout = await context.request.get(`${issuer}/auth/session`, {
        headers: { Accept: 'application/json' }
      })

      expect(sessionAfterLogout.status()).toBe(401)

      await testInfo.attach('task-1832-redacted-oauth-evidence.json', {
        contentType: 'application/json',
        body: Buffer.from(
          JSON.stringify(
            {
              issuer,
              audience: resource,
              redirect: 'loopback-127.0.0.1:dynamic',
              registration: 'DCR-public-none',
              subjectFingerprint: createHash('sha256').update(String(verified.payload.sub)).digest('hex').slice(0, 16),
              azpMatches: verified.payload.azp === client.client_id,
              scope: verified.payload.scope,
              gv: verified.payload.gv,
              mcpInitialized: true,
              refreshRotated: true,
              oauthFamilyRevoked: true,
              browserSessionRevoked: true
            },
            null,
            2
          )
        )
      })
    } finally {
      await context.request
        .post(`${issuer}/auth/session/logout`, {
          headers: { 'Content-Type': 'application/json', Origin: issuer },
          data: {}
        })
        .catch(() => undefined)
      await context.close()
      await callbackListener.close()
    }
  })
})
