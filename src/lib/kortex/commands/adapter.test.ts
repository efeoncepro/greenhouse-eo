import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  executeApiPlatformCommand: vi.fn(),
  parseIdempotencyKey: vi.fn(),
  fetchKortexCommandJson: vi.fn(),
  isKortexCommandAdminEnabled: vi.fn(),
  isKortexCommandAdapterEnabled: vi.fn(),
  isKortexCommandLiveExecuteEnabled: vi.fn(),
  resolveKortexCommandScope: vi.fn(),
  verifyKortexDryRunPreview: vi.fn(),
  redactErrorForResponse: vi.fn((value: unknown) => {
    void value

    return '[redacted]'
  })
}))

vi.mock('@/lib/api-platform/core/commands', () => ({
  executeApiPlatformCommand: (...args: unknown[]) => mocks.executeApiPlatformCommand(...args)
}))

vi.mock('@/lib/api-platform/core/idempotency', () => ({
  parseIdempotencyKey: (...args: unknown[]) => mocks.parseIdempotencyKey(...args)
}))

vi.mock('./client', () => ({
  fetchKortexCommandJson: (...args: unknown[]) => mocks.fetchKortexCommandJson(...args)
}))

vi.mock('./flags', () => ({
  isKortexCommandAdminEnabled: () => mocks.isKortexCommandAdminEnabled(),
  isKortexCommandAdapterEnabled: () => mocks.isKortexCommandAdapterEnabled(),
  isKortexCommandLiveExecuteEnabled: () => mocks.isKortexCommandLiveExecuteEnabled()
}))

vi.mock('./preflight', () => ({
  resolveKortexCommandScope: (...args: unknown[]) => mocks.resolveKortexCommandScope(...args),
  verifyKortexDryRunPreview: (...args: unknown[]) => mocks.verifyKortexDryRunPreview(...args)
}))

vi.mock('@/lib/observability/redact', () => ({
  redactErrorForResponse: (value: unknown) => mocks.redactErrorForResponse(value)
}))

const TENANT = {
  userId: 'user-admin-1',
  clientId: 'efeonce-internal',
  tenantType: 'efeonce_internal' as const
}

const REQUEST = new Request('http://localhost/api/admin/kortex/commands', {
  method: 'POST',
  headers: { 'Idempotency-Key': 'idem-1' }
})

const PREFLIGHT = {
  scope: {
    requestedPortalId: null,
    requestedHubspotPortalId: '51183921',
    resolvedPortalId: '0c0af3a3-627e-4e05-96f3-557712a2e06a',
    resolvedHubspotPortalId: '51183921',
    bindingId: 'binding-1',
    bindingPublicId: 'EO-SPB-0001',
    greenhouseScopeType: 'global',
    organizationId: null,
    clientId: null,
    spaceId: null
  },
  source: {
    source: 'greenhouse_preflight',
    status: 'ok',
    checkedAt: '2026-06-17T12:00:00.000Z'
  },
  warnings: []
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isKortexCommandAdminEnabled.mockReturnValue(false)
  mocks.isKortexCommandAdapterEnabled.mockReturnValue(true)
  mocks.isKortexCommandLiveExecuteEnabled.mockReturnValue(false)
  mocks.parseIdempotencyKey.mockReturnValue('idem-1')
  mocks.resolveKortexCommandScope.mockResolvedValue(PREFLIGHT)
  mocks.fetchKortexCommandJson.mockResolvedValue({
    deployment_run: {
      deployment_run_id: 'dep-1',
      status: 'completed'
    }
  })
  mocks.executeApiPlatformCommand.mockImplementation(async options => {
    const result = await options.run({ commandExecutionId: 'cmd-1' })

    return {
      ...result,
      headers: { 'idempotency-replayed': 'false' }
    }
  })
})

