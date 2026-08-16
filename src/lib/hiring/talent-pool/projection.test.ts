import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  publish: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: async (callback: (client: { query: typeof mocks.query }) => unknown) =>
    callback({ query: mocks.query })
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mocks.publish(...args)
}))

import { reconcileTalentPoolProjection } from './projection'

describe('reconcileTalentPoolProjection privacy boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query
      .mockResolvedValueOnce({
        rows: [{ total_facets: 52, active_process: 50, needs_reconsent: 2 }],
        rowCount: 1
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 2 })
      .mockResolvedValueOnce({ rows: [], rowCount: 10 })
      .mockResolvedValueOnce({ rows: [], rowCount: 20 })
      .mockResolvedValueOnce({ rows: [], rowCount: 30 })
    mocks.publish.mockResolvedValue(undefined)
  })

  it('keeps active applications separate from future consent and purges non-discoverable evidence', async () => {
    const result = await reconcileTalentPoolProjection({ apply: true, actorUserId: 'privacy-test' })
    const statements = mocks.query.mock.calls.map(call => String(call[0]))

    expect(statements.some(sql => sql.includes("purpose='future_opportunities'"))).toBe(true)
    expect(statements.some(sql => sql.includes("stage NOT IN ('rejected','withdrawn','closed')"))).toBe(true)
    expect(
      statements.some(sql =>
        sql.includes("lifecycle_status NOT IN ('active_process','pool_eligible','paused')")
      )
    ).toBe(true)
    expect(
      statements.filter(sql => sql.includes('talent_pool_evidence_projection')).filter(sql => sql.includes('INSERT INTO'))
    ).toHaveLength(3)
    expect(
      statements
        .filter(sql => sql.includes('INSERT INTO greenhouse_hiring.talent_pool_evidence_projection'))
        .every(sql => sql.includes("m.lifecycle_status IN ('active_process','pool_eligible','paused')"))
    ).toBe(true)
    expect(result).toMatchObject({
      membershipsReclassified: 0,
      evidenceRemoved: 2,
      evidenceUpserted: 60
    })
  })
})
