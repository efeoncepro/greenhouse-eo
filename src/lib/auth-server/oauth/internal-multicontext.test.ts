import { SignJWT, generateKeyPair, jwtVerify } from 'jose'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/identity/external-access', () => ({ resolveExternalAccess: vi.fn() }))

import {
  createInternalContextService,
  type InternalAuthorizationContext,
  type InternalAuthorityFacts
} from '../internal/context'
import { createNativeGrantsPort } from '../internal/grants'
import { AUTH_SERVER_OAUTH_DEFAULTS } from './config'
import { headersFromRecord } from './http'
import { InMemoryOAuthStore } from './store/memory-store'
import type { OAuthClientRecord } from './store/port'
import { handleToken } from './token'
import { issueInitialTokenSet } from './tokens'

const now = new Date('2026-09-05T12:00:00Z')

const config = {
  ...AUTH_SERVER_OAUTH_DEFAULTS,
  issuer: 'https://auth.example',
  mcpAudience: 'https://mcp.example/mcp',
  environmentId: 'native',
  oauthEnabled: true,
  allowLocalhostAlias: false
}

describe('native OAuth multi-context revocation', () => {
  it('keeps A=10 independent of B=2→3, rejects old signed B, and never downgrades issued internal tokens when OFF', async () => {
    const { privateKey, publicKey } = await generateKeyPair('ES256')

    const signer = (claims: Record<string, unknown>) =>
      new SignJWT(claims).setProtectedHeader({ alg: 'ES256' }).sign(privateKey)

    const store = new InMemoryOAuthStore()
    const records = new Map<string, InternalAuthorizationContext>()
    let enabled = true

    const facts = new Map<string, InternalAuthorityFacts>(
      ['A', 'B'].map(name => [
        name,
        {
          environmentId: 'native',
          subject: 'person',
          profileId: 'profile',
          organizationId: `org-${name}`,
          bindingId: name,
          upstreamLinkId: 'entra-link',
          population: 'internal',
          eligible: true,
          bindingActive: true,
          sourceLinkActive: true,
          grantsVersion: name === 'A' ? 10 : 2,
          capabilities: [`capability.${name}.read`]
        }
      ])
    )

    const service = createInternalContextService({
      enabled: () => enabled,
      now: () => now,
      store: {
        insert: async c => {
          records.set(c.id, c)
          
return c
        },
        get: async id => records.get(id) ?? null,
        revoke: async () => false
      },
      authority: {
        getCorporateSession: async () => ({
          sessionHash: 'session',
          environmentId: 'native',
          subject: 'person',
          profileId: 'profile',
          upstreamLinkId: 'entra-link',
          provenance: 'entra_oidc',
          authTime: now,
          expiresAt: new Date(now.getTime() + 3600000),
          revokedAt: null
        }),
        resolve: async ({ bindingId }) => facts.get(bindingId) ?? null
      }
    })

    const external = {
      resolve: vi.fn(async () => ({ bound: true as const, grantsVersion: 99, profileId: 'profile', memberships: 2 }))
    }

    const grantsPort = createNativeGrantsPort({ config, internal: service, external })

    const client: OAuthClientRecord = {
      clientId: 'client',
      registrationKind: 'preregistered',
      clientType: 'public',
      clientName: 'Client',
      redirectUris: ['https://client.example/cb'],
      grantTypes: ['authorization_code', 'refresh_token'],
      responseTypes: ['code'],
      tokenEndpointAuthMethod: 'none',
      clientSecretHash: null,
      allowedScopes: ['efeonce.mcp.read'],
      status: 'active',
      metadata: {},
      createdBy: 'test',
      createdAt: now,
      updatedAt: now
    }

    await store.upsertClient(client)

    const issue = async (bindingId: string) => {
      const created = await service.create({
        issuer: config.issuer,
        environmentId: 'native',
        subject: 'person',
        clientId: client.clientId,
        audience: config.mcpAudience,
        sessionHash: 'session',
        bindingId,
        expiresAt: new Date(now.getTime() + 3600000)
      })

      if (!created.allowed) throw new Error('fixture context denied')

      const input = {
        environmentId: 'native',
        subject: 'person',
        clientId: client.clientId,
        authorizationContextId: created.context.id
      }

      const grant = await grantsPort.resolve(input)

      if (!grant.bound) throw new Error('fixture grant denied')
      await store.grantConsents({
        ...input,
        scopes: ['efeonce.mcp.read'],
        grantedVia: 'authorize_screen',
        grantedBy: 'person',
        now
      })

      const tokens = await issueInitialTokenSet(
        { config, signer, store },
        {
          ...input,
          client,
          scopes: ['efeonce.mcp.read'],
          grantId: `grant-${bindingId}`,
          grantsVersion: grant.grantsVersion,
          authTime: now,
          now
        }
      )

      return { input, tokens }
    }

    const a = await issue('A')
    const b = await issue('B')

    const resolveToken = async (token: string) => {
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: config.issuer,
        audience: config.mcpAudience,
        currentDate: now
      })

      return service.resolve({
        issuer: payload.iss!,
        environmentId: 'native',
        subject: payload.sub!,
        clientId: payload.azp as string,
        audience: payload.aud as string,
        id: payload.authorization_context_id as string,
        version: payload.authorization_context_version as number,
        grantsVersion: payload.gv as number
      })
    }

    expect(await resolveToken(a.tokens.access_token)).toMatchObject({
      allowed: true,
      grantsVersion: 10,
      capabilities: ['capability.A.read']
    })
    expect(await resolveToken(b.tokens.access_token)).toMatchObject({
      allowed: true,
      grantsVersion: 2,
      capabilities: ['capability.B.read']
    })
    facts.get('B')!.grantsVersion = 3
    facts.get('B')!.capabilities = []
    expect(await resolveToken(b.tokens.access_token)).toEqual({ allowed: false, reason: 'version_stale' })
    expect(await resolveToken(a.tokens.access_token)).toMatchObject({
      allowed: true,
      grantsVersion: 10,
      capabilities: ['capability.A.read']
    })
    expect(await grantsPort.resolve(b.input)).toMatchObject({ bound: true, grantsVersion: 3, memberships: 1 })
    expect(
      await service.resolve({
        issuer: config.issuer,
        environmentId: 'native',
        subject: 'person',
        clientId: 'client',
        audience: config.mcpAudience,
        id: b.input.authorizationContextId,
        version: 1
      })
    ).toMatchObject({ allowed: true, capabilities: [], grantsVersion: 3 })

    enabled = false
    expect(await resolveToken(a.tokens.access_token)).toEqual({ allowed: false, reason: 'disabled' })
    expect(await resolveToken(b.tokens.access_token)).toEqual({ allowed: false, reason: 'disabled' })
    expect(await grantsPort.resolve(b.input)).toMatchObject({ bound: false, outcome: 'internal_disabled' })

    const refresh = await handleToken(
      {
        method: 'POST',
        url: new URL('/oauth/token', config.issuer),
        headers: headersFromRecord({ 'content-type': 'application/x-www-form-urlencoded' }),
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: 'client',
          refresh_token: b.tokens.refresh_token
        }).toString()
      },
      {
        store,
        config,
        signer,
        grantsPort,
        cimd: {
          resolveAddresses: async () => [],
          fetcher: async () => {
            throw new Error('unexpected CIMD')
          }
        },
        now: () => now
      }
    )

    expect(refresh.status).toBe(400)
    expect(JSON.parse(refresh.body).error).toBe('invalid_grant')
    expect(store.refreshTokens.size).toBe(2)
    expect(external.resolve).not.toHaveBeenCalled()
    // A genuinely legacy request still uses its explicit external lane, proving the spy is live.
    expect(await grantsPort.resolve({ environmentId: 'native', subject: 'person', clientId: 'client' })).toMatchObject({
      bound: true,
      grantsVersion: 99
    })
    expect(external.resolve).toHaveBeenCalledTimes(1)
  })
})
