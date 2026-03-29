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
    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('to_regclass(\'greenhouse_sync.outbox_reactive_log\')')) {
        return [{ exists: true }]
      }

      if (sql.includes('FROM greenhouse_sync.outbox_events')) {
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

      if (sql.includes('SELECT EXISTS')) {
        return [{ exists: false }]
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

    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('to_regclass(\'greenhouse_sync.outbox_reactive_log\')')) {
        return [{ exists: true }]
      }

      if (sql.includes('FROM greenhouse_sync.outbox_events')) {
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

      if (sql.includes('SELECT EXISTS')) {
        return [{ exists: false }]
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
})
