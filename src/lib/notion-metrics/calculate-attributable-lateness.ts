import 'server-only'

import { classifyOtdBucket } from './classify-otd-bucket'
import {
  ATTRIBUTABLE_LATENESS_FORMULA_VERSION,
  FAIR_DEADLINE_EXTENDING_REASONS,
  type AttributableLatenessResult,
  type TaskInputsForAttributableLateness
} from './attributable-lateness-types'

/**
 * TASK-922 (M2) — `calculateAttributableLateness` canonical helper V1.
 *
 * Mide el atraso IMPUTABLE a la agencia (ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1`
 * §4): días posteriores a la **fecha justa** menos el tiempo en estados de freeze.
 *
 * ```
 * fecha_justa = COALESCE(original, vigente)
 *             + Σ days_delta de reprogramaciones FORWARD con reason confirmado
 *               ∈ {client_requested, scope_change}
 *
 * atraso_imputable = max(0, días(fin, fecha_justa) − freeze posterior a fecha_justa)
 *   fin = completed_at  (o asOf si abierta)
 * ```
 *
 * Mismo algoritmo de resta de intervalos que `calculateCycleTime` (CYCLE_TIME_V1
 * §4.1), con **tres diferencias canónicas** (ADR §4):
 *   1. el reloj arranca en la **fecha justa**, no en "En curso";
 *   2. set de exclusión = los **3 estados de freeze** (Cycle Time solo `Bloqueado`);
 *   3. solo cuenta intervalos **posteriores** a la fecha justa.
 *
 * > Distinción vs Cycle Time: el tiempo en revisión del cliente y En pausa se
 * > EXCLUYEN del atraso pero se INCLUYEN en Cycle Time (calendario real).
 *
 * **Anti-doble-descuento** (ADR §5): solo `client_requested`/`scope_change`
 * extienden la fecha justa; esos motivos son disjuntos de los estados de freeze
 * → ningún wall-clock se cuenta en ambos.
 *
 * **Degradación honesta** (ADR §42): sin historial de transiciones →
 * `unavailable` (no 0); reprogramación extending sin confirmar → `legacy_unknown`
 * (mide vs vigente, no vs la fecha justa especulativa). NUNCA inventa.
 *
 * Pure function — no IO, determinista, idempotente. El bucket reason-aware se
 * delega a `classifyOtdBucket` (freeze ON, `applyMonthGate: false`) — single
 * source of truth del bucket.
 */
const MS_PER_DAY = 86_400_000

const toUtcMidnight = (d: Date): number =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())

const formatDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

export const calculateAttributableLateness = (
  inputs: TaskInputsForAttributableLateness
): AttributableLatenessResult => {
  const { originalDueDate, currentDueDate, completedAt, taskStatus, freezeIntervals, reschedules } =
    inputs

  const asOf = inputs.asOf ?? new Date()

  const base = {
    formulaVersion: ATTRIBUTABLE_LATENESS_FORMULA_VERSION
  } as const

  const deadlineBase = originalDueDate ?? currentDueDate

  // Sin fecha base o sin historial de transiciones → no medible (honest).
  if (!deadlineBase || !inputs.hasStatusHistory) {
    const fallbackBucket = classifyOtdBucket({
      taskStatus,
      dueDate: deadlineBase,
      completedAt,
      asOf,
      frozenDays: 0,
      applyMonthGate: false
    })

    return {
      attributableDaysLate: 0,
      fairDeadline: deadlineBase ? formatDate(toUtcMidnight(deadlineBase)) : null,
      frozenDaysExcluded: 0,
      bucket: fallbackBucket.bucket,
      dataStatus: 'unavailable',
      ...base
    }
  }

  // ── Fecha justa: original + Σ extensiones confirmadas cliente/scope ──
  const confirmedExtensionDays = reschedules.reduce((sum, r) => {
    const extends_ =
      r.reasonSource === 'operator_confirmed' &&
      FAIR_DEADLINE_EXTENDING_REASONS.includes(r.reasonCode) &&
      (r.daysDelta ?? 0) > 0

    return extends_ ? sum + (r.daysDelta ?? 0) : sum
  }, 0)

  const hasUnconfirmedExtending = reschedules.some(
    r => r.reasonSource !== 'operator_confirmed' && FAIR_DEADLINE_EXTENDING_REASONS.includes(r.reasonCode)
  )

  // legacy_unknown (ADR §6/§42): reprogramación extending sin confirmar →
  // conservador, mide vs la fecha VIGENTE (no extiende especulativamente).
  const dataStatus = hasUnconfirmedExtending ? 'legacy_unknown' : 'valid'

  const fairDeadlineMs =
    dataStatus === 'legacy_unknown'
      ? toUtcMidnight(currentDueDate ?? deadlineBase)
      : toUtcMidnight(deadlineBase) + confirmedExtensionDays * MS_PER_DAY

  const endMs = (completedAt ?? asOf).getTime()

  // ── Freeze: tiempo en {Listo para revisión, Bloqueado, En pausa} POSTERIOR
  //    a la fecha justa, clampeado a [fairDeadline, end]. Mirror cycle-time. ──
  let frozenMs = 0

  for (const { entered, exited } of freezeIntervals) {
    const effEntered = Math.max(entered.getTime(), fairDeadlineMs)
    const effExited = Math.min(exited === null ? endMs : exited.getTime(), endMs)

    if (effExited > effEntered) {
      frozenMs += effExited - effEntered
    }
  }

  const frozenDaysExcluded = frozenMs / MS_PER_DAY
  const rawDaysLate = (endMs - fairDeadlineMs) / MS_PER_DAY
  const attributableDaysLate = Math.max(0, rawDaysLate - frozenDaysExcluded)

  // Bucket reason-aware: classifyOtdBucket con dueDate = fecha justa, freeze ON,
  // sin gate de mes (M2). Recomputa daysLate consistente con attributableDaysLate.
  const bucketResult = classifyOtdBucket({
    taskStatus,
    dueDate: new Date(fairDeadlineMs),
    completedAt,
    asOf,
    frozenDays: frozenDaysExcluded,
    applyMonthGate: false
  })

  return {
    attributableDaysLate,
    fairDeadline: formatDate(fairDeadlineMs),
    frozenDaysExcluded,
    bucket: bucketResult.bucket,
    dataStatus,
    ...base
  }
}
