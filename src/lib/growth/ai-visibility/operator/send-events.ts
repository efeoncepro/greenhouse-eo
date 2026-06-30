/**
 * TASK-1279 — Growth AI Visibility · operator cross-sell send · eventos outbox.
 *
 * El envío operador del informe AEO + creación del Lead HubSpot sigue el patrón canónico
 * outbox + reactive consumer (NUNCA email/HubSpot inline en el route handler Vercel). El command
 * gobernado `sendAeoReportAndCreateLead` publica `report_send_requested`; el reactive consumer
 * (lane `ops-reactive-growth`) lo drena y ejecuta `executeOperatorReportSend`, que re-lee de PG
 * (el send log) y nunca confía en el payload. Espeja los eventos del handoff / report email de
 * TASK-1242/1250, pero con aggregate PROPIO (la decisión de envío del operador es la entidad).
 */

/** El send log (decisión de envío del operador) es la entidad. aggregateId = send_id. */
export const GROWTH_AI_VISIBILITY_REPORT_SEND_AGGREGATE = 'growth_ai_visibility_report_send' as const

/** Solicitud de envío operador del informe + creación del Lead HubSpot (cross-sell gobernado). */
export const GROWTH_AI_VISIBILITY_REPORT_SEND_REQUESTED_EVENT =
  'growth.ai_visibility.report_send_requested' as const

/** `type` (no `interface`) para que sea asignable a `Record<string, unknown>` del publisher. */
export type ReportSendRequestedPayload = {
  schemaVersion: 1
  /** El send log a ejecutar. El consumer re-lee TODO de PG (PII-free: solo el id del audit). */
  sendId: string
}
