// TASK-1361 — Assessment AI Assist: tipos del ledger de propuestas IA gobernadas.
// Patrón propose→confirm→execute: la IA propone contenido (evidencia), el humano confirma.
// El LLM NUNCA escribe el banco ni el score; solo confirmAiProposal aplica.

export const AI_PROPOSAL_KINDS = ['question_draft', 'response_score', 'opening_public_copy'] as const
export type AiProposalKind = (typeof AI_PROPOSAL_KINDS)[number]

export const AI_PROPOSAL_STATUSES = ['proposed', 'confirmed', 'rejected'] as const
export type AiProposalStatus = (typeof AI_PROPOSAL_STATUSES)[number]

export const AI_PROPOSAL_DECISIONS = ['confirm', 'reject'] as const
export type AiProposalDecision = (typeof AI_PROPOSAL_DECISIONS)[number]

/**
 * Payload estructurado de un `question_draft`. Espeja `CreateQuestionInput` para que el confirm
 * mapee 1:1 a `createQuestion` (la pregunta nace `draft` → gate SME). answerKey/rubric son
 * sensibles: viven en la propuesta solo para el reviewer interno, nunca en el payload candidato.
 */
export interface QuestionDraftProposal {
  competencyKey: string
  level: string
  type: string
  prompt: string
  options?: Array<Record<string, unknown>>
  answerKey?: Record<string, unknown>
  rubric?: Record<string, unknown>
  note?: string
}

/**
 * Payload estructurado de un `response_score`. El LLM aporta EVIDENCIA (score sugerido + rationale);
 * el humano fija el valor final al confirmar. score en escala canónica 0–100.
 */
export interface ResponseScoreProposal {
  score: number
  rationale: string
  perCriterion?: Array<{ criterion: string; score: number; note?: string }>
}

/**
 * Payload estructurado de un `opening_public_copy` (TASK-1385). La IA redacta SOLO copy público
 * (campos de texto del aviso); los HECHOS (ubicación, work mode, banda de compensación) son del
 * operador — la IA nunca los inventa ni los propone. `targetRef` = openingId. El confirm humano
 * aplica vía `updateHiringOpening` (el LLM nunca escribe el opening).
 */
export interface OpeningPublicCopyProposal {
  publicTitle: string
  publicSummary: string
  publicDescription: string
  publicRequirements?: string
  publicNiceToHave?: string
  publicArea?: string
  publicSkillTags?: string[]
  publicSeniority?: string
  publicProcessNotes?: string
  note?: string
}

/** View model normalizado del ledger (snake→camel). NUNCA expone secretos crudos de credenciales. */
export interface AiProposal {
  proposalId: string
  kind: AiProposalKind
  targetRef: string
  proposed: Record<string, unknown>
  provider: string
  model: string
  promptVersion: string
  inputDigest: string | null
  usage: Record<string, unknown>
  status: AiProposalStatus
  confirmedRef: string | null
  decisionNote: string | null
  confirmedBy: string | null
  confirmedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAiProposalInput {
  kind: AiProposalKind
  targetRef: string
  proposed: Record<string, unknown>
  provider: string
  model: string
  promptVersion: string
  inputDigest?: string | null
  usage?: Record<string, unknown>
}

export interface ListAiProposalFilters {
  kind?: AiProposalKind
  status?: AiProposalStatus
  targetRef?: string
  limit?: number
  offset?: number
}

/**
 * Input del confirm gobernado. Para `question_draft`, `questionOverride` permite que el humano edite
 * el borrador antes de crearlo. Para `response_score`, `finalScore` es el valor que el humano fija
 * (default = el score propuesto por la IA si no se pasa override).
 */
export interface ConfirmAiProposalInput {
  proposalId: string
  decision: AiProposalDecision
  decisionNote?: string
  questionOverride?: Partial<QuestionDraftProposal>
  finalScore?: number
  /** TASK-1385: edición humana del copy propuesto antes de aplicarlo al opening. */
  publicCopyOverride?: Partial<OpeningPublicCopyProposal>
}
