/**
 * TASK-773 Slice 2 — tests del worker outbox publisher.
 *
 * Cubre:
 *   - Caso happy: events 'pending' → 'published' tras BQ insert OK.
 *   - Empty fetch: no hay events → result vacío sin error.
 *   - BQ partial failure: rows OK marcan 'published', rows FAIL incrementan
 *     'published_attempts' y van a 'failed' (retryable).
 *   - BQ total failure: TODOS los events suben attempts.
 *   - Dead-letter routing: cuando attempts+1 >= maxRetries → 'dead_letter'
 *     + Sentry captureWithDomain('sync', ...).
 *   - SELECT FOR UPDATE SKIP LOCKED: usado en el claim phase (verificable
 *     por el SQL emitido al pg client).
 *   - Re-fetch eligibility: 'pending' OR 'failed' (retry-eligible).
 *
 * Patrón: mockear runGreenhousePostgresQuery + withGreenhousePostgresTransaction
 * + getBigQueryClient para evitar dependencia real de DB/BQ.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunQuery = vi.fn()
const mockClientQuery = vi.fn()

const mockWithTransaction = vi.fn(async (cb: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
  cb({ query: mockClientQuery })
)

const mockBqInsert = vi.fn()
const mockBqTable = vi.fn(() => ({ insert: mockBqInsert }))
const mockBqDataset = vi.fn(() => ({ table: mockBqTable }))
const mockGetBigQueryClient = vi.fn(() => ({ dataset: mockBqDataset }))

const mockCaptureWithDomain = vi.fn()

const mockRedactErrorForResponse = vi.fn((err: unknown) =>
  err instanceof Error ? err.message : String(err)
)

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunQuery(...args),
  withGreenhousePostgresTransaction: (cb: (client: unknown) => Promise<unknown>) => mockWithTransaction(cb)
}))

vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: () => mockGetBigQueryClient()
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

vi.mock('@/lib/observability/redact', () => ({
  redactErrorForResponse: (err: unknown) => mockRedactErrorForResponse(err)
}))

import { publishPendingOutboxEvents, OUTBOX_MAX_PUBLISH_ATTEMPTS } from './outbox-consumer'

const buildEvent = (overrides: Record<string, unknown> = {}) => ({
  event_id: 'evt-1',
  aggregate_type: 'finance_expense_payment',
  aggregate_id: 'exp-pay-1',
  event_type: 'finance.expense_payment.recorded',
  payload_json: { foo: 'bar' },
  status: 'pending',
  occurred_at: '2026-05-03T16:00:00Z',
  published_attempts: 0,
  ...overrides
})

beforeEach(() => {
  mockRunQuery.mockReset()
  mockClientQuery.mockReset()
  mockBqInsert.mockReset()
  mockCaptureWithDomain.mockReset()
  mockRedactErrorForResponse.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('publishPendingOutboxEvents — TASK-773 state machine', () => {
  it('returns early when no pending or failed events exist', async () => {
    // claim phase
    mockClientQuery.mockResolvedValueOnce({ rows: [] })
    // sync run writes
    mockRunQuery.mockResolvedValue([])

    const result = await publishPendingOutboxEvents({ batchSize: 100 })

    expect(result.eventsRead).toBe(0)
    expect(result.eventsPublished).toBe(0)
    expect(result.eventsFailed).toBe(0)
    expect(result.eventsDeadLetter).toBe(0)
    expect(mockBqInsert).not.toHaveBeenCalled()
  })

  it('claims pending events with SELECT FOR UPDATE SKIP LOCKED', async () => {
    const event = buildEvent()

    mockClientQuery
      .mockResolvedValueOnce({ rows: [event] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [] }) // UPDATE status='publishing'
      .mockResolvedValueOnce({ rows: [] }) // UPDATE status='published'
    mockRunQuery.mockResolvedValue([])
    mockBqInsert.mockResolvedValue(undefined)

    await publishPendingOutboxEvents({ batchSize: 100 })

    const selectCall = mockClientQuery.mock.calls.find(c => /SELECT.+event_id/i.test(c[0] as string))

    expect(selectCall).toBeDefined()
    expect(selectCall![0]).toContain('FOR UPDATE SKIP LOCKED')
    expect(selectCall![0]).toContain("status IN ('pending', 'failed')")
  })

  it('marks events as published when BQ insert succeeds', async () => {
    const event = buildEvent()

    mockClientQuery
      .mockResolvedValueOnce({ rows: [event] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
    mockRunQuery.mockResolvedValue([])
    mockBqInsert.mockResolvedValue(undefined)

    const result = await publishPendingOutboxEvents()

    expect(result.eventsPublished).toBe(1)
    expect(result.eventsFailed).toBe(0)
    expect(result.eventsDeadLetter).toBe(0)

    const publishedUpdate = mockClientQuery.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes("SET status = 'published'")
    )

    expect(publishedUpdate).toBeDefined()
  })

  it('routes failed events to status=failed when attempts < maxRetries', async () => {
    const event = buildEvent({ event_id: 'evt-fail', published_attempts: 0 })

    mockClientQuery
      .mockResolvedValueOnce({ rows: [event] })
      .mockResolvedValueOnce({ rows: [] }) // UPDATE publishing
      .mockResolvedValueOnce({ rows: [] }) // UPDATE failed
    mockRunQuery.mockResolvedValue([])
    mockBqInsert.mockRejectedValueOnce(new Error('BQ unreachable'))

    const result = await publishPendingOutboxEvents({ maxRetries: 5 })

    expect(result.eventsPublished).toBe(0)
    expect(result.eventsFailed).toBe(1)
    expect(result.eventsDeadLetter).toBe(0)

    const failedUpdate = mockClientQuery.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes("SET status = 'failed'")
    )

    expect(failedUpdate).toBeDefined()
    expect(failedUpdate![0]).toContain('published_attempts = published_attempts + 1')
  })

  it('routes events to dead_letter when attempts+1 >= maxRetries + emits Sentry', async () => {
    const event = buildEvent({ event_id: 'evt-dead', published_attempts: 4 })

    mockClientQuery
      .mockResolvedValueOnce({ rows: [event] })
      .mockResolvedValueOnce({ rows: [] }) // UPDATE publishing
      .mockResolvedValueOnce({ rows: [] }) // UPDATE dead_letter
    mockRunQuery.mockResolvedValue([])
    mockBqInsert.mockRejectedValueOnce(new Error('BQ permanent error'))

    const result = await publishPendingOutboxEvents({ maxRetries: 5 })

    expect(result.eventsDeadLetter).toBe(1)
    expect(result.eventsFailed).toBe(1) // counted in failed because BQ failed

    const deadLetterUpdate = mockClientQuery.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes("SET status = 'dead_letter'")
    )

    expect(deadLetterUpdate).toBeDefined()
    expect(deadLetterUpdate![0]).toContain('dead_letter_at = NOW()')

    expect(mockCaptureWithDomain).toHaveBeenCalledTimes(1)
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'sync',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'outbox_publisher_dead_letter' })
      })
    )
  })

  it('OUTBOX_MAX_PUBLISH_ATTEMPTS export is 5 (canónico)', () => {
    expect(OUTBOX_MAX_PUBLISH_ATTEMPTS).toBe(5)
  })

  it('handles partial BQ failure: some rows published, some failed', async () => {
    const ev1 = buildEvent({ event_id: 'evt-ok', published_attempts: 0 })
    const ev2 = buildEvent({ event_id: 'evt-bad', published_attempts: 0 })

    mockClientQuery
      .mockResolvedValueOnce({ rows: [ev1, ev2] })
      .mockResolvedValueOnce({ rows: [] }) // UPDATE publishing
      .mockResolvedValueOnce({ rows: [] }) // UPDATE published (ev1)
      .mockResolvedValueOnce({ rows: [] }) // UPDATE failed (ev2)
    mockRunQuery.mockResolvedValue([])

    // BQ rejects only evt-bad
    mockBqInsert.mockRejectedValueOnce({
      errors: [{ row: { event_id: 'evt-bad' }, errors: [{ reason: 'invalid' }] }]
    })

    const result = await publishPendingOutboxEvents({ maxRetries: 5 })

    expect(result.eventsRead).toBe(2)
    expect(result.eventsPublished).toBe(1)
    expect(result.eventsFailed).toBe(1)
    expect(result.eventsDeadLetter).toBe(0)
  })
})
