import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenantAccessRecord } from '@/lib/tenant/access'

import {
  __resetTeamsBotActionRegistry,
  dispatchTeamsBotAction,
  getTeamsBotAction,
  registerTeamsBotAction,
  type TeamsBotActionContext
} from '../action-registry'

const buildContext = (overrides: Partial<TenantAccessRecord> = {}): TeamsBotActionContext => ({
  tenantContext: {
    userId: 'user-1',
    clientId: 'client-1',
    clientName: 'Efeonce',
    tenantType: 'efeonce_internal',
    email: 'julio@efeonce.com',
    microsoftOid: 'aad-1',
    microsoftTenantId: 'tenant-a',
    microsoftEmail: 'julio@efeonce.com',
    googleSub: null,
    googleEmail: null,
    fullName: 'Julio Reyes',
    avatarUrl: null,
    roleCodes: ['efeonce_admin'],
    primaryRoleCode: 'efeonce_admin',
    routeGroups: ['internal', 'admin'],
    authorizedViews: [],
    projectScopes: [],
    campaignScopes: [],
    businessLines: [],
    serviceModules: [],
    projectIds: [],
    role: 'efeonce_admin',
    featureFlags: [],
    timezone: 'America/Santiago',
    portalHomePath: '/dashboard',
    authMode: 'sso',
    active: true,
    status: 'active',
    passwordHash: null,
    passwordHashAlgorithm: null,
    spaceId: null,
    organizationId: null,
    organizationName: null,
    memberId: 'mem-1',
    identityProfileId: 'ip-1',
    ...overrides
  } as TenantAccessRecord,
  aadObjectId: 'aad-1',
  memberId: 'mem-1',
  conversationId: 'conv-1',
  activityId: 'act-1'
})

beforeEach(() => {
  __resetTeamsBotActionRegistry()
})

afterEach(() => {
  __resetTeamsBotActionRegistry()
})

describe('action-registry', () => {
  it('rejects duplicate action registrations', () => {
    registerTeamsBotAction({
      actionId: 'duplicate.test',
      description: 'first',
      domain: 'platform',
      handler: async () => ({ ok: true })
    })

    expect(() =>
      registerTeamsBotAction({
        actionId: 'duplicate.test',
        description: 'second',
        domain: 'platform',
        handler: async () => ({ ok: true })
      })
    ).toThrow(/Duplicate teams bot action/)
  })

  it('returns invalid_data when actionId is unknown', async () => {
    const result = await dispatchTeamsBotAction('unknown.action', {}, buildContext())

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_data')
  })

  it('rejects when principal lacks required role', async () => {
    registerTeamsBotAction({
      actionId: 'finance.approve',
      description: 'approve',
      domain: 'finance',
      requiredRoleCodes: ['finance_manager'],
      handler: async () => ({ ok: true })
    })

    const ctx = buildContext({ roleCodes: ['client_executive'], routeGroups: ['client'] })
    const result = await dispatchTeamsBotAction('finance.approve', {}, ctx)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('missing_role')
  })

  it('rejects when principal lacks required route group', async () => {
    registerTeamsBotAction({
      actionId: 'ops.snooze',
      description: 'snooze',
      domain: 'ops',
      requiredRouteGroups: ['internal'],
      handler: async () => ({ ok: true })
    })

    const ctx = buildContext({ routeGroups: ['client'], roleCodes: ['client_executive'] })
    const result = await dispatchTeamsBotAction('ops.snooze', {}, ctx)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('missing_capability')
  })

  it('runs validateData and rejects malformed payload', async () => {
    registerTeamsBotAction<{ foo: string }>({
      actionId: 'sample.validate',
      description: 'validate',
      domain: 'platform',
      validateData: (data): data is { foo: string } =>
        Boolean(data && typeof data === 'object' && typeof (data as { foo?: unknown }).foo === 'string'),
      handler: async () => ({ ok: true })
    })

    const result = await dispatchTeamsBotAction('sample.validate', { foo: 42 }, buildContext())

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_data')
  })

  it('executes happy path and returns ok true', async () => {
    registerTeamsBotAction({
      actionId: 'happy.path',
      description: 'ok',
      domain: 'platform',
      handler: async () => ({ ok: true, message: 'done' })
    })

    const result = await dispatchTeamsBotAction('happy.path', {}, buildContext())

    expect(result).toEqual({ ok: true, message: 'done' })
  })

  it('captures handler exceptions as execution_failed', async () => {
    registerTeamsBotAction({
      actionId: 'crash.path',
      description: 'crash',
      domain: 'platform',
      handler: async () => {
        throw new Error('boom')
      }
    })

    const result = await dispatchTeamsBotAction('crash.path', {}, buildContext())

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.reason).toBe('execution_failed')
      expect(result.message).toBe('boom')
    }
  })

  it('exposes registered definitions via getter', () => {
    registerTeamsBotAction({
      actionId: 'lookup.test',
      description: 'lookup',
      domain: 'platform',
      handler: async () => ({ ok: true })
    })

    expect(getTeamsBotAction('lookup.test')?.description).toBe('lookup')
    expect(getTeamsBotAction('missing')).toBeNull()
  })
})

describe('action-registry — bundled handlers', () => {
  it('snooze handler validates window bounds', async () => {
    vi.resetModules()
    const registryModule = await import('../action-registry')

    registryModule.__resetTeamsBotActionRegistry()
    await import('../handlers/ops-alert-snooze')

    const handler = registryModule.getTeamsBotAction('ops.alert.snooze')

    expect(handler).not.toBeNull()
    expect(handler!.validateData!({ alertSignature: 'sig', hours: 24 })).toBe(true)
    expect(handler!.validateData!({ alertSignature: 'sig', hours: 0 })).toBe(false)
    expect(handler!.validateData!({ alertSignature: '', hours: 1 })).toBe(false)
    expect(handler!.validateData!({ alertSignature: 'sig', hours: 999 })).toBe(false)

    registryModule.__resetTeamsBotActionRegistry()
  })

  it('mark-read handler validates notificationId', async () => {
    vi.resetModules()
    const registryModule = await import('../action-registry')

    registryModule.__resetTeamsBotActionRegistry()
    await import('../handlers/notification-mark-read')

    const handler = registryModule.getTeamsBotAction('notification.mark_read')

    expect(handler).not.toBeNull()
    expect(handler!.validateData!({ notificationId: 'nf-1' })).toBe(true)
    expect(handler!.validateData!({ notificationId: '' })).toBe(false)

    registryModule.__resetTeamsBotActionRegistry()
  })
})
