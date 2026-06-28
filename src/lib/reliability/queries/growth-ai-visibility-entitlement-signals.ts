import 'server-only'

/**
 * TASK-1277 — Growth AI Visibility · Entitlement & metering reliability signals.
 *
 * 3 signals desde `greenhouse_growth.grader_runs` (atribución, ventana del mes en curso):
 *  - entitlement_integrity: runs de portal SIN assignment vigente (bypass del chokepoint).
 *    steady = 0; cualquier > 0 es un bug de gobernanza (un run de portal sin entitlement).
 *  - trial_budget: costo estimado de los trial runs del mes vs el tope global (cost backstop).
 *  - run_attribution: conteo por bucket (client/sales) del mes — observabilidad del cross-sell.
 * DB vacía / portal OFF → steady ok. Degradación honesta: error de lectura → severity unknown.
 */

import { resolveAeoAllowanceConfig } from '@/lib/growth/ai-visibility/flags'
import { resolveProviderPolicy } from '@/lib/growth/ai-visibility/policy'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_ENTITLEMENT_INTEGRITY_SIGNAL_ID =
  'growth.ai_visibility.entitlement_integrity'
export const GROWTH_AI_VISIBILITY_TRIAL_BUDGET_SIGNAL_ID = 'growth.ai_visibility.trial_budget_window'
export const GROWTH_AI_VISIBILITY_RUN_ATTRIBUTION_SIGNAL_ID = 'growth.ai_visibility.run_attribution_window'

const MODULE_KEY = 'growth' as const

interface MeteringRow extends Record<string, unknown> {
  unentitled: number
  trial_runs: number
  client_runs: number
  sales_runs: number
}

export const getGrowthAiVisibilityEntitlementSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()
  const config = resolveAeoAllowanceConfig()
  const lightCeiling = resolveProviderPolicy('light').costCeilingUsdPerRun

  try {
    const rows = await runGreenhousePostgresQuery<MeteringRow>(
      `SELECT
         COUNT(*) FILTER (
           WHERE r.run_source LIKE 'portal_%'
             AND NOT EXISTS (
               SELECT 1 FROM greenhouse_client_portal.module_assignments a
                WHERE a.organization_id = r.organization_id
                  AND a.module_key = 'ai_visibility_v1'
                  AND a.effective_to IS NULL
             )
         )::int AS unentitled,
         COUNT(*) FILTER (WHERE r.run_source = 'portal_trial')::int AS trial_runs,
         COUNT(*) FILTER (WHERE r.cost_attribution = 'client')::int AS client_runs,
         COUNT(*) FILTER (WHERE r.cost_attribution = 'sales')::int AS sales_runs
       FROM greenhouse_growth.grader_runs r
       WHERE r.created_at >= date_trunc('month', CURRENT_DATE)`
    )

    const unentitled = Number(rows[0]?.unentitled ?? 0)
    const trialRuns = Number(rows[0]?.trial_runs ?? 0)
    const clientRuns = Number(rows[0]?.client_runs ?? 0)
    const salesRuns = Number(rows[0]?.sales_runs ?? 0)
    const trialSpent = trialRuns * lightCeiling
    const budget = config.trialGlobalMonthlyBudgetUsd
    const budgetUsed = budget > 0 ? trialSpent / budget : 0

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_ENTITLEMENT_INTEGRITY_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'drift',
        source: 'getGrowthAiVisibilityEntitlementSignals',
        label: 'Runs de portal AEO sin entitlement (integridad del chokepoint)',
        severity: unentitled === 0 ? 'ok' : 'error',
        summary:
          unentitled === 0
            ? 'Todos los runs de portal del mes tienen entitlement vigente.'
            : `${unentitled} run(s) de portal SIN assignment vigente este mes — bypass del chokepoint.`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'unentitled_portal_runs', value: String(unentitled) }]
      },
      {
        signalId: GROWTH_AI_VISIBILITY_TRIAL_BUDGET_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'cost_guard',
        source: 'getGrowthAiVisibilityEntitlementSignals',
        label: 'Presupuesto mensual de trials AEO (cost backstop)',
        severity: budgetUsed >= 1 ? 'error' : budgetUsed >= 0.8 ? 'warning' : 'ok',
        summary: `Trials del mes: ${trialRuns} (estimado $${trialSpent.toFixed(2)} de $${budget.toFixed(2)}, ${(budgetUsed * 100).toFixed(0)}%).`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'trial_runs', value: String(trialRuns) },
          { kind: 'metric', label: 'estimated_spent_usd', value: trialSpent.toFixed(2) },
          { kind: 'metric', label: 'budget_usd', value: budget.toFixed(2) }
        ]
      },
      {
        signalId: GROWTH_AI_VISIBILITY_RUN_ATTRIBUTION_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'posture',
        source: 'getGrowthAiVisibilityEntitlementSignals',
        label: 'Atribución de runs AEO del mes (cliente vs sales)',
        severity: 'ok',
        summary: `Este mes: ${clientRuns} runs de cliente · ${salesRuns} runs operador (sales).`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'client_runs', value: String(clientRuns) },
          { kind: 'metric', label: 'sales_runs', value: String(salesRuns) }
        ]
      }
    ]
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_aeo_entitlement' } })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_ENTITLEMENT_INTEGRITY_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'drift' as const,
        source: 'getGrowthAiVisibilityEntitlementSignals',
        label: 'Runs de portal AEO sin entitlement (integridad del chokepoint)',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [
          { kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) }
        ]
      }
    ]
  }
}
