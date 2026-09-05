import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ query: vi.fn(), tx: vi.fn(), event: vi.fn() }))

vi.mock('@/lib/db', () => ({ withTransaction: state.tx }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: state.event }))
import { reconcileInternalAuthority } from './reconcile'

const input = { bindingId: 'binding', actorId: 'operator', reason: 'Current reconciliation of reviewed pilot' }
const deps = { authorize: async () => true }
const expiry = new Date('2030-01-01T00:00:00.000Z')
const capability = 'growth.seo.observation.read'

function fixture({
  previous = [],
  wrongProfile = false,
  proofCapability = capability,
  proofExpiry = expiry.toISOString(),
  grantExpiry = expiry,
  laterCapability
}: {
  previous?: Record<string, unknown>[]
  wrongProfile?: boolean
  proofCapability?: string
  proofExpiry?: string | null
  grantExpiry?: Date | null
  laterCapability?: string
} = {}) {
  let audits: unknown[][] = []
  let committed: unknown[][] = []

  const original = [
    { audit_id: 'original-enroll', event_type: 'enrolled', enrollment_id: 'enrollment', metadata_json: {} },
    {
      audit_id: 'original-grant',
      event_type: 'capability_granted',
      enrollment_id: wrongProfile ? 'another-enrollment' : 'enrollment',
      metadata_json: { grantId: 'grant', capability: proofCapability, expiresAt: proofExpiry }
    }
  ]

  if (laterCapability)
    original.push({
      audit_id: 'later-grant',
      event_type: 'capability_granted',
      enrollment_id: 'enrollment',
      metadata_json: { grantId: 'grant', capability: laterCapability, expiresAt: expiry.toISOString() }
    })

  const results = [
    { environment_id: 'efeonce-auth' },
    {},
    {
      binding_id: 'binding',
      organization_id: 'own-org',
      environment_id: 'efeonce-auth',
      grants_version: 3,
      status: 'active'
    },
    { enrollment_id: 'enrollment', profile_id: 'person' },
    { enrollment_id: 'enrollment' },
    null,
    {
      grant_id: 'grant',
      profile_id: 'person',
      capability: 'growth.seo.observation.read',
      status: 'active',
      expires_at: grantExpiry
    },
    original,
    previous
  ]

  let index = 0

  state.query.mockImplementation(async () => {
    if (index < results.length) {
      const row = results[index++]

      return { rows: row === null ? [] : Array.isArray(row) ? row : [row] }
    }

    return { rows: [] }
  })

  const client = {
    query: async (sql: string, values: unknown[]) => {
      if (sql.includes('INSERT INTO')) audits.push(values)

      return state.query(sql, values)
    }
  }

  state.tx.mockImplementation(async work => {
    try {
      const result = await work(client)

      committed = [...audits]

      return result
    } catch (error) {
      audits = []
      throw error
    }
  })

  return { getAudits: () => audits, getCommitted: () => committed }
}

beforeEach(() => {
  vi.clearAllMocks()
})
describe('current-time internal authority reconciliation', () => {
  it('dry-run is the default and has no audit/event writes', async () => {
    const f = fixture()

    expect(await reconcileInternalAuthority(input, deps)).toEqual({
      applied: false,
      bindingRecords: 1,
      grantRecords: 1,
      grantsVersion: 3
    })
    expect(f.getAudits()).toEqual([])
    expect(state.event).not.toHaveBeenCalled()
  })
  it('records current events with original evidence, and a repeated canonical snapshot needs no writes', async () => {
    const f = fixture()

    expect(await reconcileInternalAuthority({ ...input, dryRun: false }, deps)).toMatchObject({
      applied: true,
      bindingRecords: 1,
      grantRecords: 1
    })
    expect(f.getCommitted()).toHaveLength(2)
    expect(state.event.mock.calls.map(([event]) => event.eventType)).toEqual([
      'identity.external_binding.reconciled',
      'identity.external_grant.reconciled'
    ])
    const metadata = JSON.parse(f.getCommitted()[1][10] as string)

    expect(metadata).toMatchObject({
      population: 'internal',
      reconciliationVersion: 1,
      originalInternalAuditIds: ['original-enroll', 'original-grant']
    })
    state.event.mockClear()

    const repeat = fixture({
      previous: [
        {
          event_type: 'binding_reconciled',
          grant_id: null,
          metadata_json: { population: 'internal', reconciliationVersion: 1 }
        },
        {
          event_type: 'grant_reconciled',
          grant_id: 'grant',
          metadata_json: { population: 'internal', reconciliationVersion: 1 }
        }
      ]
    })

    expect(await reconcileInternalAuthority({ ...input, dryRun: false }, deps)).toMatchObject({
      applied: false,
      bindingRecords: 0,
      grantRecords: 0
    })
    expect(repeat.getCommitted()).toEqual([])
    expect(state.event).not.toHaveBeenCalled()
  })
  it.each([
    { proofCapability: 'another.capability' },
    { proofExpiry: '2031-01-01T00:00:00.000Z' },
    { proofExpiry: null },
    { grantExpiry: null },
    { laterCapability: 'changed.capability' }
  ])('rejects drifted or unbounded grant evidence %j', async overrides => {
    fixture(overrides)
    await expect(reconcileInternalAuthority(input, deps)).rejects.toMatchObject({ code: 'conflict' })
    expect(state.event).not.toHaveBeenCalled()
  })
  it('rejects grant proof belonging to another enrollment', async () => {
    const f = fixture({ wrongProfile: true })

    await expect(reconcileInternalAuthority({ ...input, dryRun: false }, deps)).rejects.toMatchObject({
      code: 'conflict'
    })
    expect(f.getCommitted()).toEqual([])
    expect(state.event).not.toHaveBeenCalled()
  })
  it('propagates outbox failure to the transaction owner (PG rollback covered by reconcile.live.test.ts)', async () => {
    const f = fixture()

    state.event.mockRejectedValueOnce(new Error('transaction unavailable'))
    await expect(reconcileInternalAuthority({ ...input, dryRun: false }, deps)).rejects.toThrow()
    expect(f.getCommitted()).toEqual([])
    expect(f.getAudits()).toEqual([])
  })
  it('requires both existing fine capabilities before data access', async () => {
    fixture()
    await expect(
      reconcileInternalAuthority(input, { authorize: async (_id, cap) => cap.endsWith('.enroll') })
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(state.tx).not.toHaveBeenCalled()
  })
})
