import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockSendEmail = vi.fn()
const mockResolveNotificationRecipients = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/email/delivery', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}))

vi.mock('./person-recipient-resolver', () => ({
  resolveNotificationRecipients: (...args: unknown[]) => mockResolveNotificationRecipients(...args)
}))

const { NotificationService } = await import('./notification-service')

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveNotificationRecipients.mockImplementation(async (recipients: unknown[]) => recipients)
    mockSendEmail.mockResolvedValue({
      deliveryId: 'delivery-1',
      resendId: 'resend-1',
      status: 'sent'
    })
    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: unknown) => {
      if (typeof sql !== 'string') return []
      if (sql.includes('FROM greenhouse_notifications.notification_preferences')) return []

      if (sql.includes('INSERT INTO greenhouse_notifications.notifications')) {
        return [{ notification_id: 'notif-1' }]
      }

      return []
    })
  })

  it('routes email notifications through the centralized delivery layer', async () => {
    const result = await NotificationService.dispatch({
      category: 'ico_alert',
      title: 'Umbral ICO',
      body: 'La métrica cruzó el umbral',
      actionUrl: '/dashboard',
      recipients: [{ userId: 'user-1', email: 'user@example.com', fullName: 'User One' }]
    })

    expect(result.sent).toEqual([
      { userId: 'user-1', channels: ['in_app', 'email'] }
    ])
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail.mock.calls[0]?.[0]).toMatchObject({
      emailType: 'notification',
      domain: 'system'
    })
  })

  it('supports email-only recipients without creating in-app notifications', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const result = await NotificationService.dispatch({
      category: 'payroll_ops',
      title: 'Nomina calculada',
      body: 'Lista para revision',
      actionUrl: '/hr/payroll',
      recipients: [{ email: 'external@example.com', fullName: 'External Ops' }]
    })

    expect(result.sent).toEqual([
      { userId: 'external:external@example.com', channels: ['email'] }
    ])
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail.mock.calls[0]?.[0]).toMatchObject({
      recipients: [{ email: 'external@example.com', name: 'External Ops', userId: undefined }]
    })
    expect(
      mockRunGreenhousePostgresQuery.mock.calls.some(
        call => typeof call[0] === 'string' && call[0].includes('INSERT INTO greenhouse_notifications.notifications')
      )
    ).toBe(false)
  })
})
