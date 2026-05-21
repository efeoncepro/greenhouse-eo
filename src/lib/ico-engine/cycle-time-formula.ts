import {
  TASK_STATUS_CANONICAL,
  TASK_STATUS_GROUPS,
  taskStatusGroupSql,
  taskStatusSql
} from '@/lib/delivery/task-status-canonical'

import { isCanonicalCycleTimeFormulaEnabled } from './cycle-time-flags'

/**
 * TASK-912 Slice 4 — Builder canónico de `cycle_time_days` para `v_tasks_enriched`.
 * Gated por `CT_DAYS_CANONICAL_FORMULA_ENABLED`.
 *
 * **OFF (default) = fórmula LEGACY byte-idéntica + SIN JOIN extra**. La VIEW se
 * regenera idéntica al merge. Cero impacto en métricas.
 *
 * **ON = fórmula canónica V1** (Engine §A.5 + Contrato Métricas Delta 2026-05-17):
 *   - INICIO: primera transición a `En curso` (MIN transitioned_at), fallback a
 *     `created_at`/`synced_at` para tareas sin transición capturada.
 *   - FIN: `completed_at` o `CURRENT_DATE()` (tarea abierta).
 *   - DESCUENTO: días en `Bloqueado`/`En pausa` (intervalos vía LEAD).
 *
 * **De-correlación obligatoria** (verificado contra BQ real 2026-05-21): BigQuery
 * NO soporta subqueries correlacionadas que referencian otra tabla dentro de una
 * expresión SELECT. Por eso las agregaciones de transiciones se pre-computan en
 * una subquery LEFT JOIN-eada 1:1 (`ctw`, GROUP BY task_source_id), NO como
 * subquery correlacionada. El JOIN solo se agrega cuando el flag está ON → el
 * path OFF queda estructuralmente idéntico al legacy.
 *
 * El flip ON está gated por shadow mode 7d verde + arch-architect 4-pillar.
 */

const CONFORMED_DATASET = 'greenhouse_conformed'
const TRANSITIONS_TABLE = 'task_status_transitions'

const transitionsRef = (projectId: string): string =>
  `\`${projectId}.${CONFORMED_DATASET}.${TRANSITIONS_TABLE}\``

/** Fórmula LEGACY — copiada VERBATIM de la versión pre-TASK-912 (no cambiar). */
const legacyCycleTimeExpression = (): string => `DATE_DIFF(
      COALESCE(DATE(dt.completed_at), CURRENT_DATE()),
      COALESCE(DATE(dt.created_at), DATE(dt.synced_at)),
      DAY
    )`

/**
 * LEFT JOIN de-correlado a las agregaciones de transiciones (solo cuando ON).
 * Pre-computa por `task_source_id`: primera transición a `En curso` +
 * días totales en estados bloqueantes. GROUP BY → 1 fila por task → JOIN 1:1
 * (sin multiplicación de filas, OFF-path-safe si alguna vez se dejara presente).
 */
export const buildCycleTimeJoinClause = (projectId: string): string => {
  if (!isCanonicalCycleTimeFormulaEnabled()) {
    return ''
  }

  const enCursoList = taskStatusSql(TASK_STATUS_CANONICAL.EN_CURSO)
  const blockedList = taskStatusGroupSql(TASK_STATUS_GROUPS.BLOCKED)

  return `
  LEFT JOIN (
    SELECT
      task_source_id,
      MIN(IF(to_status IN (${enCursoList}), transitioned_at, NULL)) AS first_en_curso_at,
      SUM(
        IF(
          to_status IN (${blockedList}) AND next_at IS NOT NULL,
          DATE_DIFF(DATE(next_at), DATE(transitioned_at), DAY),
          0
        )
      ) AS blocked_days
    FROM (
      SELECT
        task_source_id,
        transitioned_at,
        to_status,
        LEAD(transitioned_at) OVER (
          PARTITION BY task_source_id ORDER BY transitioned_at
        ) AS next_at
      FROM ${transitionsRef(projectId)}
    )
    GROUP BY task_source_id
  ) ctw ON ctw.task_source_id = dt.task_source_id`
}

/** Fórmula canónica V1 — usa las columnas pre-agregadas del LEFT JOIN `ctw`. */
const canonicalCycleTimeExpression = (): string => `DATE_DIFF(
      COALESCE(DATE(dt.completed_at), CURRENT_DATE()),
      COALESCE(DATE(ctw.first_en_curso_at), DATE(dt.created_at), DATE(dt.synced_at)),
      DAY
    ) - COALESCE(ctw.blocked_days, 0)`

/**
 * Retorna la expresión SQL `cycle_time_days` según el flag. Usada por
 * `buildTasksEnrichedView`. Exported para tests + smoke.
 */
export const buildCycleTimeDaysExpression = (): string =>
  isCanonicalCycleTimeFormulaEnabled() ? canonicalCycleTimeExpression() : legacyCycleTimeExpression()

// Export for tests / smoke (solo validación — NO usar en producción)
export const __testing__ = { legacyCycleTimeExpression, canonicalCycleTimeExpression }
