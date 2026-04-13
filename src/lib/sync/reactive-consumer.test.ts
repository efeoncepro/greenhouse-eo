import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProjectionDefinition } from './projection-registry'

const mockQuery = vi.fn()
const mockEvaluateCircuit = vi.fn()
const mockRecordSuccess = vi.fn()
const mockRecordFailure = vi.fn()
const mockGetAllTriggerEventTypes = vi.fn()
const mockGetProjectionsForEvent = vi.fn()
const mockEnsureProjectionsRegistered = vi.fn()
const mockEnqueueRefresh = vi.fn()
const mockMarkRefreshCompleted = vi.fn()
const mockMarkRefreshFailed = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/operations/reactive-circuit-breaker', () => ({
  DEFAULT_CIRCUIT_BREAKER_CONFIG: {
    minimumRunsForEvaluation: 10,
    failureRateThreshold: 0.5,
    consecutiveFailureThreshold: 5,
    cooldownMs: 30 * 60 * 1000,
    rollingWindowSize: 50
  },
  evaluateCircuit: (...args: unknown[]) => mockEvaluateCircuit(...args),
  recordSuccess: (...args: unknown[]) => mockRecordSuccess(...args),
  recordFailure: (...args: unknown[]) => mockRecordFailure(...args)
}))

vi.mock('./projection-registry', () => ({
  getAllTriggerEventTypes: (...args: unknown[]) => mockGetAllTriggerEventTypes(...args),
  getProjectionsForEvent: (...args: unknown[]) => mockGetProjectionsForEvent(...args)
}))

vi.mock('./projections', () => ({
  ensureProjectionsRegistered: () => mockEnsureProjectionsRegistered()
}))

vi.mock('./refresh-queue', () => ({
  buildRefreshQueueId: (projection: string, type: string, id: string) => `${projection}:${type}:${id}`,
  enqueueRefresh: (...args: unknown[]) => mockEnqueueRefresh(...args),
  markRefreshCompleted: (...args: unknown[]) => mockMarkRefreshCompleted(...args),
  markRefreshFailed: (...args: unknown[]) => mockMarkRefreshFailed(...args)
}))

// The real Cloud Monitoring emitter spawns a GoogleAuth task on first use
// that rejects asynchronously when ADC is missing (CI). Mocking it here
// keeps the consumer test hermetic and prevents the post-test unhandled
// rejection that breaks CI runs.
vi.mock('@/lib/operations/cloud-monitoring-emitter', () => ({
  emitConsumerRunMetrics: vi.fn().mockResolvedValue(undefined)
}))

import { buildReactiveHandlerKey, processReactiveEvents } from './reactive-consumer'

const buildProjection = (overrides: Partial<ProjectionDefinition> = {}): ProjectionDefinition => ({
  name: 'test_projection',
  description: 'test',
  domain: 'finance',
  triggerEvents: ['finance.expense.created'],
  extractScope: vi.fn().mockReturnValue({ entityType: 'finance_period', entityId: '2026-04' }),
  refresh: vi.fn().mockResolvedValue('refreshed: 1 entity for 2026-04'),
  maxRetries: 2,
  ...overrides
})

const buildEventRow = (id: string, eventType: string, occurredAt = '2026-04-05T19:41:26Z') => ({
  event_id: id,
  aggregate_type: 'provider_tooling_snapshot',
  aggregate_id: 'snap-1',
  event_type: eventType,
  payload_json: { periodId: '2026-04', periodYear: 2026, periodMonth: 4 },
  occurred_at: occurredAt
})

describe('buildReactiveHandlerKey', () => {
  it('keeps the handler key scoped to projection name and event type', () => {
    expect(buildReactiveHandlerKey('payroll_receipts_delivery', 'payroll_period.exported'))
      .toBe('payroll_receipts_delivery:payroll_period.exported')
    expect(buildReactiveHandlerKey('projected_payroll', 'payroll_period.exported'))
      .toBe('projected_payroll:payroll_period.exported')
    expect(buildReactiveHandlerKey('payroll_receipts_delivery', 'payroll_period.exported'))
      .not.toBe(buildReactiveHandlerKey('projected_payroll', 'payroll_period.exported'))
  })
})

