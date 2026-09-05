import { describe, expect, it, vi } from 'vitest'

import type { ExternalOrganizationBinding } from '@/lib/identity/external-access/types'
import type { InternalAuthorizationContext } from './context'
import {
  createConsentContextPort,
  createRuntimeConsentContextPort,
  type ConsentContextDependencies
} from './consent-context'

const canonical = vi.hoisted(() => ({ getBinding: vi.fn(), external: vi.fn() }))

vi.mock('@/lib/identity/external-access/store', () => ({ getExternalOrganizationBinding: canonical.getBinding }))
vi.mock('@/lib/identity/external-access/resolve-external-access', () => ({ resolveExternalAccess: canonical.external }))

const config = { issuer: 'https://auth.example', environmentId: 'efeonce-auth', mcpAudience: 'https://mcp.example/mcp' }

const input = {
  environmentId: config.environmentId,
  subject: 'opaque-person',
  clientId: 'client',
  audience: config.mcpAudience,
  authorizationContextId: 'ctx'
}

const context: InternalAuthorizationContext = {
  id: 'ctx',
  version: 1,
  issuer: config.issuer,
  environmentId: input.environmentId,
  subject: input.subject,
  profileId: 'private-profile',
  clientId: input.clientId,
  audience: input.audience,
  organizationId: 'org-a',
  bindingId: 'binding-a',
  sessionHash: 'private-session',
  upstreamLinkId: 'private-upstream',
  authTime: new Date(),
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 60000),
  revokedAt: null
}

const binding: ExternalOrganizationBinding = {
  bindingId: 'binding-a',
  organizationId: 'org-a',
  organizationName: 'Efeonce',
  environmentId: config.environmentId,
  externalOrganizationRef: 'external-a',
  status: 'active',
  grantsVersion: 3,
  designatedAdminProfileId: null,
  reason: null,
  boundBy: 'operator',
  boundAt: new Date().toISOString(),
  revokedBy: null,
  revokedAt: null,
  revokeReason: null
}

const fixture = () => {
  const internal = {
    resolve: vi.fn<ConsentContextDependencies['internal']['resolve']>(async () => ({
      allowed: true,
      context,
      grantsVersion: 3,
      capabilities: ['growth.seo.observation.read']
    }))
  }

  const external = vi.fn<ConsentContextDependencies['external']>(async () => ({
    outcome: 'bound',
    environmentId: config.environmentId,
    issuerClass: 'external',
    profileId: 'profile',
    resolvedAt: new Date().toISOString(),
    memberships: [
      {
        bindingId: 'binding-a',
        organizationId: 'org-a',
        externalOrganizationRef: 'external-a',
        grantsVersion: 3,
        grants: ['capability.a'],
        designatedAdmin: false
      }
    ]
  }))

  const getBinding = vi.fn<ConsentContextDependencies['getBinding']>(async () => binding)

  return { internal, external, getBinding, port: createConsentContextPort({ config, internal, external, getBinding }) }
}

