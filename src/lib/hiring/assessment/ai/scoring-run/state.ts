// TASK-1734 — State machine PURA del scoring run (ADR D1) + de sus items.
// Trio state-machine+CHECK+audit: el CHECK de DB valida estados; este módulo valida
// TRANSICIONES; la historia append-only (run_event) audita. Testeable sin DB.

import { HiringValidationError } from '@/lib/hiring/errors'
import {
  AI_SCORING_RUN_ITEM_TERMINAL_STATUSES,
  AI_SCORING_RUN_TERMINAL_STATUSES,
  type AiScoringRunItemStatus,
  type AiScoringRunStatus,
} from '@/types/hiring-assessment-ai-run'

// ── Run ──

/**
 * Matriz canónica de transiciones del run (ADR D1):
 * created → enumerating → scoring → awaiting_review → confirmable → confirmed.
 * cancelled/failed alcanzables desde todo estado no terminal. `enumerating → awaiting_review`
 * cubre el run sin items elegibles (nada que puntuar). `confirmable → awaiting_review`
 * cubre reapertura por digest stale antes del confirm (Slice 4).
 */
const RUN_TRANSITIONS: Record<AiScoringRunStatus, readonly AiScoringRunStatus[]> = {
  created: ['enumerating', 'cancelled', 'failed'],
  enumerating: ['scoring', 'awaiting_review', 'cancelled', 'failed'],
  scoring: ['awaiting_review', 'cancelled', 'failed'],
  awaiting_review: ['confirmable', 'cancelled', 'failed'],
  confirmable: ['confirmed', 'awaiting_review', 'cancelled', 'failed'],
  confirmed: [],
  cancelled: [],
  failed: [],
}

export const isTerminalRunStatus = (status: AiScoringRunStatus): boolean =>
  (AI_SCORING_RUN_TERMINAL_STATUSES as readonly AiScoringRunStatus[]).includes(status)

export interface RunTransition {
  next: AiScoringRunStatus
  /** false = no-op idempotente (ya está en el estado destino terminal); no re-ejecutar efectos. */
  apply: boolean
}

/**
 * Resuelve una transición del run. Terminal-once: pedir el MISMO estado terminal ya
 * alcanzado es idempotente (`apply=false`); cualquier otra transición ilegal es 409.
 */
export const resolveRunTransition = (
  current: AiScoringRunStatus,
  target: AiScoringRunStatus,
): RunTransition => {
  if (current === target && isTerminalRunStatus(current)) {
    return { next: current, apply: false }
  }

  if (RUN_TRANSITIONS[current]?.includes(target)) {
    return { next: target, apply: true }
  }

  throw new HiringValidationError(
    `El run de scoring no puede pasar de ${current} a ${target}.`,
    'assessment_ai_run_invalid_transition',
    409,
    { current, target },
  )
}

// ── Items ──

/**
 * Matriz de transiciones del item. `pending → claimed → proposed` es el camino del drain
 * (Slice 2); todo item no terminal puede caer a `superseded_by_manual` (reconciliación),
 * `stale` (digest cambió) o `cancelled` (cancel del run). Slice 4: `proposed → confirmed`
 * (resolución humana confirmed/overridden o batch confirm) y `proposed → rejected_to_manual`
 * (la propuesta se rechaza y la respuesta vuelve a la cola manual).
 */
const ITEM_TRANSITIONS: Record<AiScoringRunItemStatus, readonly AiScoringRunItemStatus[]> = {
  pending: ['claimed', 'stale', 'superseded_by_manual', 'cancelled', 'failed'],
  claimed: ['proposed', 'abstained', 'failed', 'pending', 'stale', 'superseded_by_manual', 'cancelled'],
  proposed: ['confirmed', 'rejected_to_manual', 'stale', 'superseded_by_manual', 'cancelled'],
  abstained: [],
  failed: [],
  stale: [],
  superseded_by_manual: [],
  cancelled: [],
  confirmed: [],
  rejected_to_manual: [],
}

export const isTerminalItemStatus = (status: AiScoringRunItemStatus): boolean =>
  (AI_SCORING_RUN_ITEM_TERMINAL_STATUSES as readonly AiScoringRunItemStatus[]).includes(status)

export interface ItemTransition {
  next: AiScoringRunItemStatus
  apply: boolean
}

export const resolveItemTransition = (
  current: AiScoringRunItemStatus,
  target: AiScoringRunItemStatus,
): ItemTransition => {
  if (current === target && isTerminalItemStatus(current)) {
    return { next: current, apply: false }
  }

  if (ITEM_TRANSITIONS[current]?.includes(target)) {
    return { next: target, apply: true }
  }

  throw new HiringValidationError(
    `El item del run no puede pasar de ${current} a ${target}.`,
    'assessment_ai_run_item_invalid_transition',
    409,
    { current, target },
  )
}
