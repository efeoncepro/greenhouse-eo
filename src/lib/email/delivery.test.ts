import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockIsResendConfigured = vi.fn()
const mockGetResendClient = vi.fn()
const mockGetEmailFromAddress = vi.fn()
const mockGetSubscribers = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
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

const { sendEmail } = await import('./delivery')

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
    expect(resendClient.emails.send).toHaveBeenCalledWith(expect.objectContaining({
      from: 'no-reply@efeoncepro.com',
      to: 'user@example.com',
      subject: 'Restablece tu contraseña — Greenhouse'
    }))

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO greenhouse_notifications.email_deliveries'),
      expect.arrayContaining([
        expect.any(String),
        'password_reset',
        'identity',
        'user@example.com'
      ])
    )
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
})
