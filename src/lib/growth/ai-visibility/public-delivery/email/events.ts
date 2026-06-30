/**
 * TASK-1250 — Growth AI Visibility · report email delivery · eventos outbox.
 *
 * La entrega del informe por email sigue el patrón canónico outbox + reactive consumer
 * (write-side, NUNCA on-read del GET de status). El command gobernado publica
 * `report_email_requested` desde los puntos de publicación del snapshot (auto-finalize del
 * worker, aprobación TASK-1244, route admin de publish); el reactive consumer (lane
 * `ops-reactive-growth`) lo drena y ejecuta `dispatchAiVisibilityReportEmail`. La pantalla
 * pública (TASK-1241) y el email son dos consumers del MISMO delivery state.
 *
 * Mismo aggregate que el handoff (`growth_ai_visibility_lead`): el lead es la entidad; el
 * payload es PII-free (solo runId + trigger); el consumer re-lee de PG.
 */

export const GROWTH_AI_VISIBILITY_LEAD_AGGREGATE = 'growth_ai_visibility_lead' as const

/** Solicitud de envío del email de entrega del informe al lead (auto-publish o resend admin). */
export const GROWTH_AI_VISIBILITY_REPORT_EMAIL_REQUESTED_EVENT =
  'growth.ai_visibility.report_email_requested' as const

/** `type` (no `interface`) para que sea asignable a `Record<string, unknown>` del publisher. */
export type ReportEmailRequestedPayload = {
  schemaVersion: 1
  /** El run cuyo snapshot publicado se entrega por email. El consumer re-lee de PG (PII-free). */
  runId: string
  /** Origen del disparo (observabilidad). */
  trigger: 'report_published' | 'admin_resend'
}
