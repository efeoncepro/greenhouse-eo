import 'server-only'

import { DEFAULT_AI_RUN_RISK_POLICY, type AiRunRiskPolicyConfig } from './risk-router'

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
 * Versión de la policy de risk-routing que entra al digest del run. La implementación v1
 * (Slice 2) vive en `risk-router.ts` — señales estructurales + banda decision-near +
 * peso de competencia + muestra ciega determinística. Toda evolución de señales o
 * thresholds cambia la versión (un run con policy vieja queda stale, nunca se
 * reinterpreta). La confianza CALIBRADA es Slice 3 y exigirá `...v2`.
 */
export const HIRING_ASSESSMENT_AI_RUN_POLICY_VERSION = 'hiring_assessment_ai_risk_policy.v1'

// ── Fan-out del drain (Slice 2, ADR D4): concurrencia/costo/timeout/retry acotados ──

export interface AiRunFanOutConfig {
  /** Llamadas al provider simultáneas por drain (bounded concurrency). */
  concurrency: number
  /** Timeout duro por item (ms); vencido cuenta como intento fallido retryable. */
  itemTimeoutMs: number
  /** Reintentos máximos por item (además del intento inicial). */
  maxRetriesPerItem: number
  /**
   * Cost/quota cap por run: máximo de intentos de provider ACUMULADOS
   * (suma de attempt_count). Agotado ⇒ los items restantes caen `failed`
   * con reason `run_cost_cap_exceeded` (fail-closed a la cola manual, nunca se pierden).
   */
  maxProviderAttemptsPerRun: number
  /** Lease del run reclamado por un drain (segundos); vencida, otro drain puede retomar. */
  leaseSeconds: number
}

const intEnv = (name: string, fallback: number, min: number, max: number): number => {
  const raw = Number(process.env[name])

  if (!Number.isFinite(raw)) return fallback

  return Math.max(min, Math.min(max, Math.floor(raw)))
}

export const getAiRunFanOutConfig = (): AiRunFanOutConfig => ({
  concurrency: intEnv('HIRING_ASSESSMENT_AI_RUN_CONCURRENCY', 3, 1, 8),
  itemTimeoutMs: intEnv('HIRING_ASSESSMENT_AI_RUN_ITEM_TIMEOUT_MS', 60_000, 5_000, 300_000),
  maxRetriesPerItem: intEnv('HIRING_ASSESSMENT_AI_RUN_MAX_RETRIES', 2, 0, 2),
  maxProviderAttemptsPerRun: intEnv('HIRING_ASSESSMENT_AI_RUN_MAX_PROVIDER_ATTEMPTS', 60, 1, 500),
  leaseSeconds: intEnv('HIRING_ASSESSMENT_AI_RUN_LEASE_SECONDS', 300, 30, 3600),
})

/**
 * Policy de riesgo efectiva del runtime: defaults versionados de `risk-router.ts` con
 * override acotado por env (la banda decision-near es configurable — spec §Risk-routing).
 * Cambiar un default DEBE ir acompañado de bump de `HIRING_ASSESSMENT_AI_RUN_POLICY_VERSION`.
 */
export const getAiRunRiskPolicyConfig = (): AiRunRiskPolicyConfig => ({
  minAnswerChars: intEnv('HIRING_ASSESSMENT_AI_RISK_MIN_ANSWER_CHARS', DEFAULT_AI_RUN_RISK_POLICY.minAnswerChars, 1, 2000),
  decisionNearBandLow: intEnv('HIRING_ASSESSMENT_AI_RISK_BAND_LOW', DEFAULT_AI_RUN_RISK_POLICY.decisionNearBandLow, 0, 100),
  decisionNearBandHigh: intEnv('HIRING_ASSESSMENT_AI_RISK_BAND_HIGH', DEFAULT_AI_RUN_RISK_POLICY.decisionNearBandHigh, 0, 100),
  highWeightThreshold: intEnv('HIRING_ASSESSMENT_AI_RISK_HIGH_WEIGHT', DEFAULT_AI_RUN_RISK_POLICY.highWeightThreshold, 1, 100),
  qualitySampleRate: DEFAULT_AI_RUN_RISK_POLICY.qualitySampleRate,
  criterionContradictionDelta: DEFAULT_AI_RUN_RISK_POLICY.criterionContradictionDelta,
})
