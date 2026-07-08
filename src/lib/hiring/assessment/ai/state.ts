// TASK-1361 — Assessment AI Assist: state machine pura del ledger de propuestas.
// El LLM NUNCA confirma: la decisión es un comando humano gobernado (propose→confirm→execute).
// Espeja la doctrina del AEO grader (src/lib/growth/ai-visibility/review/state.ts).

import { HiringValidationError } from '@/lib/hiring/errors'
import type { AiProposalDecision, AiProposalStatus } from '@/types/hiring-assessment-ai'

export interface ProposalTransition {
  /** Estado destino tras aplicar la decisión. */
  next: AiProposalStatus
  /** false = no-op idempotente (misma decisión ya aplicada); no re-ejecutar el efecto. */
  apply: boolean
}

/**
 * Resuelve la transición de una propuesta ante una decisión humana.
 * - `proposed` → `confirmed` (decision=confirm) | `rejected` (decision=reject), `apply=true`.
 * - Misma decisión sobre un estado ya terminal → idempotente (`apply=false`), no vuelve a ejecutar.
 * - Decisión distinta sobre un estado terminal → error (`invalid_transition`), terminal-once.
 */
export const resolveProposalTransition = (
  current: AiProposalStatus,
  decision: AiProposalDecision,
): ProposalTransition => {
  const target: AiProposalStatus = decision === 'confirm' ? 'confirmed' : 'rejected'

  if (current === 'proposed') {
    return { next: target, apply: true }
  }

  // Estado terminal (confirmed | rejected).
  if (current === target) {
    return { next: current, apply: false }
  }

  throw new HiringValidationError(
    `No se puede ${decision === 'confirm' ? 'confirmar' : 'rechazar'} una propuesta que ya está ${current === 'confirmed' ? 'confirmada' : 'rechazada'}.`,
    'assessment_ai_proposal_invalid_transition',
    409,
  )
}
