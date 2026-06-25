import 'server-only'

/**
 * TASK-1242 — Growth AI Visibility · HubSpot lead handoff · command gobernado (parity).
 *
 * `syncAiVisibilityRunToHubSpot` es el primitive canónico de Full API parity: una sola
 * implementación server-side, muchos consumers (route de publish del snapshot [auto],
 * endpoint admin de re-trigger, Nexa via propose→confirm→execute, CLI/runbook). NUNCA
 * escribe a HubSpot inline: ENQUEUE gobernado (publica el outbox event); el reactive
 * consumer (lane `ops-reactive-growth`) hace el upsert con el cliente HubSpot in-app
 * directo. El write authoritative (gate de score `completed`, mapper, upsert) vive en el
 * consumer (`executeLeadHandoff`, Slice 2), que re-lee de PG y nunca confía en el payload.
 *
 * Gate de este enqueue (barato, no recomputa el reporte):
 *  - existe lead para el run (si no → no-op);
 *  - consent = TRUE (defensa extra al CHECK de la tabla);
 *  - ya sincronizado → skip salvo `admin_retrigger` (intención explícita del operador).
 */

import { publishOutboxEvent } from '@/lib/sync/publish-event'

/** Cliente opcional para emitir el evento in-tx (PoolClient/Kysely); tipo del publisher canónico. */
type OutboxPublisherClient = Parameters<typeof publishOutboxEvent>[1]

import { getGraderLeadForHandoff } from '../public-intake/store'
import {
  GROWTH_AI_VISIBILITY_LEAD_AGGREGATE,
  GROWTH_AI_VISIBILITY_LEAD_HANDOFF_REQUESTED_EVENT,
  type LeadHandoffRequestedPayload,
} from './events'

export type LeadHandoffTrigger = LeadHandoffRequestedPayload['trigger']

export type LeadHandoffRequestStatus = 'requested' | 'skipped'

export interface LeadHandoffRequestResult {
  status: LeadHandoffRequestStatus
  /** Razón del skip (observabilidad). */
  reason?: 'no_lead' | 'no_consent' | 'already_synced'
  runId: string
}

/**
 * Solicita (enqueue gobernado) el handoff de un lead a HubSpot. Idempotente: sin lead /
 * sin consent / ya sincronizado ⇒ skip (no publica evento). `admin_retrigger` ignora el
 * guard de `already_synced` (re-sync deliberado). Opcionalmente in-tx (`client`).
 */
export const syncAiVisibilityRunToHubSpot = async (
  input: { runId: string; trigger: LeadHandoffTrigger },
  client?: OutboxPublisherClient,
): Promise<LeadHandoffRequestResult> => {
  const lead = await getGraderLeadForHandoff(input.runId)

  if (!lead) {
    return { status: 'skipped', reason: 'no_lead', runId: input.runId }
  }

  if (!lead.consent) {
    return { status: 'skipped', reason: 'no_consent', runId: input.runId }
  }

  if (lead.hubspotSyncedAt && input.trigger !== 'admin_retrigger') {
    return { status: 'skipped', reason: 'already_synced', runId: input.runId }
  }

  const payload: LeadHandoffRequestedPayload = {
    schemaVersion: 1,
    runId: input.runId,
    trigger: input.trigger,
  }

  await publishOutboxEvent(
    {
      aggregateType: GROWTH_AI_VISIBILITY_LEAD_AGGREGATE,
      aggregateId: input.runId,
      eventType: GROWTH_AI_VISIBILITY_LEAD_HANDOFF_REQUESTED_EVENT,
      payload,
    },
    client,
  )

  return { status: 'requested', runId: input.runId }
}
