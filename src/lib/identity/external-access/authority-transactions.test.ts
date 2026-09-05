import type { PoolClient } from 'pg'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const events = vi.hoisted(() => vi.fn())

vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: events }))
import {
  insertAuthorityGrant,
  protectInternalSourceLinks,
  revokeAuthorityGrant,
  recordInternalMembership
} from './authority-transactions'

const authority = {
  bindingId: 'binding',
  environmentId: 'efeonce-auth',
  organizationId: 'own-org',
  population: 'internal' as const
}

const grant = {
  ...authority,
  grantId: 'grant',
  profileId: 'person',
  capability: 'growth.seo.observation.read',
  actorId: 'operator',
  reason: 'Governed test delegation',
  expiresAt: new Date(Date.now() + 600000)
}

function fixture({
  population = 'internal',
  member = true,
  changes = 1,
  environmentStatus = 'active',
  bindingActive = true
}: {
  population?: string
  member?: boolean
  changes?: number
  environmentStatus?: string
  bindingActive?: boolean
} = {}) {
  let version = 4
  const writes: unknown[][] = []

  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (sql.includes('SELECT status FROM')) return { rows: [{ status: environmentStatus }] }
    if (sql.includes('SELECT binding_id FROM'))
      return {
        rows: values[3] === population && (bindingActive || values[4] === true) ? [{ binding_id: 'binding' }] : []
      }
    if (sql.includes(' AS membership_id')) return { rows: member ? [{ membership_id: 'member' }] : [] }
    if (sql.startsWith('SELECT enrollment_id')) return { rows: member ? [{ enrollment_id: 'enrollment' }] : [] }
    if (sql.includes('RETURNING grants_version')) return { rows: [{ grants_version: ++version }] }
    writes.push([sql, values])
    
return { rows: [], rowCount: changes }
  })

  
return { client: { query } as unknown as PoolClient, query, writes, getVersion: () => version }
}

beforeEach(() => events.mockClear())
describe('authority populations under the canonical transaction', () => {
  it('does not grant through a caller-declared internal population on an external binding', async () => {
    const f = fixture({ population: 'external' })

    await expect(insertAuthorityGrant(f.client, grant)).rejects.toMatchObject({ code: 'binding_not_active' })
    expect(f.writes).toEqual([])
    expect(events).not.toHaveBeenCalled()
    expect(f.getVersion()).toBe(4)
  })
  it('requires internal enrollment; a profile alone cannot receive delegated authority', async () => {
    const f = fixture({ member: false })

    await expect(insertAuthorityGrant(f.client, grant)).rejects.toMatchObject({ code: 'invalid_request' })
    expect(f.writes).toEqual([])
    expect(events).not.toHaveBeenCalled()
  })
  it('rejects binding-wide internal defaults', async () => {
    const f = fixture()

    await expect(insertAuthorityGrant(f.client, { ...grant, profileId: null })).rejects.toMatchObject({
      code: 'invalid_request'
    })
    expect(f.writes).toEqual([])
  })
  it('grants with shared audit/event and advances the same binding version', async () => {
    const f = fixture()

    await expect(insertAuthorityGrant(f.client, grant)).resolves.toBe(5)
    expect(f.writes).toHaveLength(2)
    expect(events).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'identity.external_grant.granted',
        aggregateId: 'binding',
        payload: expect.objectContaining({ population: 'internal', profileId: 'person', grantsVersion: 5 })
      }),
      f.client
    )
  })
  it('zero-row revocation produces neither audit/event nor version change', async () => {
    const f = fixture({ changes: 0 })

    await expect(revokeAuthorityGrant(f.client, grant)).rejects.toMatchObject({ code: 'conflict' })
    expect(f.writes).toHaveLength(1)
    expect(events).not.toHaveBeenCalled()
    expect(f.getVersion()).toBe(4)
  })
  it('external recovery refuses an active corporate enrollment before touching its source link', async () => {
    const f = fixture()

    await expect(protectInternalSourceLinks(f.client, 'efeonce-auth', 'person')).rejects.toMatchObject({
      code: 'conflict'
    })
    expect(f.writes).toEqual([])
  })
  it('enrollment on a reused internal binding still has its own shared membership event', async () => {
    const f = fixture()

    await recordInternalMembership(f.client, {
      ...authority,
      enrollmentId: 'new-enrollment',
      profileId: 'second-person',
      actorId: 'operator',
      reason: 'Explicit enrollment'
    })
    expect(events).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'identity.internal_authority.member_enrolled',
        payload: expect.objectContaining({ enrollmentId: 'new-enrollment', grantsVersion: 5 })
      }),
      f.client
    )
    expect(f.writes).toHaveLength(1)
  })
})

it('permits authority reduction after environment and binding are inactive, but never increases it', async () => {
  const f = fixture({ environmentStatus: 'suspended', bindingActive: false })

  await expect(insertAuthorityGrant(f.client, grant)).rejects.toMatchObject({ code: 'environment_not_active' })
  expect(f.writes).toEqual([])
  await revokeAuthorityGrant(f.client, grant)
  expect(f.getVersion()).toBe(5)
  expect(events).toHaveBeenCalledWith(
    expect.objectContaining({ eventType: 'identity.external_access.revoked' }),
    f.client
  )
})
