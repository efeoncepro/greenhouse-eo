import 'server-only'

import {
  getMemberNotificationRecipients,
  getProfileNotificationRecipient,
  getUserNotificationRecipient,
} from '@/lib/notifications/person-recipient-resolver'
import type { ProjectionDefinition } from '../projection-registry'
import { buildNotificationRecipientKey, NotificationService } from '@/lib/notifications/notification-service'
import { ensureNotificationSchema } from '@/lib/notifications/schema'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const PAYROLL_OPS_RECIPIENTS = [
  { memberId: 'julio-reyes', contactEmail: 'jreyes@efeoncepro.com', fullName: 'Julio Reyes' },
  { memberId: 'humberly-henriquez', contactEmail: 'hhumberly@efeoncepro.com', fullName: 'Humberly Henriquez' }
] as const

type NotificationDispatchRecipient = {
  identityProfileId?: string
  memberId?: string
  userId?: string
  email?: string
  fullName?: string
}

const getRecipientsByRoleCodes = async (roleCodes: string[]) =>
  runGreenhousePostgresQuery<{
    identity_profile_id: string | null
    member_id: string | null
    user_id: string | null
    email: string | null
    full_name: string | null
  } & Record<string, unknown>>(
    `SELECT DISTINCT
       identity_profile_id,
       member_id,
       user_id,
       email,
       full_name
     FROM greenhouse_serving.session_360
     WHERE active = TRUE
       AND status = 'active'
       AND role_codes && $1::text[]
     ORDER BY full_name ASC NULLS LAST, email ASC NULLS LAST
     LIMIT 20`,
    [roleCodes]
  )

const getAdminUsers = async () => getRecipientsByRoleCodes(['efeonce_admin'])

const getFinanceUsers = async () => getRecipientsByRoleCodes(['finance_manager', 'efeonce_admin'])

const getPayrollOpsRecipients = async (): Promise<NotificationDispatchRecipient[]> => {
  const recipientsByMemberId = await getMemberNotificationRecipients(
    PAYROLL_OPS_RECIPIENTS.map(recipient => recipient.memberId),
    {
      fallbacks: Object.fromEntries(
        PAYROLL_OPS_RECIPIENTS.map(recipient => [
          recipient.memberId,
          { email: recipient.contactEmail, fullName: recipient.fullName }
        ])
      )
    }
  )

  return PAYROLL_OPS_RECIPIENTS
    .map(recipient => recipientsByMemberId.get(recipient.memberId) ?? null)
    .filter((recipient): recipient is NotificationDispatchRecipient => recipient !== null)
}

const wasNotificationAlreadySent = async ({
  recipientKey,
  category,
  eventId
}: {
  recipientKey: string
  category: string
  eventId: string | null
}) => {
  if (!eventId) {
    return false
  }

  const rows = await runGreenhousePostgresQuery<{ exists: boolean } & Record<string, unknown>>(
    `SELECT EXISTS (
       SELECT 1
       FROM greenhouse_notifications.notification_log
       WHERE user_id = $1
         AND category = $2
         AND status = 'sent'
         AND metadata ->> 'eventId' = $3
     ) AS exists`,
    [recipientKey, category, eventId]
  )

  return rows[0]?.exists === true
}

const formatPayrollPeriodLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago'
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)))

