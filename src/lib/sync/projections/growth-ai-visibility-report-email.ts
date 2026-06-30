import 'server-only'

/**
 * TASK-1250 — Reactive consumer: snapshot publicado del grader → email de entrega al lead.
 *
 * Trigger: `growth.ai_visibility.report_email_requested` (emitido por el command gobernado
 * `requestAiVisibilityReportEmail` desde los puntos de publicación del snapshot). Hace el WRITE
 * authoritative via `dispatchAiVisibilityReportEmail` (re-lee de PG, NUNCA confía en el payload).
 * Gates duros viven en dispatch (flag + consent + estado del reporte + claim idempotente).
 * Lane: `ops-reactive-growth`. Espeja `growthAiVisibilityLeadHandoffProjection`.
 *
 * Idempotente: el claim DB-level (UNIQUE report_id, email_type) garantiza envío único.
 * Manejo de fallo: `failed` retryable → throw (retry/dead-letter); `failed` no-retryable →
 * captura + ack; `skipped` → ack.
 */

import { dispatchAiVisibilityReportEmail } from '@/lib/growth/ai-visibility/public-delivery/email/dispatch-report-email'
import { GROWTH_AI_VISIBILITY_REPORT_EMAIL_REQUESTED_EVENT } from '@/lib/growth/ai-visibility/public-delivery/email/events'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProjectionDefinition } from '../projection-registry'

export const growthAiVisibilityReportEmailProjection: ProjectionDefinition = {
  name: 'growth_ai_visibility_report_email',
  description:
    'TASK-1250 — growth.ai_visibility.report_email_requested → envía el informe por email al lead (adjunto PDF público-safe, consent+estado gated, idempotente DB-level)',
  domain: 'growth',
  triggerEvents: [GROWTH_AI_VISIBILITY_REPORT_EMAIL_REQUESTED_EVENT],
  extractScope: payload => {
    const runId = typeof payload.runId === 'string' ? payload.runId.trim() : ''

    if (!runId) return null

    return { entityType: 'growth_ai_visibility_lead', entityId: runId }
  },
  refresh: async scope => {
    const runId = scope.entityId
    const result = await dispatchAiVisibilityReportEmail(runId)

    if (result.status === 'failed') {
      if (result.retryable) {
        // Fallo transitorio (delivery rate-limited / red / excepción): throw → retry/dead-letter.
        const err = new Error(`report_email transient failure for run ${runId}: ${result.reason ?? 'unknown'}`)

        captureWithDomain(err, 'growth', {
          tags: { source: 'growth_ai_visibility_report_email', stage: 'dispatch', retryable: 'true' },
          extra: { runId }
        })

        throw err
      }

      // No-retryable: reintentar no ayuda. Captura + ack para no quemar reintentos.
      captureWithDomain(
        new Error(`report_email permanent failure for run ${runId}: ${result.reason ?? 'unknown'}`),
        'growth',
        {
          level: 'error',
          tags: { source: 'growth_ai_visibility_report_email', stage: 'dispatch', retryable: 'false' },
          extra: { runId }
        }
      )

      return `report_email permanent-fail (acked): run ${runId} reason=${result.reason ?? 'unknown'}`
    }

    if (result.status === 'skipped') {
      return `report_email skipped: run ${runId} reason=${result.reason ?? 'unknown'}`
    }

    return `report_email ok: run ${runId}`
  },
  maxRetries: 3
}
