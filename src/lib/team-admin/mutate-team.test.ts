import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildIdentitySourceLinkId } from '@/lib/ids/greenhouse-ids'

const db = vi.hoisted(() => ({
  member: {} as Record<string, unknown>,
  links: [] as unknown[][],
  events: [] as Record<string, unknown>[],
  failure: null as 'links' | 'outbox' | 'mirror' | null,
  transactionClient: null as unknown,
  query: vi.fn(),
  mirror: vi.fn()
}))

// Transaction fault injection verifies the command's commit boundary. This is not a live
// PostgreSQL rollback test: the driver owns rollback; this test proves every canonical write
// participates in that transaction and no mirror runs before it successfully commits.
vi.mock('@/lib/postgres/client', () => ({
  isGreenhousePostgresConfigured: () => true,
  runGreenhousePostgresQuery: (...args: unknown[]) => db.query(...args),
  withGreenhousePostgresTransaction: async (callback: (client: unknown) => Promise<unknown>) => {
    const pendingMember = { ...db.member }
    const pendingLinks: unknown[][] = []
    const pendingEvents: Record<string, unknown>[] = []

    const client = {
      events: pendingEvents,
      query: vi.fn(async (sql: string, values: unknown[] = []) => {
        if (/^\s*SELECT/.test(sql)) return { rows: [{ ...pendingMember }] }

        if (/UPDATE greenhouse_core.members/.test(sql)) {
          pendingMember.active = values[0]

return { rows: [], rowCount: 1 }
        }

        if (/INSERT INTO greenhouse_core.identity_profile_source_links/.test(sql)) {
          if (db.failure === 'links') throw new Error('source link rejected')
          pendingLinks.push(values)

return { rows: [], rowCount: 1 }
        }

        throw new Error('Unexpected transaction statement')
      })
    }

    db.transactionClient = client
    const result = await callback(client)

    db.member = pendingMember
    db.links.push(...pendingLinks)
    db.events.push(...pendingEvents)

    return result
  }
}))
vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: async (event: Record<string, unknown>, client: { events: Record<string, unknown>[] }) => {
    expect(client).toBe(db.transactionClient)
    if (db.failure === 'outbox') throw new Error('outbox rejected')
    client.events.push(event)

return 'outbox-test'
  }
}))
vi.mock('@/lib/bigquery', () => ({
  getBigQueryProjectId: () => 'test-project',
  getBigQueryClient: () => ({ query: (...args: unknown[]) => db.mirror(...args) })
}))
vi.mock('@/lib/workforce/offboarding', () => ({ openOffboardingNeedsReviewFromMember: vi.fn() }))
vi.mock('@/lib/people/shared', () => ({
  getPeopleTableColumns: async () => new Set(['member_id', 'active']),
  toContactChannel: (value: unknown) => value || 'email',
  toDateString: (value: unknown) => value,
  toNumber: Number,
  toStringArray: (value: unknown) => value || []
}))

import { updateMember } from './mutate-team'

const command = (input = { active: true }) => updateMember({
  memberId: 'test-member', input, actorUserId: 'test-admin', actorEmail: 'admin@example.test'
})

beforeEach(() => {
  vi.clearAllMocks()
  db.member = {
    member_id: 'test-member', display_name: 'Test Member', email: 'test@example.test',
    email_aliases: [], active: false, identity_profile_id: 'identity-hubspot-crm-owner-test',
    azure_oid: 'test-azure-oid', notion_user_id: null, hubspot_owner_id: 'test-owner'
  }
  db.links = []
  db.events = []
  db.failure = null
  db.query.mockRejectedValue(new Error('Canonical operation escaped transaction'))
  db.mirror.mockImplementation(async () => {
    expect(db.member.active).toBe(true)
    expect(db.events).toHaveLength(1)
    if (db.failure === 'mirror') throw new Error('mirror unavailable')

return [[]]
  })
})

describe('updateMember canonical transaction', () => {
  it('commits member, canonical source IDs and an attributable before/after event together', async () => {
    const result = await command()

    expect(result.active).toBe(true)
    expect(db.member.active).toBe(true)
    expect(db.links).toHaveLength(2)
    expect(db.links[0][0]).toBe(buildIdentitySourceLinkId({
      profileId: 'identity-hubspot-crm-owner-test', sourceSystem: 'azure_ad',
      sourceObjectType: 'user', sourceObjectId: 'test-azure-oid'
    }))
    expect(db.events).toEqual([expect.objectContaining({
      eventType: 'member.updated',
      payload: expect.objectContaining({
        actorUserId: 'test-admin', previous: expect.objectContaining({ active: false }),
        next: expect.objectContaining({ active: true })
      })
    })])
    expect(db.query).not.toHaveBeenCalled()
  })

  it.each(['links', 'outbox'] as const)('does not commit any state or mirror when %s fails', async failure => {
    db.failure = failure
    await expect(command()).rejects.toThrow(/rejected/)
    expect(db.member.active).toBe(false)
    expect(db.links).toEqual([])
    expect(db.events).toEqual([])
    expect(db.mirror).not.toHaveBeenCalled()
    expect(db.query).not.toHaveBeenCalled()
  })

  it('treats a mirror failure as projection failure after canonical success', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    try {
      db.failure = 'mirror'
      await expect(command()).resolves.toMatchObject({ active: true })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(db.member.active).toBe(true)
      expect(db.events).toHaveLength(1)
      expect(warning).toHaveBeenCalled()
    } finally {
      warning.mockRestore()
    }
  })

  it('allows an ordinary member with no identity profile without creating source links', async () => {
    db.member.identity_profile_id = null
    await expect(command()).resolves.toMatchObject({ active: true })
    expect(db.links).toEqual([])
    expect(db.events).toHaveLength(1)
  })

  it('does not emit events or mirrors for an empty update', async () => {
    await expect(updateMember({ memberId: 'test-member', input: {}, actorUserId: 'test-admin', actorEmail: null }))
      .resolves.toMatchObject({ active: false })
    expect(db.events).toEqual([])
    expect(db.links).toEqual([])
    expect(db.mirror).not.toHaveBeenCalled()
  })
})
