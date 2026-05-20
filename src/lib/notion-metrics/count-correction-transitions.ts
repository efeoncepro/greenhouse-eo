import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-908 Slice 3.5 — countCorrectionTransitions canonical helper V1.
 *
 * **DESBLOQUEA TASK-901 arquitectónicamente**: `calculateRpa(taskId)` delega
 * a este helper (per `RPA_V1.md §4.1` spec). Sin esto, TASK-901 caería en
 * el anti-patrón legacy de leer Notion property `Correcciones` (bug class
 * TASK-877 follow-up — formula Notion editable por cualquier operador, sin
 * git history, sin tests, sin observability).
 *
 * **DESBLOQUEA TASK-909 transitively**: `calculateFtr(taskId)` delega a
 * `calculateRpa.value === 0`, que delega aquí.
 *
 * Lógica canonical (ADR `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1` + spec
 * `RPA_V1.md`): una "corrección" = una transición `Listo para revisión →
 * Cambios solicitados` observada en `greenhouse_delivery.task_status_transitions`.
 *
 * Esta tabla está populated por:
 *   - Webhook canonical (TASK-908b futuro): cada cambio de status Notion
 *     captura una row con `source_quality='canonical'`.
 *   - Backfill histórico (TASK-908b Slice 9 opcional): reconstruye transitions
 *     pre-deployment via Notion page history, `source_quality='backfilled'`.
 *
 * **NOTA cleanup window** (~1-2 días post 2026-05-17 ADR):
 *
 * Pre-cleanup operador-side, Sky usaba el legacy status `En feedback` en
 * lugar del canonical `Cambios solicitados`. Post-cleanup (rename ejecutado
 * by operador), TODOS los teamspaces convergen a canonical. Sin embargo, la
 * tabla canonical task_status_transitions tiene CHECK constraint enum cerrado
 * que SOLO acepta los 11 estados canonical V1 — el webhook handler normaliza
 * via `normalizeTaskStatus` ANTES de insertar (Sky `En feedback` → canonical
 * `Cambios solicitados` automatic).
 *
 * Por eso este helper compara SOLO contra canonical V1 (NO contra legacy):
 * la normalización es responsabilidad upstream (webhook handler), no del reader.
 *
 * Cross-ref: `docs/architecture/metrics/RPA_V1.md §4.1`.
 */

export interface CountCorrectionTransitionsInput {
  readonly taskSourceId: string

  /** Filtro opcional: solo transitions con `transitioned_at >= windowStart`. */
  readonly windowStart?: Date | null

  /** Filtro opcional: solo transitions con `transitioned_at <= windowEnd`. */
  readonly windowEnd?: Date | null
}

export interface CorrectionTransitionRecord {
  readonly transitionedAt: Date
  readonly transitionedBy: string | null
}

export type CorrectionTransitionsSourceMode = 'canonical' | 'unavailable'

export interface CountCorrectionTransitionsResult {
  /**
   * Número de transitions `Listo para revisión → Cambios solicitados` para
   * la tarea en la ventana especificada (o todas, si window* es null).
   *
   * Cuando `sourceMode='unavailable'` (tarea sin rows en table), retorna `0`
   * pero el caller debe interpretar como "no data" no como "0 correcciones".
   * El consumer canonical `calculateRpa` lo mapea a `dataStatus='unavailable'`
   * + `value=null` (NO `value=0`).
   */
  readonly count: number

  /**
   * Transitions individuales (sin window filter aplicado más allá del input)
   * en orden ascendente por `transitioned_at`. Útil para forensic / audit /
   * UI per-task drawer mostrar timeline.
   */
  readonly transitions: readonly CorrectionTransitionRecord[]

  /**
   * - `canonical`: tarea tiene al menos una row en `task_status_transitions`
   *   (independiente de si tiene correction transitions o no — 0 correciones
   *   sigue siendo `canonical`)
   * - `unavailable`: tarea NO tiene ninguna row en la tabla (pre-deployment,
   *   sin historial, backfill no ejecutado). Caller decide cómo tratar el 0.
   */
  readonly sourceMode: CorrectionTransitionsSourceMode
}

/**
 * Helper canonical para contar transiciones `Listo para revisión → Cambios
 * solicitados` de una tarea. Consumido por `calculateRpa` (TASK-901) y
 * transitively por `calculateFtr` (TASK-909).
 *
 * Edge cases canonical:
 * - taskSourceId vacío/null/undefined → count=0, sourceMode='unavailable',
 *   transitions=[]. No throws.
 * - Tarea sin rows en table (pre-TASK-908b o sin webhook capturado) →
 *   sourceMode='unavailable'. Caller (calculateRpa) lo mapea a dataStatus.
 * - Tarea con rows en table pero sin transitions canonical de corrección →
 *   sourceMode='canonical', count=0. Distinguible vs unavailable.
 * - Window filter excluye TODAS las transitions → count=0 pero sourceMode
 *   refleja si la tarea tiene rows EN GENERAL (no filtradas).
 */
export const countCorrectionTransitions = async (
  input: CountCorrectionTransitionsInput
): Promise<CountCorrectionTransitionsResult> => {
  const { taskSourceId, windowStart, windowEnd } = input

  if (!taskSourceId || typeof taskSourceId !== 'string' || taskSourceId.trim() === '') {
    return { count: 0, transitions: [], sourceMode: 'unavailable' }
  }

  // Probe canonical: tarea tiene al menos 1 row en task_status_transitions?
  // Distingue "no data" (unavailable) vs "data but 0 corrections" (canonical).
  const probeRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM greenhouse_delivery.task_status_transitions
     WHERE task_source_id = $1
     LIMIT 1`,
    [taskSourceId]
  )

  const hasAnyTransition = Number(probeRows[0]?.count ?? 0) > 0

  if (!hasAnyTransition) {
    return { count: 0, transitions: [], sourceMode: 'unavailable' }
  }

  // Fetch correction transitions canonical V1:
  //   from_status = 'Listo para revisión' (canonical V1)
  //   to_status   = 'Cambios solicitados' (canonical V1)
  //
  // Webhook handler normaliza legacy variants pre-insert — esta query SOLO
  // matchea canonical V1 strings (table CHECK constraint enforce).
  //
  // Index hot path: task_status_transitions_correction_event_idx (partial)
  // → O(log n) lookup + ordered scan.
  const correctionRows = await query<{
    transitioned_at: Date | string
    transitioned_by: string | null
  }>(
    `SELECT transitioned_at, transitioned_by
     FROM greenhouse_delivery.task_status_transitions
     WHERE task_source_id = $1
       AND from_status = 'Listo para revisión'
       AND to_status   = 'Cambios solicitados'
       AND ($2::timestamptz IS NULL OR transitioned_at >= $2)
       AND ($3::timestamptz IS NULL OR transitioned_at <= $3)
     ORDER BY transitioned_at ASC`,
    [taskSourceId, windowStart ?? null, windowEnd ?? null]
  )

  const transitions: CorrectionTransitionRecord[] = correctionRows.map(row => ({
    transitionedAt:
      row.transitioned_at instanceof Date ? row.transitioned_at : new Date(row.transitioned_at),
    transitionedBy: row.transitioned_by ?? null
  }))

  return {
    count: transitions.length,
    transitions,
    sourceMode: 'canonical'
  }
}
