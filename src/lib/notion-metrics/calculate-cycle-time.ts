import 'server-only'

import {
  CYCLE_TIME_FORMULA_VERSION,
  type CycleTimeResult,
  type TaskInputsForCycleTime
} from './cycle-time-types'

/**
 * TASK-908 Slice 1 — calculateCycleTime canonical helper V1.
 *
 * 4 decisiones canonical (Delta 2026-05-17 + spec CYCLE_TIME_V1.md §4):
 *
 *   1. INICIO = primer timestamp donde status pasó a 'En curso' (canonical).
 *      Fallback canonical a `createdAt` cuando NO hay transition row
 *      (tareas pre-TASK-908b sin historial capturado). `sourceMode` distingue.
 *   2. FIN = `completedAt` (Notion `Fecha de completado`). `null` → unavailable.
 *   3. Tiempo en `Cambios solicitados` / `Listo para revisión` (feedback time):
 *      SE INCLUYE. No se descuenta — es parte del CT canonical.
 *   4. Tiempo en `Bloqueado` / `En pausa` / `Detenido` (legacy): SE EXCLUYE.
 *      Cada interval `[entered, exited]` se descuenta clampeado a la ventana
 *      `[start, completedAt]`.
 *
 * Pure function — no IO, deterministic, idempotent.
 *
 * Cross-ref: docs/architecture/metrics/CYCLE_TIME_V1.md §4.1.
 */
export const calculateCycleTime = (inputs: TaskInputsForCycleTime): CycleTimeResult => {
  const { enCursoStartedAt, completedAt, blockedIntervals, createdAt } = inputs

  // 1. Sin completion → unavailable (CT requiere ventana cerrada)
  if (!completedAt) {
    return {
      cycleTimeDays: null,
      sourceMode: 'unavailable',
      blockedDaysExcluded: 0,
      formulaVersion: CYCLE_TIME_FORMULA_VERSION
    }
  }

  // 2. Resolver inicio canonical
  const start = enCursoStartedAt ?? createdAt
  const sourceMode = enCursoStartedAt ? 'canonical' : 'fallback_created_at'

  // 3. Raw días calendar
  const MS_PER_DAY = 86_400_000
  const rawMs = completedAt.getTime() - start.getTime()
  const rawDays = rawMs / MS_PER_DAY

  // 4. Descontar tiempo en Bloqueado/Detenido dentro de [start, completedAt].
  // Clamp pre-start a start; clamp post-end a completedAt; clamp exited=null
  // a completedAt (tarea aún bloqueada al cierre).
  let blockedMs = 0

  for (const { entered, exited } of blockedIntervals) {
    const effectiveEntered =
      entered.getTime() < start.getTime() ? start.getTime() : entered.getTime()

    const effectiveExited =
      exited === null || exited.getTime() > completedAt.getTime()
        ? completedAt.getTime()
        : exited.getTime()

    if (effectiveExited > effectiveEntered) {
      blockedMs += effectiveExited - effectiveEntered
    }
  }

  const blockedDays = blockedMs / MS_PER_DAY

  // Clamp defensivo a 0 (data inconsistente: e.g. enCursoStartedAt posterior
  // a completedAt, o blocked > raw).
  const cycleTimeDays = Math.max(0, rawDays - blockedDays)

  return {
    cycleTimeDays,
    sourceMode,
    blockedDaysExcluded: blockedDays,
    formulaVersion: CYCLE_TIME_FORMULA_VERSION
  }
}
