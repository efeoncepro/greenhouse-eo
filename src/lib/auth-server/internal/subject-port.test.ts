import { describe, expect, it, vi } from 'vitest'

import { headersFromRecord, type OAuthHttpRequest } from '../oauth/http'
import { AUTH_SERVER_PERSON_AUTH_DEFAULTS } from '../persons/config'
import { createPersonSession } from '../persons/sessions'
import { InMemoryPersonAuthStore } from '../persons/store/memory-store'
import { createPersonSubjectPort } from '../persons/subject-port'
import {
  createInternalContextService,
  type CorporateSessionEvidence,
  type InternalAuthorizationContext
} from './context'
import { createNativeSubjectPort } from './subject-port'

const now = new Date('2026-09-05T12:00:00Z')
const issuer = 'https://auth.example'
const environmentId = 'native-test'
const config = { ...AUTH_SERVER_PERSON_AUTH_DEFAULTS, personAuthEnabled: true }
const authorization = { clientId: 'registered-client', audience: 'https://mcp.example/mcp' }

const setup = async (corporate = true) => {
  const store = new InMemoryPersonAuthStore()
  const sourceSystem = `external_idp:${environmentId}`

  store.registerLink({ linkId: 'native-link', subject: 'opaque-subject', sourceSystem, active: true })

  const session = await createPersonSession({
    store,
    config,
    now,
    input: {
      subject: 'opaque-subject',
      profileId: 'person',
      environmentId,
      linkId: 'native-link',
      amr: corporate ? ['entra_oidc'] : ['magic_link'],
      authTime: now,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    }
  })

  let enabled = true
  let evidence: CorporateSessionEvidence | null = corporate
    ? {
        sessionHash: session.record.sessionHash,
        environmentId,
        subject: session.record.subject,
        profileId: 'person',
        upstreamLinkId: 'upstream-link',
        provenance: 'entra_oidc',
        authTime: now,
        expiresAt: session.record.expiresAt,
        revokedAt: null
      }
    : null
  const records = new Map<string, InternalAuthorizationContext>()

  const authority = {
    getCorporateSession: vi.fn(async () => evidence),
    resolve: vi.fn(async () => ({
      environmentId,
      subject: session.record.subject,
      profileId: 'person',
      organizationId: 'own-org',
      bindingId: 'internal-binding',
      upstreamLinkId: 'upstream-link',
      population: 'internal' as const,
      eligible: true,
      bindingActive: true,
      sourceLinkActive: true,
      grantsVersion: 2,
      capabilities: ['example.read']
    }))
  }

  const contexts = createInternalContextService({
    enabled: () => enabled,
    now: () => now,
    authority,
    store: {
      insert: async c => {
        records.set(c.id, c)

        return c
      },
      get: async id => records.get(id) ?? null,
      revoke: async () => false
    }
  })

  const base = createPersonSubjectPort({
    store,
    config,
    environmentId,
    expectedSourceSystem: sourceSystem,
    now: () => now
  })

  const findEnrollment = vi.fn(async () => ({ bindingId: 'internal-binding' }))

  const port = createNativeSubjectPort({
    base,
    config,
    issuer,
    store,
    authority,
    contexts,
    findEnrollment,
    enabled: () => enabled
  })

  const request: OAuthHttpRequest = {
    method: 'GET',
    url: new URL('/oauth/authorize?authorization_context_id=attacker', issuer),
    headers: headersFromRecord({ cookie: `${config.sessionCookieName}=${session.sessionId}` }),
    body: ''
  }

  return {
    store,
    session,
    base,
    port,
    request,
    records,
    authority,
    findEnrollment,
    disable: () => {
      enabled = false
    },
    clearEvidence: () => {
      evidence = null
    }
  }
}

describe('native subject adapter composes the real person session port', () => {
  it('turns corporate primary login into a server-owned context using validated client/audience', async () => {
    const h = await setup()

    // The base intentionally resolves identity only; the native wrapper owns authority context.
    expect(await h.base.resolve(h.request, authorization)).not.toHaveProperty('authorizationContextId')
    const result = await h.port.resolve(h.request, authorization)

    expect(result).toMatchObject({ subject: 'opaque-subject', environmentId, authLevel: 'primary', authTime: now })
    expect(result?.authorizationContextId).toBeTruthy()
    expect(result?.authorizationContextId).not.toBe('attacker')
    expect(h.records.get(result!.authorizationContextId!)).toMatchObject({
      issuer,
      environmentId,
      subject: 'opaque-subject',
      profileId: 'person',
      clientId: authorization.clientId,
      audience: authorization.audience,
      sessionHash: h.session.record.sessionHash,
      bindingId: 'internal-binding',
      expiresAt: h.session.record.absoluteExpiresAt
    })
    expect(h.findEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'opaque-subject', profileId: 'person', upstreamLinkId: 'upstream-link' })
    )
  })

  it('preserves an external login even for the same canonical person while the internal flag is off', async () => {
    const h = await setup(false)

    h.disable()
    expect(await h.port.resolve(h.request, authorization)).toEqual(await h.base.resolve(h.request, authorization))
    expect(h.records.size).toBe(0)
    expect(h.findEnrollment).not.toHaveBeenCalled()
  })

  it('denies corporate login when OFF, authorization context is missing, cookie absent, or native link revoked', async () => {
    const h = await setup()

    expect(await h.port.resolve(h.request)).toBeNull()
    expect(await h.port.resolve({ ...h.request, headers: headersFromRecord({}) }, authorization)).toBeNull()
    h.store.links.get('native-link')!.active = false
    expect(await h.port.resolve(h.request, authorization)).toBeNull()
    const off = await setup()

    off.disable()
    expect(await off.port.resolve(off.request, authorization)).toBeNull()
    expect(off.records.size).toBe(0)
  })

  it('never falls back to an external subject when corporate evidence lookup fails', async () => {
    const h = await setup()

    h.authority.getCorporateSession.mockRejectedValue(new Error('database unavailable'))
    expect(await h.port.resolve(h.request, authorization)).toBeNull()
    expect(h.records.size).toBe(0)
  })

  it('denies a corporate-marked session whose durable evidence disappeared', async () => {
    const h = await setup()

    h.clearEvidence()
    expect(await h.port.resolve(h.request, authorization)).toBeNull()
    expect(h.findEnrollment).not.toHaveBeenCalled()
  })

  it('rejects malformed authorization dimensions instead of issuing an unusable context', async () => {
    const h = await setup()

    for (const malformed of [
      { ...authorization, clientId: '' },
      { ...authorization, audience: '' }
    ]) {
      expect(await h.port.resolve(h.request, malformed)).toBeNull()
    }

    expect(h.records.size).toBe(0)
  })
})
