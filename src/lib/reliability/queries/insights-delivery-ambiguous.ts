import 'server-only'

import { query } from '@/lib/db'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1848 — envíos por correo de Efeonce Insights con resultado desconocido.
 *
 * Dos poblaciones:
 *
 *  1. `ambiguous` — el correo pudo haber salido o no (timeout, excepción, fila previa del mismo
 *     intento). NO se reenvía solo: una persona reconcilia contra el ledger de correo
 *     (`reconcileInsightDeliveryRecipient`) antes de cualquier reintento. Reenviar a ciegas duplica
 *     un correo que puede llevar un enlace personal.
 *  2. `claimed` hace más de 30 min — un dispatcher reclamó al destinatario y murió antes de dejar
 *     resultado. Mismo tratamiento: reconciliar, nunca devolver a `pending` a mano.
 *
 * **Steady state: 0.** **Kind**: `data_quality`. **Severidad**: 0 → ok; 1-3 → warning; >3 → error.
 */
export const INSIGHTS_DELIVERY_AMBIGUOUS_SIGNAL_ID = 'insights.delivery.ambiguous'

const STUCK_CLAIM_MINUTES = 30

const QUERY_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE state = 'ambiguous')::int AS ambiguous,
    COUNT(*) FILTER (WHERE state = 'claimed' AND claimed_at < now() - make_interval(mins => $1))::int AS stuck_claimed
  FROM greenhouse_insights.insight_delivery_recipients
  WHERE state IN ('ambiguous', 'claimed')
`

const resolveSeverity = (count: number): ReliabilitySignal['severity'] => {
  if (count === 0) return 'ok'

  return count <= 3 ? 'warning' : 'error'
}

export const getInsightsDeliveryAmbiguousSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const rows = await query<{ ambiguous: number; stuck_claimed: number }>(QUERY_SQL, [STUCK_CLAIM_MINUTES])
  const ambiguous = Number(rows[0]?.ambiguous ?? 0)
  const stuckClaimed = Number(rows[0]?.stuck_claimed ?? 0)
  const total = ambiguous + stuckClaimed

  const summary =
    total === 0
      ? 'Ningún envío de Insights tiene resultado desconocido.'
      : `${total} destinatario${total === 1 ? '' : 's'} de envíos de Insights sin resultado conocido (${ambiguous} ambiguo${ambiguous === 1 ? '' : 's'}, ${stuckClaimed} reclamado${stuckClaimed === 1 ? '' : 's'} hace más de ${STUCK_CLAIM_MINUTES} min). Reconciliar contra el ledger de correo antes de reenviar.`

  return {
    signalId: INSIGHTS_DELIVERY_AMBIGUOUS_SIGNAL_ID,
    moduleKey: 'insights',
    kind: 'data_quality',
    source: 'getInsightsDeliveryAmbiguousSignal',
    label: 'Envíos de Insights sin resultado conocido',
    severity: resolveSeverity(total),
    summary,
    observedAt,
    evidence: [
      { kind: 'metric', label: 'ambiguos', value: String(ambiguous) },
      { kind: 'metric', label: `reclamados > ${STUCK_CLAIM_MINUTES} min`, value: String(stuckClaimed) }
    ]
  }
}
