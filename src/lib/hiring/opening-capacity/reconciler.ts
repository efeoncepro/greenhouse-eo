import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { decideHiringApplication } from '../decide'
import { isHiringOpeningCapacityClosureEnabled } from '../notifications/config'

/**
 * TASK-1762 Slice 3 — reconciler del cierre por capacidad.
 *
 * Toma los items pendientes de un run y registra, en cada candidatura, el desenlace `not_selected`
 * con causa `capacity_filled` **a través del command canónico**. Nunca hace `UPDATE` masivo: cada
 * persona conserva su historia de supersede, su evento y su reloj de retención.
 *
 * 🔴 **El desenlace es `not_selected`, JAMÁS `rejected`.** `rejected` es un juicio sobre la persona;
 * aplicarlo a una cohorte que nadie juzgó le atribuye una causa falsa en el registro, la deja fuera
 * del Banco de Talento por defecto e **infla la tasa de rechazo de su cohorte demográfica en el
 * análisis de impacto adverso**. El correo suavizado no repara el registro.
 *
 * Idempotencia: la clave de decisión se deriva de `runId + applicationId`, así que un reintento
 * —o un proceso que murió después de decidir pero antes de marcar el item— converge sin decidir dos
 * veces. El command responde `idempotentReplay` y el item se marca igual.
 */

/** Cuántas veces se reintenta un item antes de mandarlo a cuarentena para revisión humana. */
export const CLOSURE_ITEM_RETRY_BUDGET = 3

/** Tope de items por ciclo. Un run grande se drena en varias pasadas en vez de una transacción larga. */
export const CLOSURE_RECONCILE_BATCH_SIZE = 25

export interface ReconcileClosureRunResult {
  runId: string
  processed: number
  decided: number
  skipped: number
  failed: number
  quarantined: number
  /** `true` cuando ya no queda nada pendiente y el run quedó cerrado. */
  finished: boolean
}

interface PendingItemRow extends Record<string, unknown> {
  item_id: string
  application_id: string
  attempts: number
  decision: string | null
  archived_at: string | null
}

const closureIdempotencyKey = (runId: string, applicationId: string): string =>
  `capacity-closure:${runId}:${applicationId}`

export const reconcileClosureRun = async (
  runId: string,
  actorUserId: string | null
): Promise<ReconcileClosureRunResult> => {
  // Flag OFF: el run queda intacto y NADIE cambia de estado. No es un error ni consume reintentos
  // — es la posición de reposo mientras el rollout no está autorizado.
  if (!isHiringOpeningCapacityClosureEnabled()) {
    return { runId, processed: 0, decided: 0, skipped: 0, failed: 0, quarantined: 0, finished: false }
  }

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_hiring.hiring_opening_closure_run
        SET state = 'running', started_at = COALESCE(started_at, now())
      WHERE run_id = $1 AND state = 'pending'`,
    [runId]
  )

  // Se re-lee el estado VIGENTE de cada candidatura, no el que tenía al confirmar: entre la
  // confirmación y ahora alguien pudo decidirla a mano o archivarla, y volver a escribirle sería
  // pisar una decisión humana más reciente con una masiva más vieja.
  const pending = await runGreenhousePostgresQuery<PendingItemRow>(
    `SELECT i.item_id, i.application_id, i.attempts, a.decision, a.archived_at
       FROM greenhouse_hiring.hiring_opening_closure_run_item i
       JOIN greenhouse_hiring.hiring_application a ON a.application_id = i.application_id
      WHERE i.run_id = $1 AND i.state IN ('pending', 'failed')
      ORDER BY i.item_id
      LIMIT $2`,
    [runId, CLOSURE_RECONCILE_BATCH_SIZE]
  )

  const result: ReconcileClosureRunResult = {
    runId,
    processed: 0,
    decided: 0,
    skipped: 0,
    failed: 0,
    quarantined: 0,
    finished: false
  }

  for (const item of pending) {
    result.processed += 1

    // Alguien ya la decidió o la archivó despues de confirmar: se salta, no se pisa. `skipped` es
    // un desenlace legitimo del item, no una falla.
    if (item.decision !== null || item.archived_at !== null) {
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_hiring.hiring_opening_closure_run_item
            SET state = 'skipped', updated_at = now(), last_error_code = 'already_decided'
          WHERE item_id = $1`,
        [item.item_id]
      )
      result.skipped += 1
      continue
    }

    try {
      await decideHiringApplication(
        item.application_id,
        {
          decision: 'not_selected',
          cause: 'capacity_filled',
          idempotencyKey: closureIdempotencyKey(runId, item.application_id),
          reason: {
            // El resumen es interno y auditable. NO es el copy del correo: el candidato nunca lee
            // el literal del desenlace ni el nombre de la causa.
            summary: 'Cierre de vacante por capacidad completa (TASK-1762).',
            evidence: [`closure_run:${runId}`]
          }
        },
        actorUserId
      )

      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_hiring.hiring_opening_closure_run_item
            SET state = 'decided', decided_at = now(), updated_at = now(),
                attempts = attempts + 1, last_error_code = NULL
          WHERE item_id = $1`,
        [item.item_id]
      )
      result.decided += 1
    } catch (error) {
      const attempts = item.attempts + 1
      const exhausted = attempts >= CLOSURE_ITEM_RETRY_BUDGET

      // El codigo viaja sanitizado: lo leen dashboards y logs, asi que nunca el mensaje crudo del
      // error (puede traer identificadores o texto del dominio).
      const code = error instanceof Error && 'code' in error ? String((error as { code: unknown }).code) : 'unexpected_error'

      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_hiring.hiring_opening_closure_run_item
            SET state = $2, attempts = $3, updated_at = now(), last_error_code = $4
          WHERE item_id = $1`,
        [item.item_id, exhausted ? 'quarantined' : 'failed', attempts, code.slice(0, 80)]
      )

      // Sin PII: sólo ids técnicos y el conteo de intentos. El id de la candidatura NO identifica
      // a una persona por sí solo, pero tampoco hace falta para diagnosticar — basta el item.
      captureWithDomain(error, 'hiring', {
        tags: { source: 'hiring:capacity_closure_reconcile_item' },
        extra: { runId, itemId: item.item_id, attempts }
      })

      if (exhausted) result.quarantined += 1
      else result.failed += 1
    }
  }

  // El run se cierra solo cuando no queda NADA accionable. Un item en cuarentena no bloquea el
  // cierre del run, pero lo degrada a `partially_failed`: alguien tiene que mirarlo.
  const remaining = await runGreenhousePostgresQuery<{ pending: string; quarantined: string }>(
    `SELECT count(*) FILTER (WHERE state IN ('pending', 'failed'))  AS pending,
            count(*) FILTER (WHERE state = 'quarantined')           AS quarantined
       FROM greenhouse_hiring.hiring_opening_closure_run_item
      WHERE run_id = $1`,
    [runId]
  )

  const stillPending = Number(remaining[0]?.pending ?? 0)
  const quarantined = Number(remaining[0]?.quarantined ?? 0)

  if (stillPending === 0) {
    await withGreenhousePostgresTransaction(async client => {
      await client.query(
        `UPDATE greenhouse_hiring.hiring_opening_closure_run
            SET state = $2, completed_at = now()
          WHERE run_id = $1 AND state = 'running'`,
        [runId, quarantined > 0 ? 'partially_failed' : 'completed']
      )
    })
    result.finished = true
  }

  return result
}
