import 'server-only'

import {
  TASK_STATUS_CANONICAL,
  allVariantsForCanonical,
  normalizeTaskStatus
} from '@/lib/delivery/task-status-canonical'

import {
  OTD_BUCKET_FORMULA_VERSION,
  type OtdBucket,
  type OtdBucketResult,
  type TaskInputsForOtdBucket
} from './otd-bucket-types'

/**
 * TASK-923 (M1) — `classifyOtdBucket` canonical helper V1.
 *
 * Source of truth del bucket OTD, computado en Greenhouse (NO leído de la
 * fórmula Notion `Indicador de Performance`). Mueve el clasificador de Notion
 * a Greenhouse (boundary: Notion = OS / Greenhouse = motor — ADR
 * `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1`).
 *
 * **M1 = modo PARIDAD (freeze OFF)**: replica exactamente la semántica cruda
 * que la fórmula Notion produce HOY (con `frozenDays = 0` por el `elYp` muerto
 * — ver ISSUE-081). Lógica espejo del `Indicador de Performance`:
 *
 *   1. sin `due_date`                          → not_applicable (unavailable)
 *   2. estado ∈ {Cancelado, Archivado}         → not_applicable (excluida)
 *   3. due_date NO en el mes calendario vigente → not_applicable (esMesActual gate)
 *   4. estado = Aprobado (completada):
 *        on_time  si (días(completed, due) - frozenDays) <= 0
 *        late_drop si > 0
 *        (sin completed_at pero Aprobado → on_time, como Notion fueATiempo=true)
 *   5. no completada:
 *        overdue    si (días(now, due) - frozenDays) > 0
 *        carry_over si <= 0
 *
 * **Freeze-aware togglable**: `frozenDays` se resta del atraso en AMBAS ramas
 * (completada y abierta). M1 pasa 0 (o lo omite) → paridad. M2/TASK-922 pasa
 * los días no imputables (Listo para revisión + Bloqueado + En pausa).
 *
 * Pure function — no IO, determinista, idempotente. El gate `esMesActual` se
 * **replica en M1** para paridad con el synced; M2 lo elimina (el filtro de
 * período del registry ya hace el scoping).
 *
 * Cross-ref: docs/architecture/metrics/OTD_V1.md §6.1 + ADR Attributable
 * Lateness V1 §16.5. Mirror SQL: `buildOtdBucketSql` (este archivo).
 */
const MS_PER_DAY = 86_400_000

/** Diferencia en días calendar (truncada a fecha, como `DATE_DIFF(...,DAY)` BQ). */
const dateDiffDays = (a: Date, b: Date): number => {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())

  return Math.round((da - db) / MS_PER_DAY)
}

const isSameCalendarMonth = (a: Date, b: Date): boolean =>
  a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()

export const classifyOtdBucket = (inputs: TaskInputsForOtdBucket): OtdBucketResult => {
  const { taskStatus, dueDate, completedAt } = inputs
  const asOf = inputs.asOf ?? new Date()
  const frozenDays = inputs.frozenDays ?? 0

  const base = {
    frozenDaysApplied: frozenDays,
    formulaVersion: OTD_BUCKET_FORMULA_VERSION
  } as const

  const result = (bucket: OtdBucket, dataStatus: 'valid' | 'unavailable'): OtdBucketResult => ({
    bucket,
    dataStatus,
    ...base
  })

  // 1. Sin due_date → no hay compromiso que medir.
  if (!dueDate) {
    return result('not_applicable', 'unavailable')
  }

  const canonicalStatus = normalizeTaskStatus(taskStatus)

  // 2. Excluida (Cancelado / Archivado) — set canonical EXACTO de Notion
  //    `Indicador de Performance` (NO el EXCLUDED_FROM_METRICS ampliado).
  if (
    canonicalStatus === TASK_STATUS_CANONICAL.CANCELADO ||
    canonicalStatus === TASK_STATUS_CANONICAL.ARCHIVADO
  ) {
    return result('not_applicable', 'valid')
  }

  // 3. Gate esMesActual (paridad M1): due_date debe caer en el mes vigente.
  if (!isSameCalendarMonth(dueDate, asOf)) {
    return result('not_applicable', 'valid')
  }

  const esCompletada = canonicalStatus === TASK_STATUS_CANONICAL.APROBADO

  // 4. Completada → on_time / late_drop.
  if (esCompletada) {
    if (!completedAt) {
      // Aprobado sin completed_at: Notion fueATiempo=true → on_time.
      return result('on_time', 'valid')
    }

    const daysLate = dateDiffDays(completedAt, dueDate) - frozenDays

    return result(daysLate <= 0 ? 'on_time' : 'late_drop', 'valid')
  }

  // 5. Abierta → overdue / carry_over (depende de asOf — now-dependiente).
  const daysOverdue = dateDiffDays(asOf, dueDate) - frozenDays

  return result(daysOverdue > 0 ? 'overdue' : 'carry_over', 'valid')
}

