import 'server-only'

/**
 * TASK-1700 — `recordSeoWorkQueueDecision`: el punto de confirmación humana del loop
 * `propose → confirm → execute`.
 *
 * 🔴 **NO EJECUTA NADA.** La cola PROPONE; el humano confirma acá; el command canónico del
 * dominio dueño ejecuta después, por su propio camino. Este módulo no llama a
 * `trackKeywords`, no llama a `createGroundedQueryDraft`, no llama a ningún write de otro
 * dominio — y hay un test de boundary que falla si alguien importa uno. La razón no es
 * purismo: encadenar la ejecución acá haría que "acepté esta recomendación" y "comprometí
 * gasto recurrente del proveedor" fueran el mismo click, sin que nadie declarara el segundo.
 *
 * 🔴 **La decisión se ancla al SUJETO, no a la fila.** Los items se regeneran en cada
 * snapshot: una decisión atada al `item_id` moriría mañana y el operador volvería a ver lo
 * que ya descartó. El ancla es `(seo_target_id, origin, normalized_keyword)`; el `item_id` y
 * el `snapshot_id` se guardan como EVIDENCIA de qué estaba mirando cuando decidió, no como
 * clave.
 *
 * Append-only: una decisión nueva sobre el mismo sujeto es una fila nueva, y la vigente es
 * la más reciente. Cambiar de opinión es un hecho que también se registra.
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isSeoModuleEnabled, isSeoWorkQueueEnabled } from '../flags'
import { WORK_QUEUE_DECISIONS, type SeoWorkQueueDecision, type SeoWorkQueueOrigin } from './contracts'

export type RecordSeoWorkQueueDecisionErrorCode =
  | 'disabled'
  | 'invalid_input'
  | 'item_not_found'
  | 'query_failed'

export type RecordSeoWorkQueueDecisionResult =
  | { ok: true; decisionId: string; subject: { origin: SeoWorkQueueOrigin; normalizedKeyword: string } }
  | { ok: false; errorCode: RecordSeoWorkQueueDecisionErrorCode }

export interface RecordSeoWorkQueueDecisionInput {
  /**
   * El item que el operador estaba mirando. Es la ENTRADA, no el ancla: de él se derivan el
   * sujeto y el tenant, ambos server-side. Aceptar `origin`/`keyword` del request permitiría
   * decidir sobre un sujeto que nunca estuvo en pantalla.
   */
  itemId: string
  decision: SeoWorkQueueDecision
  actor: string
  note?: string
  env?: NodeJS.ProcessEnv
}

export const recordSeoWorkQueueDecision = async (
  input: RecordSeoWorkQueueDecisionInput
): Promise<RecordSeoWorkQueueDecisionResult> => {
  const env = input.env ?? process.env

  if (!isSeoModuleEnabled(env) || !isSeoWorkQueueEnabled(env)) {
    return { ok: false, errorCode: 'disabled' }
  }

  const itemId = input.itemId?.trim() ?? ''
  const actor = input.actor?.trim() ?? ''

  if (!itemId || !actor || !WORK_QUEUE_DECISIONS.includes(input.decision)) {
    return { ok: false, errorCode: 'invalid_input' }
  }

  try {
    /*
     * El sujeto y el tenant se derivan del item vía su snapshot — nunca del request.
     * Un item de otra organización simplemente "no existe" para este caller (anti-oracle),
     * y un item de un snapshot viejo tampoco resuelve: la decisión se toma sobre lo que
     * está vigente, no sobre una pantalla que quedó abierta hace tres días.
     */
    const rows = await runGreenhousePostgresQuery<{
      origin: string
      normalized_keyword: string
      snapshot_id: string
      organization_id: string
      seo_target_id: string
    }>(
      `SELECT i.origin, i.normalized_keyword, i.snapshot_id, s.organization_id, s.seo_target_id
         FROM greenhouse_growth.seo_work_queue_items i
         JOIN greenhouse_growth.seo_work_queue_snapshots s ON s.snapshot_id = i.snapshot_id
        WHERE i.item_id = $1`,
      [itemId]
    )

    const item = rows[0]

    if (!item) {
      return { ok: false, errorCode: 'item_not_found' }
    }

    const inserted = await runGreenhousePostgresQuery<{ decision_id: string }>(
      `INSERT INTO greenhouse_growth.seo_work_queue_decisions
         (organization_id, seo_target_id, origin, normalized_keyword, decision, note,
          item_id, snapshot_id, decided_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING decision_id`,
      [
        item.organization_id,
        item.seo_target_id,
        item.origin,
        item.normalized_keyword,
        input.decision,
        input.note?.trim() || null,
        itemId,
        item.snapshot_id,
        actor
      ]
    )

    const decisionId = inserted[0]?.decision_id

    if (!decisionId) {
      return { ok: false, errorCode: 'query_failed' }
    }

    /*
     * NO se publica evento outbox en V1, y es una decisión y no un olvido: la decisión no
     * dispara nada downstream por diseño. Un evento sin consumer invita a que alguien le
     * cuelgue la ejecución automática, que es exactamente lo que este command no hace.
     */
    return {
      ok: true,
      decisionId,
      subject: { origin: item.origin as SeoWorkQueueOrigin, normalizedKeyword: item.normalized_keyword }
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_work_queue_record_decision' },
      extra: { itemId }
    })

    return { ok: false, errorCode: 'query_failed' }
  }
}
