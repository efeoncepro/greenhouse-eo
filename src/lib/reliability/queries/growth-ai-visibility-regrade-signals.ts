import 'server-only'

/**
 * TASK-1270 — Recurring AI Visibility re-grade reliability signals.
 *
 * Steady state pre-rollout: no opt-in profiles and no recurring runs → all ok.
 * If the schema is not deployed yet, the reader degrades to unknown like the
 * other growth.ai_visibility signals.
 */

import { RECURRING_REGRADE_IDEMPOTENCY_PREFIX } from '@/lib/growth/ai-visibility/regrade'
import { resolveRecurringRegradeConfig } from '@/lib/growth/ai-visibility/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_REGRADE_LAG_SIGNAL_ID = 'growth.ai_visibility.regrade_lag'
export const GROWTH_AI_VISIBILITY_REGRADE_COST_SIGNAL_ID = 'growth.ai_visibility.regrade_cost'
export const GROWTH_AI_VISIBILITY_REGRADE_STALE_PROFILES_SIGNAL_ID =
  'growth.ai_visibility.regrade_stale_profiles'

const MODULE_KEY = 'growth' as const
const SOURCE = 'getGrowthAiVisibilityRegradeSignals'

interface RegradeSignalRow extends Record<string, unknown> {
  due_lag: number
  stale_profiles: number
  opt_in_profiles: number
  recurring_runs: number
  month_cost: string | number
}

const unknownSignal = (error: unknown): ReliabilitySignal => {
  captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_regrade' } })

  return {
    signalId: GROWTH_AI_VISIBILITY_REGRADE_LAG_SIGNAL_ID,
    moduleKey: MODULE_KEY,
    kind: 'lag',
    source: SOURCE,
    label: 'Cadencia de re-grade AEO',
    severity: 'unknown',
    summary: 'No fue posible leer los signals de re-grade recurrente. Revisa logs/migración TASK-1270.',
    observedAt: new Date().toISOString(),
    evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
  }
}

export const getGrowthAiVisibilityRegradeSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()
  const config = resolveRecurringRegradeConfig()

  try {
    const rows = await runGreenhousePostgresQuery<RegradeSignalRow>(
      `SELECT
         COUNT(*) FILTER (
           WHERE p.recurring_regrade_enabled IS TRUE
             AND p.status = 'active'
             AND p.recurring_regrade_next_at < NOW() - INTERVAL '1 day'
         )::int AS due_lag,
         COUNT(*) FILTER (
           WHERE p.recurring_regrade_enabled IS TRUE
             AND p.status = 'active'
             AND (
               p.recurring_regrade_last_at IS NULL
               OR p.recurring_regrade_last_at < NOW() - INTERVAL '45 days'
             )
         )::int AS stale_profiles,
         COUNT(*) FILTER (
           WHERE p.recurring_regrade_enabled IS TRUE
             AND p.status = 'active'
         )::int AS opt_in_profiles,
         (
           SELECT COUNT(*)::int
             FROM greenhouse_growth.grader_runs r
            WHERE r.idempotency_key LIKE $1
              AND r.created_at >= date_trunc('month', CURRENT_DATE)
         ) AS recurring_runs,
         (
           SELECT COALESCE(SUM(r.estimated_cost_usd), 0)
             FROM greenhouse_growth.grader_runs r
            WHERE r.idempotency_key LIKE $1
              AND r.created_at >= date_trunc('month', CURRENT_DATE)
         ) AS month_cost
       FROM greenhouse_growth.grader_profiles p`,
      [`${RECURRING_REGRADE_IDEMPOTENCY_PREFIX}:%`]
    )

    const dueLag = Number(rows[0]?.due_lag ?? 0)
    const staleProfiles = Number(rows[0]?.stale_profiles ?? 0)
    const optInProfiles = Number(rows[0]?.opt_in_profiles ?? 0)
    const recurringRuns = Number(rows[0]?.recurring_runs ?? 0)
    const monthCost = Number(rows[0]?.month_cost ?? 0)
    const budgetUsed = config.monthlyBudgetUsd > 0 ? monthCost / config.monthlyBudgetUsd : 0

    const lagSeverity: ReliabilitySignal['severity'] =
      dueLag === 0 ? 'ok' : dueLag <= 2 ? 'warning' : 'error'

    const costSeverity: ReliabilitySignal['severity'] =
      budgetUsed >= 1 ? 'error' : budgetUsed >= 0.8 ? 'warning' : 'ok'

    const staleSeverity: ReliabilitySignal['severity'] =
      staleProfiles === 0 ? 'ok' : staleProfiles <= 2 ? 'warning' : 'error'

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_REGRADE_LAG_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'lag',
        source: SOURCE,
        label: 'Lag de re-grade recurrente AEO',
        severity: lagSeverity,
        summary:
          dueLag === 0
            ? 'No hay perfiles opt-in vencidos esperando re-grade.'
            : `${dueLag} perfil(es) opt-in llevan >1 día vencidos para re-grade.`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'due_lag_profiles', value: String(dueLag) },
          { kind: 'metric', label: 'opt_in_profiles', value: String(optInProfiles) }
        ]
      },
      {
        signalId: GROWTH_AI_VISIBILITY_REGRADE_COST_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'cost_guard',
        source: SOURCE,
        label: 'Costo mensual de re-grade AEO',
        severity: costSeverity,
        summary: `Re-grades del mes: ${recurringRuns}; costo estimado $${monthCost.toFixed(2)} de $${config.monthlyBudgetUsd.toFixed(2)} (${(budgetUsed * 100).toFixed(0)}%).`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'recurring_runs', value: String(recurringRuns) },
          { kind: 'metric', label: 'month_cost_usd', value: monthCost.toFixed(2) },
          { kind: 'metric', label: 'budget_usd', value: config.monthlyBudgetUsd.toFixed(2) }
        ]
      },
      {
        signalId: GROWTH_AI_VISIBILITY_REGRADE_STALE_PROFILES_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'posture',
        source: SOURCE,
        label: 'Perfiles AEO opt-in stale',
        severity: staleSeverity,
        summary:
          staleProfiles === 0
            ? 'No hay perfiles opt-in sin re-grade reciente.'
            : `${staleProfiles} perfil(es) opt-in no tienen re-grade exitosamente encolado en 45 días.`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'stale_profiles', value: String(staleProfiles) },
          { kind: 'metric', label: 'opt_in_profiles', value: String(optInProfiles) }
        ]
      }
    ]
  } catch (error) {
    return [unknownSignal(error)]
  }
}
