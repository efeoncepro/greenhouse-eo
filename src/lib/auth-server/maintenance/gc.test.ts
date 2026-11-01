import { beforeEach, expect, it, vi } from 'vitest'

const query = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({
  withTransaction: async (work: (client: { query: typeof query }) => Promise<unknown>) => work({ query })
}))
import { runAuthGarbageCollection } from './gc'

const base = (dryRun = true, locked = true, sessions = 3) => ({ rows: [{ result: {
  dryRun, locked, cutoff: '2026-08-06T12:00:00Z', batchSize: 500, counts: { sessions }
} }] })

beforeEach(() => {
  vi.resetAllMocks()
  query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] })
})
it('rejects unbounded batches and premature retention before database access', async () => {
  await expect(runAuthGarbageCollection({ batchSize: 501 })).rejects.toThrow('invalid_batch')
  await expect(runAuthGarbageCollection({ retentionDays: 29 })).rejects.toThrow('invalid_retention')
  expect(query).not.toHaveBeenCalled()
})
it('defaults to dry-run and skips extensions absent before additive migrations', async () => {
  query.mockResolvedValueOnce(base()).mockResolvedValue({ rows: [{ present: false }] })
  const result = await runAuthGarbageCollection()

  expect(result.counts).toEqual({ sessions: 3 })
  expect(result.extensions).toEqual({ first_party: 'not_migrated', email_otp: 'not_migrated' })
  expect(query.mock.calls[2][1]).toEqual([500, 30, true])
  expect(query).toHaveBeenCalledTimes(5)
})
it('reports another worker owning the global maintenance lock and never invokes helpers', async () => {
  query.mockResolvedValueOnce(base(false, false))
  const result = await runAuthGarbageCollection({ dryRun: false })

  expect(result.locked).toBe(false)
  expect(result.extensions).toEqual({ first_party: 'lock_unavailable', email_otp: 'lock_unavailable' })
  expect(query).toHaveBeenCalledTimes(3)
})
it('honors longer retention by explicitly skipping fixed-30-day helpers', async () => {
  query.mockResolvedValueOnce(base())
  expect((await runAuthGarbageCollection({ retentionDays: 90 })).extensions).toEqual({ first_party: 'retention_mismatch', email_otp: 'retention_mismatch' })
  expect(query).toHaveBeenCalledTimes(3)
})
it.each([true, false])('merges bounded prefixed counts in the same transaction with dryRun=%s', async dryRun => {
  query.mockResolvedValueOnce(base(dryRun))
    .mockResolvedValueOnce({ rows: [{ present: true }] })
    .mockResolvedValueOnce({ rows: [{ result: { dryRun, handles: 1, codes: 2, transactions: 3 } }] })
    .mockResolvedValueOnce({ rows: [{ present: true }] })
    .mockResolvedValueOnce({ rows: [{ result: { dryRun, challenges: 4, budgets: 5 } }] })
  const result = await runAuthGarbageCollection({ dryRun })

  expect(result.counts).toEqual({ sessions: 3, first_party_handles: 1, first_party_codes: 2, first_party_transactions: 3, email_otp_challenges: 4, email_otp_budgets: 5 })
  expect(result.extensions).toEqual({ first_party: 'ran', email_otp: 'ran' })
  expect(query.mock.calls[4][1]).toEqual([500, dryRun])
  expect(query.mock.calls[6][1]).toEqual([500, dryRun])
})
it('rejects an out-of-contract base result before invoking helpers', async () => {
  query.mockResolvedValueOnce(base(true, true, 501))
  await expect(runAuthGarbageCollection()).rejects.toThrow('invalid_result')
  expect(query).toHaveBeenCalledTimes(3)
})
it.each([{ dryRun: true, handles: 501, codes: 0, transactions: 0 }, { dryRun: false, handles: 0, codes: 0, transactions: 0 },
  { dryRun: true, handles: 0, codes: 0 }])('rejects invalid extension result within transaction: %j', async result => {
  query.mockResolvedValueOnce(base()).mockResolvedValueOnce({ rows: [{ present: true }] }).mockResolvedValueOnce({ rows: [{ result }] })
  await expect(runAuthGarbageCollection()).rejects.toThrow('invalid_extension_result')
})
