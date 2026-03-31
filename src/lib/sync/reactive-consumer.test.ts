import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockEnsureProjectionsRegistered = vi.fn()
const mockGetAllTriggerEventTypes = vi.fn()
const mockGetProjectionsForEvent = vi.fn()
const mockEnqueueRefresh = vi.fn()
const mockMarkRefreshCompleted = vi.fn()
const mockMarkRefreshFailed = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('./projections', () => ({
  ensureProjectionsRegistered: () => mockEnsureProjectionsRegistered()
}))

vi.mock('./projection-registry', () => ({
  getAllTriggerEventTypes: (...args: unknown[]) => mockGetAllTriggerEventTypes(...args),
  getProjectionsForEvent: (...args: unknown[]) => mockGetProjectionsForEvent(...args)
}))

vi.mock('./refresh-queue', () => ({
  buildRefreshQueueId: (projectionName: string, entityType: string, entityId: string) =>
    `${projectionName}:${entityType}:${entityId}`,
  enqueueRefresh: (...args: unknown[]) => mockEnqueueRefresh(...args),
  markRefreshCompleted: (...args: unknown[]) => mockMarkRefreshCompleted(...args),
  markRefreshFailed: (...args: unknown[]) => mockMarkRefreshFailed(...args)
}))

import { buildReactiveHandlerKey, processReactiveEvents } from './reactive-consumer'

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

