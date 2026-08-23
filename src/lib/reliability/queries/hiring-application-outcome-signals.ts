import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1765 — drift del invariante `stage='closed'` ⟺ desenlace declarado.
 *
 * Nace ANTES que el `CHECK` de base, a propósito: primero mide el drift que el `CHECK` va a impedir,
 * y después queda como red por si alguna vía de escritura futura lo evade. Una señal que sólo se
 * construye cuando ya no puede fallar no prueba nada.
 *
 * Los dos lados de la bicondicional NO hacen el mismo daño, y colapsarlos en un solo número sería
 * repetir el defecto que esta task viene a cerrar:
 *
 * - **`closed` SIN desenlace** — el peligroso. `documents/retention.ts` descarta candidatos con un
 *   `NOT EXISTS ... decision IS NULL` que cruza por `identity_profile_id`, así que UNA sola fila así
 *   congela el borrado de los documentos de esa persona en TODAS sus demás postulaciones. Es una
 *   obligación legal (Ley 21.719) bloqueada en silencio. Se separa además por procedencia: las
 *   sintéticas son deuda conocida y asignada a TASK-1748; una REAL es un incidente.
 * - **desenlace SIN `closed`** — benigno. Es una fila decidida que quedó en su etapa espejo. No
 *   congela nada; la corrige el `UPDATE` del lote post-release.
 *
 * PII-free: sólo counts. Steady = 0.
 */

export const HIRING_APPLICATION_CLOSED_WITHOUT_OUTCOME_SIGNAL_ID =
  'hiring.application.closed_without_outcome'

type OutcomeDriftRow = {
  closed_without_outcome_real: number
  closed_without_outcome_synthetic: number
  outcome_not_closed: number
}

export const getHiringApplicationOutcomeDriftSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Desenlace del pipeline: cierres sin desenlace declarado'

  try {
    const rows = await runGreenhousePostgresQuery<OutcomeDriftRow>(`
      SELECT
        COUNT(*) FILTER (
          WHERE stage = 'closed' AND decision IS NULL AND data_origin = 'real'
        )::int AS closed_without_outcome_real,
        COUNT(*) FILTER (
          WHERE stage = 'closed' AND decision IS NULL AND data_origin <> 'real'
        )::int AS closed_without_outcome_synthetic,
        COUNT(*) FILTER (
          WHERE stage <> 'closed' AND decision IS NOT NULL
        )::int AS outcome_not_closed
      FROM greenhouse_hiring.hiring_application`)

    const row = rows[0] ?? {
      closed_without_outcome_real: 0,
      closed_without_outcome_synthetic: 0,
      outcome_not_closed: 0,
    }

    const realClosed = Number(row.closed_without_outcome_real)
    const syntheticClosed = Number(row.closed_without_outcome_synthetic)
    const outcomeNotClosed = Number(row.outcome_not_closed)
    const total = realClosed + syntheticClosed + outcomeNotClosed

    // La severidad la fija el DAÑO, no el conteo: una fila real que congela retención pesa más que
    // 32 sintéticas ya asignadas a una task.
    const severity =
      realClosed > 0 ? 'error' : total > 0 ? 'warning' : 'ok'

    const summary =
      total === 0
        ? 'Sin drift: toda postulación cerrada declara su desenlace, y todo desenlace cerró su recorrido.'
        : [
            realClosed > 0
              ? `${realClosed} postulación(es) REAL(es) en «Cerrado» sin desenlace declarado: congelan el borrado de los documentos de esa persona en TODAS sus postulaciones (Ley 21.719). Cerrar con el command de decisión, NUNCA con un cambio de etapa.`
              : null,
            syntheticClosed > 0
              ? `${syntheticClosed} fila(s) sintética(s) en «Cerrado» sin desenlace: deuda conocida de TASK-1748, que debe moverlas a \`archived_at\`. Archivar un registro no es cerrar el proceso de una persona.`
              : null,
            outcomeNotClosed > 0
              ? `${outcomeNotClosed} postulación(es) con desenlace que todavía viven en una etapa espejo. Benigno: lo corrige el \`UPDATE\` del lote post-release de TASK-1765.`
              : null,
          ]
            .filter(Boolean)
            .join(' ')

    return {
      signalId: HIRING_APPLICATION_CLOSED_WITHOUT_OUTCOME_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringApplicationOutcomeDriftSignal',
      label,
      severity,
      observedAt: new Date().toISOString(),
      summary,
      evidence: [
        { kind: 'metric', label: 'closed_without_outcome_real', value: String(realClosed) },
        { kind: 'metric', label: 'closed_without_outcome_synthetic', value: String(syntheticClosed) },
        { kind: 'metric', label: 'outcome_not_closed', value: String(outcomeNotClosed) },
        {
          kind: 'sql',
          label: 'Invariante',
          value: "(stage = 'closed') = (decision IS NOT NULL)",
        },
        {
          kind: 'doc',
          label: 'ADR',
          value: 'docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md',
        },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', {
      tags: { source: 'reliability_hiring_application_outcome_drift' },
    })

    return {
      signalId: HIRING_APPLICATION_CLOSED_WITHOUT_OUTCOME_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringApplicationOutcomeDriftSignal',
      label,
      severity: 'unknown',
      observedAt: null,
      summary: 'No se pudo evaluar el drift del invariante de cierre.',
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
