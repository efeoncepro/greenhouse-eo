import 'server-only'

/**
 * TASK-1250 — Growth AI Visibility · report email delivery · command gobernado (parity).
 *
 * `requestAiVisibilityReportEmail` es el primitive canónico de enqueue: una implementación
 * server-side, muchos consumers (auto-finalize del worker, aprobación TASK-1244, route admin
 * de publish, resend admin, Nexa via propose→confirm→execute, CLI/runbook). NUNCA envía email
 * inline: ENQUEUE gobernado (publica el outbox event); el reactive consumer (lane
 * `ops-reactive-growth`) hace el WRITE authoritative (`dispatchAiVisibilityReportEmail`), que
 * re-lee de PG y nunca confía en el payload. Espeja `syncAiVisibilityRunToHubSpot`.
 *
 * Gate de este enqueue (barato, no recomputa el reporte): existe lead para el run + consent.
 * El gate de feature flag, estado del reporte e idempotencia DB-level viven en el WRITE
 * (dispatch) para no perder eventos al prender el flag.
 */

import { getGraderLeadForHandoff } from '@/lib/growth/ai-visibility/public-intake/store'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  GROWTH_AI_VISIBILITY_LEAD_AGGREGATE,
  GROWTH_AI_VISIBILITY_REPORT_EMAIL_REQUESTED_EVENT,
  type ReportEmailRequestedPayload
} from './events'

/** Cliente opcional para emitir el evento in-tx (PoolClient/Kysely); tipo del publisher canónico. */
type OutboxPublisherClient = Parameters<typeof publishOutboxEvent>[1]

export type ReportEmailTrigger = ReportEmailRequestedPayload['trigger']

export interface ReportEmailRequestResult {
  status: 'requested' | 'skipped'
  reason?: 'no_lead' | 'no_consent'
  runId: string
}

/**
 * Solicita (enqueue gobernado) el envío del email de entrega del informe. Idempotente a nivel
 * de enqueue: sin lead / sin consent ⇒ skip (no publica). El dispatch del consumer garantiza
 * envío único (claim DB-level). Opcionalmente in-tx (`client`).
 */
export const requestAiVisibilityReportEmail = async (
  input: { runId: string; trigger: ReportEmailTrigger },
  client?: OutboxPublisherClient
): Promise<ReportEmailRequestResult> => {
  const lead = await getGraderLeadForHandoff(input.runId)

  if (!lead) return { status: 'skipped', reason: 'no_lead', runId: input.runId }
  if (!lead.consent) return { status: 'skipped', reason: 'no_consent', runId: input.runId }

  const payload: ReportEmailRequestedPayload = {
    schemaVersion: 1,
    runId: input.runId,
    trigger: input.trigger
  }

  await publishOutboxEvent(
    {
      aggregateType: GROWTH_AI_VISIBILITY_LEAD_AGGREGATE,
      aggregateId: input.runId,
      eventType: GROWTH_AI_VISIBILITY_REPORT_EMAIL_REQUESTED_EVENT,
      payload
    },
    client
  )

  return { status: 'requested', runId: input.runId }
}
