/**
 * TASK-912 — Feature flags canonical del pipeline de captura de transiciones
 * de estado productivo. Patrón canonical Greenhouse `process.env.X === 'true'`
 * (sin drift posible, default OFF), mirror de
 * `src/lib/payroll/exit-eligibility/flag.ts` + `src/lib/ico-engine/materialize-flags.ts`.
 *
 * **Default OFF es load-bearing**: al merge, el webhook handler hace ACK + drop
 * (cero re-fetch, cero outbox emit). La activación es un acto operador-side
 * deliberado, gated y observable — NUNCA automático. Garantiza que mergear esta
 * task NO afecte los flujos delicados de métricas Notion existentes
 * (notion-bq-sync legacy + pipeline demo TASK-913/914 intactos).
 */

/**
 * Kill-switch del webhook ingestion productivo `/api/webhooks/notion-status-transitions`.
 * Cuando OFF (default): el handler valida el verification handshake de Notion
 * (para permitir (re)suscripción) pero NO procesa events — ACK + drop silencioso,
 * sin emitir `notion.task.page_change_signal`. Cuando ON: pipeline completo activo.
 */
export const isNotionStatusTransitionsWebhookEnabled = (): boolean =>
  process.env.NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED === 'true'

/**
 * TASK-921 — Kill-switch de la captura de cambios de fecha límite
 * (`task_due_date_changes`). El consumer `notion-due-date-change-capture`
 * reusa el evento `notion.task.page_change_signal` que el webhook
 * `notion-status-transitions` YA emite (y que YA está ON en producción), así que
 * necesita su PROPIO flag para no empezar a capturar al merge.
 *
 * **Default OFF es load-bearing**: con el flag OFF, el consumer hace no-op
 * (cero re-fetch, cero persist). Mergear TASK-921 NO afecta nada aunque
 * `page_change_signal` esté fluyendo. La activación es operador-side deliberada,
 * gated y observable. Mirror del patrón TASK-912.
 */
export const isNotionDueDateCaptureEnabled = (): boolean =>
  process.env.NOTION_DUE_DATE_CAPTURE_ENABLED === 'true'

/**
 * TASK-922 (M2) — Kill-switch del cómputo shadow de atraso imputable
 * (`task_attributable_lateness_shadow`). El consumer reactivo
 * `notion_attributable_lateness_compute` reusa el evento
 * `notion.task.status_transitioned` (TASK-912) y, con el flag OFF (default),
 * hace no-op (cero compute, cero persist).
 *
 * **Default OFF es load-bearing**: M2 toca (al cutover) el bono. En shadow solo
 * computa + persiste en una tabla que NADIE lee. Mergear TASK-922 NO afecta nada.
 * La activación de la captura/cómputo es operador-side; el cutover real del bono
 * es una task futura gated (8 stop-gates + sign-off HR + ≥30d shadow verde — ADR §16.2).
 */
export const isAttributableLatenessOtdEnabled = (): boolean =>
  process.env.ATTRIBUTABLE_LATENESS_OTD_ENABLED === 'true'
