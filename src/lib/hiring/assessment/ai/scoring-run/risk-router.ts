// TASK-1734 Slice 2 — Risk router PURO de la policy versionada
// `hiring_assessment_ai_risk_policy.v1` (ADR D2). Clasifica cada item YA puntuado en
// `mandatory_review` | `quality_sample` | `batch_eligible` usando SOLO las señales
// implementables hoy de la spec (§Risk-routing minimum signals):
//
//   - respuesta vacía / demasiado corta / malformada;
//   - rubric faltante o vacía;
//   - proposal sin `perCriterion` o con criterios contradictorios vs el score global;
//   - score dentro de la banda decision-near definida por policy;
//   - competencia de peso alto en el template;
//   - muestra ciega aleatoria DETERMINÍSTICA por (runId, responseId) — sin Math.random.
//
// ⚠️ Declaración explícita (ADR D2 + Slice 3): la CONFIANZA CALIBRADA contra outcomes
// humanos NO existe todavía — es entregable del Slice 3. Por eso esta policy clasifica
// conservador: con `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED` OFF (default en todos
// los runtimes) TODO item es `mandatory_review`, y el flag NO debe prenderse antes de que
// el Slice 3 entregue la calibración + eval de promoción (los gates técnicos del ADR no
// se rebajan). La confianza self-report del modelo NUNCA decide elegibilidad.
//
// Módulo puro: cero IO, cero flags leídos acá (el caller inyecta el estado del flag y la
// policy). Testeable sin DB ni env.

import { createHash } from 'node:crypto'

import type { AiScoringRiskClass } from '@/types/hiring-assessment-ai-run'
import type { ResponseScoreProposal } from '@/types/hiring-assessment-ai'

// ── Reason codes ESTABLES (evidencia auditable en routing_reasons; nunca prosa) ──

export const AI_RISK_ROUTING_REASONS = [
  'answer_empty',
  'answer_too_short',
  'answer_malformed',
  'rubric_missing',
  'per_criterion_missing',
  'per_criterion_contradictory',
  'score_decision_near_band',
  'high_weight_competency',
  'exception_policy_disabled',
  'blind_quality_sample',
  'no_risk_signals',
] as const
export type AiRiskRoutingReason = (typeof AI_RISK_ROUTING_REASONS)[number]

// ── Policy config (los valores viven acá; el override por env vive en config.ts) ──

export interface AiRunRiskPolicyConfig {
  /** Respuesta con menos caracteres útiles que esto → `answer_too_short`. */
  minAnswerChars: number
  /** Banda decision-near inclusive [low, high] en la escala canónica 0–100. */
  decisionNearBandLow: number
  decisionNearBandHigh: number
  /** Peso del módulo de competencia (template suma 100) desde el cual es "alto peso". */
  highWeightThreshold: number
  /** Tasa de la muestra ciega determinística (0–1). */
  qualitySampleRate: number
  /** |score global − promedio(perCriterion)| mayor que esto → criterios contradictorios. */
  criterionContradictionDelta: number
}

export const DEFAULT_AI_RUN_RISK_POLICY: AiRunRiskPolicyConfig = {
  minAnswerChars: 40,
  decisionNearBandLow: 55,
  decisionNearBandHigh: 70,
  highWeightThreshold: 30,
  qualitySampleRate: 0.1,
  criterionContradictionDelta: 25,
}

// ── Muestra ciega determinística (seed = runId + responseId; jamás Math.random) ──

/**
 * Selección reproducible: sha256(`runId|responseId`) → primeros 4 bytes como uint32
 * normalizado a [0,1). El mismo (run, response) SIEMPRE cae igual — auditoría y replay
 * dan la misma muestra; ningún operador puede re-tirar el dado.
 */
export const isBlindQualitySample = (runId: string, responseId: string, rate: number): boolean => {
  if (!(rate > 0)) return false
  if (rate >= 1) return true

  const digest = createHash('sha256').update(`${runId}|${responseId}`).digest()

  return digest.readUInt32BE(0) / 0x1_0000_0000 < rate
}

// ── Router ──

export interface RiskRoutingInput {
  runId: string
  responseId: string
  /** Texto extraído de la respuesta (allowlist del packet; puede ser ''). */
  answerText: string
  /** true si el answer_json no tiene campo de texto usable (estructura inesperada). */
  answerMalformed: boolean
  rubric: Record<string, unknown> | null
  /** Peso del módulo de competencia en el template (0–100) o null si no hay template. */
  competencyWeight: number | null
  proposal: ResponseScoreProposal
  /** Estado inyectado de `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED` (OFF ⇒ todo mandatory). */
  exceptionPolicyEnabled: boolean
  policy?: AiRunRiskPolicyConfig
}

export interface RiskRoutingResult {
  riskClass: AiScoringRiskClass
  /** Reason codes estables, en orden de evaluación (evidencia para el manifest de Slice 4). */
  reasons: AiRiskRoutingReason[]
}

/**
 * Clasifica un item PUNTUADO. Fail-closed por construcción: cualquier señal de riesgo
 * ⇒ `mandatory_review`; en duda (policy OFF, sin calibración) ⇒ `mandatory_review`.
 * La muestra ciega solo se sortea entre items que de otro modo serían elegibles
 * (ADR D2: blind sample "among otherwise eligible cases").
 */
export const routeScoredItem = (input: RiskRoutingInput): RiskRoutingResult => {
  const policy = input.policy ?? DEFAULT_AI_RUN_RISK_POLICY
  const reasons: AiRiskRoutingReason[] = []

  const answer = input.answerText.trim()

  if (input.answerMalformed) reasons.push('answer_malformed')

  if (!input.answerMalformed && answer.length === 0) reasons.push('answer_empty')

  if (!input.answerMalformed && answer.length > 0 && answer.length < policy.minAnswerChars) {
    reasons.push('answer_too_short')
  }

  if (!input.rubric || Object.keys(input.rubric).length === 0) reasons.push('rubric_missing')

  const perCriterion = input.proposal.perCriterion

  if (!perCriterion || perCriterion.length === 0) {
    reasons.push('per_criterion_missing')
  } else {
    const mean = perCriterion.reduce((acc, c) => acc + c.score, 0) / perCriterion.length

    if (Math.abs(input.proposal.score - mean) > policy.criterionContradictionDelta) {
      reasons.push('per_criterion_contradictory')
    }
  }

  if (
    input.proposal.score >= policy.decisionNearBandLow &&
    input.proposal.score <= policy.decisionNearBandHigh
  ) {
    reasons.push('score_decision_near_band')
  }

  if (input.competencyWeight != null && input.competencyWeight >= policy.highWeightThreshold) {
    reasons.push('high_weight_competency')
  }

  if (reasons.length > 0) {
    return { riskClass: 'mandatory_review', reasons }
  }

  // Sin señales de riesgo. Sin policy de excepción activa no hay elegibilidad batch:
  // conservador (la calibración del Slice 3 aún no existe) ⇒ mandatory_review.
  if (!input.exceptionPolicyEnabled) {
    return { riskClass: 'mandatory_review', reasons: ['exception_policy_disabled'] }
  }

  if (isBlindQualitySample(input.runId, input.responseId, policy.qualitySampleRate)) {
    return { riskClass: 'quality_sample', reasons: ['blind_quality_sample'] }
  }

  return { riskClass: 'batch_eligible', reasons: ['no_risk_signals'] }
}
