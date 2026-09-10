import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'

const mocks = vi.hoisted(() => ({ preview: vi.fn(), authorize: vi.fn(), apply: vi.fn(), rollback: vi.fn() }))

vi.mock('@/lib/client-portal/enablement/reader', () => ({ previewServiceEnablement: mocks.preview }))
vi.mock('@/lib/client-portal/enablement/access', () => ({
  authorizeServiceEnablement: mocks.authorize,
  CLIENT_SERVICE_ENABLEMENT_DELEGATED_SCOPE: 'client_services.enablement.write',
  CLIENT_SERVICE_ENABLEMENT_EXCHANGE_CLIENT_ID: 'efeonce-mcp-client-services'
}))
vi.mock('@/lib/client-portal/enablement/commands', () => ({ applyServiceEnablement: mocks.apply, rollbackServiceEnablement: mocks.rollback }))

import { runAppClientServiceEnablement } from './app-client-service-enablement'
import { runEcosystemClientServiceEnablement } from './ecosystem-client-service-enablement'

const request = { organizationId: 'org-a', targets: [{ serviceId: 'service-a', moduleKey: 'module-a' }], personIds: ['person-a'] }
const app = { authSource: 'cookie_session', tenant: { userId: 'authenticated-actor' } } as AppPlatformRequestContext
const internal = { binding: { greenhouseScopeType: 'internal', organizationId: null } } as ApiPlatformRequestContext

beforeEach(() => {
  vi.clearAllMocks()
  mocks.preview.mockResolvedValue({ version: 1, canApply: true, fingerprint: 'a'.repeat(64) })
  mocks.authorize.mockResolvedValue(undefined)
  mocks.apply.mockResolvedValue({ data: { operationId: 'receipt-a' }, replayed: false })
})

