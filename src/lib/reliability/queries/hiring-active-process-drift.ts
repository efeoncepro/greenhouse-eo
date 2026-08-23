import 'server-only'

import { activeProcessPredicate } from '@/lib/hiring/active-process'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1772 — divergencia entre el predicado CANÓNICO de «proceso activo» y el que los ocho
 * callsites usaban antes de esta task (la lista literal de etapas terminales).
 *
 * Qué detecta, y por qué no es una métrica de curiosidad:
 *
 * Ocho copias de una regla derivan por separado cada vez que el vocabulario cambia. Esta señal
 * mide la distancia entre las dos definiciones, así que cualquier valor distinto de 0 significa
 * una de tres cosas, todas accionables:
 *
 * 1. **Alguien reintrodujo una lista literal de etapas** en un callsite. El gate de source lo
 *    atrapa en CI; esta señal lo atrapa en runtime, que es donde el gate no llega (una vía de
 *    escritura nueva, un consumer fuera del repo, una query de un worker).
 * 2. **Apareció un cuadrante nuevo**: filas que un predicado cuenta y el otro no, porque el eje
 *    de etapa y el de desenlace se separaron sin que el `CHECK` los volviera a atar.
 * 3. **El `CHECK` del invariante se cayó o se creó una fila que lo evade.** `stage='closed'` ⟺
 *    `decision IS NOT NULL` es lo que hace equivalentes las dos primeras condiciones; sin él,
 *    `stage_only` y `outcome_only` se separan.
 *
 * `archived_gap` es la métrica distinta: NO es drift, es la diferencia que esta task introdujo a
 * propósito. Cuenta el cuadrante «sin desenlace / archivada» — el que ningún consumidor cubría.
 * Su steady NO es 0: es cuántos registros hay archivados sin desenlace, y es información, no
 * alarma. Se reporta para que nadie lea la caída del conteo de activas como una pérdida de datos.
 *
 * PII-free: sólo conteos. Steady = 0 para el drift; `archived_gap` es evidencia.
 */

export const HIRING_ACTIVE_PROCESS_PREDICATE_DRIFT_SIGNAL_ID =
  'hiring.data_quality.active_process_predicate_drift'

type DriftRow = {
  stage_only: number
  outcome_only: number
  canonical: number
  archived_gap: number
}

const LABEL = 'Proceso activo: divergencia entre el predicado canónico y el de etapa'

export const getHiringActiveProcessPredicateDriftSignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await runGreenhousePostgresQuery<DriftRow>(`
      SELECT
        -- Predicado VIEJO, por etapa. Se escribe literal ACÁ a propósito: esta señal existe para
        -- confrontarlo con el canónico, así que es el único lugar del dominio donde nombrarlo es
        -- correcto. El gate de source exime este archivo por esa razón.
        COUNT(*) FILTER (
          WHERE app.stage NOT IN ('rejected', 'withdrawn', 'closed')
        )::int AS stage_only,

        COUNT(*) FILTER (WHERE app.decision IS NULL)::int AS outcome_only,

        COUNT(*) FILTER (WHERE ${activeProcessPredicate('app')})::int AS canonical,

        -- El cuadrante que motivó la task: sin desenlace, pero retirada de la vista.
        COUNT(*) FILTER (
          WHERE app.decision IS NULL AND app.archived_at IS NOT NULL
        )::int AS archived_gap
      FROM greenhouse_hiring.hiring_application app`)

    const row = rows[0] ?? { stage_only: 0, outcome_only: 0, canonical: 0, archived_gap: 0 }

    const stageOnly = Number(row.stage_only)
    const outcomeOnly = Number(row.outcome_only)
    const canonical = Number(row.canonical)
    const archivedGap = Number(row.archived_gap)

    /**
     * El drift es la distancia entre los DOS predicados viejos. Que el canónico devuelva menos NO
     * es drift: es exactamente lo que esta task vino a corregir, y esa diferencia se reporta como
     * `archived_gap`. Confundir las dos cosas haría que la señal alarmara por su propio arreglo.
     */
    const drift = Math.abs(stageOnly - outcomeOnly)

    /**
     * Coherencia aritmética: el canónico tiene que ser exactamente el de desenlace menos las
     * archivadas. Si no lo es, apareció un cuadrante que este modelo no contempla —un cuarto eje,
     * una fila que evade el CHECK— y eso es más grave que el drift, porque significa que la
     * definición dejó de describir la realidad.
     */
    const incoherent = canonical !== outcomeOnly - archivedGap

    const severity = incoherent || drift > 0 ? 'warning' : 'ok'

    const summary = incoherent
      ? `Incoherencia aritmética: el predicado canónico devuelve ${canonical} y debería devolver ${
          outcomeOnly - archivedGap
        } (desenlace ${outcomeOnly} − archivadas ${archivedGap}). Apareció un cuadrante que la definición de tres ejes no contempla.`
      : drift > 0
        ? `${drift} postulación(es) de diferencia entre preguntar por etapa (${stageOnly}) y por desenlace (${outcomeOnly}). El invariante \`stage='closed'\` ⟺ desenlace declarado dejó de sostenerse, o alguien reintrodujo una lista literal de etapas.`
        : `Los dos ejes coinciden (${stageOnly}). El predicado canónico cuenta ${canonical} en proceso activo y deja fuera ${archivedGap} archivada(s) sin desenlace, que es el cuadrante que ningún consumidor cubría.`

    return {
      signalId: HIRING_ACTIVE_PROCESS_PREDICATE_DRIFT_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringActiveProcessPredicateDriftSignal',
      label: LABEL,
      severity,
      observedAt: new Date().toISOString(),
      summary,
      evidence: [
        { kind: 'metric', label: 'stage_only', value: String(stageOnly) },
        { kind: 'metric', label: 'outcome_only', value: String(outcomeOnly) },
        { kind: 'metric', label: 'canonical', value: String(canonical) },
        { kind: 'metric', label: 'archived_gap', value: String(archivedGap) },
        { kind: 'metric', label: 'drift', value: String(drift) },
        { kind: 'sql', label: 'Predicado canónico', value: activeProcessPredicate('app') },
        {
          kind: 'doc',
          label: 'ADR',
          value: 'docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md',
        },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', {
      tags: { source: 'reliability_hiring_active_process_predicate_drift' },
    })

    return {
      signalId: HIRING_ACTIVE_PROCESS_PREDICATE_DRIFT_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringActiveProcessPredicateDriftSignal',
      label: LABEL,
      severity: 'unknown',
      observedAt: null,
      summary: 'No se pudo evaluar la divergencia del predicado de proceso activo.',
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