describe('processReactiveEvents (V2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEvaluateCircuit.mockResolvedValue({ allow: true, mode: 'normal', snapshot: null })
    mockEnqueueRefresh.mockResolvedValue(undefined)
    mockMarkRefreshCompleted.mockResolvedValue(undefined)
    mockMarkRefreshFailed.mockResolvedValue(undefined)
  })

  it('returns empty result when no trigger event types are registered', async () => {
    mockGetAllTriggerEventTypes.mockReturnValue([])

    const result = await processReactiveEvents()

    expect(result.eventsFetched).toBe(0)
    expect(result.scopesCoalesced).toBe(0)
    expect(result.projectionsTriggered).toBe(0)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('returns empty result when no events are pending', async () => {
    mockGetAllTriggerEventTypes.mockReturnValue(['finance.expense.created'])
    mockGetProjectionsForEvent.mockReturnValue([buildProjection()])
    mockQuery.mockResolvedValueOnce([]) // SELECT events

    const result = await processReactiveEvents()

    expect(result.eventsFetched).toBe(0)
    expect(result.eventsAcknowledged).toBe(0)
  })

  it('coalesces N events with same scope into 1 refresh call', async () => {
    const projection = buildProjection()

    mockGetAllTriggerEventTypes.mockReturnValue(['finance.expense.created'])
    mockGetProjectionsForEvent.mockReturnValue([projection])

    // 5 events, all mapping to scope finance_period:2026-04
    const events = Array.from({ length: 5 }, (_, i) =>
      buildEventRow(`evt-${i}`, 'finance.expense.created')
    )

    mockQuery.mockResolvedValueOnce(events) // SELECT events
    mockQuery.mockResolvedValue([]) // bulk INSERTs

    const result = await processReactiveEvents()

    expect(result.eventsFetched).toBe(5)
    expect(result.scopesCoalesced).toBe(1)

    // refresh called ONCE despite 5 events
    expect(projection.refresh).toHaveBeenCalledTimes(1)

    // All 5 events acknowledged
    expect(result.eventsAcknowledged).toBe(5)
    expect(mockRecordSuccess).toHaveBeenCalledWith('test_projection', expect.any(Object))

    // Queue lifecycle
    expect(mockEnqueueRefresh).toHaveBeenCalledTimes(1)
    expect(mockMarkRefreshCompleted).toHaveBeenCalledWith('test_projection:finance_period:2026-04')
  })

  it('marks events with no registered projection as no-op:no-handler', async () => {
    mockGetAllTriggerEventTypes.mockReturnValue(['orphan.event'])
    mockGetProjectionsForEvent.mockReturnValue([]) // no projection consumes this

    const events = [buildEventRow('orphan-1', 'orphan.event')]

    mockQuery.mockResolvedValueOnce(events)
    mockQuery.mockResolvedValue([])

    const result = await processReactiveEvents()

    expect(result.eventsFetched).toBe(1)
    expect(result.eventsAcknowledged).toBe(1)
    expect(result.scopesCoalesced).toBe(0)

    const insertCalls = mockQuery.mock.calls.filter(call =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO greenhouse_sync.outbox_reactive_log')
    )

    expect(insertCalls.length).toBeGreaterThan(0)
    const allParams = insertCalls.flatMap(call => call[1] as unknown[])

    expect(allParams).toContain('no-op:no-handler')
  })

  it('marks events with null extractScope as no-op:no-scope', async () => {
    const projection = buildProjection({
      extractScope: vi.fn().mockReturnValue(null)
    })

    mockGetAllTriggerEventTypes.mockReturnValue(['finance.expense.created'])
    mockGetProjectionsForEvent.mockReturnValue([projection])

    const events = [buildEventRow('null-scope-1', 'finance.expense.created')]

    mockQuery.mockResolvedValueOnce(events)
    mockQuery.mockResolvedValue([])

    const result = await processReactiveEvents()

    expect(projection.refresh).not.toHaveBeenCalled()
    expect(result.eventsAcknowledged).toBe(1)

    const insertCalls = mockQuery.mock.calls.filter(call =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO greenhouse_sync.outbox_reactive_log')
    )

    const allParams = insertCalls.flatMap(call => call[1] as unknown[])

    expect(allParams).toContain('no-op:no-scope')
  })

  it('skips a scope group when circuit breaker is open', async () => {
    const projection = buildProjection()

    mockGetAllTriggerEventTypes.mockReturnValue(['finance.expense.created'])
    mockGetProjectionsForEvent.mockReturnValue([projection])

    mockEvaluateCircuit.mockResolvedValueOnce({
      allow: false,
      mode: 'blocked',
      snapshot: { state: 'open' }
    })

    const events = [buildEventRow('breaker-1', 'finance.expense.created')]

    mockQuery.mockResolvedValueOnce(events)
    mockQuery.mockResolvedValue([])

    const result = await processReactiveEvents()

    expect(projection.refresh).not.toHaveBeenCalled()
    expect(result.scopeGroupsBreakerSkipped).toBe(1)
    expect(result.scopesCoalesced).toBe(0)
    expect(mockRecordSuccess).not.toHaveBeenCalled()
    expect(mockRecordFailure).not.toHaveBeenCalled()
  })

  it('records failure to circuit breaker and marks events as retry on first failure', async () => {
    const projection = buildProjection({
      refresh: vi.fn().mockRejectedValue(new Error('boom')),
      maxRetries: 3
    })

    mockGetAllTriggerEventTypes.mockReturnValue(['finance.expense.created'])
    mockGetProjectionsForEvent.mockReturnValue([projection])

    const events = [buildEventRow('fail-1', 'finance.expense.created')]

    // SELECT events
    mockQuery.mockResolvedValueOnce(events)

    // Per-event prior retry lookup
    mockQuery.mockResolvedValueOnce([{ retries: 0 }])

    // Subsequent inserts
    mockQuery.mockResolvedValue([])

    const result = await processReactiveEvents()

    expect(result.scopeGroupsFailed).toBe(1)
    expect(mockRecordFailure).toHaveBeenCalledWith(
      'test_projection',
      'boom',
      expect.any(Object)
    )
    expect(mockMarkRefreshFailed).toHaveBeenCalled()

    const insertCalls = mockQuery.mock.calls.filter(call =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO greenhouse_sync.outbox_reactive_log')
    )

    const allParams = insertCalls.flatMap(call => call[1] as unknown[])

    expect(allParams).toContain('retry')
  })

  it('marks events as dead-letter when retry budget exhausted', async () => {
    const projection = buildProjection({
      refresh: vi.fn().mockRejectedValue(new Error('persistent')),
      maxRetries: 2
    })

    mockGetAllTriggerEventTypes.mockReturnValue(['finance.expense.created'])
    mockGetProjectionsForEvent.mockReturnValue([projection])

    const events = [buildEventRow('dead-1', 'finance.expense.created')]

    mockQuery.mockResolvedValueOnce(events)
    mockQuery.mockResolvedValueOnce([{ retries: 1 }]) // already 1 retry, next = 2 = maxRetries
    mockQuery.mockResolvedValue([])

    const result = await processReactiveEvents()

    expect(result.scopeGroupsFailed).toBe(1)

    const insertCalls = mockQuery.mock.calls.filter(call =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO greenhouse_sync.outbox_reactive_log')
    )

    const allParams = insertCalls.flatMap(call => call[1] as unknown[])

    expect(allParams).toContain('dead-letter')
    expect(result.actions.some(a => a.includes('DEAD-LETTER'))).toBe(true)
  })

  it('reports per-projection stats with successes and acknowledged counts', async () => {
    const projectionA = buildProjection({ name: 'projection_a' })

    const projectionB = buildProjection({
      name: 'projection_b',
      triggerEvents: ['finance.income.created'],
      extractScope: vi.fn().mockReturnValue({ entityType: 'client', entityId: 'client-1' }),
      refresh: vi.fn().mockResolvedValue('refreshed b')
    })

    mockGetAllTriggerEventTypes.mockReturnValue(['finance.expense.created', 'finance.income.created'])
    mockGetProjectionsForEvent.mockImplementation((eventType: string) => {
      if (eventType === 'finance.expense.created') return [projectionA]
      if (eventType === 'finance.income.created') return [projectionB]
      
return []
    })

    const events = [
      buildEventRow('a-1', 'finance.expense.created'),
      buildEventRow('a-2', 'finance.expense.created'),
      buildEventRow('b-1', 'finance.income.created')
    ]

    mockQuery.mockResolvedValueOnce(events)
    mockQuery.mockResolvedValue([])

    const result = await processReactiveEvents()

    expect(result.scopesCoalesced).toBe(2)
    expect(result.eventsAcknowledged).toBe(3)
    expect(result.perProjection.projection_a.scopesCoalesced).toBe(1)
    expect(result.perProjection.projection_a.eventsAcknowledged).toBe(2)
    expect(result.perProjection.projection_a.successes).toBe(1)
    expect(result.perProjection.projection_b.scopesCoalesced).toBe(1)
    expect(result.perProjection.projection_b.eventsAcknowledged).toBe(1)
  })

  it('preserves backwards-compat fields eventsProcessed and eventsFailed', async () => {
    mockGetAllTriggerEventTypes.mockReturnValue(['finance.expense.created'])
    mockGetProjectionsForEvent.mockReturnValue([buildProjection()])

    const events = [buildEventRow('e-1', 'finance.expense.created')]

    mockQuery.mockResolvedValueOnce(events)
    mockQuery.mockResolvedValue([])

    const result = await processReactiveEvents()

    expect(result.eventsProcessed).toBe(result.eventsAcknowledged)
    expect(result.eventsFailed).toBe(result.scopeGroupsFailed)
  })

  it('calls projection.refresh with the most recent payload as representative', async () => {
    const projection = buildProjection()

    mockGetAllTriggerEventTypes.mockReturnValue(['finance.expense.created'])
    mockGetProjectionsForEvent.mockReturnValue([projection])

    const events = [
      { ...buildEventRow('older', 'finance.expense.created'), payload_json: { periodId: '2026-04', sequence: 1 } },
      { ...buildEventRow('mid', 'finance.expense.created'), payload_json: { periodId: '2026-04', sequence: 2 } },
      { ...buildEventRow('newest', 'finance.expense.created'), payload_json: { periodId: '2026-04', sequence: 3 } }
    ]

    mockQuery.mockResolvedValueOnce(events)
    mockQuery.mockResolvedValue([])

    await processReactiveEvents()

    expect(projection.refresh).toHaveBeenCalledWith(
      { entityType: 'finance_period', entityId: '2026-04' },
      expect.objectContaining({ sequence: 3, _eventType: 'finance.expense.created' })
    )
  })
})
