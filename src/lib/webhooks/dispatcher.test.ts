import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  runGreenhousePostgresQuery,
  ensureWebhookSchema,
  getActiveSubscriptions,
  upsertDelivery,
  getPendingDeliveries,
  buildWebhookEnvelope,
  matchesSubscription,
  deliverWebhook
} = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  ensureWebhookSchema: vi.fn(),
  getActiveSubscriptions: vi.fn(),
  upsertDelivery: vi.fn(),
  getPendingDeliveries: vi.fn(),
  buildWebhookEnvelope: vi.fn(),
  matchesSubscription: vi.fn(),
  deliverWebhook: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery
}))

vi.mock('./store', () => ({
  ensureWebhookSchema,
  getActiveSubscriptions,
  upsertDelivery,
  getPendingDeliveries
}))

vi.mock('./envelope', () => ({
  buildWebhookEnvelope
}))

vi.mock('./outbound', () => ({
  matchesSubscription,
  deliverWebhook
}))

import { dispatchPendingWebhooks } from './dispatcher'

describe('dispatchPendingWebhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    ensureWebhookSchema.mockResolvedValue(undefined)
    getPendingDeliveries.mockResolvedValue([])
    upsertDelivery.mockResolvedValue({ id: 'wh-del-1', isNew: true })
    matchesSubscription.mockReturnValue(true)
    buildWebhookEnvelope.mockReturnValue({})
    deliverWebhook.mockResolvedValue(undefined)
  })

  it('queries recent published events with newest-first ordering', async () => {
    getActiveSubscriptions.mockResolvedValue([
      {
        webhook_subscription_id: 'wh-sub-canary',
        event_filters_json: [{ event_type: 'finance.income.nubox_synced' }]
      }
    ])

    runGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        event_id: 'evt-1',
        aggregate_type: 'finance_income',
        aggregate_id: 'income-1',
        event_type: 'finance.income.nubox_synced',
        payload_json: {},
        occurred_at: new Date().toISOString()
      }
    ])

    const result = await dispatchPendingWebhooks({ batchSize: 5 })

    expect(result.eventsMatched).toBe(1)
    expect(runGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY published_at DESC NULLS LAST, occurred_at DESC"),
      [5]
    )
    expect(upsertDelivery).toHaveBeenCalledWith('evt-1', 'wh-sub-canary', 'finance.income.nubox_synced')
  })
})
