/**
 * TASK-921 (M0) — Inferencia pura del motivo de reprogramación de fecha límite.
 *
 * Foundation del ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §5 (partición disjunta
 * de motivos) + §6 (inferido + confirmado). Función pura — sin IO, 100% testable.
 *
 * Boundary canonical (ADR §10): Greenhouse INFIERE el motivo desde señales
 * observables (`status_at_change` + transiciones recientes de
 * `task_status_transitions`); el operador CONFIRMA/corrige en Notion (propiedad
 * `Motivo de reprogramación`). El bono (TASK-922+) SOLO usa el motivo confirmado.
 *
 * NO es server-only — pura, segura en client + server.
 */

/**
 * Motivos canónicos (mirror exacto del CHECK enum de
 * `greenhouse_delivery.task_due_date_changes.reason_code`).
 *
 * Partición disjunta (ADR §5):
 * - `client_requested` / `scope_change` → EXTIENDEN la fecha justa (mueven la promesa).
 * - `external_blocker`                  → lo maneja el freeze (estado `Bloqueado`).
 * - `internal_not_prioritized`          → slip de agencia (NO extiende).
 * - `unspecified`                       → default conservador (NO extiende).
 */
export const RESCHEDULE_REASON_CODES = [
  'client_requested',
  'scope_change',
  'external_blocker',
  'internal_not_prioritized',
  'unspecified'
] as const

export type RescheduleReasonCode = (typeof RESCHEDULE_REASON_CODES)[number]

export type RescheduleReasonConfidence = 'high' | 'medium' | 'low'

/**
 * Transición reciente mínima necesaria para la inferencia. El consumer pre-filtra
 * por ventana temporal antes de pasar el array (mantiene la función pura).
 */
export interface RecentStatusTransition {
  readonly toStatus: string
  readonly transitionedAt: string
}

export interface RescheduleReasonInferenceInput {
  /** Estado canonical V1 al momento del cambio de fecha (null si no resoluble). */
  readonly statusAtChange: string | null
  /** Transiciones recientes (pre-filtradas por ventana), cualquier orden. */
  readonly recentTransitions: readonly RecentStatusTransition[]
  /** new - previous en días (null si alguna fecha es null). Diagnóstico. */
  readonly daysDelta: number | null
}

export interface RescheduleReasonInferenceResult {
  readonly reasonCode: RescheduleReasonCode
  readonly reasonConfidence: RescheduleReasonConfidence
}

const BLOCKED_STATUS = 'Bloqueado'
const PAUSED_STATUS = 'En pausa'
const NOT_STARTED_STATUS = 'Sin empezar'
const CLIENT_CHANGES_STATUS = 'Cambios solicitados'

/**
 * Infiere el motivo de reprogramación desde señales observables (ADR §6).
 *
 * Prioridad (first-match-wins, de la señal más fuerte a la más débil):
 * 1. Estado `Bloqueado` al cambio → `external_blocker` (high — estado explícito).
 * 2. Transición reciente a `Bloqueado` → `external_blocker` (medium).
 * 3. Transición reciente a `Cambios solicitados` → `client_requested` (medium —
 *    el cliente pidió cambios → se movió la fecha).
 * 4. Estado `En pausa` al cambio → `internal_not_prioritized` (medium).
 * 5. Estado `Sin empezar` al cambio → `internal_not_prioritized` (low — ambiguo).
 * 6. Sin señal → `unspecified` (low — conservador, NO extiende la fecha justa).
 *
 * **`scope_change` NUNCA se infiere**: es indistinguible de `client_requested`
 * desde señales de estado. Solo el operador lo confirma en Notion. La inferencia
 * client-driven default es `client_requested`; el operador corrige a
 * `scope_change` si corresponde.
 *
 * El signo de `daysDelta` no altera la inferencia en V1 (la atribución la decide
 * TASK-922; acá solo inferimos el porqué del movimiento).
 */
export const inferRescheduleReason = (
  input: RescheduleReasonInferenceInput
): RescheduleReasonInferenceResult => {
  const { statusAtChange, recentTransitions } = input

  if (statusAtChange === BLOCKED_STATUS) {
    return { reasonCode: 'external_blocker', reasonConfidence: 'high' }
  }

  const transitionedToBlocked = recentTransitions.some(t => t.toStatus === BLOCKED_STATUS)

  if (transitionedToBlocked) {
    return { reasonCode: 'external_blocker', reasonConfidence: 'medium' }
  }

  const transitionedToClientChanges = recentTransitions.some(
    t => t.toStatus === CLIENT_CHANGES_STATUS
  )

  if (transitionedToClientChanges) {
    return { reasonCode: 'client_requested', reasonConfidence: 'medium' }
  }

  if (statusAtChange === PAUSED_STATUS) {
    return { reasonCode: 'internal_not_prioritized', reasonConfidence: 'medium' }
  }

  if (statusAtChange === NOT_STARTED_STATUS) {
    return { reasonCode: 'internal_not_prioritized', reasonConfidence: 'low' }
  }

  return { reasonCode: 'unspecified', reasonConfidence: 'low' }
}

// ── Vocabulario Notion ↔ código canonical ────────────────────────────────────
//
// Labels es-CL de la propiedad select `Motivo de reprogramación` en Notion
// (operador-facing). El consumer lee la selección del operador y la mapea a
// `reason_code` canonical. La ausencia de selección = `unspecified` (no se
// fuerza un default falso). El mapa inverso sirve al futuro writeback-de-sugerencia.

export const NOTION_RESCHEDULE_REASON_PROPERTY = 'Motivo de reprogramación'

export const NOTION_RESCHEDULE_REASON_OPTION_TO_CODE: Readonly<Record<string, RescheduleReasonCode>> =
  Object.freeze({
    'Solicitud del cliente': 'client_requested',
    'Cambio de alcance': 'scope_change',
    'Bloqueo externo': 'external_blocker',
    'No priorizado (interno)': 'internal_not_prioritized'
  })

export const RESCHEDULE_REASON_CODE_TO_NOTION_OPTION: Readonly<
  Record<Exclude<RescheduleReasonCode, 'unspecified'>, string>
> = Object.freeze({
  client_requested: 'Solicitud del cliente',
  scope_change: 'Cambio de alcance',
  external_blocker: 'Bloqueo externo',
  internal_not_prioritized: 'No priorizado (interno)'
})

/**
 * Mapea el label de la propiedad Notion `Motivo de reprogramación` a un
 * `reason_code` canonical. Devuelve `null` si el label no está en el vocabulario
 * (operador escribió algo fuera del enum, o la propiedad está vacía) — el caller
 * trata `null` como "sin confirmación" (mantiene la inferencia).
 */
export const notionReasonOptionToCode = (
  optionLabel: string | null | undefined
): RescheduleReasonCode | null => {
  if (!optionLabel) {
    return null
  }

  return NOTION_RESCHEDULE_REASON_OPTION_TO_CODE[optionLabel.trim()] ?? null
}
