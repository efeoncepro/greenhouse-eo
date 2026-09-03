import type { PoolClient } from 'pg'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
  clientQuery: vi.fn(),
  operatingEntity: vi.fn(),
  publish: vi.fn(),
  nextPublicId: vi.fn()
}))

vi.mock('@/lib/db', () => ({ query: mocks.query, withTransaction: mocks.transaction }))
vi.mock('@/lib/account-360/organization-identity', () => ({ getOperatingEntityIdentity: mocks.operatingEntity }))
vi.mock('@/lib/account-360/id-generation', () => ({
  generatePersonLegalEntityRelationshipId: () => 'new-employee',
  nextPublicId: mocks.nextPublicId
}))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: mocks.publish }))

import { syncOperatingEntityEmployeeLegalRelationshipForMember } from './person-legal-entity-relationships'

const client = { query: mocks.clientQuery } as unknown as PoolClient
const member = { identity_profile_id: 'person-1', role_title: 'Designer', active: true }

const employee = {
  relationship_id: 'employee-previous', role_label: 'Designer', status: 'active',
  space_id: 'space-1', effective_to: null
}

// Exercise the actual projection orchestration with database results, asserting
// actions and write/event boundaries. Live SQL semantics remain covered by the
// offboarding review-execute.live.test.ts suite; this is not a SQL-text guard.
const arrange = (existing: Record<string, unknown> | null, active = true) => {
  mocks.clientQuery
    .mockResolvedValueOnce({ rows: [{ ...member, active }] })
    .mockResolvedValueOnce({ rows: [{ space_id: 'space-1' }] })
    .mockResolvedValueOnce({ rows: existing ? [existing] : [] })
}

describe('operating entity employee projection preserves legal episodes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.operatingEntity.mockResolvedValue({ organizationId: 'org-1' })
    mocks.transaction.mockImplementation(async (fn: (c: PoolClient) => unknown) => fn(client))
    mocks.clientQuery.mockResolvedValue({ rows: [] })
    mocks.nextPublicId.mockResolvedValue('EO-PLR-9999')
  })

  it.each(['ended', 'inactive'])('never reopens a %s employee episode on member reactivation', async status => {
    arrange({ ...employee, status, effective_to: '2026-04-30' })

    await expect(syncOperatingEntityEmployeeLegalRelationshipForMember('member-1'))
      .resolves.toEqual({ action: 'noop', relationshipId: null })
    expect(mocks.clientQuery).toHaveBeenCalledTimes(3)
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('preserves a bounded episode even if its status is still active', async () => {
    arrange({ ...employee, effective_to: '2026-04-30' })

    await expect(syncOperatingEntityEmployeeLegalRelationshipForMember('member-1'))
      .resolves.toEqual({ action: 'noop', relationshipId: null })
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it.each(['contractor', 'executive'])('does not bootstrap employment over explicit %s history', async kind => {
    arrange(null)
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ relationship_id: `${kind}-episode` }] })

    await expect(syncOperatingEntityEmployeeLegalRelationshipForMember('member-1'))
      .resolves.toEqual({ action: 'skipped', relationshipId: null })
    expect(mocks.nextPublicId).not.toHaveBeenCalled()
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('still bootstraps a legacy member with no legal work history', async () => {
    arrange(null)
    mocks.clientQuery.mockResolvedValueOnce({ rows: [] })

    await expect(syncOperatingEntityEmployeeLegalRelationshipForMember('member-1'))
      .resolves.toEqual({ action: 'created', relationshipId: 'new-employee' })
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({
      aggregateId: 'new-employee',
      payload: expect.objectContaining({ relationshipType: 'employee' })
    }), client)
  })

  it('updates an open employee role without changing the legal episode', async () => {
    arrange({ ...employee, role_label: 'Previous role' })

    await expect(syncOperatingEntityEmployeeLegalRelationshipForMember('member-1', client))
      .resolves.toEqual({ action: 'updated', relationshipId: employee.relationship_id })
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.query).not.toHaveBeenCalled()
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({
      aggregateId: employee.relationship_id
    }), client)
  })

  it('does not restamp a closed employee episode when deactivated', async () => {
    arrange({ ...employee, status: 'ended', effective_to: '2026-04-30' }, false)

    await expect(syncOperatingEntityEmployeeLegalRelationshipForMember('member-1'))
      .resolves.toEqual({ action: 'noop', relationshipId: null })
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('keeps legacy deactivation of an open employee episode', async () => {
    arrange(employee, false)

    await expect(syncOperatingEntityEmployeeLegalRelationshipForMember('member-1'))
      .resolves.toEqual({ action: 'deactivated', relationshipId: employee.relationship_id })
    expect(mocks.publish).toHaveBeenCalledOnce()
  })

  it('propagates outbox failure to the enclosing transaction', async () => {
    arrange({ ...employee, role_label: 'Previous role' })
    mocks.publish.mockRejectedValue(new Error('outbox unavailable'))

    await expect(syncOperatingEntityEmployeeLegalRelationshipForMember('member-1', client))
      .rejects.toThrow('outbox unavailable')
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
