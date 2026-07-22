import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ query: vi.fn() }))

const { resolveGlobeOAuthWorkspaceBindings } = await import('./oauth-workspace-bindings')

const tenant = {
  userId: 'user-1',
  tenantType: 'efeonce_internal',
  clientId: 'efeonce',
  clientName: 'Efeonce · Marca',
  organizationId: 'org-efeonce',
  spaceId: 'space-efeonce'
} as never

const row = (overrides: Record<string, unknown> = {}) => ({
  external_scope_id: 'greenhouse-org:efeonce',
  external_display_name: 'Efeonce · Marca',
  greenhouse_scope_type: 'internal',
  organization_name: null,
  client_name: null,
  space_name: null,
  binding_role: 'primary',
  binding_status: 'active',
  current_scope: true,
  authorized: true,
  ...overrides
})

describe('Globe OAuth workspace bindings projection', () => {
  const query = vi.fn()

  beforeEach(() => query.mockReset())

  it('returns only active related bindings and chooses exactly one deterministic primary', async () => {
    query.mockResolvedValue([
      row(),
      row({
        external_scope_id: 'globe-workspace:norte',
        external_display_name: 'Cliente · Norte',
        greenhouse_scope_type: 'client',
        binding_role: 'secondary',
        current_scope: false
      }),
      row({
        external_scope_id: 'globe-workspace:unrelated',
        external_display_name: 'No autorizado',
        greenhouse_scope_type: 'client',
        current_scope: false,
        authorized: false
      }),
      row({
        external_scope_id: 'globe-workspace:suspended',
        binding_status: 'suspended',
        current_scope: false
      })
    ])

    const result = await resolveGlobeOAuthWorkspaceBindings(tenant, query)

    expect(result).toEqual([
      { workspaceId: 'greenhouse-org:efeonce', displayName: 'Efeonce · Marca', kind: 'internal', isPrimary: true },
      { workspaceId: 'globe-workspace:norte', displayName: 'Cliente · Norte', kind: 'client', isPrimary: false }
    ])
    expect(result.filter(binding => binding.isPrimary)).toHaveLength(1)
    expect(String(query.mock.calls[0]?.[0])).toContain("b.sister_platform_key = 'globe'")
    expect(String(query.mock.calls[0]?.[0])).toContain('subject_assignments')
  })

  it('does not resurrect a suspended explicit current binding through the legacy fallback', async () => {
    query.mockResolvedValue([row({ binding_status: 'suspended', authorized: false })])

    await expect(resolveGlobeOAuthWorkspaceBindings(tenant, query)).resolves.toEqual([])
  })

  it('removes a binding on the next broker resolution after revocation', async () => {
    query
      .mockResolvedValueOnce([row()])
      .mockResolvedValueOnce([row({ binding_status: 'suspended', authorized: false })])

    const before = await resolveGlobeOAuthWorkspaceBindings(tenant, query)
    const after = await resolveGlobeOAuthWorkspaceBindings(tenant, query)

    expect(before.map(binding => binding.workspaceId)).toEqual(['greenhouse-org:efeonce'])
    expect(after).toEqual([])
  })

  it('keeps the existing single-tenant identity compatible when no explicit Globe binding exists', async () => {
    query.mockResolvedValue([])

    await expect(resolveGlobeOAuthWorkspaceBindings(tenant, query)).resolves.toEqual([
      { workspaceId: 'greenhouse-org:efeonce', displayName: 'Efeonce · Marca', kind: 'internal', isPrimary: true }
    ])
  })

  it('drops malformed external ids and never exposes binding metadata or subject data', async () => {
    query.mockResolvedValue([
      row({ external_scope_id: 'bad id with spaces', current_scope: false }),
      row({
        external_scope_id: 'globe-workspace:safe',
        external_display_name: '  Cliente    seguro  ',
        current_scope: false
      })
    ])

    const result = await resolveGlobeOAuthWorkspaceBindings(tenant, query)

    expect(result).toEqual([
      { workspaceId: 'greenhouse-org:efeonce', displayName: 'Efeonce · Marca', kind: 'internal', isPrimary: true },
      { workspaceId: 'globe-workspace:safe', displayName: 'Cliente seguro', kind: 'internal', isPrimary: false }
    ])
    expect(JSON.stringify(result)).not.toMatch(/bindingId|role|user-1|org-efeonce|space-efeonce/)
  })
})
