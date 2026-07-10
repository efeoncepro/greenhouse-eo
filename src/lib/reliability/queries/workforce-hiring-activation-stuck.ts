import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-770 — Activaciones de hiring atascadas (member creado pero intake sin completar).
 *
 * Cuenta `hiring_activation_request` en `member_created`/`onboarding_open` cuyo
 * `state_changed_at` supera la ventana (7 días): la persona fue seleccionada, su faceta
 * member existe en `pending_intake`, pero nadie completó la ficha laboral — el hire está
 * en limbo. Complementa (namespace workforce, NO hiring): 356 vigila el tramo ANTERIOR
 * (handoff aprobado sin member); esta señal vigila el tramo member→activo. Steady = 0.
 */
export const WORKFORCE_HIRING_ACTIVATION_STUCK_SIGNAL_ID = 'workforce.hiring_activation_stuck'

const STUCK_DAYS = 7

const QUERY_SQL = `
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE state_changed_at < NOW() - INTERVAL '30 days')::int AS very_stale
  FROM greenhouse_hr.hiring_activation_request
  WHERE state IN ('member_created', 'onboarding_open')
    AND state_changed_at < NOW() - INTERVAL '${STUCK_DAYS} days'
`

const resolveSeverity = ({ total, veryStale }: { total: number; veryStale: number }) => {
  if (veryStale > 0 || total > 3) return 'error' as const
  if (total > 0) return 'warning' as const

  return 'ok' as const
}

const resolveSummary = ({ total, veryStale }: { total: number; veryStale: number }) => {
  if (total === 0) return 'Sin activaciones de hiring atascadas fuera de ventana.'

  const noun = total === 1 ? 'activación atascada' : 'activaciones atascadas'
  const detail = veryStale > 0 ? ` (${veryStale} con más de 30 días)` : ''

  return `${total} ${noun} hace más de ${STUCK_DAYS} días con la ficha laboral sin completar${detail}.`
}

export const getWorkforceHiringActivationStuckSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Activaciones de hiring atascadas'

  try {
    const rows = await query<{ total: number; very_stale: number; [column: string]: unknown }>(QUERY_SQL)

    const total = rows[0]?.total ?? 0
    const veryStale = rows[0]?.very_stale ?? 0

    return {
      signalId: WORKFORCE_HIRING_ACTIVATION_STUCK_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'lag',
      source: 'getWorkforceHiringActivationStuckSignal',
      label,
      severity: resolveSeverity({ total, veryStale }),
      summary: resolveSummary({ total, veryStale }),
      observedAt: new Date().toISOString(),
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `greenhouse_hr.hiring_activation_request WHERE state IN ('member_created','onboarding_open') AND state_changed_at < NOW() - INTERVAL '${STUCK_DAYS} days'`,
        },
        { kind: 'metric', label: 'total', value: String(total) },
        { kind: 'metric', label: 'very_stale', value: String(veryStale) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/complete/TASK-770-hiring-to-hris-collaborator-activation.md' },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'workforce', { tags: { source: 'reliability_workforce_hiring_activation_stuck' } })

    return {
      signalId: WORKFORCE_HIRING_ACTIVATION_STUCK_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'lag',
      source: 'getWorkforceHiringActivationStuckSignal',
      label,
      severity: 'unknown',
      summary: 'No se pudo evaluar el estado de las activaciones de hiring (query falló).',
      observedAt: null,
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
