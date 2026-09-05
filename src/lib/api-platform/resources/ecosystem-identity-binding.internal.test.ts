import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiPlatformRequestContext } from '../core/context'
import { getEcosystemIdentityBindingPayload } from './ecosystem-identity-binding'

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), external: vi.fn(), runtime: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth-server/internal/runtime', () => ({ createRuntimeInternalContexts: mocks.runtime }))
vi.mock('@/lib/identity/external-access/resolve-external-access', () => ({ resolveExternalAccess: mocks.external }))
vi.mock('@/lib/auth-server/oauth/config', () => ({ readAuthServerOAuthConfig: () => ({
  environmentId: 'efeonce-auth', issuer: 'https://auth.example', mcpAudience: 'https://mcp.example'
}) }))

const ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const params = { environment: 'efeonce-auth', subject: 'subject-opaque', clientId: 'client-A',
  authorizationContextId: ID, contextVersion: '1', grantsVersion: '3', audience: 'https://mcp.example' }

const context = (scope = 'internal') => ({ binding: { greenhouseScopeType: scope } }) as ApiPlatformRequestContext

const invoke = (query: Record<string, string> = params, scope = 'internal') => getEcosystemIdentityBindingPayload({
  context: context(scope), request: new Request(`https://greenhouse.example/api/platform/ecosystem/identity/binding?${new URLSearchParams(query)}`)
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.runtime.mockReturnValue({ contexts: { resolve: mocks.resolve } })
  mocks.resolve.mockResolvedValue({ allowed: true, context: { profileId: 'profile-A', organizationId: 'org-A', bindingId: 'binding-A' },
    grantsVersion: 3, capabilities: ['read:A'] })
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

    expect(mocks.resolve).toHaveBeenCalledExactlyOnceWith({ id: ID, version: 1, issuer: 'https://auth.example',
      environmentId: 'efeonce-auth', subject: 'subject-opaque', clientId: 'client-A', audience: 'https://mcp.example', grantsVersion: 3 })
    expect(result).toEqual({ data: { population: 'internal', outcome: 'bound', cacheTtlSeconds: 0, contextVersion: 1,
      authorizationContextId: ID, profileId: 'profile-A', organizationId: 'org-A', bindingId: 'binding-A', grantsVersion: 3,
      capabilities: ['read:A'] }, cacheControl: 'private, no-store' })
    expect(mocks.external).not.toHaveBeenCalled()
    await invoke()
    expect(mocks.resolve).toHaveBeenCalledTimes(2)
  })

  it('rejects invalid context dimensions before resolution and never falls back to external', async () => {
    for (const override of [
      { authorizationContextId: '' }, { authorizationContextId: 'not-a-uuid' }, { contextVersion: '2' },
      { contextVersion: '1e0' }, { contextVersion: ' 1 ' }, { grantsVersion: '1e0' }, { grantsVersion: '03' },
      { grantsVersion: ' 3 ' }, { grantsVersion: '0' }, { grantsVersion: '1.5' }, { grantsVersion: 'Infinity' }, { grantsVersion: '' },
      { grantsVersion: '9007199254740992' }, { clientId: '' }, { environment: 'other' }, { environment: '' },
      { subject: '' }, { audience: 'https://other.example' }
    ]) {
      await expect(invoke({ ...params, ...override })).rejects.toMatchObject({ statusCode: 400, errorCode: 'bad_request' })
    }

    expect(mocks.resolve).not.toHaveBeenCalled()
    expect(mocks.external).not.toHaveBeenCalled()
  })

  it('rejects partial context metadata rather than attempting external authority', async () => {
    for (const key of ['contextVersion', 'grantsVersion', 'audience'] as const) {
      await expect(invoke({ environment: params.environment, subject: params.subject, clientId: params.clientId,
        [key]: params[key] })).rejects.toMatchObject({ statusCode: 400, errorCode: 'bad_request' })
    }

    expect(mocks.resolve).not.toHaveBeenCalled()
    expect(mocks.external).not.toHaveBeenCalled()
  })

  it('rejects duplicate caller dimensions even when values are identical', async () => {
    for (const [key, value] of Object.entries(params)) {
      const query = new URLSearchParams(params)

      query.append(key, value)
      await expect(getEcosystemIdentityBindingPayload({ context: context(),
        request: new Request(`https://greenhouse.example/api/platform/ecosystem/identity/binding?${query}`)
      })).rejects.toMatchObject({ statusCode: 400, errorCode: 'bad_request' })
    }

    expect(mocks.resolve).not.toHaveBeenCalled()
    expect(mocks.external).not.toHaveBeenCalled()
  })

  it('preserves internal denial and service failure without legacy fallback or positive caching', async () => {
    for (const reason of ['disabled', 'context_invalid', 'session_invalid', 'ineligible', 'version_stale', 'unavailable']) {
      mocks.resolve.mockResolvedValueOnce({ allowed: false, reason })
      const result = await invoke()

      expect(result).toEqual({ data: { population: 'internal', outcome: 'denied', cacheTtlSeconds: 0,
        contextVersion: 1, authorizationContextId: ID, reason }, cacheControl: 'private, no-store' })
    }

    const unavailable = new Error('unavailable')

    mocks.resolve.mockRejectedValueOnce(unavailable)
    await expect(invoke()).rejects.toBe(unavailable)
    expect(mocks.external).not.toHaveBeenCalled()
  })

  it('retains the legacy external path only when no authorization context is present', async () => {
    const result = await invoke({ environment: 'external-env', subject: 'external-sub', clientId: 'external-client' })

    expect(mocks.external).toHaveBeenCalledExactlyOnceWith({ environmentId: 'external-env', subject: 'external-sub', clientId: 'external-client' })
    expect(mocks.runtime).not.toHaveBeenCalled()
    expect(result).toEqual({ data: { outcome: 'unbound', memberships: [], cacheTtlSeconds: 60 }, cacheControl: 'private, no-store' })
  })
})
