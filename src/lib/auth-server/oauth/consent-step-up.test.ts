import { describe, expect, it, vi } from 'vitest'

import { AUTH_SERVER_OAUTH_DEFAULTS } from './config'
import { createStaticGrantsPort } from './grants'
import { handleConsent } from './consent-endpoint'
import { headersFromRecord } from './http'
import { InMemoryOAuthStore } from './store/memory-store'
import { createStaticSubjectPort } from './subject'

const issuer = 'https://auth.example'
const now = new Date('2026-09-05T12:00:00Z')
const read = 'efeonce.mcp.read'
const write = 'efeonce.mcp.seo.write'

async function submit(authLevel: 'primary' | 'step_up', scopes: string[], decision = 'allow', bound = true) {
  const store = new InMemoryOAuthStore()
  const clientId = 'registered-client'

  await store.upsertClient({
    clientId,
    registrationKind: 'preregistered',
    clientType: 'public',
    clientName: 'Test client',
    redirectUris: ['https://client.example/cb'],
    grantTypes: ['authorization_code'],
    responseTypes: ['code'],
    tokenEndpointAuthMethod: 'none',
    clientSecretHash: null,
    allowedScopes: [read, write],
    status: 'active',
    metadata: {},
    createdBy: 'test',
    createdAt: now,
    updatedAt: now
  })
  const grant = vi.spyOn(store, 'grantConsents')

  const returnTo =
    '/oauth/authorize?' +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: 'https://client.example/cb',
      response_type: 'code',
      scope: scopes.join(' '),
      state: 'client-state'
    })

  const response = await handleConsent(
    {
      method: 'POST',
      url: new URL('/oauth/consent', issuer),
      headers: headersFromRecord({
        origin: issuer,
        'content-type': 'application/x-www-form-urlencoded',
        'sec-fetch-site': 'same-origin'
      }),
      body: new URLSearchParams({
        client_id: clientId,
        scope: scopes.join(' '),
        return_to: returnTo,
        decision
      }).toString()
    },
    {
      consentContextPort: { resolve: async () => ({ outcome: 'resolved', population: 'internal', organizations: [{ organizationName: 'Test org', capabilities: [] }] }) },
      grantsPort: createStaticGrantsPort(
        bound
          ? { bound: true, grantsVersion: 2, profileId: 'profile', memberships: 1 }
          : { bound: false, profileId: null, outcome: 'revoked' }
      ),
      store,
      config: {
        ...AUTH_SERVER_OAUTH_DEFAULTS,
        issuer,
        environmentId: 'native',
        mcpAudience: 'https://mcp.example/mcp',
        oauthEnabled: true,
        allowLocalhostAlias: false
      },
      subjectPort: createStaticSubjectPort({
        subject: 'person',
        environmentId: 'native',
        authLevel,
        authTime: now,
        authorizationContextId: '550e8400-e29b-41d4-a716-446655440000'
      }),
      cimd: {
        resolveAddresses: async () => [],
        fetcher: async () => {
          throw new Error('unexpected metadata fetch')
        }
      },
      now: () => now
    }
  )

  return { store, response, grant, returnTo }
}

describe('consent POST requires fresh local step-up before accepting write scopes', () => {
  it('denies primary write submission without persisting any consent', async () => {
    const { store, response, grant } = await submit('primary', [read, write])

    expect(response.status).toBe(403)
    expect(response.headers['Content-Type']).toContain('text/html')
    expect(store.consents).toEqual([])
    expect(grant).not.toHaveBeenCalled()
    expect(store.audit.some(event => event.eventType === 'consent_granted')).toBe(false)
  })

  it('persists explicitly approved write scopes under the server-resolved context after step-up', async () => {
    const { store, response, grant, returnTo } = await submit('step_up', [read, write])

    expect(response.status).toBe(302)
    expect(response.headers.Location).toBe(issuer + returnTo)
    expect(grant).toHaveBeenCalledOnce()
    expect(store.consents.map(c => c.scope)).toEqual([read, write])
    expect(store.consents.every(c => c.authorizationContextId === '550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('lets a primary session deny write authorization without requiring step-up or granting scopes', async () => {
    const { store, response, grant } = await submit('primary', [read, write], 'deny')
    const target = new URL(response.headers.Location!)

    expect(response.status).toBe(302)
    expect(target.origin + target.pathname).toBe('https://client.example/cb')
    expect(target.searchParams.get('error')).toBe('access_denied')
    expect(target.searchParams.get('state')).toBe('client-state')
    expect(store.consents).toEqual([])
    expect(grant).not.toHaveBeenCalled()
  })

  it('keeps read-only consent available to a primary session', async () => {
    const { store, response, grant } = await submit('primary', [read])

    expect(response.status).toBe(302)
    expect(grant).toHaveBeenCalledOnce()
    expect(store.consents.map(c => c.scope)).toEqual([read])
  })

  it('rechecks binding at POST time and persists nothing when it has been revoked', async () => {
    for (const scopes of [[read], [read, write]]) {
      const { store, response, grant } = await submit('step_up', scopes, 'allow', false)

      expect(response.status).toBe(403)
      expect(store.consents).toEqual([])
      expect(grant).not.toHaveBeenCalled()
    }
  })

  it('allows denial even after the binding was revoked', async () => {
    const { store, response, grant } = await submit('primary', [read, write], 'deny', false)

    expect(response.status).toBe(302)
    expect(new URL(response.headers.Location!).searchParams.get('error')).toBe('access_denied')
    expect(store.consents).toEqual([])
    expect(grant).not.toHaveBeenCalled()
  })
})
