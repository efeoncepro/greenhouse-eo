// TASK-1734 Slice 1 — Assessment AI Scoring Run: tipos del aggregate durable de scoring
// por hiring_assessment exacto (ADR GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1).
// El run orquesta y gobierna escala; TASK-1361 sigue siendo dueña del proposal ledger.
// El resultado es EXCLUSIVAMENTE interno para operadores: nunca llega al postulante.

// ── Run (state machine ADR D1) ──

export const AI_SCORING_RUN_STATUSES = [
  'created',
  'enumerating',
  'scoring',
  'awaiting_review',
  'confirmable',
  'confirmed',
  'cancelled',
  'failed',
] as const
export type AiScoringRunStatus = (typeof AI_SCORING_RUN_STATUSES)[number]

export const AI_SCORING_RUN_TERMINAL_STATUSES = ['confirmed', 'cancelled', 'failed'] as const satisfies readonly AiScoringRunStatus[]

// ── Items (lineage exacto run → response → proposal) ──

export const AI_SCORING_RUN_ITEM_STATUSES = [
  'pending',
  'claimed',
  'proposed',
  'abstained',
  'failed',
  'stale',
  'superseded_by_manual',
  'cancelled',
  'confirmed',
] as const
export type AiScoringRunItemStatus = (typeof AI_SCORING_RUN_ITEM_STATUSES)[number]

export const AI_SCORING_RUN_ITEM_TERMINAL_STATUSES = [
  'abstained',
  'failed',
  'stale',
  'superseded_by_manual',
  'cancelled',
  'confirmed',
] as const satisfies readonly AiScoringRunItemStatus[]

/** Clases de riesgo de la policy versionada (ADR D2). La puebla Slice 2; nace nullable. */
export const AI_SCORING_RISK_CLASSES = ['mandatory_review', 'quality_sample', 'batch_eligible'] as const
export type AiScoringRiskClass = (typeof AI_SCORING_RISK_CLASSES)[number]

// ── View models normalizados (snake → camel; DTOs operator-only, sin PII cruda) ──

export interface AiScoringRun {
  runId: string
  assessmentId: string
  applicationId: string
  inputDigest: string
  /** Modelo EFECTIVO resuelto por el runtime al crear el run (nunca el default asumido). */
  model: string
  promptVersion: string
  policyVersion: string
  status: AiScoringRunStatus
  statusReason: string | null
  leaseOwner: string | null
  leaseExpiresAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface AiScoringRunItem {
  runItemId: string
  runId: string
  assessmentId: string
  applicationId: string
  responseId: string
  proposalId: string | null
  inputDigest: string | null
  status: AiScoringRunItemStatus
  riskClass: AiScoringRiskClass | null
  reasonCode: string | null
  attemptCount: number
  createdAt: string
  updatedAt: string
}

export interface AiScoringRunWithItems {
  run: AiScoringRun
  items: AiScoringRunItem[]
}

export interface StartAiScoringRunResult {
  run: AiScoringRun
  items: AiScoringRunItem[]
  /** false = replay/duplicado resuelto al run activo existente (idempotencia D1). */
  created: boolean
}

export interface ReconcileAiScoringRunsResult {
  /** Proposals `proposed` huérfanas transicionadas a `superseded_by_manual` (ADR D3). */
  proposalsSuperseded: number
  /** Items no terminales cuya respuesta ya tiene score humano → `superseded_by_manual`. */
  itemsSuperseded: number
  /** Runs no terminales sin trabajo restante (assessment ya scored) → `cancelled`. */
  runsClosed: number
}
