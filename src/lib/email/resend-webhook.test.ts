import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWithTransaction = vi.fn()
const mockPublishOutboxEvent = vi.fn()
const mockRunQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (...args: unknown[]) => mockWithTransaction(...args),
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunQuery(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

import { processResendWebhookEvent, redrivePendingResendWebhookEvents } from '@/lib/email/resend-webhook'

type QueryCall = { sql: string; values: unknown[] }

const createTransaction = (options?: {
  inboxStatus?: 'pending' | 'processed' | 'ignored'
  deliveryVisible?: boolean
  deadLetterOnMissing?: boolean
}) => {
  const calls: QueryCall[] = []

  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values })

    if (sql.includes('SELECT processing_status')) {
      return {
        rows: [
          {
            processing_status: options?.inboxStatus ?? 'pending',
            reason_code: options?.inboxStatus === 'ignored' ? 'unsupported_event_type' : null
          }
        ]
      }
    }

    if (sql.includes('FROM greenhouse_notifications.email_deliveries')) {
      return {
        rows:
          options?.deliveryVisible === false
            ? []
            : [
                {
                  delivery_id: 'delivery-1',
                  recipient_email: 'candidate@example.com',
                  email_type: 'hiring_assessment_assigned'
                }
              ]
      }
    }

    if (sql.includes("reason_code = 'delivery_not_yet_visible'")) {
      return { rows: options?.deadLetterOnMissing ? [{ processing_status: 'dead_letter' }] : [] }
    }

    return { rows: [] }
  })

  const client = { query }

  mockWithTransaction.mockImplementation(async callback => callback(client))

  return { calls }
}

describe('processResendWebhookEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPublishOutboxEvent.mockResolvedValue('outbox-1')
    mockRunQuery.mockResolvedValue([])
  })

  it('keeps outbound sent state separate and applies provider delivery monotonically', async () => {
    const { calls } = createTransaction()

    const result = await processResendWebhookEvent({
      providerEventId: 'evt-delivered-1',
      payload: {
        type: 'email.delivered',
        created_at: '2026-08-19T12:00:00.000Z',
        data: { email_id: 'resend-1' }
      }
    })

    expect(result).toEqual({
      outcome: 'processed',
      eventType: 'email.delivered',
      deliveryId: 'delivery-1'
    })

    const providerUpdate = calls.find(call => call.sql.includes('SET provider_status'))

    expect(providerUpdate?.values).toEqual([
      'delivery-1',
      'delivered',
      'evt-delivered-1',
      new Date('2026-08-19T12:00:00.000Z'),
      3
    ])
    expect(providerUpdate?.sql).toContain("provider_status_source = 'reconciliation'")
    expect(providerUpdate?.sql).toContain("provider_status_source = 'webhook'")
    expect(calls.some(call => call.sql.includes("status = 'delivered'"))).toBe(false)
  })

  it('leaves a racing event pending and asks the provider to retry', async () => {
    const { calls } = createTransaction({ deliveryVisible: false })

    const result = await processResendWebhookEvent({
      providerEventId: 'evt-race-1',
      payload: {
        type: 'email.sent',
        created_at: '2026-08-19T12:00:00.000Z',
        data: { email_id: 'resend-race' }
      }
    })

    expect(result).toEqual({
      outcome: 'retry',
      eventType: 'email.sent',
      reason: 'delivery_not_yet_visible'
    })
    expect(calls.some(call => call.sql.includes("reason_code = 'delivery_not_yet_visible'"))).toBe(true)
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })

  it('reports dead-letter honestly when the attempt budget is exhausted', async () => {
    createTransaction({ deliveryVisible: false, deadLetterOnMissing: true })

    const result = await processResendWebhookEvent({
      providerEventId: 'evt-dead-letter',
      payload: {
        type: 'email.sent',
        created_at: '2026-08-19T12:00:00.000Z',
        data: { email_id: 'resend-missing' }
      }
    })

    expect(result).toEqual({
      outcome: 'ignored',
      eventType: 'email.sent',
      reason: 'delivery_not_visible_after_attempt_budget'
    })
  })

  it('deduplicates only an event that was already fully processed', async () => {
    const { calls } = createTransaction({ inboxStatus: 'processed' })

    const result = await processResendWebhookEvent({
      providerEventId: 'evt-duplicate',
      payload: {
        type: 'email.bounced',
        created_at: '2026-08-19T12:00:00.000Z',
        data: { email_id: 'resend-1', bounce: { type: 'Permanent' } }
      }
    })

    expect(result.outcome).toBe('deduplicated')
    expect(calls.some(call => call.sql.includes('FROM greenhouse_notifications.email_deliveries'))).toBe(false)
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })

  it('stores only the click origin and never the bearer URL', async () => {
    const { calls } = createTransaction()

    await processResendWebhookEvent({
      providerEventId: 'evt-click-1',
      payload: {
        type: 'email.clicked',
        created_at: '2026-08-19T12:00:00.000Z',
        data: {
          email_id: 'resend-1',
          click: { link: 'https://greenhouse.efeoncepro.com/assessment/secret-token?utm_source=email' }
        }
      }
    })

    const engagementInsert = calls.find(call => call.sql.includes('email_engagement'))

    expect(engagementInsert?.values.at(-1)).toBe('https://greenhouse.efeoncepro.com')
    expect(JSON.stringify(calls)).not.toContain('secret-token')
  })

  it('redrives a normalized permanent bounce with its full safety side effects', async () => {
    const { calls } = createTransaction()

    mockRunQuery.mockResolvedValue([
      {
        provider_event_id: 'evt-pending-bounce',
        resend_id: 'resend-1',
        event_type: 'email.bounced',
        provider_created_at: new Date('2026-08-19T12:00:00.000Z'),
        bounce_type: 'Permanent',
        click_origin: null
      }
    ])

    const report = await redrivePendingResendWebhookEvents()

    expect(report.processed).toBe(1)
    expect(calls.some(call => call.sql.includes('SET email_undeliverable = TRUE'))).toBe(true)
    expect(mockPublishOutboxEvent).toHaveBeenCalled()
  })
})
