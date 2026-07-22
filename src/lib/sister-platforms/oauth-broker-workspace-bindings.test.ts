import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: vi.fn() }))
vi.mock('@/lib/tenant/access', () => ({ getTenantAccessRecordByUserId: vi.fn() }))

const resolveGlobeOAuthWorkspaceBindings = vi.fn()

vi.mock('./oauth-workspace-bindings', () => ({
  resolveGlobeOAuthWorkspaceBindings
}))

const { buildBrokerSisterPlatformOAuthIdentityPayload, buildSisterPlatformOAuthIdentityPayload } = await import(
  './oauth-broker'
)

const tenant = {
  userId: 'user-1',
  clientId: 'efeonce',
  clientName: 'Efeonce',
  tenantType: 'efeonce_internal',
  email: 'operator@example.test',
  fullName: 'Operator',
  identityProfileId: 'identity-1',
  roleCodes: ['efeonce_admin']
} as never

const client = {
  sisterPlatformKey: 'globe',
  policy: {
    claims: { includeGreenhouseRoles: false },
    capabilityScopes: ['globe.studio.access']
  }
} as never

const expiresAt = '2026-07-22T20:00:00.000Z'

describe('Globe OAuth workspace identity projection', () => {
  beforeEach(() => resolveGlobeOAuthWorkspaceBindings.mockReset())

  it('adds the safe workspace projection without changing the legacy organization claim', () => {
    const workspaceBindings = [
      {
        workspaceId: 'greenhouse-org:efeonce',
        displayName: 'Efeonce',
        kind: 'internal',
        isPrimary: true
      }
    ] as const

    const identity = buildSisterPlatformOAuthIdentityPayload({
      tenant,
      client,
      requestedScopes: ['openid', 'globe.studio.access'],
      expiresAt,
      workspaceBindings
    })

    expect(identity.organization).toEqual({
      clientId: 'efeonce',
      clientName: 'Efeonce',
      tenantType: 'efeonce_internal'
    })
    expect(identity.workspaceBindings).toEqual(workspaceBindings)
    expect(identity.capabilities).toEqual(['globe.studio.access'])
  })

  it('re-resolves bindings on every identity build so revocation is reflected in userinfo', async () => {
    resolveGlobeOAuthWorkspaceBindings
      .mockResolvedValueOnce([
        {
          workspaceId: 'globe-workspace:norte',
          displayName: 'Norte',
          kind: 'client',
          isPrimary: true
        }
      ])
      .mockResolvedValueOnce([])

    const input = {
      tenant,
      client,
      requestedScopes: ['openid', 'globe.studio.access'],
      expiresAt
    }

    const beforeRevocation = await buildBrokerSisterPlatformOAuthIdentityPayload(input)
    const afterRevocation = await buildBrokerSisterPlatformOAuthIdentityPayload(input)

    expect(beforeRevocation.workspaceBindings?.map(binding => binding.workspaceId)).toEqual(['globe-workspace:norte'])
    expect(afterRevocation.workspaceBindings).toEqual([])
    expect(resolveGlobeOAuthWorkspaceBindings).toHaveBeenCalledTimes(2)
  })

  it('does not query or expose workspace bindings for another sister platform', async () => {
    const identity = await buildBrokerSisterPlatformOAuthIdentityPayload({
      tenant,
      client: {
        sisterPlatformKey: 'kortex',
        policy: {
          claims: { includeGreenhouseRoles: false },
          capabilityScopes: []
        }
      } as never,
      requestedScopes: ['openid'],
      expiresAt
    })

    expect(identity).not.toHaveProperty('workspaceBindings')
    expect(resolveGlobeOAuthWorkspaceBindings).not.toHaveBeenCalled()
  })
})
