import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockPublishPendingOutboxEvents = vi.fn()
const mockEnsureReactiveSchema = vi.fn()
const mockProcessReactiveEvents = vi.fn()

vi.mock('@/lib/sync/outbox-consumer', () => ({
  publishPendingOutboxEvents: (...args: unknown[]) => mockPublishPendingOutboxEvents(...args)
}))

vi.mock('@/lib/sync/reactive-consumer', () => ({
  ensureReactiveSchema: () => mockEnsureReactiveSchema(),
  processReactiveEvents: (...args: unknown[]) => mockProcessReactiveEvents(...args)
}))

const { dispatchPayrollExportNotifications } = await import('./dispatch-payroll-export-notifications')

describe('dispatchPayrollExportNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPublishPendingOutboxEvents.mockResolvedValue({ runId: 'outbox-1' })
    mockEnsureReactiveSchema.mockResolvedValue(undefined)
    mockProcessReactiveEvents.mockResolvedValue({
      runId: 'react-1',
      eventsProcessed: 1,
      eventsFailed: 0,
      projectionsTriggered: 1,
      actions: ['sent payroll export ready email for 2026-03'],
      durationMs: 10
    })
  })

  it('publishes pending outbox events and processes notification projections', async () => {
    const result = await dispatchPayrollExportNotifications()

    expect(mockPublishPendingOutboxEvents).toHaveBeenCalledWith({ batchSize: 100 })
    expect(mockEnsureReactiveSchema).toHaveBeenCalled()
    expect(mockProcessReactiveEvents).toHaveBeenCalledWith({ domain: 'notifications' })
    expect(result.outbox).toEqual({ runId: 'outbox-1' })
    expect(result.reactive).toEqual({
      runId: 'react-1',
      eventsProcessed: 1,
      eventsFailed: 0,
      projectionsTriggered: 1,
      actions: ['sent payroll export ready email for 2026-03'],
      durationMs: 10
    })
    expect(result.error).toBeUndefined()
  })

  it('returns an error message when dispatch fails', async () => {
    mockPublishPendingOutboxEvents.mockRejectedValueOnce(new Error('publish failed'))
    mockProcessReactiveEvents.mockRejectedValueOnce(new Error('reactive failed'))

    const result = await dispatchPayrollExportNotifications()

    expect(result.error).toBe('reactive failed')
  })
})
