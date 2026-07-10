import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-356 — Handoffs bloqueados sin resolución humana.
 *
 * Cuenta `hiring_handoff` en `state='blocked'` cuyo `state_changed_at` supera la ventana
 * de triage (48h). Cada fila es una contratación decidida que downstream no puede ejecutar:
 * destino sin owner, datos faltantes, supersede/revocación post-aprobación. Steady = 0.
 * No es "vacante sin llenar" (estado de negocio): es workflow atascado que pierde un hire.
 */
export const HIRING_HANDOFF_BLOCKED_STALE_SIGNAL_ID = 'hiring.handoff_blocked_stale'

const STALE_HOURS = 48

const QUERY_SQL = `
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE blocked_reason IN ('decision_superseded_after_approval', 'decision_revoked'))::int AS post_approval
  FROM greenhouse_hiring.hiring_handoff
  WHERE state = 'blocked'
    AND state_changed_at < NOW() - INTERVAL '${STALE_HOURS} hours'
`

const resolveSeverity = ({ total, postApproval }: { total: number; postApproval: number }) => {
  if (postApproval > 0 || total > 3) return 'error' as const
  if (total > 0) return 'warning' as const

  return 'ok' as const
}

const resolveSummary = ({ total, postApproval }: { total: number; postApproval: number }) => {
  if (total === 0) return 'Sin handoffs bloqueados fuera de la ventana de triage.'

  const noun = total === 1 ? 'handoff bloqueado' : 'handoffs bloqueados'
  const detail = postApproval > 0 ? ` (${postApproval} con supersede/revocación post-aprobación)` : ''

  return `${total} ${noun} hace más de ${STALE_HOURS}h sin resolución${detail}.`
}

export const getHiringHandoffBlockedStaleSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Handoffs bloqueados sin resolver'

  try {
    const rows = await query<{ total: number; post_approval: number; [column: string]: unknown }>(QUERY_SQL)

    const total = rows[0]?.total ?? 0
    const postApproval = rows[0]?.post_approval ?? 0

    return {
      signalId: HIRING_HANDOFF_BLOCKED_STALE_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'lag',
      source: 'getHiringHandoffBlockedStaleSignal',
      label,
      severity: resolveSeverity({ total, postApproval }),
      summary: resolveSummary({ total, postApproval }),
      observedAt: new Date().toISOString(),
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `greenhouse_hiring.hiring_handoff WHERE state='blocked' AND state_changed_at < NOW() - INTERVAL '${STALE_HOURS} hours'`,
        },
        { kind: 'metric', label: 'total', value: String(total) },
        { kind: 'metric', label: 'post_approval', value: String(postApproval) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md' },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_handoff_blocked_stale' } })

    return {
      signalId: HIRING_HANDOFF_BLOCKED_STALE_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'lag',
      source: 'getHiringHandoffBlockedStaleSignal',
      label,
      severity: 'unknown',
      summary: 'No se pudo evaluar el estado de los handoffs bloqueados (query falló).',
      observedAt: null,
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
