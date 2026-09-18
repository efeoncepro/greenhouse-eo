import 'server-only'

/**
 * TASK-1848 — Reactive consumer: `insights.delivery.requested` → despacho del DeliveryIntent de
 * Efeonce Insights (un correo por destinatario). Corre en el `ops-worker` (dominio `notifications`,
 * drenado por su cron existente: no se crea un scheduler nuevo ni uno por cliente).
 *
 * Idempotente por construcción: re-lee el intent desde PG (NUNCA confía en el payload), cada
 * destinatario se reclama atómicamente (`pending → claimed`) y el correo se correlaciona por
 * destinatario e intento en `email_deliveries`. Un reintento humano publica un evento NUEVO (el
 * ledger reactivo deduplica por event_id). Gateado por `INSIGHTS_DELIVERY_ENABLED` en este runtime.
 */

import { dispatchInsightDeliveryIntent } from '@/lib/efeonce-insights/delivery/dispatch'
import type { ProjectionDefinition } from '@/lib/sync/projection-registry'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

export const insightsDeliveryDispatchProjection: ProjectionDefinition = {
  name: 'insights_delivery_dispatch',
  description:
    'TASK-1848 — insights.delivery.requested → un correo por destinatario del intent (enlace compartido o PDF adjunto); claim atómico, dedupe por destinatario/intento, ambiguo no se reenvía.',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.insightDeliveryRequested],
  extractScope: payload => {
    const deliveryIntentId = typeof payload.deliveryIntentId === 'string' ? payload.deliveryIntentId.trim() : ''

    if (!deliveryIntentId) return null

    return { entityType: 'insight_delivery_intent', entityId: deliveryIntentId }
  },
  refresh: async scope => {
    const result = await dispatchInsightDeliveryIntent(scope.entityId)

    if (result.skipped) return `insights_delivery skip: ${result.skipped} (${scope.entityId})`

    return `insights_delivery ${scope.entityId}: accepted=${result.accepted} failed=${result.failed} ambiguous=${result.ambiguous} skipped=${result.skippedRecipients}`
  },
  // El despacho no se reintenta a ciegas: un destinatario ya reclamado no vuelve a `pending` solo.
  maxRetries: 2
}
