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
  'rejected_to_manual',
] as const
export type AiScoringRunItemStatus = (typeof AI_SCORING_RUN_ITEM_STATUSES)[number]

export const AI_SCORING_RUN_ITEM_TERMINAL_STATUSES = [
  'abstained',
  'failed',
  'stale',
  'superseded_by_manual',
  'cancelled',
  'confirmed',
  'rejected_to_manual',
] as const satisfies readonly AiScoringRunItemStatus[]

/**
 * Resolución humana UNO a uno de un item `mandatory_review` | `quality_sample` (Slice 4):
 * `confirmed` aplica el score propuesto tal cual; `overridden` aplica el score humano
 * (`finalScore` obligatorio); `rejected_to_manual` rechaza la propuesta y la respuesta
 * vuelve a la cola manual. Terminal-once por item.
 */
export const AI_SCORING_RUN_ITEM_RESOLUTIONS = ['confirmed', 'overridden', 'rejected_to_manual'] as const
export type AiScoringRunItemResolution = (typeof AI_SCORING_RUN_ITEM_RESOLUTIONS)[number]

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
  /** Reason codes estables de la policy de routing (evidencia auditable, Slice 2). */
  routingReasons: string[]
  attemptCount: number
  /** Decisión humana terminal-once (Slice 4); null mientras la excepción no se resuelve. */
  resolution: AiScoringRunItemResolution | null
  /**
   * Anti-anclaje (ADR D1 / Delta punto 9): si el revisor VIO la propuesta antes de emitir
   * su score. Evidencia auditable del manifest; null en items sin revisión humana.
   */
  sawProposalBeforeScoring: boolean | null
  resolvedBy: string | null
  resolvedAt: string | null
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

// ── Slice 4 — Revisión operator-only + confirmación de run por lote ──

/**
 * Item de revisión operator-only (reader exact-scoped). NUNCA incluye campos de identidad
 * del candidato (nombre/contacto/CV): solo IDs de lineage + textos de pregunta/respuesta
 * necesarios para revisar + la evidencia del proposal con su provenance.
 */
export interface AssessmentAiReviewItem {
  runItemId: string
  responseId: string
  status: AiScoringRunItemStatus
  riskClass: AiScoringRiskClass | null
  /** Reason codes estables del routing (evidencia; nunca prosa libre). */
  routingReasons: string[]
  reasonCode: string | null
  attemptCount: number
  resolution: AiScoringRunItemResolution | null
  sawProposalBeforeScoring: boolean | null
  resolvedBy: string | null
  resolvedAt: string | null
  /** Texto de la pregunta (necesario para revisar; no identifica al candidato). */
  questionPrompt: string
  questionType: string
  /** Texto de la respuesta (allowlist `text|value`; '' si malformada). */
  answerText: string
  /** Evidencia del proposal (score sugerido + perCriterion + rationale) o null si no hay proposal. */
  proposal: {
    proposalId: string
    status: string
    score: number | null
    rationale: string | null
    perCriterion: Array<{ criterion: string; score: number; note?: string }>
    /** Provenance reconstruible (ADR D3): provider/model/prompt/digest, nunca payload crudo. */
    provider: string
    model: string
    promptVersion: string
    inputDigest: string | null
  } | null
}

/** Cobertura del run para el gate de confirmación (Slice 4). */
export interface AssessmentAiRunReviewCoverage {
  /** Items aún en scoring (pending|claimed) — el run no es confirmable con esto > 0. */
  scoringPending: number
  /** Excepciones mandatory_review con proposal sin resolver (bloquean el confirm). */
  mandatoryPending: number
  mandatoryResolved: number
  /** Muestra ciega sin resolver (bloquea el confirm). */
  samplePending: number
  sampleResolved: number
  /** Proposals batch_eligible restantes que cubriría el confirm de run. */
  batchEligible: number
  /** Items devueltos a la cola manual (abstained|failed|rejected_to_manual). */
  returnedToManual: number
  /** Items cerrados por el carril manual / stale / cancelados. */
  closedWithoutProposal: number
  /** true si el digest recomputado hoy difiere del digest del run (answers/rubric/modelo/policy cambiaron). */
  digestStale: boolean
}

export interface AssessmentAiRunReview {
  run: AiScoringRun
  items: AssessmentAiReviewItem[]
  coverage: AssessmentAiRunReviewCoverage
}

export interface ResolveScoringRunItemInput {
  runId: string
  runItemId: string
  resolution: AiScoringRunItemResolution
  /** Obligatorio con `overridden` (escala canónica 0–100); ignorado en los demás casos. */
  finalScore?: number
  decisionNote?: string
  /** Evidencia anti-anclaje obligatoria (ADR D1/Delta punto 9). */
  sawProposalBeforeScoring: boolean
  actorUserId: string
}

export interface ResolveScoringRunItemResult {
  item: AiScoringRunItem
  /** false = misma resolución ya aplicada (no-op idempotente, sin re-ejecutar efectos). */
  applied: boolean
}

export interface ConfirmAssessmentAiScoringRunInput {
  runId: string
  actorUserId: string
  decisionNote?: string
}

export interface ConfirmAssessmentAiScoringRunResult {
  run: AiScoringRun
  items: AiScoringRunItem[]
  /** Proposals batch_eligible aplicadas por ESTE confirm (0 en el no-op idempotente). */
  appliedProposals: number
  /** true = el run ya estaba confirmado (no-op idempotente; sin manifest nuevo). */
  alreadyConfirmed: boolean
}

export interface ReconcileAiScoringRunsResult {
  /** Proposals `proposed` huérfanas transicionadas a `superseded_by_manual` (ADR D3). */
  proposalsSuperseded: number
  /** Items no terminales cuya respuesta ya tiene score humano → `superseded_by_manual`. */
  itemsSuperseded: number
  /** Runs no terminales sin trabajo restante (assessment ya scored) → `cancelled`. */
  runsClosed: number
}
