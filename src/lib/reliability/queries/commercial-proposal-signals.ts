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
// TASK-1391 — cola de render (steady = 0 en ambos):
export const RENDER_STARVATION_SIGNAL_ID = 'artifact.render.queue.starvation'
export const RENDER_DEAD_LETTER_SIGNAL_ID = 'artifact.render.dead_letter'

const STUCK_DAYS = 14
const DEADLINE_BUFFER_HOURS = 72
// Un job en cola >20 min con el dispatcher corriendo cada 2 min = inanición o dispatcher caído.
const STARVATION_MINUTES = 20

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

    const starvingRows = await query<{ n: string }>(
      `SELECT count(*)::text AS n
         FROM greenhouse_commercial.proposal_render_jobs
        WHERE state = 'queued'
          AND (deadline IS NULL OR deadline > now())
          AND created_at < now() - ($1 || ' minutes')::interval`,
      [String(STARVATION_MINUTES)]
    )

    const deadLetterRows = await query<{ n: string }>(
      `SELECT count(*)::text AS n
         FROM greenhouse_commercial.proposal_render_jobs
        WHERE state = 'dead_letter'
          AND updated_at > now() - interval '7 days'`,
      []
    )

    const stuck = Number.parseInt(stuckRows[0]?.n ?? '0', 10)
    const atRisk = Number.parseInt(atRiskRows[0]?.n ?? '0', 10)
    const starving = Number.parseInt(starvingRows[0]?.n ?? '0', 10)
    const deadLetter = Number.parseInt(deadLetterRows[0]?.n ?? '0', 10)

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
      ),
      baseSignal(
        RENDER_STARVATION_SIGNAL_ID,
        'Cola de render con inanición',
        starving === 0 ? 'ok' : 'error',
        starving === 0
          ? 'Ningún render job lleva más de 20 minutos en cola sin despacharse.'
          : `${starving} render job(s) en cola hace más de ${STARVATION_MINUTES} min sin despacharse — dispatcher caído o inanición de prioridad.`,
        starving
      ),
      baseSignal(
        RENDER_DEAD_LETTER_SIGNAL_ID,
        'Render jobs en dead letter',
        deadLetter === 0 ? 'ok' : 'error',
        deadLetter === 0
          ? 'Ningún render job agotó sus reintentos.'
          : `${deadLetter} render job(s) en dead_letter en 7 días — requieren humano (retry del dominio o corrección del plan).`,
        deadLetter
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
