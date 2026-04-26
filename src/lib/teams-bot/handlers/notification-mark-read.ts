import 'server-only'

import {
  registerTeamsBotAction,
  type TeamsBotActionContext,
  type TeamsBotActionResult
} from '../action-registry'

/**
 * TASK-671 — handler for the "Marcar como leído" button on a notification card.
 *
 * MVP: simply acknowledges the click and returns a confirmation. A future iteration
 * (when the notifications module exposes a write API) will:
 *  - lookup the notification by id
 *  - mark it as read for the principal's user_id
 *  - return the count of remaining unread notifications
 */

interface NotificationMarkReadData {
  notificationId: string
}

const validateData = (data: unknown): data is NotificationMarkReadData => {
  if (!data || typeof data !== 'object') return false

  const id = (data as { notificationId?: unknown }).notificationId

  return typeof id === 'string' && id.trim().length > 0 && id.length <= 128
}

const handler = async (
  _data: NotificationMarkReadData,
  ctx: TeamsBotActionContext
): Promise<TeamsBotActionResult> => {
  return {
    ok: true,
    message: `👍 Marcada como leída para ${ctx.tenantContext.email}`
  }
}

registerTeamsBotAction<NotificationMarkReadData>({
  actionId: 'notification.mark_read',
  description: 'Marca una notificación como leída sin requerir abrir el portal.',
  domain: 'platform',
  validateData,
  handler
})
