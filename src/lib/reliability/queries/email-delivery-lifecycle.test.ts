import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()
const mockCapture = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCapture(...args)
}))

import { getEmailDeliveryLifecycleSignal } from '@/lib/reliability/queries/email-delivery-lifecycle'

describe('getEmailDeliveryLifecycleSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('covers every delivery source and separates missing lifecycle from delayed terminal outcome', async () => {
    mockQuery.mockResolvedValue([
      {
        stale_token_intent_15m: 0,
        webhook_pending_15m: 0,
        webhook_dead_letter_24h: 0,
        lifecycle_missing_24h: 2,
        terminal_outcome_pending_24h: 3,
        provider_failure_24h: 0
      }
    ])

    const signal = await getEmailDeliveryLifecycleSignal()
    const sql = mockQuery.mock.calls[0]?.[0] as string

    expect(sql).toContain('greenhouse_notifications.email_deliveries')
    expect(sql).not.toContain('greenhouse_hiring')
    expect(sql).toContain('provider_status IS NULL')
    expect(sql).toContain("provider_status IN ('sent', 'delivery_delayed')")
    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('no tienen lifecycle')
  })

  it('prioritizes durable signed events that remain pending', async () => {
    mockQuery.mockResolvedValue([
      {
        stale_token_intent_15m: 0,
        webhook_pending_15m: 1,
        webhook_dead_letter_24h: 0,
        lifecycle_missing_24h: 0,
        terminal_outcome_pending_24h: 0,
        provider_failure_24h: 0
      }
    ])

    const signal = await getEmailDeliveryLifecycleSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('firmado')
  })

  it('surfaces stale token intents that must use explicit recovery', async () => {
    mockQuery.mockResolvedValue([{
      stale_token_intent_15m: 1,
      webhook_pending_15m: 0,
      webhook_dead_letter_24h: 0,
      lifecycle_missing_24h: 0,
      terminal_outcome_pending_24h: 0,
      provider_failure_24h: 0
    }])

    const signal = await getEmailDeliveryLifecycleSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('recuperación explícita')
    expect(signal.evidence).toContainEqual({ kind: 'metric', label: 'stale_token_intent_15m', value: '1' })
  })
})
