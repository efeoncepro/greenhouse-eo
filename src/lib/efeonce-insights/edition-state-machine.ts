/**
 * TASK-1845 — state machine de `InsightEdition` (guard de aplicación, fail-fast antes de
 * tocar DB). Espejo EXACTO de `greenhouse_insights.insight_edition_state_matrix`
 * (trigger de DB — última defensa). El test de paridad parsea la migración foundation.
 *
 *   draft → collecting → composing → validating → ready_for_review → issued
 *   {collecting,composing,validating} → failed → (recuperación POR FASE) → esa fase
 *   {draft, ready_for_review, issued} → withdrawn        (GATE HUMANO)
 *   ready_for_review → issued                            (GATE HUMANO)
 *
 * Una edición emitida no vuelve al ciclo: corregir = versión nueva (arquitectura §4).
 */

import { INSIGHT_EDITION_STATES, type InsightEditionState, type InsightFailedPhase } from './contracts/states'

export const INSIGHT_EDITION_TRANSITION_MATRIX: Readonly<Record<InsightEditionState, readonly InsightEditionState[]>> = {
  draft: ['collecting', 'withdrawn'],
  collecting: ['composing', 'failed'],
  composing: ['validating', 'failed'],
  validating: ['ready_for_review', 'failed'],
  ready_for_review: ['issued', 'withdrawn'],
  failed: ['collecting', 'composing', 'validating'],
  issued: ['withdrawn'],
  withdrawn: []
}

export const INSIGHT_EDITION_HUMAN_GATE_TRANSITIONS: ReadonlySet<string> = new Set([
  'draft→withdrawn',
  'ready_for_review→issued',
  'ready_for_review→withdrawn',
  'issued→withdrawn'
])

export const TERMINAL_INSIGHT_EDITION_STATES: readonly InsightEditionState[] = ['withdrawn']

/** Estados que el cliente puede ver con estado REDACTADO (arquitectura §7.1). */
export const CLIENT_VISIBLE_EDITION_STATES: readonly InsightEditionState[] = [
  'draft',
  'collecting',
  'composing',
  'validating',
  'ready_for_review',
  'issued',
  'failed'
]

const transitionKey = (from: InsightEditionState, to: InsightEditionState): string => `${from}→${to}`

export const isValidInsightEditionTransition = (from: InsightEditionState, to: InsightEditionState): boolean =>
  INSIGHT_EDITION_TRANSITION_MATRIX[from].includes(to)

export const requiresInsightHumanGate = (from: InsightEditionState, to: InsightEditionState): boolean =>
  INSIGHT_EDITION_HUMAN_GATE_TRANSITIONS.has(transitionKey(from, to))

export const isTerminalInsightEditionState = (state: InsightEditionState): boolean =>
  TERMINAL_INSIGHT_EDITION_STATES.includes(state)

export class InsightEditionTransitionError extends Error {
  readonly from: InsightEditionState
  readonly to: InsightEditionState

  constructor(from: InsightEditionState, to: InsightEditionState, editionId: string) {
    super(`Transición ilegal de edición Insights ${from} → ${to} (${editionId})`)
    this.name = 'InsightEditionTransitionError'
    this.from = from
    this.to = to
  }
}

export const assertValidInsightEditionTransition = (
  from: InsightEditionState,
  to: InsightEditionState,
  editionId: string
): void => {
  if (!isValidInsightEditionTransition(from, to)) throw new InsightEditionTransitionError(from, to, editionId)
}

/** La fase recuperable de `failed` es la fase de destino (failed → collecting|composing|validating). */
export const recoveryPhaseForTransition = (
  from: InsightEditionState,
  to: InsightEditionState
): InsightFailedPhase | null => {
  if (from !== 'failed') return null
  if (to === 'collecting' || to === 'composing' || to === 'validating') return to

  return null
}

/** Todas las transiciones válidas como `from→to`, para paridad y documentación. */
export const listInsightEditionTransitions = (): Array<{ from: InsightEditionState; to: InsightEditionState; humanGate: boolean }> =>
  INSIGHT_EDITION_STATES.flatMap(from =>
    INSIGHT_EDITION_TRANSITION_MATRIX[from].map(to => ({ from, to, humanGate: requiresInsightHumanGate(from, to) }))
  )
