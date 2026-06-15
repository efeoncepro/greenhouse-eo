import 'server-only'

import { NotificationService } from '@/lib/notifications/notification-service'

import { isNexaActionRuntimeEnabled } from '../flags'
import type {
  NexaActionContext,
  NexaActionDefinition,
  NexaActionExecutionResult,
  NexaActionPreviewResult
} from './types'

/**
 * TASK-1137 — First governed action pilot: mark all of the user's notifications as read.
 *
 * Chosen as the V1 pilot because it is low-risk, idempotent, and self-scoped:
 *   - Domain `notifications` is NOT finance/payroll/legal/security/HR/commercial/client-portal
 *     (the agentic decision doc forbids piloting actions there).
 *   - The userId comes ALWAYS from the session (anti-oracle) — the LLM/client never supplies it,
 *     so a user can only ever mark THEIR OWN notifications read.
 *   - Re-execution is harmless (already-read stays read) and the command store is idempotent.
 *
 * Reuses the canonical command `NotificationService.markAllAsRead` — never recomputes notification
 * state. The preview reads `getUnreadCount` (read-only).
 */
export const markNotificationsReadAction: NexaActionDefinition = {
  actionKey: 'mark_notifications_read',
  intent: 'Marcar todas tus notificaciones como leídas',
  sensitivity: 'low',
  domain: 'notifications',
  // Self-action: marcar las notificaciones PROPIAS no requiere capability de dominio adicional.
  // La capability del runtime (`nexa.action.execute`) se chequea en el tool + el endpoint.
  requiredCapability: null,
  // Per-action allowlist. El runtime master flag se chequea por separado en el resolver; acá
  // bastaría `true`, pero mantenemos el gate explícito para que una acción nueva pueda
  // habilitarse/deshabilitarse de forma independiente.
  isEnabled: () => isNexaActionRuntimeEnabled(),
  isPermitted: (context: NexaActionContext) => Boolean(context.userId),
  async buildPreview(context: NexaActionContext): Promise<NexaActionPreviewResult> {
    const unread = await NotificationService.getUnreadCount(context.userId)

    return {
      title: 'Marcar notificaciones como leídas',
      summary:
        unread > 0
          ? `Tienes ${unread} notificación${unread === 1 ? '' : 'es'} sin leer. Al confirmar, se marcarán todas como leídas.`
          : 'No tienes notificaciones sin leer.',
      metrics: [{ label: 'Sin leer', value: String(unread) }]
    }
  },
  async execute(context: NexaActionContext): Promise<NexaActionExecutionResult> {
    const updatedCount = await NotificationService.markAllAsRead(context.userId)

    return {
      ok: true,
      summary:
        updatedCount > 0
          ? `Listo: marqué ${updatedCount} notificación${updatedCount === 1 ? '' : 'es'} como leída${updatedCount === 1 ? '' : 's'}.`
          : 'No había notificaciones sin leer para marcar.',
      metrics: [{ label: 'Marcadas', value: String(updatedCount) }],
      raw: { updatedCount }
    }
  },
  confirmation: {
    title: 'Marcar todas como leídas',
    body: 'Se marcarán todas tus notificaciones como leídas. Esta acción afecta solo a tu cuenta.',
    confirmLabel: 'Marcar como leídas',
    cancelLabel: 'Cancelar'
  },
  deepLinkFallback: '/notifications',
  expirationSeconds: 300
}
