/**
 * TASK-1845 — vocabularios de estado de Efeonce Insights (browser-safe).
 * Paridad con los CHECK de `greenhouse_insights.insight_editions` / `insight_edition_transitions`.
 */

export const INSIGHT_EDITION_STATES = [
  'draft',
  'collecting',
  'composing',
  'validating',
  'ready_for_review',
  'issued',
  'failed',
  'withdrawn'
] as const
export type InsightEditionState = (typeof INSIGHT_EDITION_STATES)[number]

/** Fases recuperables desde `failed` (una por fase; la recuperación vuelve a esa fase). */
export const INSIGHT_FAILED_PHASES = ['collecting', 'composing', 'validating'] as const
export type InsightFailedPhase = (typeof INSIGHT_FAILED_PHASES)[number]

export const INSIGHT_ACTOR_KINDS = ['member', 'client_user', 'system', 'cli'] as const
export type InsightActorKind = (typeof INSIGHT_ACTOR_KINDS)[number]

/**
 * Actor resuelto por la autoridad autenticada (nunca por el payload). `userId` es el
 * usuario canónico (interno o cliente); `memberId` sólo existe para colaboradores.
 */
export interface InsightActor {
  kind: InsightActorKind
  userId: string | null
  memberId: string | null
}

export const isInsightEditionState = (value: unknown): value is InsightEditionState =>
  typeof value === 'string' && (INSIGHT_EDITION_STATES as readonly string[]).includes(value)
