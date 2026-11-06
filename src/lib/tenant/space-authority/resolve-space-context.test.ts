import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ query: vi.fn() }))

import { listAuthorizedSpaces, resolveSpaceContext, revalidateSpaceContext } from './resolve-space-context'

type Fixture = {
  principal?: Record<string, unknown> | null
  grants?: Record<string, unknown>[]
  governed?: string[]
  clientSpaces?: Record<string, unknown>[]
  services?: string[]
}

const space = (spaceId: string, organizationId = 'org-sky') =>
  ({ space_id: spaceId, space_public_id: null, organization_id: organizationId, organization_name: 'SKY' })

const grant = (spaceId: string, verbs = ['read', 'create'], version = 1) =>
  ({ ...space(spaceId), grant_id: `grant-${spaceId}`, version, verbs })

const fakeQuery = (fx: Fixture) => (async (sql: string) => {
  if (sql.includes('FROM greenhouse_core.client_users')) {
    return fx.principal === null ? [] : [{ user_id: 'u1', active: true, status: 'active', tenant_type: 'client',
      identity_profile_id: 'p1', client_id: 'client-owner', ...fx.principal }]
  }

  if (sql.includes('SELECT DISTINCT organization_id')) return (fx.governed ?? []).map(organization_id => ({ organization_id }))
  if (sql.includes('FROM greenhouse_core.space_access_grants g')) return fx.grants ?? []
  if (sql.includes('FROM greenhouse_core.services')) return (fx.services ?? []).map(service_id => ({ service_id }))
  if (sql.includes('FROM greenhouse_core.spaces s')) return fx.clientSpaces ?? []

  throw new Error(`unexpected SQL: ${sql}`)
}) as never

const opts = (fx: Fixture) => ({ readQuery: fakeQuery(fx) })

describe('TASK-2096 — Space authority resolver policy', () => {
  it('a single-Space client without grants keeps today\'s behaviour (implicit, every verb)', async () => {
    const fx = { clientSpaces: [space('space-design')] }

    expect(await resolveSpaceContext({ userId: 'u1', need: 'create' }, opts(fx))).toMatchObject({
      status: 'authorized', context: { spaceId: 'space-design', source: 'single_space_client', grantVersion: 0 }
    })
  })

  it('a multi-Space client without grants confers nothing: no default department', async () => {
    const fx = { clientSpaces: [space('space-design'), space('space-seo')] }

    expect(await resolveSpaceContext({ userId: 'u1', need: 'read' }, opts(fx))).toEqual({ status: 'denied', reason: 'grant_required' })
    expect(await listAuthorizedSpaces('u1', 'read', opts(fx))).toEqual([])
  })

  it('once a person has a grant in the Organization, only grants count there', async () => {
    const fx = { clientSpaces: [space('space-design')], governed: ['org-sky'], grants: [] }

    expect(await resolveSpaceContext({ userId: 'u1', need: 'read' }, opts(fx))).toEqual({ status: 'denied', reason: 'grant_required' })
  })

  it('two authorized Spaces without an explicit target require selection; a target selects', async () => {
    const fx = { governed: ['org-sky'], grants: [grant('space-seo', ['read']), grant('space-design')] }

    const pending = await resolveSpaceContext({ userId: 'u1', need: 'read' }, opts(fx))

    expect(pending.status).toBe('selection_required')
    expect(pending.status === 'selection_required' && pending.candidates.map(c => c.spaceId)).toEqual(['space-design', 'space-seo'])
    expect(await resolveSpaceContext({ userId: 'u1', need: 'read', spaceId: 'space-seo' }, opts(fx))).toMatchObject({
      status: 'authorized', context: { spaceId: 'space-seo', source: 'explicit_grant', grantId: 'grant-space-seo' }
    })
  })

  it('a foreign Space is denied, never widened; an Organization mismatch is told apart', async () => {
    const fx = { governed: ['org-sky'], grants: [grant('space-design')] }

    expect(await resolveSpaceContext({ userId: 'u1', need: 'read', spaceId: 'space-other' }, opts(fx)))
      .toEqual({ status: 'denied', reason: 'space_not_allowed' })
    expect(await resolveSpaceContext({ userId: 'u1', need: 'read', spaceId: 'space-design', organizationId: 'org-other' }, opts(fx)))
      .toEqual({ status: 'denied', reason: 'organization_mismatch' })
  })

  it('a Service must belong to the selected Space', async () => {
    const base = { governed: ['org-sky'], grants: [grant('space-design')] }

    expect(await resolveSpaceContext({ userId: 'u1', need: 'read', spaceId: 'space-design', serviceId: 'service-seo' }, opts(base)))
      .toEqual({ status: 'denied', reason: 'service_not_in_space' })
    expect(await resolveSpaceContext({ userId: 'u1', need: 'read', spaceId: 'space-design', serviceId: 'service-design' },
      opts({ ...base, services: ['service-design'] }))).toMatchObject({ status: 'authorized', context: { serviceId: 'service-design' } })
  })

  it.each([
    [null, 'principal_not_found'],
    [{ active: false }, 'principal_inactive'],
    [{ status: 'disabled' }, 'principal_inactive'],
    [{ tenant_type: 'efeonce_internal' }, 'tenant_type_unsupported'],
    [{ identity_profile_id: null }, 'identity_profile_missing']
  ])('principal %o is denied as %s, read fresh on every call', async (principal, reason) => {
    expect(await resolveSpaceContext({ userId: 'u1', need: 'read' }, opts({ principal, clientSpaces: [space('space-design')] })))
      .toEqual({ status: 'denied', reason })
  })

  it('revalidation fails when the grant version moved, or when another user presents the context', async () => {
    const fx = { governed: ['org-sky'], grants: [grant('space-seo')] }
    const selected = await resolveSpaceContext({ userId: 'u1', need: 'read', spaceId: 'space-seo' }, opts(fx))

    if (selected.status !== 'authorized') throw new Error('expected authorized')
    expect(await revalidateSpaceContext('u1', selected.context, opts(fx))).toEqual(selected)
    expect(await revalidateSpaceContext('u1', selected.context, opts({ ...fx, grants: [grant('space-seo', ['read'], 3)] })))
      .toEqual({ status: 'denied', reason: 'context_stale' })
    expect(await revalidateSpaceContext('u2', selected.context, opts(fx))).toEqual({ status: 'denied', reason: 'space_not_allowed' })
  })
})
