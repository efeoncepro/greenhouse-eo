import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { resolveXrayAuthority } from './authz'
import { redactSensitive } from '@/lib/observability/redact'
import { scrubSentryServerEvent } from '@/lib/observability/sentry-server-event-scrub'

const mocks = vi.hoisted(() => ({
  rows: [] as { organization_id: string }[],
  predicates: [] as unknown[][],
  calls: 0,
  identity: vi.fn()
}))

vi.mock('@/lib/tenant/access', () => ({ getTenantAccessRecordFromPostgresByUserId: mocks.identity }))

vi.mock('@/lib/db', () => ({
  getDb: async () => {
    mocks.calls++

    const query = {
      select: () => query,
      where: (...args: unknown[]) => {
        mocks.predicates.push(args)

        return query
      },
      limit: () => query,
      execute: async () => mocks.rows
    }

    return { selectFrom: () => query }
  }
}))

const context = (role = 'efeonce_account'): AppPlatformRequestContext => ({
  requestId: 'test',
  routeKey: 'test',
  version: '1',
  authSource: 'cookie_session',
  appSessionId: null,
  oauthCapabilities: [],
  oauthWorkspaceBindings: [],
  rateLimit: { limitPerMinute: 120, limitPerHour: 5000 },
  tenant: {
    userId: 'operator',
    clientId: 'internal',
    clientName: 'Efeonce',
    tenantType: 'efeonce_internal',
    roleCodes: [role],
    primaryRoleCode: role,
    role,
    routeGroups: ['commercial'],
    authorizedViews: [],
    projectScopes: [],
    campaignScopes: [],
    businessLines: [],
    serviceModules: [],
    projectIds: [],
    featureFlags: [],
    timezone: 'America/Santiago',
    portalHomePath: '/home',
    authMode: 'credentials',
    preferredLocale: null,
    tenantDefaultLocale: null,
    legacyLocale: null,
    effectiveLocale: 'es-CL'
  }
})

describe('X-Ray owner authority', () => {
  beforeEach(() => {
    mocks.rows = [{ organization_id: 'owner' }]
    mocks.predicates = []
    mocks.calls = 0
    mocks.identity.mockResolvedValue({ ...context().tenant, active: true, status: 'active' })
  })

  it('resolves an active internal owner, never the prospect', async () => {
    expect(await resolveXrayAuthority(context(), 'issue')).toEqual({ organizationId: 'owner', actorUserId: 'operator' })
    expect(mocks.predicates).toContainEqual(['is_operating_entity', '=', true])
    expect(mocks.predicates).toContainEqual(['status', '=', 'active'])
  })

  it('constrains a session owner and fails closed on absent or ambiguous ownership', async () => {
    const actor = context()

    actor.tenant.organizationId = 'session-owner'
    await resolveXrayAuthority(actor, 'read')
    expect(mocks.predicates).toContainEqual(['organization_id', '=', 'session-owner'])
    mocks.rows = []
    await expect(resolveXrayAuthority(actor, 'read')).rejects.toMatchObject({ statusCode: 403 })
    mocks.rows = [{ organization_id: 'one' }, { organization_id: 'two' }]
    await expect(resolveXrayAuthority(context(), 'read')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('denies client, removed operator role and delegated OAuth before touching data', async () => {
    const client = context('efeonce_admin')

    client.tenant.tenantType = 'client'
    const delegated = context('efeonce_admin')

    delegated.authSource = 'sister_platform_oauth'
    delegated.oauthCapabilities = ['*']

    for (const actor of [client, context('collaborator'), delegated]) {
      await expect(resolveXrayAuthority(actor, 'share_create')).rejects.toMatchObject({ statusCode: 403 })
    }

    expect(mocks.calls).toBe(0)
  })

  it('denies a revoked current role even when an old session still claims Account', async () => {
    mocks.identity.mockResolvedValue({ ...context('collaborator').tenant, active: true, status: 'active' })
    await expect(resolveXrayAuthority(context(), 'issue')).rejects.toMatchObject({ statusCode: 403 })
    mocks.identity.mockResolvedValue({ ...context().tenant, active: false, status: 'active' })
    await expect(resolveXrayAuthority(context(), 'issue')).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.calls).toBe(0)
  })

  it('scrubs bearer URLs and loose tokens from telemetry including malformed paths', () => {
    const token = `xrg_${'a'.repeat(43)}`

    const event = scrubSentryServerEvent({
      request: { url: `https://host/api/public/growth/aeo-xray/shared/${token}` },
      transaction: `GET /aeo-xray/r/${token}`,
      breadcrumbs: [{ message: token }]
    })

    expect(JSON.stringify(event)).not.toContain(token)
    expect(redactSensitive('/aeo-xray/shared/not-even-valid')).toBe('/aeo-xray/shared/[redacted]')
  })
})