export const notificationProjection: ProjectionDefinition = {
  name: 'notification_dispatch',
  description: 'Dispatch notifications for key domain events',
  domain: 'notifications',

  triggerEvents: [
    'service.created',
    'identity.reconciliation.approved',
    'finance.dte.discrepancy_found',
    'identity.profile.linked',
    'payroll_period.calculated'
  ],

  extractScope: (payload) => {
    const eventType = payload._eventType as string | undefined

    if (!eventType) return null

    return { entityType: 'notification', entityId: eventType }
  },

  refresh: async (scope, payload) => {
    await ensureNotificationSchema()

    const eventType = scope.entityId

    if (eventType === 'service.created') {
      const users = await getAdminUsers()

      if (users.length === 0) return null

      await NotificationService.dispatch({
        category: 'system_event',
        title: `Nuevo servicio: ${(payload.name as string) || 'Sin nombre'}`,
        body: `Línea: ${(payload.lineaDeServicio as string) || '—'}`,
        actionUrl: '/agency/services',
        metadata: payload,
        recipients: users.map(u => ({
          ...(u.identity_profile_id ? { identityProfileId: u.identity_profile_id } : {}),
          ...(u.member_id ? { memberId: u.member_id } : {}),
          ...(u.user_id ? { userId: u.user_id } : {}),
          ...(u.email ? { email: u.email } : {}),
          ...(u.full_name ? { fullName: u.full_name } : {})
        }))
      })

      return `notified ${users.length} admins about service.created`
    }

    if (eventType === 'identity.reconciliation.approved') {
      const users = await getAdminUsers()

      if (users.length === 0) return null

      await NotificationService.dispatch({
        category: 'system_event',
        title: 'Reconciliación de identidad aprobada',
        body: 'Perfil vinculado correctamente',
        actionUrl: '/admin/identity',
        metadata: payload,
        recipients: users.map(u => ({
          ...(u.identity_profile_id ? { identityProfileId: u.identity_profile_id } : {}),
          ...(u.member_id ? { memberId: u.member_id } : {}),
          ...(u.user_id ? { userId: u.user_id } : {}),
          ...(u.email ? { email: u.email } : {}),
          ...(u.full_name ? { fullName: u.full_name } : {})
        }))
      })

      return 'notified admins about reconciliation.approved'
    }

    if (eventType === 'finance.dte.discrepancy_found') {
      const users = await getFinanceUsers()

      if (users.length === 0) return null

      await NotificationService.dispatch({
        category: 'ico_alert',
        title: 'Discrepancia DTE detectada',
        body: 'Se encontró una discrepancia en la reconciliación de documentos tributarios',
        actionUrl: '/finance/dte-reconciliation',
        metadata: payload,
        recipients: users.map(u => ({
          ...(u.identity_profile_id ? { identityProfileId: u.identity_profile_id } : {}),
          ...(u.member_id ? { memberId: u.member_id } : {}),
          ...(u.user_id ? { userId: u.user_id } : {}),
          ...(u.email ? { email: u.email } : {}),
          ...(u.full_name ? { fullName: u.full_name } : {})
        }))
      })

      return `notified ${users.length} finance users about DTE discrepancy`
    }

    if (eventType === 'identity.profile.linked') {
      const profileId = typeof payload.profileId === 'string' && payload.profileId.trim() ? payload.profileId : null
      const userId = typeof payload.userId === 'string' && payload.userId.trim() ? payload.userId : null

      const recipient = profileId
        ? await getProfileNotificationRecipient(profileId)
        : userId
          ? await getUserNotificationRecipient(userId)
          : null

      if (!recipient) return null

      await NotificationService.dispatch({
        category: 'assignment_change',
        title: 'Perfil vinculado exitosamente',
        body: 'Tu identidad fue verificada y vinculada a tu perfil de equipo',
        actionUrl: '/people/me',
        metadata: payload,
        recipients: [recipient]
      })

      return `notified ${buildNotificationRecipientKey(recipient)} about profile.linked`
    }

    if (eventType === 'payroll_period.calculated') {
      const periodId = typeof payload.periodId === 'string' ? payload.periodId : null
      const year = typeof payload.year === 'number' ? payload.year : null
      const month = typeof payload.month === 'number' ? payload.month : null
      const eventId = typeof payload._eventId === 'string' ? payload._eventId : null

      if (!periodId || !year || !month) return null

      const recipients = await getPayrollOpsRecipients()

      const eligibleUsers = (
        await Promise.all(
          recipients.map(async recipient => ({
            ...recipient,
            recipientKey: buildNotificationRecipientKey(recipient),
            alreadySent: await wasNotificationAlreadySent({
              recipientKey: buildNotificationRecipientKey(recipient) ?? 'unknown-recipient',
              category: 'payroll_ops',
              eventId
            })
          }))
        )
      ).filter(recipient => recipient.recipientKey && !recipient.alreadySent)

      if (eligibleUsers.length === 0) {
        return `payroll_period.calculated already notified for event ${eventId ?? 'without-event-id'}`
      }

      await NotificationService.dispatch({
        category: 'payroll_ops',
        title: `Nómina ${formatPayrollPeriodLabel(year, month)} calculada`,
        body: 'El período oficial quedó calculado y está listo para revisión operativa.',
        actionUrl: '/hr/payroll',
        metadata: {
          ...payload,
          eventId,
          notificationScope: 'payroll_ops'
        },
        recipients: eligibleUsers.map(recipient => ({
          identityProfileId: recipient.identityProfileId,
          memberId: recipient.memberId,
          userId: recipient.userId,
          email: recipient.email,
          fullName: recipient.fullName
        }))
      })

      return `notified ${eligibleUsers.length} payroll ops users about payroll_period.calculated`
    }

    return null
  },

  maxRetries: 1
}
