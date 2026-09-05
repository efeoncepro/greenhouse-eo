import { describe, expect, it } from 'vitest'

import {
  createInternalContextService,
  type InternalAuthorizationContext,
  type InternalAuthorityFacts,
  type CorporateSessionEvidence
} from './context'

const NOW = new Date('2026-09-05T12:00:00Z')

const setup = () => {
  const records = new Map<string, InternalAuthorizationContext>()
  let enabled = true

  const session: CorporateSessionEvidence = {
    sessionHash: 'session-A',
    environmentId: 'native',
    subject: 'subject-A',
    profileId: 'person-A',
    upstreamLinkId: 'entra-A',
    provenance: 'entra_oidc',
    authTime: NOW,
    expiresAt: new Date(NOW.getTime() + 3600000),
    revokedAt: null
  }

  const facts: InternalAuthorityFacts = {
    environmentId: 'native',
    subject: 'subject-A',
    profileId: 'person-A',
    organizationId: 'org-own',
    bindingId: 'binding-B',
    upstreamLinkId: 'entra-A',
    population: 'internal',
    eligible: true,
    bindingActive: true,
    sourceLinkActive: true,
    grantsVersion: 2,
    capabilities: ['example.read']
  }

  const service = createInternalContextService({
    enabled: () => enabled,
    now: () => NOW,
    store: {
      insert: async c => {
        const existing = [...records.values()].find(
          r =>
            r.revokedAt === null &&
            r.sessionHash === c.sessionHash &&
            r.clientId === c.clientId &&
            r.bindingId === c.bindingId &&
            r.issuer === c.issuer &&
            r.audience === c.audience
        )

        if (existing) return existing
        records.set(c.id, c)

        return c
      },
      get: async id => records.get(id) ?? null,
      revoke: async () => false
    },
    authority: { getCorporateSession: async () => session, resolve: async () => facts }
  })

  const input = {
    issuer: 'https://auth.example',
    environmentId: 'native',
    subject: 'subject-A',
    clientId: 'client-A',
    audience: 'https://mcp.example/mcp',
    sessionHash: session.sessionHash,
    bindingId: facts.bindingId,
    expiresAt: new Date(NOW.getTime() + 86400000)
  }

  return {
    service,
    input,
    facts,
    session,
    records,
    disable: () => {
      enabled = false
    }
  }
}

describe('internal context authorization boundary', () => {
  it('binds the full caller and rejects each changed dimension', async () => {
    const { service, input } = setup()
    const created = await service.create(input)

    expect(created.allowed).toBe(true)
    if (!created.allowed) throw new Error('fixture')
    const request = { ...input, id: created.context.id, version: 1, grantsVersion: 2 }

    for (const key of ['issuer', 'environmentId', 'subject', 'clientId', 'audience'] as const) {
      expect(await service.resolve({ ...request, [key]: 'other' })).toEqual({
        allowed: false,
        reason: 'context_invalid'
      })
    }

    expect(await service.resolve({ ...request, version: 2 })).toEqual({ allowed: false, reason: 'context_invalid' })
  })

  it('rejects a stale binding version after revocation', async () => {
    const { service, input, facts } = setup()
    const created = await service.create(input)

    if (!created.allowed) throw new Error('fixture')
    facts.grantsVersion = 3
    facts.capabilities = []
    const request = { ...input, id: created.context.id, version: 1 }

    expect(await service.resolve({ ...request, grantsVersion: 2 })).toEqual({ allowed: false, reason: 'version_stale' })
    const refreshed = await service.resolve(request)

    expect(refreshed.allowed && refreshed.capabilities).toEqual([])
  })

  it('rechecks eligibility and rejects tokens already issued after disabling the lane', async () => {
    const { service, input, facts, disable } = setup()
    const created = await service.create(input)

    if (!created.allowed) throw new Error('fixture')
    const request = { ...input, id: created.context.id, version: 1 }

    facts.eligible = false
    expect(await service.resolve(request)).toEqual({ allowed: false, reason: 'ineligible' })
    facts.eligible = true
    disable()
    expect(await service.resolve(request)).toEqual({ allowed: false, reason: 'disabled' })
  })

  it('does not promote an external login of the same workforce person', async () => {
    const { service, input, session } = setup()

    session.provenance = 'external'
    expect(await service.create(input)).toEqual({ allowed: false, reason: 'session_invalid' })
  })

  it('denies revoked provenance even if the context and native token remain unexpired', async () => {
    const { service, input, session } = setup()
    const created = await service.create(input)

    if (!created.allowed) throw new Error('fixture')
    session.revokedAt = NOW
    expect(await service.resolve({ ...input, id: created.context.id, version: 1 })).toEqual({
      allowed: false,
      reason: 'session_invalid'
    })
  })

  it('reuses the same context without extending its lifetime, while isolating clients', async () => {
    const { service, input, records } = setup()
    const first = await service.create(input)
    const again = await service.create({ ...input, expiresAt: new Date(input.expiresAt.getTime() + 86400000) })

    if (!first.allowed || !again.allowed) throw new Error('fixture')
    expect(again.context.id).toBe(first.context.id)
    expect(again.context.expiresAt).toEqual(input.expiresAt)
    expect(records.size).toBe(1)
    const otherClient = await service.create({ ...input, clientId: 'client-B' })

    expect(otherClient.allowed && otherClient.context.id).not.toBe(first.context.id)
    expect(records.size).toBe(2)
  })

  it('allows existing consented context after web-session expiry, denies new context and enforces final expiry', async () => {
    const { service, input, session, records } = setup()
    const created = await service.create(input)

    if (!created.allowed) throw new Error('fixture')
    const request = { ...input, id: created.context.id, version: 1 }

    session.expiresAt = new Date(NOW.getTime() - 1)
    expect((await service.resolve(request)).allowed).toBe(true)
    expect(await service.create({ ...input, clientId: 'new-client' })).toEqual({
      allowed: false,
      reason: 'session_invalid'
    })
    records.get(created.context.id)!.expiresAt = NOW
    expect(await service.resolve(request)).toEqual({ allowed: false, reason: 'context_invalid' })
  })

  it('rejects direct context revocation and never resurrects its ID', async () => {
    const { service, input, records } = setup()
    const created = await service.create(input)

    if (!created.allowed) throw new Error('fixture')
    records.get(created.context.id)!.revokedAt = NOW
    const request = { ...input, id: created.context.id, version: 1 }

    expect(await service.resolve(request)).toEqual({ allowed: false, reason: 'context_invalid' })
    const newAuthorization = await service.create(input)

    if (!newAuthorization.allowed) throw new Error('fixture')
    // A fresh context requires its own consent; persisted grants referencing the old ID stay dead.
    expect(newAuthorization.context.id).not.toBe(created.context.id)
    expect(await service.resolve(request)).toEqual({ allowed: false, reason: 'context_invalid' })
  })

  it('denies external population and malformed authority facts', async () => {
    const { service, input, facts } = setup()

    facts.population = 'external'
    expect((await service.create(input)).allowed).toBe(false)
    facts.population = 'internal'
    facts.grantsVersion = NaN
    expect((await service.create(input)).allowed).toBe(false)
  })
})
