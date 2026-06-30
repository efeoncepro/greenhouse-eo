/**
 * TASK-1244 — Growth AI Visibility · Admin evidence review · state machine (pure).
 *
 * Gate humano de release YMYL. El estado de revisión de un (run, score_version) deriva
 * del log append-only `grader_report_reviews`: AUSENCIA de fila = `pending`; la fila más
 * reciente = `approved` | `rejected`. Este módulo es PURO (sin DB): valida la transición
 * ANTES del INSERT en el comando.
 *
 * Transiciones válidas:
 *   - pending  → approved | rejected   (decisión humana; se persiste una fila)
 *   - approved → approved              (idempotente; no-op, no persiste)
 *   - rejected → rejected              (idempotente; no-op, no persiste)
 * Transiciones INVÁLIDAS (terminal-once, anti-flip):
 *   - approved → rejected · rejected → approved   → ReportReviewError('invalid_transition')
 *
 * El LLM NUNCA aprueba: la decisión es un comando humano gobernado (propose→confirm→execute;
 * el humano confirma). Este validador no conoce identidad — sólo la legalidad de la transición.
 */

export type ReportReviewState = 'pending' | 'approved' | 'rejected'

export type ReportReviewDecision = 'approved' | 'rejected'

export type ReportReviewErrorCode = 'invalid_transition' | 'not_reviewable' | 'reason_required'

export class ReportReviewError extends Error {
  readonly code: ReportReviewErrorCode

  constructor(code: ReportReviewErrorCode, message: string) {
    super(message)
    this.name = 'ReportReviewError'
    this.code = code
  }
}

export interface ReviewTransitionResult {
  /** `true` ⇒ persistir una fila de decisión nueva; `false` ⇒ idempotente (no-op). */
  apply: boolean
  nextState: ReportReviewDecision
}

const decisionVerb = (decision: ReportReviewDecision): string => (decision === 'approved' ? 'aprobar' : 'rechazar')

const stateNoun = (state: ReportReviewState): string =>
  state === 'approved' ? 'aprobado' : state === 'rejected' ? 'rechazado' : 'pendiente'

/**
 * Valida y resuelve la transición de revisión. Lanza `ReportReviewError('invalid_transition')`
 * para un flip terminal (approved↔rejected). Idempotente cuando el estado vigente ya es la
 * decisión pedida (`apply=false`, sin persistir).
 */
export const resolveReviewTransition = (
  current: ReportReviewState,
  decision: ReportReviewDecision
): ReviewTransitionResult => {
  if (current === 'pending') {
    return { apply: true, nextState: decision }
  }

  if (current === decision) {
    return { apply: false, nextState: decision }
  }

  throw new ReportReviewError(
    'invalid_transition',
    `No se puede ${decisionVerb(decision)} un reporte ya ${stateNoun(current)}.`
  )
}
