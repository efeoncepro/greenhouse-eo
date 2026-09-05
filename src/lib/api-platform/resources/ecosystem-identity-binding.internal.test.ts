import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InMemoryOAuthStore } from '@/lib/auth-server/oauth/store/memory-store'
import { revokeClientConsent } from '@/lib/auth-server/oauth/consent'

import type { ApiPlatformRequestContext } from '../core/context'
import { getEcosystemIdentityBindingPayload } from './ecosystem-identity-binding'

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), external: vi.fn(), runtime: vi.fn(), getAccessToken: vi.fn() }))

vi.mock('@/lib/auth-server/oauth/store/postgres-store', () => ({
  PostgresOAuthStore: class {
    getAccessToken = mocks.getAccessToken
  }
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth-server/internal/runtime', () => ({ createRuntimeInternalContexts: mocks.runtime }))
vi.mock('@/lib/identity/external-access/resolve-external-access', () => ({ resolveExternalAccess: mocks.external }))
vi.mock('@/lib/auth-server/oauth/config', () => ({
  readAuthServerOAuthConfig: () => ({
    environmentId: 'efeonce-auth',
    issuer: 'https://auth.example',
    mcpAudience: 'https://mcp.example'
  })
}))

const ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const params = {
  environment: 'efeonce-auth',
  subject: 'subject-opaque',
  clientId: 'client-A',
  jti: 'abcdefghijklmnopqrstuv',
  authorizationContextId: ID,
  contextVersion: '1',
  grantsVersion: '3',
  audience: 'https://mcp.example'
}

const context = (scope = 'internal') => ({ binding: { greenhouseScopeType: scope } }) as ApiPlatformRequestContext

const invoke = (query: Record<string, string> = params, scope = 'internal') =>
  getEcosystemIdentityBindingPayload({
    context: context(scope),
    request: new Request(
      `https://greenhouse.example/api/platform/ecosystem/identity/binding?${new URLSearchParams(query)}`
    )
  })

let ledger: InMemoryOAuthStore

beforeEach(async () => {
  vi.clearAllMocks()
  ledger = new InMemoryOAuthStore()
  await ledger.insertAccessToken({
    jti: params.jti,
    grantId: 'grant-A',
    clientId: params.clientId,
    subject: params.subject,
    environmentId: params.environment,
    authorizationContextId: ID,
    scopes: ['mcp:tools'],
    issuedAt: new Date(Date.now() - 1000),
    expiresAt: new Date(Date.now() + 60000),
    revokedAt: null,
    revokeReason: null
  })
  mocks.getAccessToken.mockImplementation((jti: string) => ledger.getAccessToken(jti))
  mocks.runtime.mockReturnValue({ contexts: { resolve: mocks.resolve } })
  mocks.resolve.mockResolvedValue({
    allowed: true,
    context: { profileId: 'profile-A', organizationId: 'org-A', bindingId: 'binding-A' },
    grantsVersion: 3,
    capabilities: ['read:A']
  })
  mocks.external.mockResolvedValue({ outcome: 'unbound', memberships: [] })
})

describe('ecosystem internal identity reader', () => {
  it('rejects non-internal machine scope before invoking any identity reader', async () => {
    for (const scope of ['organization', 'client', 'person']) {
      await expect(invoke(params, scope)).rejects.toMatchObject({ statusCode: 404, errorCode: 'not_found' })
    }

    expect(mocks.resolve).not.toHaveBeenCalled()
    expect(mocks.runtime).not.toHaveBeenCalled()
    expect(mocks.external).not.toHaveBeenCalled()
  })

  it('revalidates every caller dimension and returns zero-cache context capability authority', async () => {
    const result = await invoke()

    expect(mocks.resolve).toHaveBeenCalledExactlyOnceWith({
      id: ID,
      version: 1,
      issuer: 'https://auth.example',
      environmentId: 'efeonce-auth',
      subject: 'subject-opaque',
      clientId: 'client-A',
      audience: 'https://mcp.example',
      grantsVersion: 3
    })
    expect(result).toEqual({
      data: {
        population: 'internal',
        outcome: 'bound',
        cacheTtlSeconds: 0,
        contextVersion: 1,
        authorizationContextId: ID,
        profileId: 'profile-A',
        organizationId: 'org-A',
        bindingId: 'binding-A',
        grantsVersion: 3,
        capabilities: ['read:A']
      },
      cacheControl: 'private, no-store'
    })
    expect(mocks.external).not.toHaveBeenCalled()
    await invoke()
    expect(mocks.resolve).toHaveBeenCalledTimes(2)
  })

  it('rejects invalid context dimensions before resolution and never falls back to external', async () => {
    for (const override of [
      { authorizationContextId: '' },
      { authorizationContextId: 'not-a-uuid' },
      { contextVersion: '2' },
      { contextVersion: '1e0' },
      { contextVersion: ' 1 ' },
      { grantsVersion: '1e0' },
      { grantsVersion: '03' },
      { grantsVersion: ' 3 ' },
      { grantsVersion: '0' },
      { grantsVersion: '1.5' },
      { grantsVersion: 'Infinity' },
      { grantsVersion: '' },
      { grantsVersion: '9007199254740992' },
      { clientId: '' },
      { environment: 'other' },
      { environment: '' },
      { jti: '' },
      { jti: 'not-valid' },
      { jti: 'a'.repeat(23) },
      { subject: '' },
      { audience: 'https://other.example' }
    ]) {
      await expect(invoke({ ...params, ...override })).rejects.toMatchObject({
        statusCode: 400,
        errorCode: 'bad_request'
      })
    }

    expect(mocks.resolve).not.toHaveBeenCalled()
    expect(mocks.external).not.toHaveBeenCalled()
  })

  it('rejects partial context metadata rather than attempting external authority', async () => {
    for (const key of ['contextVersion', 'grantsVersion', 'audience', 'jti'] as const) {
      await expect(
        invoke({
          environment: params.environment,
          subject: params.subject,
          clientId: params.clientId,
          [key]: params[key]
        })
      ).rejects.toMatchObject({ statusCode: 400, errorCode: 'bad_request' })
    }

    expect(mocks.resolve).not.toHaveBeenCalled()
    expect(mocks.external).not.toHaveBeenCalled()
  })

  it('rejects duplicate caller dimensions even when values are identical', async () => {
    for (const [key, value] of Object.entries(params)) {
      const query = new URLSearchParams(params)

      query.append(key, value)
      await expect(
        getEcosystemIdentityBindingPayload({
          context: context(),
          request: new Request(`https://greenhouse.example/api/platform/ecosystem/identity/binding?${query}`)
        })
      ).rejects.toMatchObject({ statusCode: 400, errorCode: 'bad_request' })
    }

    expect(mocks.resolve).not.toHaveBeenCalled()
    expect(mocks.external).not.toHaveBeenCalled()
  })

  it('preserves internal denial and service failure without legacy fallback or positive caching', async () => {
    for (const reason of [
      'disabled',
      'context_invalid',
      'session_invalid',
      'ineligible',
      'version_stale',
      'unavailable'
    ]) {
      mocks.resolve.mockResolvedValueOnce({ allowed: false, reason })
      const result = await invoke()

      expect(result).toEqual({
        data: {
          population: 'internal',
          outcome: 'denied',
          cacheTtlSeconds: 0,
          contextVersion: 1,
          authorizationContextId: ID,
          reason
        },
        cacheControl: 'private, no-store'
      })
    }

    const unavailable = new Error('unavailable')

    mocks.resolve.mockRejectedValueOnce(unavailable)
    await expect(invoke()).rejects.toBe(unavailable)
    expect(mocks.external).not.toHaveBeenCalled()
  })

  it('retains the legacy external path only when no authorization context is present', async () => {
    const result = await invoke({ environment: 'external-env', subject: 'external-sub', clientId: 'external-client' })

    expect(mocks.external).toHaveBeenCalledExactlyOnceWith({
      environmentId: 'external-env',
      subject: 'external-sub',
      clientId: 'external-client'
    })
    expect(mocks.runtime).not.toHaveBeenCalled()
    expect(result).toEqual({
      data: { outcome: 'unbound', memberships: [], cacheTtlSeconds: 60 },
      cacheControl: 'private, no-store'
    })
  })
})

describe('internal binding token revocation ledger', () => {
  it.each(['grant', 'consent'])(
    'denies the same formerly bound token after canonical %s revocation without invalidating its context',
    async method => {
      expect((await invoke()).data.outcome).toBe('bound')

      if (method === 'grant') {
        await ledger.revokeGrant({ grantId: 'grant-A', now: new Date(), reason: 'operator_revoked' })
      } else {
        await revokeClientConsent(
          {
            subject: params.subject,
            environmentId: params.environment,
            clientId: params.clientId,
            scopes: null,
            reason: 'operator_revoked',
            actor: 'admin',
            via: 'admin'
          },
          { store: ledger }
        )
      }

      expect((await invoke()).data).toMatchObject({ outcome: 'denied', reason: 'token_invalid', cacheTtlSeconds: 0 })
      expect(mocks.resolve).toHaveBeenCalledTimes(1)
      expect(mocks.external).not.toHaveBeenCalled()
    }
  )

  it('preserves another live grant sharing the same context when one grant is revoked', async () => {
    const siblingJti = 'ABCDEFGHIJKLMNOPQRSTUV'

    await ledger.insertAccessToken({ ...ledger.accessTokens.get(params.jti)!, jti: siblingJti, grantId: 'grant-B' })
    await ledger.revokeGrant({ grantId: 'grant-A', now: new Date(), reason: 'operator_revoked' })
    expect((await invoke()).data.outcome).toBe('denied')
    expect((await invoke({ ...params, jti: siblingJti })).data.outcome).toBe('bound')
  })

  it('denies nonexistent, foreign, expired, future and malformed ledger records', async () => {
    const original = ledger.accessTokens.get(params.jti)!

    for (const override of [
      { subject: 'foreign' },
      { clientId: 'foreign' },
      { environmentId: 'foreign' },
      { authorizationContextId: 'foreign' },
      { authorizationContextId: null },
      { expiresAt: new Date(Date.now() - 1) },
      { expiresAt: new Date(NaN) },
      { issuedAt: new Date(Date.now() + 60000) },
      { revokedAt: new Date() },
      { jti: 'foreign' }
    ]) {
      ledger.accessTokens.set(params.jti, { ...original, ...override })
      expect((await invoke()).data).toMatchObject({ outcome: 'denied', reason: 'token_invalid' })
    }

    ledger.accessTokens.clear()
    expect((await invoke()).data.outcome).toBe('denied')
    expect(mocks.resolve).not.toHaveBeenCalled()
  })

  it('requires jti for context but never consults its ledger for legacy external reads', async () => {
    const query = { ...params }

    Reflect.deleteProperty(query, 'jti')
    await expect(invoke(query)).rejects.toMatchObject({ statusCode: 400 })
    await invoke({ environment: 'external-env', subject: 'external-sub' })
    expect(mocks.getAccessToken).not.toHaveBeenCalled()
  })

  it('propagates ledger failure without context or external fallback', async () => {
    mocks.getAccessToken.mockRejectedValueOnce(new Error('ledger unavailable'))
    await expect(invoke()).rejects.toThrow('ledger unavailable')
    expect(mocks.resolve).not.toHaveBeenCalled()
    expect(mocks.external).not.toHaveBeenCalled()
  })
})
