import 'server-only'

/**
 * TASK-1846 — dispatcher del render de Insights.
 *
 * Por qué existe: el worker sabe reclamar outputs de Insights, pero nadie ejecutaba el Job por
 * ellos. El dispatcher de Proposal (`commercial/tenders/proposals/render-dispatch.ts`) selecciona
 * SÓLO de `proposal_render_jobs` y, si esa cola está vacía, retorna sin lanzar nada: un output de
 * Insights encolado se quedaba esperando para siempre. Este dispatcher cierra ese hueco sin
 * acoplar los dominios — cada uno decide cuándo hay que ejecutar y el worker decide cuál toma.
 *
 * No cuenta huérfanos ni vencidos: eso lo reporta la señal `insights.render.orphaned_output` y lo
 * resuelve un humano. Acá sólo se responde "¿hay trabajo encolado?" y, si lo hay, se lanza UNA
 * ejecución por tick (el Job es `parallelism=1`).
 */

import { runArtifactWorkerJob } from '@/lib/artifact-composer/job-runner'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isInsightsRenderEnabled } from '../flags'

export interface InsightRenderDispatchResult {
  skipped?: 'flag_off' | 'empty_queue'
  queued: number
  executionName: string | null
}

/** Outputs realmente reclamables: en cola y sin deadline vencido (misma regla que el claim). */
export const countClaimableInsightOutputs = async (): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM greenhouse_insights.insight_outputs
      WHERE state = 'queued'
        AND (deadline IS NULL OR deadline > now())`,
    []
  )

  return Number(rows[0]?.n ?? 0)
}

export const dispatchNextInsightRender = async (): Promise<InsightRenderDispatchResult> => {
  if (!isInsightsRenderEnabled()) {
    return { skipped: 'flag_off', queued: 0, executionName: null }
  }

  const queued = await countClaimableInsightOutputs()

  if (queued === 0) {
    return { skipped: 'empty_queue', queued: 0, executionName: null }
  }

  try {
    const executionName = await runArtifactWorkerJob()

    return { queued, executionName }
  } catch (error) {
    // No se marca el output como fallido: el fallo es del dispatch, no del render. El output sigue
    // en cola y el próximo tick lo reintenta; marcarlo consumiría un intento que nadie gastó.
    captureWithDomain(error, 'insights', { tags: { source: 'insights_render_dispatch' }, extra: { queued } })

    return { queued, executionName: null }
  }
}
