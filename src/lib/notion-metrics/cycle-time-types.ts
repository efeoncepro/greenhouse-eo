/**
 * TASK-908 Slice 1 — Cycle Time canonical types V1.
 *
 * Tipos puros — NO server-only, safe en client + server.
 * Cross-ref: docs/architecture/metrics/CYCLE_TIME_V1.md §4.1.
 */

export interface BlockedInterval {
  /** Timestamp en que la tarea entró a `Bloqueado` o `Detenido`. */
  readonly entered: Date

  /**
   * Timestamp en que la tarea salió de `Bloqueado` a otro status. `null` si
   * la tarea aún está bloqueada al momento de evaluación (usa `completedAt`
   * como exit en el cálculo).
   */
  readonly exited: Date | null
}

export interface TaskInputsForCycleTime {
  /**
   * Primer timestamp donde el status pasó a `En curso` (canonical) o legacy
   * `Tomado` (Sky pre-cleanup). Source canonical: `task_status_transitions`
   * filtered by `to_status IN ('En curso')` + `MIN(transitioned_at)`.
   *
   * `null` cuando la tarea NO tiene transition rows (pre-TASK-908b deployment
   * o sin historial Notion API). El helper hace fallback a `createdAt`.
   */
  readonly enCursoStartedAt: Date | null

  /**
   * `task.completed_at` (Notion `Fecha de completado`). `null` cuando la
   * tarea NO está completada — CT requiere ventana cerrada, helper retorna
   * `sourceMode='unavailable'`.
   */
  readonly completedAt: Date | null

  /**
   * Pares de transitions `(entered → exited)` para tiempo en `Bloqueado` /
   * `En pausa` / legacy `Detenido`. Cada interval se descuenta del CT
   * raw (clamp a la ventana `[start, end]`).
   *
   * Vacío `[]` cuando no hubo bloqueos.
   */
  readonly blockedIntervals: readonly BlockedInterval[]

  /**
   * `task.created_at` — fallback canonical cuando `enCursoStartedAt` es
   * null (tareas pre-TASK-908 sin transition history). El helper marca
   * `sourceMode='fallback_created_at'` para distinguir.
   */
  readonly createdAt: Date
}

export type CycleTimeSourceMode = 'canonical' | 'fallback_created_at' | 'unavailable'

export interface CycleTimeResult {
  /**
   * Días calendar netos entre start y completion, MENOS los intervalos
   * bloqueados dentro de la ventana. `null` cuando `completedAt` es null
   * (CT no evaluable).
   */
  readonly cycleTimeDays: number | null

  /**
   * - `canonical`: source data tenía transition row para `En curso`
   * - `fallback_created_at`: source data NO tenía transition row, usado `createdAt`
   * - `unavailable`: tarea no completada (no se puede evaluar CT)
   */
  readonly sourceMode: CycleTimeSourceMode

  /** Días descontados de los `blockedIntervals` (informativo / forensic). */
  readonly blockedDaysExcluded: number

  /** Stable canonical version constant — `'cycle_time_v1.0'`. */
  readonly formulaVersion: typeof CYCLE_TIME_FORMULA_VERSION
}

export const CYCLE_TIME_FORMULA_VERSION = 'cycle_time_v1.0' as const
