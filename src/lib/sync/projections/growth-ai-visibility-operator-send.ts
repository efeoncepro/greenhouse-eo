import 'server-only'

/**
 * TASK-1279 — Reactive consumer: envío operador del informe AEO + creación del Lead HubSpot.
 *
 * Trigger: `growth.ai_visibility.report_send_requested` (emitido por el command gobernado
 * `sendAeoReportAndCreateLead`). Hace el WRITE authoritative via `executeOperatorReportSend`
 * (re-lee el send log de PG, NUNCA confía en el payload). Gates duros (flag + estado del reporte
 * + idempotencia por sub-paso) viven en el executor. Lane: `ops-reactive-growth`. Espeja
 * `growthAiVisibilityReportEmailProjection`.
 *
 * Idempotente: `email_status`/`lead_status` del send log evitan re-enviar/re-crear en retry.
 * Manejo de fallo: retryable → throw (retry/dead-letter); no-retryable → captura + ack; skip → ack.
 */

import { executeOperatorReportSend } from '@/lib/growth/ai-visibility/operator/execute-operator-send'
import { GROWTH_AI_VISIBILITY_REPORT_SEND_REQUESTED_EVENT } from '@/lib/growth/ai-visibility/operator/send-events'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProjectionDefinition } from '../projection-registry'

export const growthAiVisibilityOperatorSendProjection: ProjectionDefinition = {
  name: 'growth_ai_visibility_operator_send',
  description:
    'TASK-1279 — growth.ai_visibility.report_send_requested → envía el informe AEO + crea el Lead HubSpot (cross-sell operador; público-safe, consent-gated, idempotente por sub-paso)',
  domain: 'growth',
  triggerEvents: [GROWTH_AI_VISIBILITY_REPORT_SEND_REQUESTED_EVENT],
  extractScope: payload => {
    const sendId = typeof payload.sendId === 'string' ? payload.sendId.trim() : ''

    if (!sendId) return null

    return { entityType: 'growth_ai_visibility_report_send', entityId: sendId }
  },
  refresh: async scope => {
    const sendId = scope.entityId
    const result = await executeOperatorReportSend(sendId)

    if (result.status === 'failed') {
      if (result.retryable) {
        const err = new Error(`operator_send transient failure for send ${sendId}: ${result.reason ?? 'unknown'}`)

        captureWithDomain(err, 'growth', {
          tags: { source: 'growth_ai_visibility_operator_send', stage: 'projection', retryable: 'true' },
          extra: { sendId }
        })

        throw err
      }

      captureWithDomain(
        new Error(`operator_send permanent failure for send ${sendId}: ${result.reason ?? 'unknown'}`),
        'growth',
        {
          level: 'error',
          tags: { source: 'growth_ai_visibility_operator_send', stage: 'projection', retryable: 'false' },
          extra: { sendId }
        }
      )

      return `operator_send permanent-fail (acked): send ${sendId} reason=${result.reason ?? 'unknown'}`
    }

    if (result.status === 'skipped') {
      return `operator_send skipped: send ${sendId} reason=${result.reason ?? 'unknown'}`
    }

    return `operator_send ok: send ${sendId}`
  },
  maxRetries: 3
}
