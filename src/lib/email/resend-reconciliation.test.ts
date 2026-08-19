import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()
const mockGetClient = vi.fn()
const mockWithTransaction = vi.fn()
const transactionCalls: Array<{ sql: string; values: unknown[] }> = []
let casApplied = true

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => mockWithTransaction(...args)
}))

vi.mock('@/lib/resend', () => ({
  getResendClientAsync: () => mockGetClient()
}))

import { reconcileResendDeliveries } from '@/lib/email/resend-reconciliation'

describe('reconcileResendDeliveries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    transactionCalls.length = 0
    casApplied = true
    mockQuery.mockResolvedValue([
      {
        delivery_id: 'delivery-1',
        resend_id: 'resend-1',
        status: 'sent',
        provider_status: null,
        created_at: '2026-08-19T12:00:00.000Z'
      }
    ])
    mockGetClient.mockResolvedValue({
      emails: {
        get: vi.fn().mockResolvedValue({
          data: {
            last_event: 'delivered',
            created_at: '2026-08-19T12:00:00.000Z'
          },
          error: null
        })
      }
    })
    mockWithTransaction.mockImplementation(async callback =>
      callback({
        query: vi.fn(async (sql: string, values: unknown[] = []) => {
          transactionCalls.push({ sql, values })

          if (sql.includes('SELECT recipient_email')) {
            return {
              rows: [
                {
                  recipient_email: 'candidate@example.com',
                  email_type: 'hiring_assessment_assigned'
                }
              ]
            }
          }

          return sql.includes('RETURNING delivery_id')
            ? { rows: casApplied ? [{ delivery_id: 'delivery-1' }] : [] }
            : { rows: [] }
        })
      })
    )
  })

  it('is dry-run by default and does not mutate lifecycle', async () => {
    const report = await reconcileResendDeliveries({ limit: 10, lookbackDays: 30 })

    expect(report.mode).toBe('dry-run')
    expect(report.wouldApply).toBe(1)
    expect(mockWithTransaction).not.toHaveBeenCalled()
  })

  it('applies only a lifecycle fact explicitly returned by the provider', async () => {
    const report = await reconcileResendDeliveries({ apply: true })

    expect(report.applied).toBe(1)
    const lifecycleUpdate = transactionCalls.find(call => call.sql.includes('UPDATE greenhouse_notifications.email_deliveries'))

    expect(lifecycleUpdate?.values).toEqual([
      'delivery-1',
      'resend-1',
      'delivered',
      'reconcile:resend-1:delivered'
    ])
    expect(lifecycleUpdate?.sql).toContain('provider_event_created_at IS NULL')
    expect(lifecycleUpdate?.sql).not.toContain('provider_event_created_at =')
    expect(lifecycleUpdate?.sql).not.toContain('delivered_at =')
  })

  it('does not infer delivery from opens or clicks', async () => {
    mockGetClient.mockResolvedValue({
      emails: {
        get: vi.fn().mockResolvedValue({
          data: { last_event: 'opened', created_at: '2026-08-19T12:00:00.000Z' },
          error: null
        })
      }
    })

    const report = await reconcileResendDeliveries({ apply: true })

    expect(report.unsupported).toBe(1)
    expect(transactionCalls.some(call => call.sql.includes('UPDATE greenhouse_notifications.email_deliveries'))).toBe(false)
    expect(mockQuery.mock.calls[0]?.[0]).not.toContain('provider_observed_at IS NULL')

    transactionCalls.length = 0
    mockGetClient.mockResolvedValue({
      emails: {
        get: vi.fn().mockResolvedValue({
          data: { last_event: 'delivered', created_at: '2026-08-19T12:00:00.000Z' },
          error: null
        })
      }
    })

    const secondReport = await reconcileResendDeliveries({ apply: true })

    expect(secondReport.applied).toBe(1)
  })

  it('preserves a webhook lifecycle that wins the CAS race', async () => {
    casApplied = false

    const report = await reconcileResendDeliveries({ apply: true })

    expect(report.applied).toBe(0)
    expect(report.preservedExisting).toBe(1)
  })

  it('keeps provider errors sanitized in the report', async () => {
    mockGetClient.mockResolvedValue({
      emails: {
        get: vi.fn().mockResolvedValue({ data: null, error: { message: 'sensitive provider error' } })
      }
    })

    const report = await reconcileResendDeliveries({ apply: true })

    expect(report.providerErrors).toBe(1)
    expect(JSON.stringify(report)).not.toContain('sensitive provider error')
    expect(mockWithTransaction).not.toHaveBeenCalled()
  })

  it('applies complaint unsubscribe and outbox in the same transaction', async () => {
    mockGetClient.mockResolvedValue({
      emails: {
        get: vi.fn().mockResolvedValue({
          data: { last_event: 'complained', created_at: '2026-08-19T12:00:00.000Z' },
          error: null
        })
      }
    })

    const report = await reconcileResendDeliveries({ apply: true })

    expect(report.applied).toBe(1)
    expect(transactionCalls.some(call => call.sql.includes('email_subscriptions'))).toBe(true)
    expect(transactionCalls.some(call => call.sql.includes('greenhouse_sync.outbox_events'))).toBe(true)
  })
})
