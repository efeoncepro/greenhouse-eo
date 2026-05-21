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
