import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1739 — Divergencia entre la procedencia DERIVADA de una postulación y la de sus dos raíces.
 *
 * Por qué existe: `hiring_application.data_origin` es una copia denormalizada que mantiene un
 * trigger. Marcar una raíz NO toca la fila de la postulación, así que el trigger no dispara solo —
 * el command de marcado debe provocar la re-derivación en la misma transacción. Si esa propagación
 * falla o alguien la olvida, la copia queda obsoleta **en silencio**: el desk seguiría mostrando
 * fantasmas ya marcados y el gold set seguiría contaminado, sin ningún error visible.
 *
 * La spec original citaba esta divergencia como "signal de alerta" en su matriz de riesgo sin
 * construirla, y le asignaba probabilidad `low`. Es probabilidad 1 si nadie propaga: ocurre en cada
 * marcado. Por eso la señal se construye, no se anota.
 *
 * PII-free: sólo counts. Steady = 0.
 */

export const HIRING_DATA_ORIGIN_DERIVATION_DRIFT_SIGNAL_ID = 'hiring.data_quality.data_origin_derivation_drift'

type DriftRow = { drifted: number; sample_openings: number }

export const getHiringDataOriginDerivationDriftSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Procedencia de datos: derivación desalineada de sus raíces'

  try {
    // Reproduce la MISMA regla del trigger (gana el no-real; entre dos no-real gana la más
    // protectora) y compara contra el valor persistido.
    const rows = await runGreenhousePostgresQuery<DriftRow>(`
      WITH derived AS (
        SELECT ha.application_id,
               ha.data_origin AS stored,
               CASE
                 WHEN COALESCE(ip.data_origin, 'real') = 'real' AND COALESCE(o.data_origin, 'real') = 'real' THEN 'real'
                 WHEN COALESCE(ip.data_origin, 'real') = 'real' THEN COALESCE(o.data_origin, 'real')
                 WHEN COALESCE(o.data_origin, 'real') = 'real' THEN COALESCE(ip.data_origin, 'real')
                 WHEN COALESCE(ip.data_origin, 'real') = COALESCE(o.data_origin, 'real') THEN COALESCE(ip.data_origin, 'real')
                 WHEN 'demo' IN (COALESCE(ip.data_origin, 'real'), COALESCE(o.data_origin, 'real')) THEN 'demo'
                 WHEN 'synthetic_seed' IN (COALESCE(ip.data_origin, 'real'), COALESCE(o.data_origin, 'real')) THEN 'synthetic_seed'
                 ELSE 'smoke_test'
               END AS expected,
               ha.opening_id
          FROM greenhouse_hiring.hiring_application ha
          JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = ha.identity_profile_id
          JOIN greenhouse_hiring.hiring_opening o ON o.opening_id = ha.opening_id
      )
      SELECT COUNT(*)::int AS drifted,
             COUNT(DISTINCT opening_id)::int AS sample_openings
        FROM derived
       WHERE stored <> expected`)

    const row = rows[0] ?? { drifted: 0, sample_openings: 0 }
    const drifted = Number(row.drifted)
    const openings = Number(row.sample_openings)

    return {
      signalId: HIRING_DATA_ORIGIN_DERIVATION_DRIFT_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringDataOriginDerivationDriftSignal',
      label,
      severity: drifted === 0 ? 'ok' : drifted <= 5 ? 'warning' : 'error',
      observedAt: new Date().toISOString(),
      summary:
        drifted === 0
          ? 'Sin divergencia: toda postulación refleja la procedencia de su persona y su vacante.'
          : `${drifted} postulación(es) sobre ${openings} vacante(s) con procedencia desalineada de sus raíces. La copia derivada quedó obsoleta: el marcado de una raíz no propagó (el trigger sólo dispara si la fila se toca). Re-derivar con el command de marcado; NUNCA con UPDATE manual.`,
      evidence: [
        { kind: 'metric', label: 'drifted_applications', value: String(drifted) },
        { kind: 'metric', label: 'affected_openings', value: String(openings) },
        {
          kind: 'sql',
          label: 'Query',
          value: 'hiring_application.data_origin ≠ derivación de identity_profiles + hiring_opening',
        },
        { kind: 'doc', label: 'Task', value: 'docs/tasks/complete/TASK-1739-hiring-synthetic-data-provenance.md' },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_data_origin_drift' } })

    return {
      signalId: HIRING_DATA_ORIGIN_DERIVATION_DRIFT_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringDataOriginDerivationDriftSignal',
      label,
      severity: 'unknown',
      observedAt: null,
      summary: 'No se pudo evaluar la divergencia de procedencia derivada.',
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
