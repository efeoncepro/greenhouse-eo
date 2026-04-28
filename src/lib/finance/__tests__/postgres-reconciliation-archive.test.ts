/**
 * TASK-715 — archive/unarchive reconciliation period as test.
 *
 * Validates store-level guards and SQL shape:
 *   1. archive emits canonical event + sets archive_* fields atomically.
 *   2. archive idempotent on already-archived period (same kind).
 *   3. archive rejects period with status='closed'.
 *   4. archive rejects reason < 8 chars (audit-grade).
 *   5. unarchive clears all archive_* fields and emits distinct event.
 *   6. list filters archived by default; includeArchived=true returns them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

type FakeClient = { query: ReturnType<typeof vi.fn> }
const mockClientQuery = vi.fn()

const mockWithTransaction = vi.fn<(fn: (client: FakeClient) => Promise<unknown>) => Promise<unknown>>(
  async fn => fn({ query: mockClientQuery })
)

const mockRunQuery = vi.fn<(sql: string, values?: unknown[]) => Promise<unknown[]>>()

interface OutboxEventInput {
  aggregateType: string
  aggregateId: string
  eventType: string
  payload: Record<string, unknown>
}

const mockPublishOutboxEvent = vi.fn<(event: OutboxEventInput, client?: unknown) => Promise<void>>(
  async () => undefined
)

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (sql: string, values?: unknown[]) => mockRunQuery(sql, values),
  withGreenhousePostgresTransaction: (fn: (client: unknown) => Promise<unknown>) => mockWithTransaction(fn)
}))

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  assertFinanceSlice2PostgresReady: vi.fn(async () => undefined)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (event: OutboxEventInput, client?: unknown) =>
    mockPublishOutboxEvent(event, client)
}))

import {
  archiveReconciliationPeriodAsTestInPostgres,
  listReconciliationPeriodsFromPostgres,
  unarchiveReconciliationPeriodInPostgres
} from '@/lib/finance/postgres-reconciliation'

const PERIOD_ID = 'santander-clp_2026_03'
const ACTOR = 'agent@greenhouse.efeonce.org'
const REASON = 'Periodo E2E manual match validation rerun'

beforeEach(() => {
  mockClientQuery.mockReset()
  mockWithTransaction.mockClear()
  mockPublishOutboxEvent.mockReset()
  mockRunQuery.mockReset()
})

describe('archiveReconciliationPeriodAsTestInPostgres', () => {
  it('archives an active period and emits the canonical event', async () => {
    mockClientQuery
      // SELECT ... FOR UPDATE
      .mockResolvedValueOnce({
        rows: [{ period_id: PERIOD_ID, status: 'reconciled', archived_at: null, archive_kind: null }]
      })
      // UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })

    const result = await archiveReconciliationPeriodAsTestInPostgres({
      periodId: PERIOD_ID,
      reason: REASON,
      actorUserId: ACTOR
    })

    expect(result).toEqual({ periodId: PERIOD_ID, alreadyArchived: false })

    const updateCall = mockClientQuery.mock.calls.find(call =>
      typeof call[0] === 'string'
        && call[0].includes('UPDATE greenhouse_finance.reconciliation_periods')
        && call[0].includes('archived_at = NOW()')
    )

    expect(updateCall).toBeDefined()
    expect(updateCall?.[1]).toEqual([PERIOD_ID, ACTOR, REASON, 'test_period'])

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(1)

    const outboxCall = mockPublishOutboxEvent.mock.calls[0][0]

    expect(outboxCall.eventType).toBe('finance.reconciliation_period.archived_as_test')
    expect(outboxCall.aggregateId).toBe(PERIOD_ID)
    expect(outboxCall.payload).toMatchObject({
      periodId: PERIOD_ID,
      archiveKind: 'test_period',
      reason: REASON,
      actorUserId: ACTOR,
      previousStatus: 'reconciled'
    })
  })

  it('is idempotent when period already archived as test', async () => {
    mockClientQuery.mockResolvedValueOnce({
      rows: [{
        period_id: PERIOD_ID,
        status: 'reconciled',
        archived_at: new Date('2026-04-28T18:00:00Z'),
        archive_kind: 'test_period'
      }]
    })

    const result = await archiveReconciliationPeriodAsTestInPostgres({
      periodId: PERIOD_ID,
      reason: REASON,
      actorUserId: ACTOR
    })

    expect(result).toEqual({ periodId: PERIOD_ID, alreadyArchived: true })

    // No UPDATE expected (single SELECT call only)
    expect(mockClientQuery.mock.calls.length).toBe(1)
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })

  it('rejects archiving a period in status=closed', async () => {
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ period_id: PERIOD_ID, status: 'closed', archived_at: null, archive_kind: null }]
    })

    await expect(
      archiveReconciliationPeriodAsTestInPostgres({
        periodId: PERIOD_ID,
        reason: REASON,
        actorUserId: ACTOR
      })
    ).rejects.toThrow(/closed/)

    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })

  it('rejects reason shorter than 8 characters', async () => {
    await expect(
      archiveReconciliationPeriodAsTestInPostgres({
        periodId: PERIOD_ID,
        reason: 'short',
        actorUserId: ACTOR
      })
    ).rejects.toThrow(/8 caracteres/)

    expect(mockClientQuery).not.toHaveBeenCalled()
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })

  it('throws 404 when period not found', async () => {
    mockClientQuery.mockResolvedValueOnce({ rows: [] })

    await expect(
      archiveReconciliationPeriodAsTestInPostgres({
        periodId: 'missing',
        reason: REASON,
        actorUserId: ACTOR
      })
    ).rejects.toThrow(/not found/)
  })
})

describe('unarchiveReconciliationPeriodInPostgres', () => {
  it('clears archive fields and emits unarchived event', async () => {
    mockClientQuery
      .mockResolvedValueOnce({
        rows: [{
          period_id: PERIOD_ID,
          archived_at: new Date('2026-04-28T18:00:00Z'),
          archive_kind: 'test_period',
          archive_reason: REASON
        }]
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })

    const result = await unarchiveReconciliationPeriodInPostgres({
      periodId: PERIOD_ID,
      actorUserId: ACTOR
    })

    expect(result).toEqual({ periodId: PERIOD_ID, wasArchived: true })

    const updateCall = mockClientQuery.mock.calls.find(call =>
      typeof call[0] === 'string' && call[0].includes('archived_at = NULL')
    )

    expect(updateCall).toBeDefined()
    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(1)
    expect(mockPublishOutboxEvent.mock.calls[0][0].eventType).toBe('finance.reconciliation_period.unarchived')
  })

  it('no-op when period was not archived', async () => {
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ period_id: PERIOD_ID, archived_at: null, archive_kind: null, archive_reason: null }]
    })

    const result = await unarchiveReconciliationPeriodInPostgres({
      periodId: PERIOD_ID,
      actorUserId: ACTOR
    })

    expect(result).toEqual({ periodId: PERIOD_ID, wasArchived: false })
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })
})

describe('listReconciliationPeriodsFromPostgres archive filter', () => {
  it('hides archived periods by default', async () => {
    mockRunQuery.mockResolvedValueOnce([])

    await listReconciliationPeriodsFromPostgres({})

    const call = mockRunQuery.mock.calls[0]

    expect(typeof call[0]).toBe('string')
    expect(call[0]).toContain('archived_at IS NULL')
  })

  it('includes archived when includeArchived=true', async () => {
    mockRunQuery.mockResolvedValueOnce([])

    await listReconciliationPeriodsFromPostgres({ includeArchived: true })

    const call = mockRunQuery.mock.calls[0]

    expect(call[0]).not.toContain('archived_at IS NULL')
  })
})
