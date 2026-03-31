import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockDispatch = vi.fn()
const mockEnsureNotificationSchema = vi.fn()
const mockGetUserNotificationRecipient = vi.fn()
const mockGetRoleCodeNotificationRecipients = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/notifications/notification-service', () => ({
  NotificationService: {
    dispatch: (...args: unknown[]) => mockDispatch(...args)
  },
  buildNotificationRecipientKey: (recipient: {
    userId?: string
    identityProfileId?: string
    email?: string
  }) =>
    recipient.userId
    ?? (recipient.identityProfileId ? `profile:${recipient.identityProfileId.trim()}` : null)
    ?? (recipient.email ? `external:${recipient.email.trim().toLowerCase()}` : null)
}))

vi.mock('@/lib/notifications/schema', () => ({
  ensureNotificationSchema: (...args: unknown[]) => mockEnsureNotificationSchema(...args)
}))

vi.mock('@/lib/notifications/person-recipient-resolver', () => ({
  getMemberNotificationRecipients: vi.fn(async () => new Map([
    ['julio-reyes', {
      identityProfileId: 'profile-julio',
      memberId: 'julio-reyes',
      userId: 'user-efeonce-admin-julio-reyes',
      email: 'jreyes@efeoncepro.com',
      fullName: 'Julio Reyes'
    }],
    ['humberly-henriquez', {
      identityProfileId: 'profile-humberly',
      memberId: 'humberly-henriquez',
      userId: 'user-efeonce-internal-humberly-henriquez',
      email: 'humberly.henriquez@efeonce.org',
      fullName: 'Humberly Henriquez'
    }]
  ])),
  getIdentityProfileNotificationRecipients: vi.fn(async () => new Map()),
  getRoleCodeNotificationRecipients: (...args: unknown[]) => mockGetRoleCodeNotificationRecipients(...args),
  getUserNotificationRecipient: (...args: unknown[]) => mockGetUserNotificationRecipient(...args)
}))

const { notificationProjection } = await import('./notifications')

describe('notificationProjection payroll ops', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsureNotificationSchema.mockResolvedValue(undefined)
    mockDispatch.mockResolvedValue({ sent: [], skipped: [], failed: [] })
    mockGetUserNotificationRecipient.mockResolvedValue(null)
    mockGetRoleCodeNotificationRecipients.mockResolvedValue([])
  })

  it('dispatches payroll ops notifications to mixed portal and email-only recipients', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ exists: false }])
      .mockResolvedValueOnce([{ exists: false }])

    const result = await notificationProjection.refresh(
      { entityType: 'notification', entityId: 'payroll_period.calculated' },
      {
        periodId: '2026-03',
        year: 2026,
        month: 3,
        _eventId: 'evt-123'
      }
    )

    expect(result).toBe('notified 2 payroll ops users about payroll_period.calculated')
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      category: 'payroll_ops',
      title: 'Nómina marzo de 2026 calculada',
      recipients: [
        {
          identityProfileId: 'profile-julio',
          memberId: 'julio-reyes',
          userId: 'user-efeonce-admin-julio-reyes',
          email: 'jreyes@efeoncepro.com',
          fullName: 'Julio Reyes'
        },
        {
          identityProfileId: 'profile-humberly',
          memberId: 'humberly-henriquez',
          userId: 'user-efeonce-internal-humberly-henriquez',
          email: 'humberly.henriquez@efeonce.org',
          fullName: 'Humberly Henriquez'
        }
      ]
    }))
  })

  it('dispatches a user-facing notification when view overrides change effective access', async () => {
    mockGetUserNotificationRecipient.mockResolvedValue({
      identityProfileId: 'profile-user-1',
      userId: 'user-1',
      email: 'user-1@example.com',
      fullName: 'María López'
    })

    const result = await notificationProjection.refresh(
      { entityType: 'notification', entityId: 'access.view_override_changed' },
      {
        userId: 'user-1',
        userName: 'María López',
        userEmail: 'user-1@example.com',
        grantedViews: [
          { viewCode: 'finanzas.inteligencia', label: 'Inteligencia financiera', routePath: '/finance/intelligence' }
        ],
        revokedViews: [
          { viewCode: 'finanzas.conciliacion', label: 'Conciliación' }
        ]
      }
    )

    expect(result).toBe('notified user-1 about access.view_override_changed')
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      category: 'system_event',
      title: 'Tu acceso al portal fue actualizado',
      body: 'Ahora puedes ver Inteligencia financiera. Ya no verás Conciliación',
      actionUrl: '/finance/intelligence',
      recipients: [
        {
          identityProfileId: 'profile-user-1',
          userId: 'user-1',
          email: 'user-1@example.com',
          fullName: 'María López'
        }
      ]
    }))
  })

  it('dispatches admin notifications through the shared role-based person-first helper', async () => {
    mockGetRoleCodeNotificationRecipients.mockResolvedValueOnce([
      {
        identityProfileId: 'profile-admin',
        memberId: 'member-admin',
        userId: 'user-admin',
        email: 'admin@efeoncepro.com',
        fullName: 'Admin One'
      }
    ])

    const result = await notificationProjection.refresh(
      { entityType: 'notification', entityId: 'service.created' },
      {
        name: 'Nueva propuesta SEO',
        lineaDeServicio: 'SEO'
      }
    )

    expect(result).toBe('notified 1 admins about service.created')
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      category: 'system_event',
      title: 'Nuevo servicio: Nueva propuesta SEO',
      body: 'Línea: SEO',
      actionUrl: '/agency/services',
      recipients: [
        {
          identityProfileId: 'profile-admin',
          memberId: 'member-admin',
          userId: 'user-admin',
          email: 'admin@efeoncepro.com',
          fullName: 'Admin One'
        }
      ]
    }))
  })
})
