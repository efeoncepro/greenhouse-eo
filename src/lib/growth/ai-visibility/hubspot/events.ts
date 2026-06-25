/**
 * TASK-1242 — Growth AI Visibility · HubSpot lead handoff · eventos outbox.
 *
 * El handoff sigue el patrón canónico outbox + reactive consumer (NUNCA POST inline
 * a HubSpot). El command gobernado publica `lead_handoff_requested`; el reactive
 * consumer (lane `ops-reactive-growth`) lo drena y hace el upsert a HubSpot con el
 * cliente in-app directo (TASK-1230, NO Cloud Run bridge).
 *
 * `publishOutboxEvent` acepta strings de dominio además de los enums centrales, así que
 * estos viven en el dominio `growth` (espejo de `growth.forms.submission_accepted`).
 */

export const GROWTH_AI_VISIBILITY_LEAD_AGGREGATE = 'growth_ai_visibility_lead' as const

/** Solicitud de handoff de un lead a HubSpot (enqueue gobernado: auto-trigger o re-trigger admin). */
export const GROWTH_AI_VISIBILITY_LEAD_HANDOFF_REQUESTED_EVENT =
  'growth.ai_visibility.lead_handoff_requested' as const

/** `type` (no `interface`) para que sea asignable a `Record<string, unknown>` del publisher. */
export type LeadHandoffRequestedPayload = {
  schemaVersion: 1
  /** El run cuyo lead + score se sincronizan. El consumer re-lee de PG; el payload es PII-free. */
  runId: string
  /** Origen del disparo (observabilidad). */
  trigger: 'report_published' | 'admin_retrigger'
}
