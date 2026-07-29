import 'server-only'

import { query } from '@/lib/db'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1566 Slice 5 (ADR-015) — propuestas de fondeo de Globe que quedaron sin confirmar.
 *
 * Qué detecta: intenciones en fase `proposed` sin su `confirmed` correspondiente, con más de 24h.
 *
 * **Por qué importa más de lo que parece.** Una propuesta vencida no es sólo ruido: en Globe la
 * propuesta expira a los 15 minutos, así que una intención vieja sin confirmar significa que alguien
 * pidió mover el presupuesto y **nadie decidió**. Los dos desenlaces son malos y distintos:
 *
 *  - Si el fondeo hacía falta, el mes sigue sin crédito y la generación está bloqueada — que es
 *    exactamente el estado que llevó al break-glass tres veces.
 *  - Si no hacía falta, quedó registrada una intención de mover dinero que nadie cerró, y eso es
 *    justamente lo que el carril append-only existe para hacer visible.
 *
 * **Steady state: 0.** Un valor > 0 no es un error del sistema — es una decisión pendiente de una
 * persona, y por eso la severidad no escala a `error` por cantidad sino por antigüedad: cinco
 * propuestas de hoy son un día ocupado; una de hace una semana es una decisión abandonada.
 *
 * **Kind**: `data_quality`. **Módulo**: `platform`.
 */
export const GLOBE_CREDIT_FUNDING_STALE_PROPOSALS_SIGNAL_ID =
  'platform.globe_credit_funding.stale_proposal'

/*
 * `(now() - created_at)::int` NO: `created_at` es `timestamptz`, así que la resta da `interval` y
 * castearla a int revienta en runtime (gate TASK-893 — `date - date` es lo único que da integer).
 * `EXTRACT(EPOCH FROM …)` sobre un interval es la forma correcta, y acá los dos lados son timestamptz.
 */
const QUERY_SQL = `
  SELECT
    COUNT(*)::int AS n,
    COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600), 0)::int AS oldest_hours
  FROM greenhouse_core.globe_credit_funding_intents p
  WHERE p.phase = 'proposed'
    AND NOW() - p.created_at > INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1
      FROM greenhouse_core.globe_credit_funding_intents c
      WHERE c.globe_workspace_id = p.globe_workspace_id
        AND c.proposal_id = p.proposal_id
        AND c.phase = 'confirmed'
    )
`

const resolveSeverity = (count: number, oldestHours: number): ReliabilitySignal['severity'] => {
  if (count === 0) return 'ok'

  // La antigüedad manda sobre la cantidad: una decisión de hace una semana está abandonada, aunque
  // sea la única. Varias de ayer son un día ocupado.
  return oldestHours >= 168 ? 'error' : 'warning'
}

const resolveSummary = (count: number, oldestHours: number): string => {
  if (count === 0) {
    return 'No hay propuestas de fondeo de Globe esperando decisión.'
  }

  const noun = count === 1 ? 'propuesta de fondeo' : 'propuestas de fondeo'
  const days = Math.floor(oldestHours / 24)

  return `${count} ${noun} sin confirmar (la más antigua, hace ${days === 0 ? `${oldestHours}h` : `${days}d`}). Nadie decidió: si el fondeo hacía falta, el mes sigue sin crédito; si no, quedó una intención de mover dinero sin cerrar.`
}

export const getGlobeCreditFundingStaleProposalsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  const rows = await query<{ n: number; oldest_hours: number }>(QUERY_SQL)
  const count = Number(rows[0]?.n ?? 0)
  const oldestHours = Number(rows[0]?.oldest_hours ?? 0)

  return {
    signalId: GLOBE_CREDIT_FUNDING_STALE_PROPOSALS_SIGNAL_ID,
    moduleKey: 'platform',
    kind: 'data_quality',
    source: 'getGlobeCreditFundingStaleProposalsSignal',
    label: 'Propuestas de fondeo de Globe sin confirmar',
    severity: resolveSeverity(count, oldestHours),
    summary: resolveSummary(count, oldestHours),
    observedAt,
    evidence: [
      {
        kind: 'sql',
        label: 'Query',
        value: `greenhouse_core.globe_credit_funding_intents phase='proposed' > 24h sin 'confirmed'`
      },
      { kind: 'metric', label: 'count', value: String(count) },
      { kind: 'metric', label: 'oldest_hours', value: String(oldestHours) },
      {
        kind: 'doc',
        label: 'Spec',
        value: 'docs/tasks/in-progress/TASK-1566-globe-governed-credit-funding-command.md'
      }
    ]
  }
}
