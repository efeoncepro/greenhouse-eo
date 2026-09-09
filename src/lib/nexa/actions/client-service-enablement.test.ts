import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NexaActionContext } from './types'

const mocks = vi.hoisted(() => ({ preview: vi.fn(), authorize: vi.fn(), apply: vi.fn(), rollback: vi.fn(), receipt: vi.fn() }))

vi.mock('@/lib/client-portal/enablement/reader', () => ({ previewServiceEnablement: mocks.preview, readServiceEnablementReceipt: mocks.receipt }))
vi.mock('@/lib/client-portal/enablement/access', () => ({ authorizeServiceEnablement: mocks.authorize }))
vi.mock('@/lib/client-portal/enablement/commands', () => ({ applyServiceEnablement: mocks.apply, rollbackServiceEnablement: mocks.rollback }))

import { applyClientServiceEnablementAction } from './client-service-enablement'
import { resolveNexaActionProposal } from './registry'

const context: NexaActionContext = { userId: 'human-admin', tenantType: 'efeonce_internal', roleCodes: ['efeonce_admin'], routeGroups: ['admin'], clientId: null }
const input = { organizationId: 'org-a', targets: [{ serviceId: 'service-a', moduleKey: 'module-a' }], personIds: ['person-a'] }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.preview.mockResolvedValue({ canApply: true, fingerprint: 'a'.repeat(64), changes: [{ moduleKey: 'module-a', action: 'enable' }], readiness: [] })
  mocks.authorize.mockResolvedValue(undefined)
  mocks.apply.mockResolvedValue({ data: { operationId: 'receipt-a' }, replayed: false })
})

afterEach(() => vi.unstubAllEnvs())

describe('Nexa service enablement', () => {
  it('prepares exact input server-side without applying and executes that fingerprint with the session actor', async () => {
    const preview = await applyClientServiceEnablementAction.buildPreview(context, input)

    expect(mocks.apply).not.toHaveBeenCalled()
    expect(preview.executionInput).toMatchObject({ proposal: input, fingerprint: 'a'.repeat(64), idempotencyKey: expect.stringMatching(/^nexa-/) })
    await applyClientServiceEnablementAction.execute(context, preview.executionInput as Parameters<typeof applyClientServiceEnablementAction.execute>[1])
    expect(mocks.apply).toHaveBeenCalledWith(preview.executionInput, 'human-admin')
  })

  it('carries the server-prepared fingerprint through the registry to the existing confirmation input', async () => {
    vi.stubEnv('NEXA_ACTION_RUNTIME_ENABLED', 'true')
    vi.stubEnv('CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED', 'true')
    const resolved = await resolveNexaActionProposal('apply_client_service_enablement', context, input)

    expect(resolved.kind).toBe('proposal')
    if (resolved.kind !== 'proposal') throw new Error('Expected a proposal')
    expect(resolved.proposal.execution.input).toMatchObject({ proposal: input, fingerprint: 'a'.repeat(64) })
    expect(resolved.proposal.preview).not.toHaveProperty('executionInput')
    expect(mocks.apply).not.toHaveBeenCalled()
  })

  it('cannot execute an unprepared request or propose unresolved configuration', async () => {
    await expect(applyClientServiceEnablementAction.execute(context, input)).rejects.toThrow()
    mocks.preview.mockResolvedValue({ canApply: false })
    await expect(applyClientServiceEnablementAction.buildPreview(context, input)).rejects.toThrow()
    expect(mocks.apply).not.toHaveBeenCalled()
  })

  it('does not offer a human approval action to an agent session', async () => {
    vi.stubEnv('NEXA_ACTION_RUNTIME_ENABLED', 'true')
    vi.stubEnv('CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED', 'true')
    expect(await resolveNexaActionProposal('apply_client_service_enablement', { ...context, authMode: 'agent' }, input)).toMatchObject({ kind: 'gap', gap: { reason: 'not_permitted' } })
    expect(mocks.preview).not.toHaveBeenCalled()
  })

  it('does not expose the new action when its write gate is off', async () => {
    vi.stubEnv('CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED', 'false')

    try {
      expect(await resolveNexaActionProposal('apply_client_service_enablement', context, input)).toMatchObject({ kind: 'gap', gap: { reason: 'runtime_disabled' } })
      expect(mocks.preview).not.toHaveBeenCalled()
    } finally { vi.unstubAllEnvs() }
  })
})