describe('service enablement API adapters', () => {
  it('app and internal API return the same canonical preview', async () => {
    const result = await runAppClientServiceEnablement({ context: app, operation: 'preview', body: request })

    expect(await runEcosystemClientServiceEnablement({ context: internal, operation: 'preview', body: request })).toEqual(result)
    expect(mocks.preview).toHaveBeenLastCalledWith(request)
    expect(mocks.authorize).toHaveBeenCalledWith('authenticated-actor', 'preview')
  })

  it('derives the actor only from the authenticated app context and preserves replay metadata', async () => {
    const body = { proposal: request, fingerprint: 'a'.repeat(64), idempotencyKey: 'apply-key' }

    await runAppClientServiceEnablement({ context: app, operation: 'apply', body })
    expect(mocks.apply).toHaveBeenCalledWith(body, 'authenticated-actor', { kind: 'app_session' })
    mocks.apply.mockClear()
    await expect(runAppClientServiceEnablement({ context: app, operation: 'apply', body: { ...body, actorUserId: 'spoof' } })).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.apply).not.toHaveBeenCalled()
  })

  it.each(['organization', 'client', 'space'])('denies %s bindings before reading inventory', async scope => {
    await expect(runEcosystemClientServiceEnablement({ context: { binding: { greenhouseScopeType: scope } } as ApiPlatformRequestContext,
      operation: 'preview', body: request })).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.preview).not.toHaveBeenCalled()
  })

  it.each(['apply', 'rollback'] as const)('denies machine %s even with a claimed actor', async operation => {
    await expect(runEcosystemClientServiceEnablement({ context: internal, operation, body: { ...request, actorUserId: 'admin' } })).rejects.toMatchObject({ statusCode: 403, errorCode: 'invalid_delegated_context' })
    expect(mocks.apply).not.toHaveBeenCalled()
    expect(mocks.rollback).not.toHaveBeenCalled()
  })

  it('allows agent inventory but never treats an agent session as human approval', async () => {
    const context = { ...app, tenant: { ...app.tenant, authMode: 'agent' } }

    await expect(runAppClientServiceEnablement({ context, operation: 'preview', body: request })).resolves.toHaveProperty('data')
    await expect(runAppClientServiceEnablement({ context, operation: 'apply', body: request })).rejects.toMatchObject({ statusCode: 403, errorCode: 'invalid_delegated_context' })
    expect(mocks.apply).not.toHaveBeenCalled()
  })

  describe('delegated human authority (sister-platform bearer)', () => {
    const body = { proposal: request, fingerprint: 'a'.repeat(64), idempotencyKey: 'apply-key' }

    const delegated = {
      ...app, requestId: 'req-1', authSource: 'sister_platform_oauth', oauthCapabilities: ['client_services.enablement.write'],
      oauthClientId: 'efeonce-mcp-client-services', oauthAccessTokenId: 'spoauth-token-1', oauthSessionAuthMode: 'agent', oauthCorrelationId: 'corr-1',
      tenant: { userId: 'authenticated-actor', authMode: 'both' }
    } as unknown as AppPlatformRequestContext

    it('denies a delegated bearer without the enablement write class before touching the domain', async () => {
      await expect(runAppClientServiceEnablement({ context: { ...delegated, oauthCapabilities: ['hiring.talent_pool.read'] }, operation: 'preview', body: request })).rejects.toMatchObject({ statusCode: 403, errorCode: 'scope_not_allowed' })
      await expect(runAppClientServiceEnablement({ context: { ...delegated, oauthCapabilities: [] }, operation: 'apply', body })).rejects.toMatchObject({ statusCode: 403, errorCode: 'scope_not_allowed' })
      expect(mocks.preview).not.toHaveBeenCalled()
      expect(mocks.apply).not.toHaveBeenCalled()
    })

    it('accepts the exchange client minted for a human and records the channel as authority, never as actor', async () => {
      await runAppClientServiceEnablement({ context: delegated, operation: 'apply', body })
      expect(mocks.apply).toHaveBeenCalledWith(body, 'authenticated-actor', {
        kind: 'delegated_oauth', clientId: 'efeonce-mcp-client-services', accessTokenId: 'spoauth-token-1', correlationId: 'corr-1'
      })

      const preview = await runAppClientServiceEnablement({ context: delegated, operation: 'preview', body: request })

      expect(preview).toHaveProperty('data')
      expect(mocks.authorize).toHaveBeenCalledWith('authenticated-actor', 'preview')
    })

    it('accepts a human OAuth session from another client with the same class', async () => {
      const human = { ...delegated, oauthClientId: 'greenhouse-admin-cli', oauthSessionAuthMode: 'microsoft_sso' } as AppPlatformRequestContext

      mocks.rollback.mockResolvedValue({ data: { paused: [] }, replayed: false })
      await runAppClientServiceEnablement({ context: human, operation: 'rollback', body: { organizationId: 'org-a', operationId: 'receipt-a', idempotencyKey: 'rollback-key' } })
      expect(mocks.rollback).toHaveBeenCalledWith(expect.anything(), 'authenticated-actor', expect.objectContaining({ kind: 'delegated_oauth', clientId: 'greenhouse-admin-cli' }))
    })

    it.each([
      ['agent transport from a non-exchange client', { oauthClientId: 'greenhouse-admin-cli', oauthSessionAuthMode: 'agent' }],
      ['missing token provenance', { oauthAccessTokenId: null }],
      ['missing client provenance', { oauthClientId: null }],
      ['a diagnostic agent as the delegating human', { tenant: { userId: 'agent', authMode: 'agent' } }]
    ])('fails closed on %s', async (_label, patch) => {
      await expect(runAppClientServiceEnablement({ context: { ...delegated, ...patch } as AppPlatformRequestContext, operation: 'apply', body })).rejects.toMatchObject({ statusCode: 403, errorCode: 'invalid_delegated_context' })
      expect(mocks.apply).not.toHaveBeenCalled()
    })

    it('never lets the bearer supply the actor in the body', async () => {
      await expect(runAppClientServiceEnablement({ context: delegated, operation: 'apply', body: { ...body, actorUserId: 'spoof' } })).rejects.toMatchObject({ statusCode: 400 })
      expect(mocks.apply).not.toHaveBeenCalled()
    })
  })
})
