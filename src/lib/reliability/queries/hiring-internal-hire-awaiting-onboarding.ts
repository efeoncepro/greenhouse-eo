import 'server-only'

import { query } from '@/lib/db'
import { isHiringHandoffBridgesEnabled } from '@/lib/hiring/handoff/config'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-356 — Contrataciones internas aprobadas sin onboarding (SLA de no perder un hire).
 *
 * Cuenta handoffs `internal_hire` en `approved`/`in_setup` cuyo `state_changed_at` supera
 * la ventana esperada de pickup de HRIS (72h). Cada fila es una persona seleccionada y
 * aprobada que nadie está incorporando — el candidato puede perderse. Steady = 0.
 * El cierre real (member + onboarding) lo ejecuta TASK-770; esta señal detecta que la
 * cola no está siendo drenada.
 */
export const HIRING_INTERNAL_HIRE_AWAITING_ONBOARDING_SIGNAL_ID = 'hiring.internal_hire_awaiting_onboarding'

const PICKUP_HOURS = 72

const QUERY_SQL = `
  SELECT COUNT(*)::int AS total
  FROM greenhouse_hiring.hiring_handoff
  WHERE selected_destination = 'internal_hire'
    AND state IN ('approved', 'in_setup')
    AND state_changed_at < NOW() - INTERVAL '${PICKUP_HOURS} hours'
`

const resolveSeverity = (total: number) => {
  if (total > 2) return 'error' as const
  if (total > 0) return 'warning' as const

  return 'ok' as const
}

const resolveSummary = (total: number) => {
  if (total === 0) return 'Sin contrataciones internas esperando onboarding fuera de ventana.'

  const noun = total === 1 ? 'contratación interna aprobada' : 'contrataciones internas aprobadas'

  return `${total} ${noun} hace más de ${PICKUP_HOURS}h sin onboarding iniciado.`
}

export const getHiringInternalHireAwaitingOnboardingSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Contrataciones internas sin onboarding'

  // Audit 2026-07-10: con los bridges OFF nadie puede drenar la cola — alarmar sería ruido
  // permanente que entrena a ignorar el signal. Estado honesto: degraded-by-config, no error.
  if (!isHiringHandoffBridgesEnabled()) {
    return {
      signalId: HIRING_INTERNAL_HIRE_AWAITING_ONBOARDING_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'lag',
      source: 'getHiringInternalHireAwaitingOnboardingSignal',
      label,
      severity: 'ok',
      summary: 'Bridges de handoff deshabilitados (HIRING_HANDOFF_BRIDGES_ENABLED=OFF) — SLA de pickup no aplica.',
      observedAt: new Date().toISOString(),
      evidence: [],
    }
  }

  try {
    const rows = await query<{ total: number; [column: string]: unknown }>(QUERY_SQL)

    const total = rows[0]?.total ?? 0

    return {
      signalId: HIRING_INTERNAL_HIRE_AWAITING_ONBOARDING_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'lag',
      source: 'getHiringInternalHireAwaitingOnboardingSignal',
      label,
      severity: resolveSeverity(total),
      summary: resolveSummary(total),
      observedAt: new Date().toISOString(),
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `greenhouse_hiring.hiring_handoff WHERE selected_destination='internal_hire' AND state IN ('approved','in_setup') AND state_changed_at < NOW() - INTERVAL '${PICKUP_HOURS} hours'`,
        },
        { kind: 'metric', label: 'total', value: String(total) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/complete/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md' },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_internal_hire_awaiting_onboarding' } })

    return {
      signalId: HIRING_INTERNAL_HIRE_AWAITING_ONBOARDING_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'lag',
      source: 'getHiringInternalHireAwaitingOnboardingSignal',
      label,
      severity: 'unknown',
      summary: 'No se pudo evaluar la cola de onboarding de contrataciones internas (query falló).',
      observedAt: null,
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
