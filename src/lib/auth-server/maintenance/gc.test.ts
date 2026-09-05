import { beforeEach, expect, it, vi } from 'vitest'

const query = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({
  withTransaction: async (work: (client: { query: typeof query }) => Promise<unknown>) => work({ query })
}))
import { runAuthGarbageCollection } from './gc'

beforeEach(() => {
  vi.resetAllMocks()
  query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] })
})
it('rejects unbounded batches and premature retention before database access', async () => {
  await expect(runAuthGarbageCollection({ batchSize: 501 })).rejects.toThrow('invalid_batch')
  await expect(runAuthGarbageCollection({ retentionDays: 29 })).rejects.toThrow('invalid_retention')
  expect(query).not.toHaveBeenCalled()
})
it('defaults to dry-run and calls the single normative PG mechanism', async () => {
  query.mockResolvedValue({
    rows: [
      {
        result: { dryRun: true, locked: true, cutoff: '2026-08-06T12:00:00Z', batchSize: 500, counts: { sessions: 3 } }
      }
    ]
  })
  expect((await runAuthGarbageCollection()).counts).toEqual({ sessions: 3 })
  expect(query.mock.calls[2][1]).toEqual([500, 30, true])
})
it('reports another worker owning the maintenance lock without pretending cleanup ran', async () => {
  query.mockResolvedValue({
    rows: [{ result: { dryRun: false, locked: false, cutoff: '2026-08-06T12:00:00Z', batchSize: 500, counts: {} } }]
  })
  expect((await runAuthGarbageCollection({ dryRun: false })).locked).toBe(false)
})
it('rejects an out-of-contract database result', async () => {
  query.mockResolvedValue({
    rows: [
      {
        result: {
          dryRun: true,
          locked: true,
          cutoff: '2026-08-06T12:00:00Z',
          batchSize: 500,
          counts: { sessions: 501 }
        }
      }
    ]
  })
  await expect(runAuthGarbageCollection()).rejects.toThrow('invalid_result')
})