/**
 * Mirror BQ del clasificador (expresión CASE) para `v_tasks_enriched.gh_otd_bucket`.
 * Encodea la MISMA lógica que `classifyOtdBucket` — validado por test de paridad.
 *
 * @param cols nombres de columna BQ (default: convención `v_tasks_enriched`).
 * @param frozenDaysSql expresión SQL de frozen days. M1 = `'0'` (paridad).
 *   M2/TASK-922 pasará una expresión de días no imputables.
 */
export const buildOtdBucketSql = (
  cols: { taskStatus: string; dueDate: string; completedAt: string } = {
    taskStatus: 'task_status',
    dueDate: 'due_date',
    completedAt: 'completed_at'
  },
  frozenDaysSql = '0'
): string => {
  const { taskStatus, dueDate, completedAt } = cols

  const cancelado = allVariantsForCanonical(TASK_STATUS_CANONICAL.CANCELADO)
    .map(s => `'${s.replace(/'/g, "\\'")}'`)
    .join(', ')

  const archivado = allVariantsForCanonical(TASK_STATUS_CANONICAL.ARCHIVADO)
    .map(s => `'${s.replace(/'/g, "\\'")}'`)
    .join(', ')

  const aprobado = allVariantsForCanonical(TASK_STATUS_CANONICAL.APROBADO)
    .map(s => `'${s.replace(/'/g, "\\'")}'`)
    .join(', ')

  // DATE_DIFF days; frozenDays restado en ambas ramas (M1 = 0).
  const daysLateExpr = `(DATE_DIFF(DATE(${completedAt}), ${dueDate}, DAY) - (${frozenDaysSql}))`
  const daysOverdueExpr = `(DATE_DIFF(CURRENT_DATE(), ${dueDate}, DAY) - (${frozenDaysSql}))`
  const esMesActual = `EXTRACT(MONTH FROM ${dueDate}) = EXTRACT(MONTH FROM CURRENT_DATE()) AND EXTRACT(YEAR FROM ${dueDate}) = EXTRACT(YEAR FROM CURRENT_DATE())`

  return `CASE
    WHEN ${dueDate} IS NULL THEN 'not_applicable'
    WHEN ${taskStatus} IN (${cancelado}, ${archivado}) THEN 'not_applicable'
    WHEN NOT (${esMesActual}) THEN 'not_applicable'
    WHEN ${taskStatus} IN (${aprobado}) AND ${completedAt} IS NULL THEN 'on_time'
    WHEN ${taskStatus} IN (${aprobado}) AND ${daysLateExpr} <= 0 THEN 'on_time'
    WHEN ${taskStatus} IN (${aprobado}) THEN 'late_drop'
    WHEN ${daysOverdueExpr} > 0 THEN 'overdue'
    ELSE 'carry_over'
  END`
}
