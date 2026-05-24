/**
 * TASK-923 (M1) — Tipos canonical del clasificador OTD bucket.
 *
 * Greenhouse pasa a ser el clasificador autoritativo del bucket OTD
 * (on_time / late_drop / overdue / carry_over), reemplazando como source la
 * fórmula Notion `Indicador de Performance` (synced a `performance_indicator_code`).
 *
 * M1 = modo PARIDAD (freeze OFF): replica la semántica cruda actual de Notion
 * (frozenDays = 0). M2/TASK-922 reusa el mismo helper con freeze ON
 * (frozenDays > 0 = tiempo no imputable descontado).
 *
 * Cross-ref: docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md §16 +
 * docs/architecture/metrics/OTD_V1.md §6.1.
 */

export const OTD_BUCKET_FORMULA_VERSION = 'otd_bucket_v1.0' as const

/**
 * Los 4 buckets canonical OTD + `not_applicable` (excluida / sin due_date /
 * fuera del mes vigente). Mismo enum que `performance_indicator_code` synced.
 */
export type OtdBucket = 'on_time' | 'late_drop' | 'overdue' | 'carry_over' | 'not_applicable'

export interface TaskInputsForOtdBucket {
  /** Estado de la tarea (raw — se normaliza a canonical V1 internamente). */
  readonly taskStatus: string | null
  /** Fecha límite vigente (`due_date`). Sin ella → `not_applicable`. */
  readonly dueDate: Date | null
  /** Timestamp de completado (`completed_at`). */
  readonly completedAt: Date | null
  /**
   * Momento de evaluación. Default `new Date()`. Determina `overdue` vs
   * `carry_over` (tareas abiertas) + el gate `esMesActual` (paridad Notion).
   */
  readonly asOf?: Date
  /**
   * Días no imputables a descontar del atraso (freeze). **M1 = 0** (paridad).
   * M2/TASK-922 pasa el tiempo en {Listo para revisión, Bloqueado, En pausa}.
   * Es el toggle freeze-aware: 0 = freeze OFF.
   */
  readonly frozenDays?: number
  /**
   * Aplica el gate `esMesActual` (due_date en el mes calendario vigente, si no
   * → `not_applicable`). **M1 = true** (paridad con la fórmula Notion). M2/TASK-922
   * pasa `false`: el filtro de período del registry ya hace el scoping y el gate
   * por mes calendario es redundante (ADR §16.5). Default `true`.
   */
  readonly applyMonthGate?: boolean
}

export interface OtdBucketResult {
  readonly bucket: OtdBucket
  /**
   * `unavailable` solo cuando no hay `due_date` (sin compromiso que medir).
   * `valid` en todo otro caso (incluido `not_applicable` por exclusión / mes).
   */
  readonly dataStatus: 'valid' | 'unavailable'
  /** Días de frozen aplicados (0 en M1). Traza el modo freeze usado. */
  readonly frozenDaysApplied: number
  readonly formulaVersion: typeof OTD_BUCKET_FORMULA_VERSION
}
