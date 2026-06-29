import 'server-only'

/**
 * TASK-1292 (EPIC-021) — Growth AI Visibility · Archetype coverage drift signal.
 *
 * Capa A de la eval (DETERMINISTA): alerta si algún arquetipo deja de cubrir su
 * contrato de buyer-intent (matriz `archetype-coverage-eval.v1.json`). Mismo
 * patrón que `prompt_pack_eval_regression` ← `runGoldenEval`: signal `test_lane`
 * que corre el harness PURO en cada lectura del overview, sin DB ni LLM. Steady = 0
 * gaps. Si > 0, un edit del generador de prompts re-rompió la cobertura de un
 * arquetipo (riesgo de re-introducir el falso-0 de ISSUE-110) — bloquea reabilitar
 * el cross-sell (TASK-1291) con confianza.
 *
 * La Capa B (¿SKY score ≠ 0 en un run real?) es evidencia allowlisted, NO un signal
 * (no-determinismo del LLM no debe alertar en steady).
 */

import { captureWithDomain } from '@/lib/observability/capture'
import coverageMatrix from '@/lib/growth/ai-visibility/evals/archetype-coverage-eval.v1.json'
import {
  type ArchetypeCoverageExpectation,
  runArchetypeCoverageEval
} from '@/lib/growth/ai-visibility/evals/archetype-coverage-eval'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_ARCHETYPE_COVERAGE_GAP_SIGNAL_ID =
  'growth.ai_visibility.archetype_coverage_gap'

const MODULE_KEY = 'growth' as const

const buildArchetypeCoverageSignal = (observedAt: string): ReliabilitySignal => {
  const expectations = coverageMatrix.expectations as ArchetypeCoverageExpectation[]
  const report = runArchetypeCoverageEval(expectations)
  const ok = report.failed === 0

  const failed = report.results.filter(result => result.status === 'fail')

  return {
    signalId: GROWTH_AI_VISIBILITY_ARCHETYPE_COVERAGE_GAP_SIGNAL_ID,
    moduleKey: MODULE_KEY,
    kind: 'test_lane',
    source: 'getGrowthAiVisibilityArchetypeCoverageSignals',
    label: 'Cobertura de prompts por arquetipo (AI Visibility)',
    severity: ok ? 'ok' : 'error',
    summary: ok
      ? `Los ${report.passed} arquetipos cubren su contrato de buyer-intent (sin gaps).`
      : `${report.failed} arquetipo(s) sin cobertura: ${failed.map(result => result.businessModel).join(', ')}.`,
    observedAt,
    evidence: [
      { kind: 'metric', label: 'arquetipos', value: String(report.total) },
      { kind: 'metric', label: 'cubiertos', value: String(report.passed) },
      { kind: 'metric', label: 'gaps', value: String(report.failed) },
      ...(ok
        ? []
        : failed.map(result => ({
            kind: 'metric' as const,
            label: result.businessModel,
            value: [
              result.missingStages.length > 0 ? `etapas:${result.missingStages.join('/')}` : '',
              result.fanOutTypesShortfall > 0 ? `fanout-${result.fanOutTypesShortfall}` : '',
              result.agencyLeakPromptIds.length > 0 ? `agency-leak:${result.agencyLeakPromptIds.join('/')}` : '',
              result.missingCategoryToken ? 'sin-{{category}}' : '',
              !result.packVersionMatches ? `pack:${result.packVersion}` : ''
            ]
              .filter(Boolean)
              .join(' ')
          })))
    ]
  }
}

export const getGrowthAiVisibilityArchetypeCoverageSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    return [buildArchetypeCoverageSignal(observedAt)]
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_archetype_coverage' } })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_ARCHETYPE_COVERAGE_GAP_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'test_lane',
        source: 'getGrowthAiVisibilityArchetypeCoverageSignals',
        label: 'Cobertura de prompts por arquetipo (AI Visibility)',
        severity: 'unknown',
        summary: 'No fue posible correr la eval de cobertura. Revisa los logs.',
        observedAt,
        evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
      }
    ]
  }
}
