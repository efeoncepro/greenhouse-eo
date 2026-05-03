import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockDispatch = vi.fn()
const mockEnsureNotificationSchema = vi.fn()
const mockGetUserNotificationRecipient = vi.fn()
const mockGetRoleCodeNotificationRecipients = vi.fn()
const mockSendEmail = vi.fn()
const mockWasEmailAlreadySent = vi.fn()

const MEMBER_RECIPIENTS = new Map([
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
  }],
  ['member-requester', {
    identityProfileId: 'profile-requester',
    memberId: 'member-requester',
    userId: 'user-requester',
    email: 'requester@example.com',
    fullName: 'Paula Requester'
  }],
  ['member-supervisor', {
    identityProfileId: 'profile-supervisor',
    memberId: 'member-supervisor',
    userId: 'user-supervisor',
    email: 'supervisor@example.com',
    fullName: 'Sofía Supervisor'
  }],
  ['member-delegate', {
    identityProfileId: 'profile-delegate',
    memberId: 'member-delegate',
    userId: 'user-delegate',
    email: 'delegate@example.com',
    fullName: 'Diego Delegate'
  }]
])

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/email/delivery', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  wasEmailAlreadySent: (...args: unknown[]) => mockWasEmailAlreadySent(...args)
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
  getMemberNotificationRecipients: vi.fn(async (memberIds: string[]) =>
    new Map(memberIds.flatMap(memberId => {
      const recipient = MEMBER_RECIPIENTS.get(memberId)

      return recipient ? [[memberId, recipient]] : []
    }))
  ),
  getProfileNotificationRecipient: vi.fn(async () => null),
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
    mockSendEmail.mockResolvedValue(undefined)
    mockWasEmailAlreadySent.mockResolvedValue(false)
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

  it('notifies the delegated approver for leave_request.created', async () => {
    const result = await notificationProjection.refresh(
      { entityType: 'notification', entityId: 'leave_request.created' },
      {
        requestId: 'leave-123',
        memberId: 'member-requester',
        memberName: 'Paula Requester',
        memberEmail: 'requester@example.com',
        supervisorMemberId: 'member-supervisor',
        leaveTypeName: 'Vacaciones',
        startDate: '2026-04-15',
        endDate: '2026-04-18',
        requestedDays: 4,
        reason: 'Descanso',
        approvalSnapshot: {
          stageCode: 'supervisor_review',
          effectiveApproverMemberId: 'member-delegate',
          fallbackRoleCodes: ['hr_manager', 'hr_payroll', 'efeonce_admin']
        }
      }
    )

    expect(result).toBe('notified 1 supervisor(s) about leave_request.created')
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      category: 'leave_review',
      recipients: [
        expect.objectContaining({
          memberId: 'member-delegate',
          email: 'delegate@example.com'
        })
      ]
    }))
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({
      recipients: [
        expect.objectContaining({
          memberId: 'member-supervisor'
        })
      ]
    }))
  })

  it('uses snapshot fallback roles when leave_request escalates to hr', async () => {
    mockGetRoleCodeNotificationRecipients.mockResolvedValueOnce([
      {
        identityProfileId: 'profile-hr',
        memberId: 'member-hr',
        userId: 'user-hr',
        email: 'hr@example.com',
        fullName: 'Helena HR'
      }
    ])

    const result = await notificationProjection.refresh(
      { entityType: 'notification', entityId: 'leave_request.escalated_to_hr' },
      {
        requestId: 'leave-123',
        memberName: 'Paula Requester',
        leaveTypeName: 'Vacaciones',
        startDate: '2026-04-15',
        endDate: '2026-04-18',
        requestedDays: 4,
        reason: 'Descanso',
        approvalSnapshot: {
          stageCode: 'hr_review',
          fallbackRoleCodes: ['hr_manager', 'efeonce_admin']
        }
      }
    )

    expect(result).toBe('notified 1 HR recipients about leave_request.escalated_to_hr')
    expect(mockGetRoleCodeNotificationRecipients).toHaveBeenCalledWith(['hr_manager', 'efeonce_admin'])
  })
})
