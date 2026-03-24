import 'server-only'

import { NotificationService } from './notification-service'
import { ensureNotificationSchema } from './schema'

/**
 * Dispatch a welcome notification for a user who just activated their account.
 * Called from SSO identity linking when status transitions from 'invited' to 'active'.
 * Non-blocking — errors are logged but don't break the auth flow.
 */
export const dispatchWelcomeNotification = async (params: {
  userId: string
  email: string
  fullName: string
}) => {
  try {
    await ensureNotificationSchema()

    await NotificationService.dispatch({
      category: 'system_event',
      title: 'Bienvenido a Greenhouse',
      body: 'Tu portal operativo está listo. Explora tus proyectos, métricas y herramientas.',
      actionUrl: '/dashboard',
      icon: 'tabler-plant-2',
      recipients: [{
        userId: params.userId,
        email: params.email,
        fullName: params.fullName
      }]
    })
  } catch (error) {
    // Non-blocking — auth flow must not fail due to notifications
    console.error('[welcome-notification] Failed to dispatch:', error)
  }
}