describe('Kortex command adapter', () => {
  it('parses every registry command name with an auditable reason', async () => {
    const { parseKortexCommandRequest } = await import('./adapter')
    const { KORTEX_COMMAND_NAMES } = await import('./registry')

    for (const commandName of KORTEX_COMMAND_NAMES) {
      expect(parseKortexCommandRequest({
        commandName,
        reason: `Run governed Kortex command ${commandName}`,
        payload: { auditType: 'readiness' }
      }).commandName).toBe(commandName)
    }

    expect(() => parseKortexCommandRequest({
      commandName: 'kortex.unknown',
      reason: 'Run an unknown command'
    })).toThrow(ApiPlatformError)

    expect(() => parseKortexCommandRequest({
      commandName: 'kortex.audit.run',
      reason: 'short'
    })).toThrow(ApiPlatformError)
  })

  it('fails closed when the adapter flag is disabled', async () => {
    mocks.isKortexCommandAdapterEnabled.mockReturnValueOnce(false)

    const { runKortexAdminCommand } = await import('./adapter')

    await expect(runKortexAdminCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.audit.run',
        hubspotPortalId: '51183921',
        reason: 'Run portal audit from Greenhouse',
        payload: {}
      }
    })).rejects.toMatchObject({ errorCode: 'kortex_command_adapter_disabled' })

    expect(mocks.fetchKortexCommandJson).not.toHaveBeenCalled()
  })

  it('requires an idempotency key before dispatching upstream', async () => {
    mocks.parseIdempotencyKey.mockReturnValueOnce(null)

    const { runKortexAdminCommand } = await import('./adapter')

    await expect(runKortexAdminCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.audit.run',
        hubspotPortalId: '51183921',
        reason: 'Run portal audit from Greenhouse',
        payload: {}
      }
    })).rejects.toMatchObject({ errorCode: 'bad_request' })

    expect(mocks.resolveKortexCommandScope).not.toHaveBeenCalled()
  })

  it('dispatches dry-run release candidate commands through the API Platform audit foundation', async () => {
    const { runKortexAdminCommand } = await import('./adapter')

    const result = await runKortexAdminCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.strategy.release_candidate.dry_run',
        hubspotPortalId: '51183921',
        reason: 'Dry-run release candidate before execution',
        payload: { releaseCandidateId: 'rc-1' }
      }
    })

    expect(result.data.contractVersion).toBe('greenhouse-kortex-command-adapter.v1')
    expect(result.data.commandExecutionId).toBe('cmd-1')
    expect(result.data.kortexOperationId).toBe('dep-1')
    expect(mocks.executeApiPlatformCommand).toHaveBeenCalledWith(expect.objectContaining({
      routeKey: 'kortex.command.kortex.strategy.release_candidate.dry_run',
      request: REQUEST
    }))
    expect(mocks.fetchKortexCommandJson).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/v1/strategy/release-candidates/rc-1/execute',
      idempotencyKey: 'idem-1',
      body: expect.objectContaining({ deployment_mode: 'dry_run' })
    }))
  })

  it('blocks live execute unless the explicit live flag is enabled', async () => {
    const { runKortexAdminCommand } = await import('./adapter')

    await expect(runKortexAdminCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.strategy.release_candidate.execute',
        hubspotPortalId: '51183921',
        reason: 'Execute approved Kortex release candidate',
        payload: { releaseCandidateId: 'rc-1' },
        confirmation: {
          confirmed: true,
          phrase: 'EXECUTE KORTEX RELEASE',
          previewCommandExecutionId: 'cmd-preview-1'
        }
      }
    })).rejects.toMatchObject({ errorCode: 'kortex_live_execute_disabled' })

    expect(mocks.verifyKortexDryRunPreview).not.toHaveBeenCalled()
    expect(mocks.fetchKortexCommandJson).not.toHaveBeenCalled()
  })

  it('blocks all external-write release variants unless live execute is enabled', async () => {
    const { runKortexAdminCommand } = await import('./adapter')

    await expect(runKortexAdminCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.strategy.release_candidate.execute_workflows',
        hubspotPortalId: '51183921',
        reason: 'Execute approved Kortex workflow candidates',
        payload: { releaseCandidateId: 'rc-1' },
        confirmation: {
          confirmed: true,
          phrase: 'EXECUTE KORTEX RELEASE',
          previewCommandExecutionId: 'cmd-preview-1'
        }
      }
    })).rejects.toMatchObject({ errorCode: 'kortex_live_execute_disabled' })

    expect(mocks.fetchKortexCommandJson).not.toHaveBeenCalled()
  })

  it('requires a matching dry-run preview before live execute', async () => {
    mocks.isKortexCommandLiveExecuteEnabled.mockReturnValueOnce(true)

    const { runKortexAdminCommand } = await import('./adapter')

    await runKortexAdminCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.strategy.release_candidate.execute',
        hubspotPortalId: '51183921',
        reason: 'Execute approved Kortex release candidate',
        payload: { releaseCandidateId: 'rc-1' },
        confirmation: {
          confirmed: true,
          phrase: 'EXECUTE KORTEX RELEASE',
          previewCommandExecutionId: 'cmd-preview-1'
        }
      }
    })

    expect(mocks.verifyKortexDryRunPreview).toHaveBeenCalledWith({
      previewCommandExecutionId: 'cmd-preview-1',
      releaseCandidateId: 'rc-1'
    })
    expect(mocks.fetchKortexCommandJson).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/v1/strategy/release-candidates/rc-1/execute',
      body: expect.objectContaining({ deployment_mode: 'execute' })
    }))
  })

  it('maps a newly enabled strategy stateful command through the registry', async () => {
    const { runKortexAdminCommand } = await import('./adapter')

    await runKortexAdminCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.strategy.conversation.create',
        hubspotPortalId: '51183921',
        reason: 'Create a Kortex strategy conversation from Greenhouse',
        payload: { title: 'Portal strategy', defaultModelEngine: 'claude' }
      }
    })

    expect(mocks.fetchKortexCommandJson).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/v1/strategy/conversations',
      body: expect.objectContaining({
        hubspot_portal_id: 51183921,
        title: 'Portal strategy',
        default_model_engine: 'claude'
      })
    }))
  })

  it('maps the hub profile command with PUT and required hubs payload', async () => {
    const { runKortexAdminCommand } = await import('./adapter')

    await runKortexAdminCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.portal.hub_profile.put',
        hubspotPortalId: '51183921',
        reason: 'Update Kortex hub profile for this portal',
        payload: { hubs: [{ hub_code: 'crm', tier: 'enterprise' }] }
      }
    })

    expect(mocks.fetchKortexCommandJson).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PUT',
      path: '/api/v1/portals/51183921/hub-profile',
      body: { hubs: [{ hub_code: 'crm', tier: 'enterprise' }] }
    }))
  })

  it('blocks admin breakglass commands unless the admin flag and phrase are present', async () => {
    const { runKortexAdminCommand } = await import('./adapter')

    await expect(runKortexAdminCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.admin.snapshots.trigger',
        hubspotPortalId: '51183921',
        reason: 'Trigger Kortex snapshots from Greenhouse',
        payload: {}
      }
    })).rejects.toMatchObject({ errorCode: 'kortex_admin_command_disabled' })

    mocks.isKortexCommandAdminEnabled.mockReturnValueOnce(true)

    await expect(runKortexAdminCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.admin.snapshots.trigger',
        hubspotPortalId: '51183921',
        reason: 'Trigger Kortex snapshots from Greenhouse',
        payload: {},
        confirmation: { confirmed: true, phrase: 'WRONG PHRASE' }
      }
    })).rejects.toMatchObject({ errorCode: 'kortex_admin_confirmation_required' })

    expect(mocks.fetchKortexCommandJson).not.toHaveBeenCalled()
  })

  it('allows admin breakglass commands with the admin flag and phrase', async () => {
    mocks.isKortexCommandAdminEnabled.mockReturnValueOnce(true)

    const { runKortexAdminCommand } = await import('./adapter')

    await runKortexAdminCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.admin.snapshots.trigger',
        hubspotPortalId: '51183921',
        reason: 'Trigger Kortex snapshots from Greenhouse',
        payload: {},
        confirmation: {
          confirmed: true,
          phrase: 'EXECUTE KORTEX ADMIN COMMAND'
        }
      }
    })

    expect(mocks.fetchKortexCommandJson).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/v1/admin/snapshots/trigger',
      body: expect.objectContaining({ hubspot_portal_id: 51183921 })
    }))
  })

})
