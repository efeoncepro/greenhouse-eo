import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockSendEmail = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/email/delivery', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}))

const { NotificationService } = await import('./notification-service')

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendEmail.mockResolvedValue({
      deliveryId: 'delivery-1',
      resendId: 'resend-1',
      status: 'sent'
    })
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ notification_id: 'notif-1' }])
      .mockResolvedValue([])
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
})