describe('consent context presentation from current authority', () => {
  it('resolves exact internal organization without exposing subject/context/binding/session IDs', async () => {
    const f = fixture()

    expect(await f.port.resolve(input)).toEqual({
      outcome: 'resolved',
      population: 'internal',
      organizations: [{ organizationName: 'Efeonce', capabilities: ['growth.seo.observation.read'] }]
    })
    expect(f.internal.resolve).toHaveBeenCalledWith({
      id: 'ctx',
      version: 1,
      issuer: config.issuer,
      environmentId: input.environmentId,
      subject: input.subject,
      clientId: input.clientId,
      audience: input.audience
    })
  })
  it('keeps external capabilities separated by organization and never invokes internal', async () => {
    const f = fixture()

    const result = await f.external({
      environmentId: input.environmentId,
      subject: input.subject,
      clientId: input.clientId
    })

    f.external.mockClear()
    f.external.mockResolvedValue({
      ...result,
      memberships: [
        ...result.memberships,
        { ...result.memberships[0]!, bindingId: 'binding-b', organizationId: 'org-b', grants: ['capability.b'] }
      ]
    })
    f.getBinding.mockImplementation(async id =>
      id === 'binding-a'
        ? binding
        : { ...binding, bindingId: 'binding-b', organizationId: 'org-b', organizationName: 'Cliente B' }
    )
    expect(await f.port.resolve({ ...input, authorizationContextId: null })).toEqual({
      outcome: 'resolved',
      population: 'external',
      organizations: [
        { organizationName: 'Efeonce', capabilities: ['capability.a'] },
        { organizationName: 'Cliente B', capabilities: ['capability.b'] }
      ]
    })
    expect(f.internal.resolve).not.toHaveBeenCalled()
  })
  it.each([
    'bindingId',
    'organizationId',
    'environmentId',
    'status',
    'grantsVersion',
    'organizationName',
    'revokedAt'
  ] as const)('denies mismatched or unavailable binding field %s', async field => {
    const f = fixture()

    f.getBinding.mockResolvedValue({
      ...binding,
      [field]:
        field === 'grantsVersion'
          ? 4
          : field === 'organizationName'
            ? ' '
            : field === 'status'
              ? 'revoked'
              : 'different'
    })
    expect(await f.port.resolve(input)).toEqual({ outcome: 'denied' })
    expect(f.external).not.toHaveBeenCalled()
  })
  it.each(['id', 'issuer', 'environmentId', 'subject', 'clientId', 'audience'] as const)(
    'denies context mismatch %s without fallback',
    async field => {
      const f = fixture()

      f.internal.resolve.mockResolvedValue({
        allowed: true,
        context: { ...context, [field]: 'other' },
        grantsVersion: 3,
        capabilities: []
      })
      expect(await f.port.resolve(input)).toEqual({ outcome: 'denied' })
      expect(f.external).not.toHaveBeenCalled()
    }
  )
  it.each(['context_invalid', 'session_invalid', 'ineligible', 'version_stale', 'unavailable'] as const)(
    'preserves current context rejection %s',
    async reason => {
      const f = fixture()

      f.internal.resolve.mockResolvedValue({ allowed: false, reason })
      expect(await f.port.resolve(input)).toEqual({ outcome: reason === 'unavailable' ? 'unavailable' : 'denied' })
      expect(f.external).not.toHaveBeenCalled()
      expect(f.getBinding).not.toHaveBeenCalled()
    }
  )
  it('fails closed on stores throwing or missing names/bindings and rejects invalid request before readers', async () => {
    const f = fixture()

    f.internal.resolve.mockRejectedValueOnce(new Error('private details'))
    expect(await f.port.resolve(input)).toEqual({ outcome: 'unavailable' })
    expect(f.external).not.toHaveBeenCalled()
    f.getBinding.mockRejectedValueOnce(new Error('private details'))
    expect(await f.port.resolve(input)).toEqual({ outcome: 'unavailable' })
    f.getBinding.mockResolvedValueOnce(null)
    expect(await f.port.resolve(input)).toEqual({ outcome: 'denied' })
    f.internal.resolve.mockClear()
    for (const changed of [{ audience: 'other' }, { environmentId: 'other' }, { authorizationContextId: '' }])
      expect(await f.port.resolve({ ...input, ...changed })).toEqual({ outcome: 'denied' })
    expect(f.internal.resolve).not.toHaveBeenCalled()
  })
  it('does not cache authority or capabilities between calls', async () => {
    const f = fixture()

    expect((await f.port.resolve(input)).outcome).toBe('resolved')
    f.internal.resolve.mockResolvedValueOnce({ allowed: false, reason: 'session_invalid' })
    expect(await f.port.resolve(input)).toEqual({ outcome: 'denied' })
    expect(f.internal.resolve).toHaveBeenCalledTimes(2)
  })
  it('denies unbound external authority and suppresses external read errors', async () => {
    const f = fixture()

    f.external.mockResolvedValueOnce({
      outcome: 'unbound',
      environmentId: config.environmentId,
      issuerClass: 'external',
      profileId: null,
      resolvedAt: new Date().toISOString(),
      memberships: []
    })
    expect(await f.port.resolve({ ...input, authorizationContextId: null })).toEqual({ outcome: 'denied' })
    f.external.mockRejectedValueOnce(new Error('private database error'))
    expect(await f.port.resolve({ ...input, authorizationContextId: null })).toEqual({ outcome: 'unavailable' })
    expect(f.getBinding).not.toHaveBeenCalled()
    expect(f.internal.resolve).not.toHaveBeenCalled()
  })
  it('production factory uses the canonical binding and external readers', async () => {
    const f = fixture()

    canonical.getBinding.mockResolvedValue(binding)
    canonical.external.mockResolvedValue(
      await f.external({ environmentId: input.environmentId, subject: input.subject, clientId: input.clientId })
    )
    const port = createRuntimeConsentContextPort(config, f.internal)

    expect((await port.resolve({ ...input, authorizationContextId: null })).outcome).toBe('resolved')
    expect(canonical.external).toHaveBeenCalledWith({
      environmentId: input.environmentId,
      subject: input.subject,
      clientId: input.clientId
    })
    expect(canonical.getBinding).toHaveBeenCalledWith('binding-a')
    expect(f.internal.resolve).not.toHaveBeenCalled()
    expect((await port.resolve(input)).outcome).toBe('resolved')
    expect(f.internal.resolve).toHaveBeenCalledTimes(1)
    expect(canonical.external).toHaveBeenCalledTimes(1)
  })
})
