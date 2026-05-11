import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  withTransaction: vi.fn(),
  publishOutboxEvent: vi.fn(),
  clearCache: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  withTransaction: mocks.withTransaction
}))

vi.mock('@/lib/capabilities-registry/parity', () => ({
  __clearCapabilitiesRegistryCache: mocks.clearCache
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: mocks.publishOutboxEvent
}))

import {
  CapabilityDeprecationError,
  markCapabilityDeprecated
} from './deprecate'

const buildClient = (rowsByCall: unknown[][]) => {
  let callIndex = 0

  return {
    query: vi.fn(async () => {
      const rows = rowsByCall[callIndex] ?? []

      callIndex += 1

      return { rows, rowCount: rows.length }
    })
  }
}

describe('TASK-840 — markCapabilityDeprecated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.publishOutboxEvent.mockResolvedValue('outbox-1')
  })

  it('marks a stale capability deprecated with audit and outbox in one transaction', async () => {
    const client = buildClient([
      [{ capability_key: 'legacy.old_capability', deprecated_at: null }],
      [{ role_defaults_count: 0, user_overrides_count: 0 }],
      [{ deprecated_at: '2026-05-11T12:00:00.000Z' }],
      [{ audit_id: 'EAL-1', created_at: '2026-05-11T12:00:01.000Z' }]
    ])

    mocks.withTransaction.mockImplementation(async callback => callback(client))

    const result = await markCapabilityDeprecated({
      capabilityKey: 'legacy.old_capability',
      reason: 'Removed from the TS catalog after migration.',
      actorUserId: 'user-1',
      spaceId: 'space-1'
    })

    expect(result).toEqual({
      capabilityKey: 'legacy.old_capability',
      deprecatedAt: '2026-05-11T12:00:00.000Z',
      auditId: 'EAL-1',
      outboxEventId: 'outbox-1',
      alreadyDeprecated: false
    })
    expect(client.query).toHaveBeenCalledTimes(4)
    expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'entitlement_governance',
        aggregateId: 'space-1:capability:legacy.old_capability',
        eventType: 'access.capability.deprecated',
        payload: expect.objectContaining({
          schemaVersion: 1,
          capabilityKey: 'legacy.old_capability',
          actorUserId: 'user-1',
          auditId: 'EAL-1'
        })
      }),
      client
    )
    expect(mocks.clearCache).toHaveBeenCalledOnce()
  })

  it('rejects a capability that does not exist in the registry', async () => {
    const client = buildClient([[]])

    mocks.withTransaction.mockImplementation(async callback => callback(client))

    await expect(
      markCapabilityDeprecated({
        capabilityKey: 'legacy.missing',
        reason: 'Missing registry row during cleanup.',
        actorUserId: 'user-1'
      })
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
    expect(mocks.clearCache).not.toHaveBeenCalled()
  })

  it('rejects a capability with active grants', async () => {
    const client = buildClient([
      [{ capability_key: 'legacy.with_grants', deprecated_at: null }],
      [{ role_defaults_count: 2, user_overrides_count: 1 }]
    ])

    mocks.withTransaction.mockImplementation(async callback => callback(client))

    await expect(
      markCapabilityDeprecated({
        capabilityKey: 'legacy.with_grants',
        reason: 'Removed from catalog but still referenced.',
        actorUserId: 'user-1'
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      details: {
        activeGrantCount: 3,
        roleDefaultsCount: 2,
        userOverridesCount: 1
      }
    })
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
    expect(mocks.clearCache).not.toHaveBeenCalled()
  })

  it('rejects capabilities still declared by the TS catalog', async () => {
    await expect(
      markCapabilityDeprecated({
        capabilityKey: 'access.governance.audit_log.read',
        reason: 'Operator attempted to deprecate active catalog key.',
        actorUserId: 'user-1'
      })
    ).rejects.toBeInstanceOf(CapabilityDeprecationError)
    expect(mocks.withTransaction).not.toHaveBeenCalled()
  })
})