describe('processReactiveEvents', () => {
  const projection = {
    name: 'payroll_receipts_delivery',
    description: 'Generate payroll receipts',
    domain: 'notifications' as const,
    triggerEvents: ['payroll_period.exported'],
    extractScope: (payload: Record<string, unknown>) => {
      if (payload.periodId === '2026-03') {
        return { entityType: 'payroll_period', entityId: '2026-03' }
      }

      return null
    },
    refresh: vi.fn(),
    maxRetries: 2
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsureProjectionsRegistered.mockReturnValue(undefined)
    mockGetAllTriggerEventTypes.mockReturnValue(['payroll_period.exported'])
    mockGetProjectionsForEvent.mockReturnValue([projection])
    mockEnqueueRefresh.mockResolvedValue(undefined)
    mockMarkRefreshCompleted.mockResolvedValue(undefined)
    mockMarkRefreshFailed.mockResolvedValue(undefined)
    projection.refresh = vi.fn().mockResolvedValue('generated receipts for 2026-03')
  })

  it('marks queue items completed after successful refreshes', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.includes('to_regclass(\'greenhouse_sync.outbox_reactive_log\')')) {
        return [{ exists: true }]
      }

      if (sql.includes('FROM greenhouse_sync.outbox_events')) {
        if (values?.[2] === 0) {
          return [
            {
              event_id: 'event-1',
              aggregate_type: 'payroll_period',
              aggregate_id: '2026-03',
              event_type: 'payroll_period.exported',
              payload_json: { periodId: '2026-03' },
              occurred_at: '2026-03-27T12:00:00.000Z'
            }
          ]
        }

        return []
      }

      if (
        sql.includes('FROM greenhouse_sync.outbox_reactive_log') &&
        sql.includes('handler = ANY($2)')
      ) {
        return []
      }

      if (sql.includes('SELECT EXISTS')) {
        return [
          {
            exists: false
          }
        ]
      }

      if (sql.includes('INSERT INTO greenhouse_sync.outbox_reactive_log')) {
        return []
      }

      return []
    })

    const result = await processReactiveEvents({ domain: 'notifications' })

    expect(mockEnqueueRefresh).toHaveBeenCalledWith({
      projectionName: 'payroll_receipts_delivery',
      entityType: 'payroll_period',
      entityId: '2026-03',
      priority: 2,
      triggeredByEventId: 'event-1',
      maxRetries: 2
    })
    expect(mockMarkRefreshCompleted).toHaveBeenCalledWith('payroll_receipts_delivery:payroll_period:2026-03')
    expect(mockMarkRefreshFailed).not.toHaveBeenCalled()
    expect(result.eventsProcessed).toBe(1)
    expect(result.projectionsTriggered).toBe(1)
  })

  it('marks queue items failed when the refresh throws', async () => {
    projection.refresh = vi.fn().mockRejectedValue(new Error('refresh failed'))

    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.includes('to_regclass(\'greenhouse_sync.outbox_reactive_log\')')) {
        return [{ exists: true }]
      }

      if (sql.includes('FROM greenhouse_sync.outbox_events')) {
        if (values?.[2] === 0) {
          return [
            {
              event_id: 'event-2',
              aggregate_type: 'payroll_period',
              aggregate_id: '2026-03',
              event_type: 'payroll_period.exported',
              payload_json: { periodId: '2026-03' },
              occurred_at: '2026-03-27T12:00:00.000Z'
            }
          ]
        }

        return []
      }

      if (
        sql.includes('FROM greenhouse_sync.outbox_reactive_log') &&
        sql.includes('handler = ANY($2)')
      ) {
        return []
      }

      if (sql.includes('SELECT EXISTS')) {
        return [
          {
            exists: false
          }
        ]
      }

      if (sql.includes('SELECT COALESCE(retries, 0) AS retries')) {
        return [{ retries: 0 }]
      }

      if (sql.includes('INSERT INTO greenhouse_sync.outbox_reactive_log')) {
        return []
      }

      return []
    })

    const result = await processReactiveEvents({ domain: 'notifications' })

    expect(mockMarkRefreshFailed).toHaveBeenCalledWith(
      'payroll_receipts_delivery:payroll_period:2026-03',
      'refresh failed',
      2
    )
    expect(mockMarkRefreshCompleted).not.toHaveBeenCalled()
    expect(result.eventsProcessed).toBe(1)
    expect(result.eventsFailed).toBe(1)
  })

  it('skips terminal older events and advances to later actionable events', async () => {
    const incomeProjection = {
      ...projection,
      name: 'commercial_cost_attribution',
      triggerEvents: ['finance.income.created'],
      refresh: vi.fn()
    }

    mockGetAllTriggerEventTypes.mockReturnValue(['finance.income.created', 'payroll_period.exported'])
    mockGetProjectionsForEvent.mockImplementation((eventType: string) => {
      if (eventType === 'finance.income.created') {
        return [incomeProjection]
      }

      return [projection]
    })

    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.includes('to_regclass(\'greenhouse_sync.outbox_reactive_log\')')) {
        return [{ exists: true }]
      }

      if (sql.includes('FROM greenhouse_sync.outbox_events')) {
        if (values?.[2] && Number(values[2]) > 0) {
          return []
        }

        return [
          {
            event_id: 'event-old-terminal',
            aggregate_type: 'finance_income',
            aggregate_id: 'INC-1',
            event_type: 'finance.income.created',
            payload_json: { incomeId: 'INC-1' },
            occurred_at: '2026-03-20T12:00:00.000Z'
          },
          {
            event_id: 'event-late-actionable',
            aggregate_type: 'payroll_period',
            aggregate_id: '2026-03',
            event_type: 'payroll_period.exported',
            payload_json: { periodId: '2026-03' },
            occurred_at: '2026-03-28T12:00:00.000Z'
          }
        ]
      }

      if (
        sql.includes('FROM greenhouse_sync.outbox_reactive_log') &&
        sql.includes('handler = ANY($2)')
      ) {
        if (values?.[0] === 'event-old-terminal') {
          return [
            {
              handler: 'commercial_cost_attribution:finance.income.created',
              result: 'dead-letter',
              last_error: 'permission denied'
            }
          ]
        }

        return []
      }

      if (sql.includes('SELECT EXISTS')) {
        return [{ exists: false }]
      }

      if (sql.includes('INSERT INTO greenhouse_sync.outbox_reactive_log')) {
        return []
      }

      return []
    })

    const result = await processReactiveEvents({ domain: 'notifications', batchSize: 1 })

    expect(projection.refresh).toHaveBeenCalledWith(
      { entityType: 'payroll_period', entityId: '2026-03' },
      expect.objectContaining({ periodId: '2026-03' })
    )
    expect(incomeProjection.refresh).not.toHaveBeenCalled()
    expect(result.eventsProcessed).toBe(1)
    expect(result.projectionsTriggered).toBe(1)
  })
})
