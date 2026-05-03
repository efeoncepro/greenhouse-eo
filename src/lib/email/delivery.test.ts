import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockIsResendConfigured = vi.fn()
const mockGetResendClient = vi.fn()
const mockGetEmailFromAddress = vi.fn()
const mockGetSubscribers = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/resend', () => ({
  isResendConfigured: () => mockIsResendConfigured(),
  getResendClient: () => mockGetResendClient(),
  getEmailFromAddress: () => mockGetEmailFromAddress()
}))

vi.mock('@/lib/email/subscriptions', () => ({
  getSubscribers: (...args: unknown[]) => mockGetSubscribers(...args)
}))

const { processFailedEmailDeliveries, sendEmail } = await import('./delivery')

describe('email delivery layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsResendConfigured.mockReturnValue(true)
    mockGetEmailFromAddress.mockReturnValue('no-reply@efeoncepro.com')
    mockGetResendClient.mockReturnValue({
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: 'resend-123' } })
      }
    })
    mockGetSubscribers.mockResolvedValue([])

    mockRunGreenhousePostgresQuery.mockImplementation((sql: string) => {
      if (sql.includes('RETURNING delivery_id')) {
        return Promise.resolve([{ delivery_id: 'delivery-123' }])
      }

      return Promise.resolve([])
    })
  })

  it('sends a templated email and records delivery rows', async () => {
    const result = await sendEmail({
      emailType: 'password_reset',
      domain: 'identity',
      recipients: [{ email: 'user@example.com', name: 'Ada Lovelace' }],
      context: {
        resetUrl: 'https://greenhouse.example/reset?token=abc'
      }
    })

    expect(result.status).toBe('sent')
    expect(result.deliveryId).toEqual(expect.any(String))
    expect(result.resendId).toBe('resend-123')

    const resendClient = mockGetResendClient.mock.results[0]?.value as any

    expect(resendClient.emails.send).toHaveBeenCalledTimes(1)
    expect(resendClient.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@efeoncepro.com',
        to: 'user@example.com',
        subject: 'Restablece tu contraseña — Greenhouse'
      })
    )

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO greenhouse_notifications.email_deliveries'),
      expect.arrayContaining([expect.any(String), 'password_reset', 'identity', 'user@example.com'])
    )

    expect(
      mockRunGreenhousePostgresQuery.mock.calls.some(
        call => typeof call[0] === 'string' && call[0].includes('delivery_payload')
      )
    ).toBe(true)
  })

  it('skips delivery when no recipients can be resolved', async () => {
    mockGetSubscribers.mockResolvedValueOnce([])

    const result = await sendEmail({
      emailType: 'payroll_export',
      domain: 'payroll',
      context: {}
    })

    expect(result.status).toBe('skipped')
    expect(result.resendId).toBeNull()
    expect(mockGetResendClient).not.toHaveBeenCalled()
  })

  it('retries failed deliveries using the persisted replay payload', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation((sql: string) => {
      if (sql.includes("status = 'failed' AND attempt_number")) {
        return Promise.resolve([
          {
            delivery_id: 'delivery-claim-1',
            batch_id: 'batch-1',
            email_type: 'notification',
            domain: 'system',
            recipient_email: 'user@example.com',
            recipient_name: 'User Example',
            recipient_user_id: 'user-1',
            subject: 'Hola',
            resend_id: null,
            status: 'pending',
            has_attachments: true,
            delivery_payload: {
              recipients: [
                {
                  email: 'user@example.com',
                  name: 'User Example',
                  userId: 'user-1'
                }
              ],
              context: {
                title: 'Hola',
                body: 'Tu notificación',
                recipientName: 'User Example'
              },
              attachments: [
                {
                  filename: 'hello.txt',
                  content: { type: 'Buffer', data: [104, 105] },
                  contentType: 'text/plain'
                }
              ]
            },
            source_event_id: 'event-1',
            source_entity: 'service.created',
            actor_email: 'ops@example.com',
            error_message: null,
            attempt_number: 2
          }
        ])
      }

      if (sql.includes("SET status = 'pending'")) {
        return Promise.resolve([
          {
            delivery_id: 'delivery-claim-1',
            batch_id: 'batch-1',
            email_type: 'notification',
            domain: 'system',
            recipient_email: 'user@example.com',
            recipient_name: 'User Example',
            recipient_user_id: 'user-1',
            subject: 'Hola',
            resend_id: null,
            status: 'pending',
            has_attachments: true,
            delivery_payload: {
              recipients: [
                {
                  email: 'user@example.com',
                  name: 'User Example',
                  userId: 'user-1'
                }
              ],
              context: {
                title: 'Hola',
                body: 'Tu notificación',
                recipientName: 'User Example'
              },
              attachments: [
                {
                  filename: 'hello.txt',
                  content: { type: 'Buffer', data: [104, 105] },
                  contentType: 'text/plain'
                }
              ]
            },
            source_event_id: 'event-1',
            source_entity: 'service.created',
            actor_email: 'ops@example.com',
            error_message: null,
            attempt_number: 3
          }
        ])
      }

      if (sql.includes('SET resend_id = $2')) {
        return Promise.resolve([])
      }

      return Promise.resolve([])
    })

    const result = await processFailedEmailDeliveries()

    expect(result).toMatchObject({
      attempted: 1,
      claimed: 1,
      sent: 1,
      failed: 0,
      skipped: 0
    })

    const resendClient = mockGetResendClient.mock.results[0]?.value as any

    expect(resendClient.emails.send).toHaveBeenCalledTimes(1)
    expect(resendClient.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Hola'
      })
    )
  })

  it('returns failed aggregate when RESEND_API_KEY is not configured (config error is retryable)', async () => {
    mockIsResendConfigured.mockReturnValue(false)

    const result = await sendEmail({
      emailType: 'notification',
      domain: 'system',
      recipients: [{ email: 'user@example.com', name: 'User' }],
      context: { title: 'Test', body: 'Test body' }
    })

    expect(result.status).toBe('failed')
    expect(result.recipientResults).toBeDefined()
    expect(result.recipientResults?.[0]?.status).toBe('failed')
  })
})
