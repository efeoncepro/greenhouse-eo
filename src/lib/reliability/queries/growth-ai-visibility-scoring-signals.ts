import 'server-only'

/**
 * TASK-1227 — Growth AI Visibility · Scoring/normalization reliability signals (Slice 5).
 *
 * 5 signals del motor de normalización/scoring. 3 medibles desde
 * greenhouse_growth.grader_scores + el eval del golden-set; 2 stubbeadas
 * (sin failure-ledger todavía) con follow-up explícito. Degradación honesta:
 * error de lectura → severity 'unknown' + captureWithDomain('growth').
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGoldenEval, type GoldenEvalCase } from '@/lib/growth/ai-visibility/evals/eval-runner'
import goldenSet from '@/lib/growth/ai-visibility/evals/golden-set.v1.json'
import { BRAND_ACCURACY_REVIEW_REASON } from '@/lib/growth/ai-visibility/review-gates/gates'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_NORMALIZATION_FAILED_SIGNAL_ID = 'growth.ai_visibility.normalization_failed'
export const GROWTH_AI_VISIBILITY_SCORE_RECOMPUTE_FAILED_SIGNAL_ID = 'growth.ai_visibility.score_recompute_failed'
export const GROWTH_AI_VISIBILITY_INSUFFICIENT_DATA_RATE_SIGNAL_ID = 'growth.ai_visibility.insufficient_data_rate'
export const GROWTH_AI_VISIBILITY_REVIEW_REQUIRED_RATE_SIGNAL_ID = 'growth.ai_visibility.report_review_required_rate'
export const GROWTH_AI_VISIBILITY_EVAL_REGRESSION_SIGNAL_ID = 'growth.ai_visibility.prompt_pack_eval_regression'
export const GROWTH_AI_VISIBILITY_BRAND_ACCURACY_REVIEW_SIGNAL_ID = 'growth.ai_visibility.brand_accuracy_review'

const MODULE_KEY = 'growth' as const

const buildScoreStatusSignals = async (observedAt: string): Promise<ReliabilitySignal[]> => {
  const rows = await runGreenhousePostgresQuery<{ total: number; insufficient: number; review: number; accuracy: number }>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE score_status = 'insufficient_data')::int AS insufficient,
       COUNT(*) FILTER (WHERE score_status = 'review_required')::int AS review,
       COUNT(*) FILTER (WHERE $1 = ANY(review_reasons))::int AS accuracy
     FROM greenhouse_growth.grader_scores
     WHERE created_at >= NOW() - INTERVAL '30 days'`,
    [BRAND_ACCURACY_REVIEW_REASON]
  )

  const total = Number(rows[0]?.total ?? 0)
  const insufficient = Number(rows[0]?.insufficient ?? 0)
  const review = Number(rows[0]?.review ?? 0)
  const accuracy = Number(rows[0]?.accuracy ?? 0)
  const insufficientRate = total > 0 ? insufficient / total : 0
  const reviewRate = total > 0 ? review / total : 0

  return [
    {
      signalId: GROWTH_AI_VISIBILITY_INSUFFICIENT_DATA_RATE_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'data_quality',
      source: 'getGrowthAiVisibilityScoringSignals',
      label: 'Tasa de scores insufficient_data (AI Visibility)',
      severity: total === 0 ? 'ok' : insufficientRate <= 0.5 ? 'ok' : insufficientRate <= 0.8 ? 'warning' : 'error',
      summary:
        total === 0
          ? 'Sin scores en 30 días.'
          : `${insufficient}/${total} scores con cobertura insuficiente (${(insufficientRate * 100).toFixed(0)}%) en 30 días.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'insufficient', value: String(insufficient) },
        { kind: 'metric', label: 'total', value: String(total) }
      ]
    },
    {
      signalId: GROWTH_AI_VISIBILITY_REVIEW_REQUIRED_RATE_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'posture',
      source: 'getGrowthAiVisibilityScoringSignals',
      label: 'Tasa de scores en review_required (AI Visibility)',
      severity: 'ok', // review_required es comportamiento de seguridad esperado, no un fallo.
      summary:
        total === 0
          ? 'Sin scores en 30 días.'
          : `${review}/${total} scores requieren revisión humana (${(reviewRate * 100).toFixed(0)}%) en 30 días.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'review_required', value: String(review) },
        { kind: 'metric', label: 'total', value: String(total) }
      ]
    },
    {
      signalId: GROWTH_AI_VISIBILITY_BRAND_ACCURACY_REVIEW_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'posture',
      source: 'getGrowthAiVisibilityScoringSignals',
      label: 'Scores con inexactitud de marca en revisión (AI Visibility)',
      severity: 'ok', // escalar a revisión por inexactitud es comportamiento de seguridad esperado (YMYL), no un fallo.
      summary:
        total === 0
          ? 'Sin scores en 30 días.'
          : `${accuracy}/${total} scores escalados a revisión por posible inexactitud de marca (TASK-1238) en 30 días.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'brand_accuracy_review', value: String(accuracy) },
        { kind: 'metric', label: 'total', value: String(total) }
      ]
    }
  ]
}

const buildEvalRegressionSignal = (observedAt: string): ReliabilitySignal => {
  const report = runGoldenEval(goldenSet.cases as unknown as GoldenEvalCase[])
  const ok = report.deterministicMismatches === 0

  return {
    signalId: GROWTH_AI_VISIBILITY_EVAL_REGRESSION_SIGNAL_ID,
    moduleKey: MODULE_KEY,
    kind: 'test_lane',
    source: 'getGrowthAiVisibilityScoringSignals',
    label: 'Regresión del golden-set (AI Visibility)',
    severity: ok ? 'ok' : 'error',
    summary: ok
      ? `Golden-set sin regresión: ${report.deterministicMatches} match deterministas, ${report.llmRequired} requieren LLM.`
      : `Regresión: ${report.deterministicMismatches} divergencias deterministas vs el golden-set.`,
    observedAt,
    evidence: [
      { kind: 'metric', label: 'matches', value: String(report.deterministicMatches) },
      { kind: 'metric', label: 'mismatches', value: String(report.deterministicMismatches) },
      { kind: 'metric', label: 'llm_required', value: String(report.llmRequired) }
    ]
  }
}

// Stubs: sin failure-ledger todavía. Steady ok; follow-up = ledger de intentos
// de normalización/recompute (mismo patrón que auth_attempts).
const buildStubSignal = (signalId: string, label: string, observedAt: string): ReliabilitySignal => ({
  signalId,
  moduleKey: MODULE_KEY,
  kind: 'runtime',
  source: 'getGrowthAiVisibilityScoringSignals',
  label,
  severity: 'ok',
  summary: 'Sin ledger de fallos todavía (follow-up: tabla de intentos). Los fallos hoy van a Sentry domain=growth.',
  observedAt,
  evidence: [{ kind: 'doc', label: 'follow-up', value: 'TASK-1227 §Reliability — failure ledger pendiente' }]
})

export const getGrowthAiVisibilityScoringSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  const statusSignals = await buildScoreStatusSignals(observedAt).catch(error => {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_scoring' } })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_INSUFFICIENT_DATA_RATE_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'data_quality' as const,
        source: 'getGrowthAiVisibilityScoringSignals',
        label: 'Tasa de scores insufficient_data (AI Visibility)',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [{ kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) }]
      }
    ]
  })

  return [
    ...statusSignals,
    buildEvalRegressionSignal(observedAt),
    buildStubSignal(GROWTH_AI_VISIBILITY_NORMALIZATION_FAILED_SIGNAL_ID, 'Fallos de normalización (AI Visibility)', observedAt),
    buildStubSignal(GROWTH_AI_VISIBILITY_SCORE_RECOMPUTE_FAILED_SIGNAL_ID, 'Fallos de recompute de score (AI Visibility)', observedAt)
  ]
}
