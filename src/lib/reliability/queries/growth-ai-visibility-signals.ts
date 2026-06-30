import 'server-only'

/**
 * TASK-1226 — Growth AI Visibility Grader · Reliability signals (Slice 4).
 *
 * 4 signals del dominio growth.ai_visibility sobre el evidence ledger de los
 * últimos 7 días. Con DB vacía (grader OFF / sin runs) todos resuelven en estado
 * sano (ok/awaiting_data) — steady esperado pre-launch. Degradación honesta:
 * error de lectura → severity 'unknown' + captureWithDomain('growth').
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  GROWTH_AI_VISIBILITY_PENDING_LAG_THRESHOLD_MINUTES,
  GROWTH_AI_VISIBILITY_STUCK_RUNNING_THRESHOLD_MINUTES
} from '@/lib/growth/ai-visibility/lifecycle'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_PROVIDER_ERROR_RATE_SIGNAL_ID = 'growth.ai_visibility.provider_error_rate'
export const GROWTH_AI_VISIBILITY_PROVIDER_LATENCY_P95_SIGNAL_ID = 'growth.ai_visibility.provider_latency_p95'
export const GROWTH_AI_VISIBILITY_COST_BUDGET_USED_SIGNAL_ID = 'growth.ai_visibility.cost_budget_used'
export const GROWTH_AI_VISIBILITY_PROVIDER_CALL_SKIPPED_SIGNAL_ID = 'growth.ai_visibility.provider_call_skipped'
export const GROWTH_AI_VISIBILITY_RUN_EXECUTION_LAG_SIGNAL_ID = 'growth.ai_visibility.run_execution_lag'
export const GROWTH_AI_VISIBILITY_RUN_STUCK_RUNNING_SIGNAL_ID = 'growth.ai_visibility.run_stuck_running'

const MODULE_KEY = 'growth' as const

const unknownSignal = (signalId: string, label: string, error: unknown): ReliabilitySignal => {
  captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal', signal: signalId } })

  return {
    signalId,
    moduleKey: MODULE_KEY,
    kind: 'data_quality',
    source: 'getGrowthAiVisibilitySignals',
    label,
    severity: 'unknown',
    summary: 'No fue posible leer el signal. Revisa los logs.',
    observedAt: new Date().toISOString(),
    evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
  }
}

const buildProviderErrorRateSignal = async (observedAt: string): Promise<ReliabilitySignal> => {
  const rows = await runGreenhousePostgresQuery<{ errors: number; attempts: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('failed', 'rate_limited'))::int AS errors,
       COUNT(*) FILTER (WHERE status <> 'skipped')::int AS attempts
     FROM greenhouse_growth.provider_observations
     WHERE created_at >= NOW() - INTERVAL '7 days'`
  )

  const errors = Number(rows[0]?.errors ?? 0)
  const attempts = Number(rows[0]?.attempts ?? 0)
  const rate = attempts > 0 ? errors / attempts : 0

  const severity: ReliabilitySignal['severity'] =
    attempts === 0 ? 'ok' : rate === 0 ? 'ok' : rate <= 0.2 ? 'warning' : 'error'

  return {
    signalId: GROWTH_AI_VISIBILITY_PROVIDER_ERROR_RATE_SIGNAL_ID,
    moduleKey: MODULE_KEY,
    kind: 'data_quality',
    source: 'getGrowthAiVisibilitySignals',
    label: 'Tasa de error de providers (AI Visibility)',
    severity,
    summary:
      attempts === 0
        ? 'Sin llamadas a providers en los últimos 7 días (grader OFF o sin runs).'
        : `${errors}/${attempts} llamadas con error/rate-limit (${(rate * 100).toFixed(1)}%) en 7 días.`,
    observedAt,
    evidence: [
      { kind: 'metric', label: 'errors', value: String(errors) },
      { kind: 'metric', label: 'attempts', value: String(attempts) },
      { kind: 'sql', label: 'source', value: 'greenhouse_growth.provider_observations' }
    ]
  }
}

const buildLatencyP95Signal = async (observedAt: string): Promise<ReliabilitySignal> => {
  const rows = await runGreenhousePostgresQuery<{ p95: number | null; n: number }>(
    `SELECT
       percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95,
       COUNT(*)::int AS n
     FROM greenhouse_growth.provider_observations
     WHERE status = 'succeeded' AND created_at >= NOW() - INTERVAL '7 days'`
  )

  const n = Number(rows[0]?.n ?? 0)
  const p95 = rows[0]?.p95 != null ? Number(rows[0].p95) : null

  const severity: ReliabilitySignal['severity'] =
    n === 0 || p95 === null ? 'ok' : p95 <= 30_000 ? 'ok' : p95 <= 60_000 ? 'warning' : 'error'

  return {
    signalId: GROWTH_AI_VISIBILITY_PROVIDER_LATENCY_P95_SIGNAL_ID,
    moduleKey: MODULE_KEY,
    kind: 'runtime',
    source: 'getGrowthAiVisibilitySignals',
    label: 'Latencia p95 de providers (AI Visibility)',
    severity,
    summary:
      n === 0 || p95 === null
        ? 'Sin observaciones exitosas en 7 días para medir latencia.'
        : `Latencia p95 ${Math.round(p95)}ms sobre ${n} observaciones exitosas (7 días).`,
    observedAt,
    evidence: [
      { kind: 'metric', label: 'p95_ms', value: p95 === null ? 'n/a' : String(Math.round(p95)) },
      { kind: 'metric', label: 'succeeded', value: String(n) }
    ]
  }
}

const buildCostBudgetSignal = async (observedAt: string): Promise<ReliabilitySignal> => {
  const rows = await runGreenhousePostgresQuery<{ max_ratio: number | null; max_cost: number | null; runs: number }>(
    `SELECT
       MAX(CASE WHEN cost_ceiling_usd > 0 THEN estimated_cost_usd / cost_ceiling_usd ELSE 0 END) AS max_ratio,
       MAX(estimated_cost_usd) AS max_cost,
       COUNT(*)::int AS runs
     FROM greenhouse_growth.grader_runs
     WHERE created_at >= NOW() - INTERVAL '7 days'`
  )

  const runs = Number(rows[0]?.runs ?? 0)
  const maxRatio = rows[0]?.max_ratio != null ? Number(rows[0].max_ratio) : 0
  const maxCost = rows[0]?.max_cost != null ? Number(rows[0].max_cost) : 0

  const severity: ReliabilitySignal['severity'] =
    runs === 0 ? 'ok' : maxRatio < 0.8 ? 'ok' : maxRatio < 1 ? 'warning' : 'error'

  return {
    signalId: GROWTH_AI_VISIBILITY_COST_BUDGET_USED_SIGNAL_ID,
    moduleKey: MODULE_KEY,
    kind: 'cost_guard',
    source: 'getGrowthAiVisibilitySignals',
    label: 'Presupuesto de costo usado (AI Visibility)',
    severity,
    summary:
      runs === 0
        ? 'Sin runs en 7 días; presupuesto sin consumo.'
        : `Máximo ${(maxRatio * 100).toFixed(0)}% del cost ceiling usado (run más caro ~$${maxCost.toFixed(4)}) en ${runs} runs.`,
    observedAt,
    evidence: [
      { kind: 'metric', label: 'max_ratio', value: maxRatio.toFixed(3) },
      { kind: 'metric', label: 'max_cost_usd', value: maxCost.toFixed(4) },
      { kind: 'metric', label: 'runs', value: String(runs) }
    ]
  }
}

const buildSkippedSignal = async (observedAt: string): Promise<ReliabilitySignal> => {
  const rows = await runGreenhousePostgresQuery<{ skipped: number; total: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped,
       COUNT(*)::int AS total
     FROM greenhouse_growth.provider_observations
     WHERE created_at >= NOW() - INTERVAL '7 days'`
  )

  const skipped = Number(rows[0]?.skipped ?? 0)
  const total = Number(rows[0]?.total ?? 0)

  // Posture: skip es ESPERADO pre-launch (flags OFF). Nunca es error por sí mismo.
  return {
    signalId: GROWTH_AI_VISIBILITY_PROVIDER_CALL_SKIPPED_SIGNAL_ID,
    moduleKey: MODULE_KEY,
    kind: 'posture',
    source: 'getGrowthAiVisibilitySignals',
    label: 'Llamadas a provider saltadas (AI Visibility)',
    severity: 'ok',
    summary:
      total === 0
        ? 'Sin observaciones en 7 días (grader OFF, estado esperado pre-launch).'
        : `${skipped}/${total} observaciones saltadas (flag/secret ausente) en 7 días — esperado mientras el grader esté OFF.`,
    observedAt,
    evidence: [
      { kind: 'metric', label: 'skipped', value: String(skipped) },
      { kind: 'metric', label: 'total', value: String(total) }
    ]
  }
}

// TASK-1234 — Salud de la ejecución async (worker Cloud Run). Date-math segura:
// created_at / started_at son timestamptz → `NOW() - col` = interval (nunca date-date).
const buildRunExecutionLagSignal = async (observedAt: string): Promise<ReliabilitySignal> => {
  const rows = await runGreenhousePostgresQuery<{ pending_lag: number }>(
    `SELECT COUNT(*)::int AS pending_lag
       FROM greenhouse_growth.grader_runs
      WHERE status = 'pending'
        AND created_at < NOW() - make_interval(mins => ${GROWTH_AI_VISIBILITY_PENDING_LAG_THRESHOLD_MINUTES})`
  )

  const pendingLag = Number(rows[0]?.pending_lag ?? 0)

  const severity: ReliabilitySignal['severity'] =
    pendingLag === 0 ? 'ok' : pendingLag <= 2 ? 'warning' : 'error'

  return {
    signalId: GROWTH_AI_VISIBILITY_RUN_EXECUTION_LAG_SIGNAL_ID,
    moduleKey: MODULE_KEY,
    kind: 'lag',
    source: 'getGrowthAiVisibilitySignals',
    label: 'Runs encolados sin ejecutar (AI Visibility)',
    severity,
    summary:
      pendingLag === 0
        ? 'Sin runs encolados esperando ejecución (worker async al día).'
        : `${pendingLag} run(s) en 'pending' > ${GROWTH_AI_VISIBILITY_PENDING_LAG_THRESHOLD_MINUTES} min — el worker Cloud Run no está drenando.`,
    observedAt,
    evidence: [
      { kind: 'metric', label: 'pending_lag', value: String(pendingLag) },
      { kind: 'sql', label: 'source', value: 'greenhouse_growth.grader_runs status=pending' },
      { kind: 'doc', label: 'task', value: 'TASK-1234 (ops-growth-grader-drain)' }
    ]
  }
}

const buildRunStuckRunningSignal = async (observedAt: string): Promise<ReliabilitySignal> => {
  const rows = await runGreenhousePostgresQuery<{ stuck: number }>(
    `SELECT COUNT(*)::int AS stuck
       FROM greenhouse_growth.grader_runs
      WHERE status = 'running'
        AND started_at IS NOT NULL
        AND started_at < NOW() - make_interval(mins => ${GROWTH_AI_VISIBILITY_STUCK_RUNNING_THRESHOLD_MINUTES})`
  )

  const stuck = Number(rows[0]?.stuck ?? 0)

  const severity: ReliabilitySignal['severity'] = stuck === 0 ? 'ok' : 'error'

  return {
    signalId: GROWTH_AI_VISIBILITY_RUN_STUCK_RUNNING_SIGNAL_ID,
    moduleKey: MODULE_KEY,
    kind: 'runtime',
    source: 'getGrowthAiVisibilitySignals',
    label: 'Runs huérfanos en ejecución (AI Visibility)',
    severity,
    summary:
      stuck === 0
        ? 'Sin runs colgados en ejecución (recovery al día).'
        : `${stuck} run(s) en 'running' > ${GROWTH_AI_VISIBILITY_STUCK_RUNNING_THRESHOLD_MINUTES} min — crash/timeout mid-run; el recovery los finaliza con la evidencia ya persistida.`,
    observedAt,
    evidence: [
      { kind: 'metric', label: 'stuck_running', value: String(stuck) },
      { kind: 'sql', label: 'source', value: 'greenhouse_growth.grader_runs status=running' },
      { kind: 'doc', label: 'task', value: 'TASK-1234 (recoverStuckRunningRuns)' }
    ]
  }
}

/** Devuelve los 6 signals del grader. Cada uno degrada honestamente si su query falla. */
export const getGrowthAiVisibilitySignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  const [errorRate, latency, cost, skipped, executionLag, stuckRunning] = await Promise.all([
    buildProviderErrorRateSignal(observedAt).catch(error =>
      unknownSignal(GROWTH_AI_VISIBILITY_PROVIDER_ERROR_RATE_SIGNAL_ID, 'Tasa de error de providers (AI Visibility)', error)
    ),
    buildLatencyP95Signal(observedAt).catch(error =>
      unknownSignal(GROWTH_AI_VISIBILITY_PROVIDER_LATENCY_P95_SIGNAL_ID, 'Latencia p95 de providers (AI Visibility)', error)
    ),
    buildCostBudgetSignal(observedAt).catch(error =>
      unknownSignal(GROWTH_AI_VISIBILITY_COST_BUDGET_USED_SIGNAL_ID, 'Presupuesto de costo usado (AI Visibility)', error)
    ),
    buildSkippedSignal(observedAt).catch(error =>
      unknownSignal(GROWTH_AI_VISIBILITY_PROVIDER_CALL_SKIPPED_SIGNAL_ID, 'Llamadas a provider saltadas (AI Visibility)', error)
    ),
    buildRunExecutionLagSignal(observedAt).catch(error =>
      unknownSignal(GROWTH_AI_VISIBILITY_RUN_EXECUTION_LAG_SIGNAL_ID, 'Runs encolados sin ejecutar (AI Visibility)', error)
    ),
    buildRunStuckRunningSignal(observedAt).catch(error =>
      unknownSignal(GROWTH_AI_VISIBILITY_RUN_STUCK_RUNNING_SIGNAL_ID, 'Runs huérfanos en ejecución (AI Visibility)', error)
    )
  ])

  return [errorRate, latency, cost, skipped, executionLag, stuckRunning]
}
