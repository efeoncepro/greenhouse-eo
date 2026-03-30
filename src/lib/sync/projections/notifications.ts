import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { NotificationService } from '@/lib/notifications/notification-service'
import { ensureNotificationSchema } from '@/lib/notifications/schema'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const PAYROLL_OPS_RECIPIENT_EMAILS = ['jreyes@efeoncepro.com', 'hhumberly@efeoncepro.com'] as const

const getAdminUsers = async () =>
  runGreenhousePostgresQuery<{ user_id: string; email: string; full_name: string } & Record<string, unknown>>(
    `SELECT user_id, email, full_name FROM greenhouse_core.client_users
     WHERE status = 'active' AND role_codes @> ARRAY['efeonce_admin']
     LIMIT 10`
  )

const getFinanceUsers = async () =>
  runGreenhousePostgresQuery<{ user_id: string; email: string; full_name: string } & Record<string, unknown>>(
    `SELECT user_id, email, full_name FROM greenhouse_core.client_users
     WHERE status = 'active'
       AND (role_codes @> ARRAY['finance_manager'] OR role_codes @> ARRAY['efeonce_admin'])
     LIMIT 10`
  )

const getPayrollOpsUsers = async () =>
  runGreenhousePostgresQuery<{ user_id: string; email: string; full_name: string } & Record<string, unknown>>(
    `SELECT user_id, email, full_name
     FROM greenhouse_core.client_users
     WHERE status = 'active'
       AND LOWER(email) = ANY($1::text[])
     ORDER BY full_name ASC NULLS LAST, email ASC NULLS LAST
     LIMIT 10`,
    [PAYROLL_OPS_RECIPIENT_EMAILS]
  )

const wasNotificationAlreadySent = async ({
  userId,
  category,
  eventId
}: {
  userId: string
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
    [userId, category, eventId]
  )

  return rows[0]?.exists === true
}

const formatPayrollPeriodLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago'
  }).format(new Date(Date.UTC(year, month - 1, 1)))

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
        recipients: users.map(u => ({ userId: u.user_id, email: u.email, fullName: u.full_name }))
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
        recipients: users.map(u => ({ userId: u.user_id, email: u.email, fullName: u.full_name }))
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
        recipients: users.map(u => ({ userId: u.user_id, email: u.email, fullName: u.full_name }))
      })

      return `notified ${users.length} finance users about DTE discrepancy`
    }

    if (eventType === 'identity.profile.linked') {
      const userId = payload.userId as string

      if (!userId) return null

      await NotificationService.dispatch({
        category: 'assignment_change',
        title: 'Perfil vinculado exitosamente',
        body: 'Tu identidad fue verificada y vinculada a tu perfil de equipo',
        actionUrl: '/people/me',
        metadata: payload,
        recipients: [{ userId }]
      })

      return `notified user ${userId} about profile.linked`
    }

    if (eventType === 'payroll_period.calculated') {
      const periodId = typeof payload.periodId === 'string' ? payload.periodId : null
      const year = typeof payload.year === 'number' ? payload.year : null
      const month = typeof payload.month === 'number' ? payload.month : null
      const eventId = typeof payload._eventId === 'string' ? payload._eventId : null

      if (!periodId || !year || !month) return null

      const users = await getPayrollOpsUsers()

      if (users.length === 0) return null

      const eligibleUsers = (
        await Promise.all(
          users.map(async user => ({
            ...user,
            alreadySent: await wasNotificationAlreadySent({
              userId: user.user_id,
              category: 'payroll_ops',
              eventId
            })
          }))
        )
      ).filter(user => !user.alreadySent)

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
        recipients: eligibleUsers.map(user => ({
          userId: user.user_id,
          email: user.email,
          fullName: user.full_name
        }))
      })

      return `notified ${eligibleUsers.length} payroll ops users about payroll_period.calculated`
    }

    return null
  },

  maxRetries: 1
}
