import 'server-only'

/**
 * TASK-1240 — Growth AI Visibility · Public intake reliability signals (EPIC-020 B).
 *
 * 3 signals desde `greenhouse_growth.grader_intake_events` (ventana 1 día):
 *  - intake_rate: tasa de aceptación del intake público;
 *  - cost_window: gasto del día vs presupuesto global (el guard de costo);
 *  - blocked: intentos bloqueados (rate/cost/captcha) — comportamiento de seguridad esperado.
 * DB vacía / intake OFF → steady ok. Degradación honesta: error de lectura → severity unknown.
 */

import { resolveIntakeLimits } from '@/lib/growth/ai-visibility/public-intake/abuse-guard'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_RATE_SIGNAL_ID = 'growth.ai_visibility.public_intake_rate'
export const GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_COST_SIGNAL_ID = 'growth.ai_visibility.public_intake_cost_window'
export const GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_BLOCKED_SIGNAL_ID = 'growth.ai_visibility.public_intake_blocked'

const MODULE_KEY = 'growth' as const

export const getGrowthAiVisibilityPublicIntakeSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()
  const budget = resolveIntakeLimits().globalDailyBudgetUsd

  try {
    const rows = await runGreenhousePostgresQuery<{ total: number; accepted: number; blocked: number; spent: string }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE outcome = 'accepted')::int AS accepted,
         COUNT(*) FILTER (WHERE outcome IN ('rate_limited', 'cost_blocked', 'captcha_failed'))::int AS blocked,
         COALESCE(SUM(estimated_cost_usd) FILTER (WHERE outcome = 'accepted'), 0)::text AS spent
       FROM greenhouse_growth.grader_intake_events
       WHERE created_at > NOW() - INTERVAL '1 day'`
    )

    const total = Number(rows[0]?.total ?? 0)
    const accepted = Number(rows[0]?.accepted ?? 0)
    const blocked = Number(rows[0]?.blocked ?? 0)
    const spent = Number(rows[0]?.spent ?? 0)
    const budgetUsed = budget > 0 ? spent / budget : 0

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_RATE_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'posture',
        source: 'getGrowthAiVisibilityPublicIntakeSignals',
        label: 'Tasa de intake público aceptado (AI Visibility)',
        severity: 'ok',
        summary:
          total === 0
            ? 'Sin intake público en 24 h (esperado pre-launch).'
            : `${accepted}/${total} intakes aceptados en 24 h.`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'accepted', value: String(accepted) },
          { kind: 'metric', label: 'total', value: String(total) }
        ]
      },
      {
        signalId: GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_COST_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'cost_guard',
        source: 'getGrowthAiVisibilityPublicIntakeSignals',
        label: 'Presupuesto diario del intake público (AI Visibility)',
        severity: budgetUsed >= 1 ? 'error' : budgetUsed >= 0.8 ? 'warning' : 'ok',
        summary: `Gasto estimado del día: $${spent.toFixed(2)} de $${budget.toFixed(2)} (${(budgetUsed * 100).toFixed(0)}%).`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'spent_usd', value: spent.toFixed(2) },
          { kind: 'metric', label: 'budget_usd', value: budget.toFixed(2) }
        ]
      },
      {
        signalId: GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_BLOCKED_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'posture',
        source: 'getGrowthAiVisibilityPublicIntakeSignals',
        label: 'Intakes públicos bloqueados (AI Visibility)',
        severity: 'ok', // bloquear (rate/cost/captcha) es comportamiento de seguridad esperado.
        summary:
          total === 0
            ? 'Sin intake público en 24 h.'
            : `${blocked} intentos bloqueados (rate-limit/cost/captcha) en 24 h.`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'blocked', value: String(blocked) }]
      }
    ]
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_public_intake' } })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_COST_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'cost_guard' as const,
        source: 'getGrowthAiVisibilityPublicIntakeSignals',
        label: 'Presupuesto diario del intake público (AI Visibility)',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [{ kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) }]
      }
    ]
  }
}
