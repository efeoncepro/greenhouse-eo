import { createHash, randomBytes } from 'node:crypto'

import { expect, test } from '@playwright/test'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const ENABLED = process.env.EXTERNAL_CANARY_E2E_ENABLED === 'true'
const ISSUER = process.env.AUTH_SERVER_CANARY_ISSUER ?? ''
const RESOURCE = process.env.MCP_CANARY_RESOURCE_URL ?? ''
const STORAGE_STATE = process.env.AUTH_SERVER_CANARY_STORAGE_STATE ?? '.auth/auth-server-canary.json'
const BASE_SCOPE = 'efeonce.mcp.read'

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

    const redirectUri = 'http://127.0.0.1:18320/callback'

    const registration = await request.post(String(metadata.registration_endpoint), {
      data: {
        client_name: 'TASK-1832 Playwright canary',
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

    const context = await browser.newContext({ storageState: STORAGE_STATE })
    const page = await context.newPage()
    let callbackUrlRaw = ''

    await page.route('http://127.0.0.1:18320/**', async route => {
      callbackUrlRaw = route.request().url()
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'OAuth callback captured by Playwright.' })
    })

    try {
      await page.goto(authorize.toString())

      const allow = page.locator('button[name="decision"][value="allow"]')

      await expect(
        allow,
        'The approved canary storage state must resolve to the consent page; a login or error page is not certification evidence'
      ).toBeVisible()
      await expect(page.locator('[data-capture="id-redirect-host"] code')).toHaveText('127.0.0.1:18320')

      await allow.click()
      await expect.poll(() => callbackUrlRaw).not.toBe('')

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

      const toolsList = await request.post(resource, {
        headers: {
          Authorization: `Bearer ${initial.access_token}`,
          Accept: 'application/json, text/event-stream'
        },
        data: { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }
      })

      expect(toolsList.status()).toBe(200)
      expect(await toolsList.text()).toContain('get_seo_entitlement')

      const entitlement = await request.post(resource, {
        headers: {
          Authorization: `Bearer ${initial.access_token}`,
          Accept: 'application/json, text/event-stream'
        },
        data: {
          jsonrpc: '2.0',
          id: 2,
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

      await testInfo.attach('task-1832-redacted-oauth-evidence.json', {
        contentType: 'application/json',
        body: Buffer.from(
          JSON.stringify(
            {
              issuer,
              audience: resource,
              redirect: 'loopback-127.0.0.1:18320',
              registration: 'DCR-public-none',
              subjectFingerprint: createHash('sha256').update(String(verified.payload.sub)).digest('hex').slice(0, 16),
              azpMatches: verified.payload.azp === client.client_id,
              scope: verified.payload.scope,
              gv: verified.payload.gv,
              refreshRotated: true,
              oauthFamilyRevoked: true
            },
            null,
            2
          )
        )
      })
    } finally {
      await context.close()
    }
  })
})
