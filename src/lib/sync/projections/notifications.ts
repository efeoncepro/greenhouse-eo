import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { NotificationService } from '@/lib/notifications/notification-service'
import { ensureNotificationSchema } from '@/lib/notifications/schema'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

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

export const notificationProjection: ProjectionDefinition = {
  name: 'notification_dispatch',
  description: 'Dispatch notifications for key domain events',
  domain: 'notifications',

  triggerEvents: [
    'service.created',
    'identity.reconciliation.approved',
    'finance.dte.discrepancy_found',
    'identity.profile.linked'
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

    return null
  },

  maxRetries: 1
}
