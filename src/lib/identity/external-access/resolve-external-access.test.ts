import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

const captureMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

const { resolveExternalAccess } = await import('./resolve-external-access')

type Handler = (params: unknown[]) => unknown[]

const route = (handlers: Array<[RegExp, Handler]>) => {
  queryMock.mockImplementation((sql: string, params: unknown[] = []) => {
    const match = handlers.find(([pattern]) => pattern.test(sql))

    if (!match) throw new Error(`unexpected SQL: ${sql.slice(0, 80)}`)

    return Promise.resolve(match[1](params))
  })
}

const denialLogCalls = () =>
  queryMock.mock.calls.filter(call => String(call[0]).includes('INSERT INTO greenhouse_core.external_access_resolution_log'))

const activeEnvironment = { environment_id: 'efeonce-auth', issuer_class: 'external', status: 'active' }

describe('TASK-1631 — resolveExternalAccess (environment, subject)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('denies environment_inactive and records the denial with a hashed subject', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [{ ...activeEnvironment, status: 'suspended' }]],
      [/INSERT INTO greenhouse_core\.external_access_resolution_log/, () => []]
    ])

    const result = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'sub-1', clientId: 'https://client.example' })

    expect(result.outcome).toBe('environment_inactive')
    expect(result.memberships).toEqual([])

    const [call] = denialLogCalls()
    const params = call?.[1] as unknown[]

    expect(params[2]).toMatch(/^[0-9a-f]{64}$/)
    expect(params[2]).not.toBe('sub-1')
    expect(params[4]).toBe('environment_inactive')
    expect(params[3]).toBe('https://client.example')
  })

  it('denies unbound when no active source link resolves the subject', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [activeEnvironment]],
      [/FROM greenhouse_core\.identity_profile_source_links l/, params => {
        expect(params).toEqual(['external_idp:efeonce-auth', 'subject', 'sub-1'])

        return []
      }],
      [/INSERT INTO greenhouse_core\.external_access_resolution_log/, () => []]
    ])

    const result = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'sub-1' })

    expect(result.outcome).toBe('unbound')
    expect(result.profileId).toBeNull()
    expect(denialLogCalls()).toHaveLength(1)
  })

  // Unit tests exercise classification/precedence. The real EXISTS ownership predicate is
  // verified with PostgreSQL in internal-access/commands.live.test.ts.
  it.each([
    { link_active: true, profile_active: true },
    { link_active: false, profile_active: true },
    { link_active: true, profile_active: false }
  ])('denies internal_population for an enrollment-owned link (%j) without external authority lookup', async flags => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [activeEnvironment]],
      [/FROM greenhouse_core\.identity_profile_source_links l/, () => [{
        profile_id: 'p-internal', ...flags, profile_status: 'active',
        merged_into_profile_id: null, internal_population: true
      }]],
      [/INSERT INTO greenhouse_core\.external_access_resolution_log/, () => []]
    ])

    const result = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'internal-sub' })

    expect(result.outcome).toBe('internal_population')
    expect(result.profileId).toBe('p-internal')
    expect(result.memberships).toEqual([])
    expect(denialLogCalls()[0]?.[1]).toEqual([
      expect.any(String), 'efeonce-auth', expect.stringMatching(/^[0-9a-f]{64}$/),
      null, 'internal_population', null, 'p-internal', null
    ])
  })

  it('does not hide an internal link when detecting an active source-link collision', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [activeEnvironment]],
      [/FROM greenhouse_core\.identity_profile_source_links l/, () => [false, true].map(internal_population => ({
        profile_id: internal_population ? 'p-internal' : 'p-external', link_active: true,
        profile_active: true, profile_status: 'active', merged_into_profile_id: null, internal_population
      }))],
      [/INSERT INTO greenhouse_core\.external_access_resolution_log/, () => []]
    ])

    const result = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'collision-sub' })

    expect(result.outcome).toBe('unbound')
    expect(result.profileId).toBeNull()
    expect(result.memberships).toEqual([])
  })

  it('denies revoked (not unbound) when the only link is inactive and the person had a revoked membership', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [activeEnvironment]],
      [/FROM greenhouse_core\.identity_profile_source_links l/, () => [
        { profile_id: 'p-1', link_active: false, profile_active: true, profile_status: 'active', merged_into_profile_id: null }
      ]],
      [/i\.status = 'revoked'[\s\S]*LIMIT 1/, params => {
        expect(params).toEqual(['p-1', 'efeonce-auth'])

        return [{ binding_id: 'xob-1', grants_version: 4 }]
      }],
      [/INSERT INTO greenhouse_core\.external_access_resolution_log/, () => []]
    ])

    const result = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'sub-1' })

    expect(result.outcome).toBe('revoked')
    expect(result.profileId).toBe('p-1')
    expect(result.memberships).toEqual([])

    const params = denialLogCalls()[0]?.[1] as unknown[]

    expect(params[4]).toBe('revoked')
    expect(params[5]).toBe('xob-1')
  })

  it('denies unbound when the only link is inactive and there was never a linked membership', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [activeEnvironment]],
      [/FROM greenhouse_core\.identity_profile_source_links l/, () => [
        { profile_id: 'p-1', link_active: false, profile_active: true, profile_status: 'active', merged_into_profile_id: null }
      ]],
      [/i\.status = 'revoked'[\s\S]*LIMIT 1/, () => []],
      [/INSERT INTO greenhouse_core\.external_access_resolution_log/, () => []]
    ])

    const result = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'sub-1' })

    expect(result.outcome).toBe('unbound')
    expect(result.profileId).toBeNull()
  })

  it('denies profile_inactive for a merged profile even with an active link', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [activeEnvironment]],
      [/FROM greenhouse_core\.identity_profile_source_links l/, () => [
        { profile_id: 'p-1', link_active: true, profile_active: true, profile_status: 'active', merged_into_profile_id: 'p-2' }
      ]],
      [/INSERT INTO greenhouse_core\.external_access_resolution_log/, () => []]
    ])

    const result = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'sub-1' })

    expect(result.outcome).toBe('profile_inactive')
    expect(result.profileId).toBe('p-1')
  })

  it('denies revoked when the only linked membership hangs from a revoked binding', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [activeEnvironment]],
      [/FROM greenhouse_core\.identity_profile_source_links l/, () => [
        { profile_id: 'p-1', link_active: true, profile_active: true, profile_status: 'active', merged_into_profile_id: null }
      ]],
      [/FROM greenhouse_core\.external_member_invitations i/, () => [
        {
          binding_id: 'xob-1',
          organization_id: 'org-1',
          external_organization_ref: 'ext-1',
          binding_status: 'revoked',
          grants_version: 4,
          designated_admin_profile_id: null,
          revoked_at: '2026-09-04T10:00:00Z'
        }
      ]],
      [/INSERT INTO greenhouse_core\.external_access_resolution_log/, () => []]
    ])

    const result = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'sub-1' })

    expect(result.outcome).toBe('revoked')
    expect(result.memberships).toEqual([])

    const params = denialLogCalls()[0]?.[1] as unknown[]

    expect(params[5]).toBe('xob-1')
    expect(params[7]).toBe(4)
  })

  it('returns bound with per-binding grants (binding-wide ∪ per-person) and never writes the log', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [activeEnvironment]],
      [/FROM greenhouse_core\.identity_profile_source_links l/, () => [
        { profile_id: 'p-1', link_active: true, profile_active: true, profile_status: 'active', merged_into_profile_id: null }
      ]],
      [/FROM greenhouse_core\.external_member_invitations i/, () => [
        {
          binding_id: 'xob-1',
          organization_id: 'org-1',
          external_organization_ref: 'ext-1',
          binding_status: 'active',
          grants_version: 3,
          designated_admin_profile_id: 'p-1',
          revoked_at: null
        },
        {
          binding_id: 'xob-old',
          organization_id: 'org-1',
          external_organization_ref: 'ext-old',
          binding_status: 'revoked',
          grants_version: 9,
          designated_admin_profile_id: null,
          revoked_at: '2026-09-01T00:00:00Z'
        }
      ]],
      [/FROM greenhouse_core\.external_capability_grants/, params => {
        expect(params).toEqual([['xob-1'], 'p-1'])

        return [
          { binding_id: 'xob-1', capability: 'globe.producer.fleet.read' },
          { binding_id: 'xob-1', capability: 'globe.producer.fleet.read' },
          { binding_id: 'xob-1', capability: 'growth.ai_visibility.prompt_set.manage' }
        ]
      }]
    ])

    const result = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'sub-1' })

    expect(result.outcome).toBe('bound')
    expect(result.issuerClass).toBe('external')
    expect(result.memberships).toEqual([
      {
        bindingId: 'xob-1',
        organizationId: 'org-1',
        externalOrganizationRef: 'ext-1',
        grantsVersion: 3,
        grants: ['globe.producer.fleet.read', 'growth.ai_visibility.prompt_set.manage'],
        designatedAdmin: true
      }
    ])
    expect(denialLogCalls()).toHaveLength(0)
  })

  it('keeps the denial when the resolution log insert fails (never becomes allow or throws)', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => []],
      [/INSERT INTO greenhouse_core\.external_access_resolution_log/, () => {
        throw new Error('log unavailable')
      }]
    ])

    const result = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'sub-1' })

    expect(result.outcome).toBe('environment_inactive')
    expect(captureMock).toHaveBeenCalledWith(expect.any(Error), 'identity', expect.anything())
  })

  it('rejects an invalid environment id before touching the database', async () => {
    await expect(resolveExternalAccess({ environmentId: 'Bad Env', subject: 'sub-1' })).rejects.toMatchObject({
      code: 'invalid_request'
    })
    expect(queryMock).not.toHaveBeenCalled()
  })
})
