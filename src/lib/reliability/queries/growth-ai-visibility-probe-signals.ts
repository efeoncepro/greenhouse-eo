import 'server-only'

/**
 * TASK-1266 — Growth AI Visibility · Site Readiness Probe Layer reliability signals.
 *
 * 2 signals desde greenhouse_growth.grader_probe_results (30 días):
 *  - probe_failure_rate (data_quality): % de probes en `failed` sobre los que tuvieron
 *    veredicto medible (succeeded+failed). Steady ~0. Un `skipped` NO es fallo (degradación
 *    honesta esperada, p.ej. no_headless) → excluido del denominador.
 *  - probe_headless_coverage (posture): % de probes headless-dependientes que quedaron
 *    `skipped/no_headless`. Severity siempre `ok` (informativo): explica por qué CWV/WebMCP
 *    salen sin dato hasta cablear Chromium en el worker; no es una falla.
 * Degradación honesta: error de lectura → severity 'unknown' + captureWithDomain('growth').
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_PROBE_FAILURE_RATE_SIGNAL_ID = 'growth.ai_visibility.probe_failure_rate'
export const GROWTH_AI_VISIBILITY_PROBE_HEADLESS_COVERAGE_SIGNAL_ID = 'growth.ai_visibility.probe_headless_coverage'

const MODULE_KEY = 'growth' as const
const SOURCE = 'getGrowthAiVisibilityProbeSignals'

type ProbeAgg = {
  total: number
  succeeded: number
  failed: number
  no_headless: number
}

const buildProbeSignals = async (observedAt: string): Promise<ReliabilitySignal[]> => {
  const rows = await runGreenhousePostgresQuery<ProbeAgg>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'succeeded')::int AS succeeded,
       COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
       COUNT(*) FILTER (WHERE status = 'skipped' AND error_code = 'no_headless')::int AS no_headless
     FROM greenhouse_growth.grader_probe_results
     WHERE created_at >= NOW() - INTERVAL '30 days'`
  )

  const total = Number(rows[0]?.total ?? 0)
  const succeeded = Number(rows[0]?.succeeded ?? 0)
  const failed = Number(rows[0]?.failed ?? 0)
  const noHeadless = Number(rows[0]?.no_headless ?? 0)

  const verdicts = succeeded + failed
  const failureRate = verdicts > 0 ? failed / verdicts : 0
  const headlessSkipRate = total > 0 ? noHeadless / total : 0

  return [
    {
      signalId: GROWTH_AI_VISIBILITY_PROBE_FAILURE_RATE_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'data_quality',
      source: SOURCE,
      label: 'Tasa de fallo de probes (Site Readiness)',
      severity: verdicts === 0 ? 'ok' : failureRate <= 0.2 ? 'ok' : failureRate <= 0.5 ? 'warning' : 'error',
      summary:
        verdicts === 0
          ? 'Sin probes con veredicto en 30 días.'
          : `${failed}/${verdicts} probes en fallo (${(failureRate * 100).toFixed(0)}%) en 30 días (skipped excluido).`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'failed', value: String(failed) },
        { kind: 'metric', label: 'verdicts', value: String(verdicts) },
        { kind: 'metric', label: 'total', value: String(total) }
      ]
    },
    {
      signalId: GROWTH_AI_VISIBILITY_PROBE_HEADLESS_COVERAGE_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'posture',
      source: SOURCE,
      // Degradación honesta esperada (Chromium se cablea aparte) → informativo, nunca un fallo.
      severity: 'ok',
      label: 'Cobertura headless de probes (Site Readiness)',
      summary:
        total === 0
          ? 'Sin probes en 30 días.'
          : `${noHeadless}/${total} probes (${(headlessSkipRate * 100).toFixed(0)}%) sin medir por falta de runtime headless (CWV/WebMCP).`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'no_headless', value: String(noHeadless) },
        { kind: 'metric', label: 'total', value: String(total) },
        { kind: 'doc', label: 'follow-up', value: 'TASK-1266 §Architecture Alignment — Chromium en Cloud Run worker' }
      ]
    }
  ]
}

export const getGrowthAiVisibilityProbeSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  return buildProbeSignals(observedAt).catch(error => {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_probe' } })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_PROBE_FAILURE_RATE_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'data_quality' as const,
        source: SOURCE,
        label: 'Tasa de fallo de probes (Site Readiness)',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [{ kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) }]
      }
    ]
  })
}
