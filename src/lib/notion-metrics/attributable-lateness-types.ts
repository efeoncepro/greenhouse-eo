import type { OtdBucket } from './otd-bucket-types'
import type { RescheduleReasonCode } from '@/lib/delivery/reschedule-reason-inference'

/**
 * TASK-922 (M2) — Tipos canonical del atraso imputable (attributable lateness).
 *
 * El atraso imputable mide SOLO el slip atribuible a la agencia: días posteriores
 * a la **fecha justa** (original + extensiones cliente/scope confirmadas) menos el
 * tiempo en estados de **freeze** ({Listo para revisión, Bloqueado, En pausa}).
 *
 * Cross-ref: docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md §4-7.
 */

export const ATTRIBUTABLE_LATENESS_FORMULA_VERSION = 'attributable_lateness_v1.0' as const

/**
 * Estados de freeze cuyo wall-clock NO se imputa al atraso (ADR §4-5). Set de
 * exclusión DISTINTO al de Cycle Time (que solo excluye `Bloqueado`): el atraso
 * EXCLUYE también `Listo para revisión` (espera del cliente) y `En pausa`.
 */
export const ATTRIBUTABLE_FREEZE_STATUSES = [
  'Listo para revisión',
  'Bloqueado',
  'En pausa'
] as const

/**
 * Motivos que EXTIENDEN la fecha justa (ADR §5 — partición disjunta). Son
 * disjuntos de los estados de freeze: ningún wall-clock se cuenta en ambos.
 */
export const FAIR_DEADLINE_EXTENDING_REASONS: readonly RescheduleReasonCode[] = [
  'client_requested',
  'scope_change'
]

/** Intervalo en un estado de freeze (mirror de blockedIntervals de Cycle Time). */
export interface FreezeInterval {
  readonly entered: Date
  /** `null` = aún en el estado al `end` (clamp a `end`). */
  readonly exited: Date | null
}

/** Una reprogramación capturada (subset de `task_due_date_changes`). */
export interface RescheduleObservation {
  readonly daysDelta: number | null
  readonly reasonCode: RescheduleReasonCode
  readonly reasonSource: 'inferred' | 'operator_confirmed'
}

export interface TaskInputsForAttributableLateness {
  readonly originalDueDate: Date | null
  readonly currentDueDate: Date | null
  /** `completed_at`. `null` → tarea abierta, `end = asOf`. */
  readonly completedAt: Date | null
  readonly taskStatus: string | null
  /** Intervalos en estados de freeze, ya reconstruidos desde transitions. */
  readonly freezeIntervals: readonly FreezeInterval[]
  /** Reprogramaciones capturadas (vacío hasta que el operador active la captura). */
  readonly reschedules: readonly RescheduleObservation[]
  /**
   * `true` si la tarea tiene historial de transiciones registrado. `false` →
   * el freeze no es confiable (`unavailable`, no 0 — ADR §42 honest degradation).
   */
  readonly hasStatusHistory: boolean
  readonly asOf?: Date
}

export type AttributableLatenessDataStatus = 'valid' | 'unavailable' | 'legacy_unknown'

export interface AttributableLatenessResult {
  /** max(0, días(fin, fecha_justa) − freeze posterior). */
  readonly attributableDaysLate: number
  /** Fecha justa `YYYY-MM-DD` (original + extensiones confirmadas), o null. */
  readonly fairDeadline: string | null
  /** Días de freeze descontados (posteriores a la fecha justa). */
  readonly frozenDaysExcluded: number
  /** Bucket reason-aware (vía classifyOtdBucket freeze ON, sin gate de mes). */
  readonly bucket: OtdBucket
  /**
   * - `unavailable`: sin historial de transiciones o sin fecha base → no medible.
   * - `legacy_unknown`: hay reprogramación extending sin confirmar → conservador
   *   (mide vs fecha vigente, NO vs la justa especulativa).
   * - `valid`: medición precisa.
   */
  readonly dataStatus: AttributableLatenessDataStatus
  readonly formulaVersion: typeof ATTRIBUTABLE_LATENESS_FORMULA_VERSION
}
