import 'server-only'

// TASK-1734 — Assessment AI Scoring Run config (ADR D6): TRES flags independientes,
// default OFF, con runtime ownership propio. El master `HIRING_ASSESSMENT_AI_ENABLED`
// NO gatea estos paths ni el rollback (Delta punto 4): el revert opera por estos flags
// + commands de run (confirm OFF → enqueue OFF → drain/cancel/reconcile → cola manual).
// Registro obligatorio en docs/operations/FEATURE_FLAG_STATE_LEDGER.md (mismo PR).

/** Gatea creación de runs + fan-out de scoring (proyección + drain). Runtime owner: ops-worker. */
export const isHiringAssessmentAiRunEnqueueEnabled = (): boolean =>
  process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED === 'true'

/**
 * Gatea elegibilidad `batch_eligible` por policy (OFF ⇒ todo item es `mandatory_review`).
 * Runtime owner: ops-worker (evaluación en el drain) + Vercel (readers reflejan la clase).
 */
export const isHiringAssessmentAiExceptionPolicyEnabled = (): boolean =>
  process.env.HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED === 'true'

/** Gatea el command de confirmación de run (batch). Runtime owner: Vercel (App API). */
export const isHiringAssessmentAiRunConfirmEnabled = (): boolean =>
  process.env.HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED === 'true'

/**
 * Versión de la policy de risk-routing que entra al digest del run. Slice 1 la fija como
 * placeholder versionado; la policy real (señales + thresholds) llega en Slice 2/3 y toda
 * evolución cambia la versión (un run con policy vieja queda stale, nunca se reinterpreta).
 */
export const HIRING_ASSESSMENT_AI_RUN_POLICY_VERSION = 'hiring_assessment_ai_risk_policy.v1'
