import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1392 — Proposal Studio F0 reliability signals. Ruedan bajo `Commercial Health`
 * (moduleKey 'commercial'). Steady = 0 en ambos.
 *
 * - `commercial.proposal.stuck_in_state`: una propuesta ACTIVA sin movimiento >14 días es un bid
 *   que se está pudriendo en silencio (steady=0; el umbral fino por estado llega con F1).
 * - `commercial.proposal.deadline_at_risk`: deadline confirmado/ambiguo a <72h y el estado aún no
 *   es ready_to_submit/submitted → SE ESTÁ MURIENDO. Si se pasa, se pierde el proceso sin
 *   recuperación — por eso `deadline` es columna de primera clase y no un metadato.
 */

export const PROPOSAL_STUCK_SIGNAL_ID = 'commercial.proposal.stuck_in_state'
export const PROPOSAL_DEADLINE_SIGNAL_ID = 'commercial.proposal.deadline_at_risk'

const STUCK_DAYS = 14
const DEADLINE_BUFFER_HOURS = 72

const baseSignal = (
  signalId: string,
  label: string,
  severity: ReliabilitySignal['severity'],
  summary: string,
  count: number
): ReliabilitySignal => ({
  signalId,
  moduleKey: 'commercial',
  kind: 'data_quality',
  source: 'proposal_studio',
  label,
  severity,
  summary,
  observedAt: new Date().toISOString(),
  evidence: [
    { kind: 'metric', label: 'count', value: String(count) },
    { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1392-tender-proposal-studio-foundation.md' }
  ]
})

export const getCommercialProposalSignals = async (): Promise<ReliabilitySignal[]> => {
  try {
    const stuckRows = await query<{ n: string }>(
      `SELECT count(*)::text AS n
         FROM greenhouse_commercial.proposals
        WHERE state NOT IN ('declined', 'won', 'lost')
          AND updated_at < now() - ($1 || ' days')::interval`,
      [String(STUCK_DAYS)]
    )

    const atRiskRows = await query<{ n: string }>(
      `SELECT count(*)::text AS n
         FROM greenhouse_commercial.proposals
        WHERE state NOT IN ('ready_to_submit', 'submitted', 'declined', 'won', 'lost')
          AND deadline IS NOT NULL
          AND deadline > now()
          AND deadline < now() + ($1 || ' hours')::interval`,
      [String(DEADLINE_BUFFER_HOURS)]
    )

    const stuck = Number.parseInt(stuckRows[0]?.n ?? '0', 10)
    const atRisk = Number.parseInt(atRiskRows[0]?.n ?? '0', 10)

    return [
      baseSignal(
        PROPOSAL_STUCK_SIGNAL_ID,
        'Propuestas sin movimiento',
        stuck === 0 ? 'ok' : 'warning',
        stuck === 0
          ? 'Ninguna propuesta activa lleva más de 14 días sin movimiento.'
          : `${stuck} propuesta(s) activa(s) sin movimiento hace más de ${STUCK_DAYS} días.`,
        stuck
      ),
      baseSignal(
        PROPOSAL_DEADLINE_SIGNAL_ID,
        'Deadlines de propuesta en riesgo',
        atRisk === 0 ? 'ok' : 'error',
        atRisk === 0
          ? 'Ningún deadline de propuesta vence en las próximas 72 horas sin estar lista.'
          : `${atRisk} propuesta(s) con deadline a <${DEADLINE_BUFFER_HOURS}h sin estar listas para presentar — si se pasa, el proceso SE PIERDE.`,
        atRisk
      )
    ]
  } catch (error) {
    captureWithDomain(error, 'commercial', { tags: { source: 'reliability_signal_proposal_studio' } })

    return [
      {
        signalId: PROPOSAL_STUCK_SIGNAL_ID,
        moduleKey: 'commercial',
        kind: 'data_quality',
        source: 'proposal_studio',
        label: 'Propuestas sin movimiento',
        severity: 'unknown',
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt: new Date().toISOString(),
        evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.name : 'unknown' }]
      }
    ]
  }
}
