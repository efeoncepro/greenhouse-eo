import 'server-only'

/**
 * TASK-1391 Slice 2b — el DISPATCHER de render jobs (la cola con prioridad por fin tiene dueño).
 *
 * Corre en el ops-worker (Cloud Scheduler cada 2 min). NO renderiza nada: selecciona el próximo
 * job por PRIORIDAD y hace una llamada de ~200 ms a la Jobs API (`jobs.run`) del Cloud Run Job
 * `artifact-worker` con `RENDER_JOB_ID` como override. El invariante "ops-worker no ejecuta
 * Chromium" se respeta.
 *
 * Reglas de la cola (Slice 0 · decisión 6 — NUNCA FIFO ciega):
 *   - prioridad = deadline más próximo primero (fijado en el job, no re-leído);
 *   - AGING: un job sin deadline envejece hasta competir (prioridad sin aging es hambruna con
 *     otro nombre — el batch social correría NUNCA);
 *   - deadline YA vencido no compite: se cierra gobernado (`timeout` + detalle) y se loguea;
 *   - TODO job pospuesto se loguea — un descarte silencioso es la peor falla posible acá;
 *   - un dispatch por tick (el Job es tasks=1: la concurrencia de ejecuciones se abre con datos
 *     de carga reales, no a ojo).
 */

import { GoogleAuth } from 'google-auth-library'

import { captureWithDomain } from '@/lib/observability/capture'

import {
  isArtifactRenderJobsEnabled,
  listExpiredQueuedRenderJobs,
  listProposalRenderJobs,
  markRenderJobDispatched,
  markRenderJobFailed,
  selectNextRenderJobForDispatch
} from './render-jobs'

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
const REGION = process.env.ARTIFACT_WORKER_REGION || 'us-east4'
const JOB_NAME = process.env.ARTIFACT_WORKER_JOB_NAME || 'artifact-worker'

export interface RenderDispatchResult {
  skipped?: 'flag_off'
  expiredClosed: number
  dispatched: Array<{ renderJobId: string; executionName: string }>
  /** Jobs en cola que ESTE tick pospuso (visibilidad anti-descarte-silencioso). */
  postponed: Array<{ renderJobId: string; state: string; deadline: string | null }>
}

/** Ejecuta el Cloud Run Job con el RENDER_JOB_ID como override de env de la ejecución. */
const runArtifactWorkerJob = async (renderJobId: string): Promise<string> => {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
  const client = await auth.getClient()

  const url = `https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}:run`

  const response = await client.request<{ metadata?: { name?: string }; name?: string }>({
    url,
    method: 'POST',
    data: {
      overrides: {
        containerOverrides: [{ env: [{ name: 'RENDER_JOB_ID', value: renderJobId }] }]
      }
    }
  })

  // La operación devuelve el nombre de la ejecución (…/executions/<name>).
  return response.data.metadata?.name ?? response.data.name ?? 'unknown-execution'
}

export const dispatchNextRenderJob = async (): Promise<RenderDispatchResult> => {
  if (!isArtifactRenderJobsEnabled()) {
    return { skipped: 'flag_off', expiredClosed: 0, dispatched: [], postponed: [] }
  }

  // 1 · Vencidos: no compiten. Se cierran gobernados, jamás en silencio.
  const expired = await listExpiredQueuedRenderJobs()

  for (const job of expired) {
    await markRenderJobFailed({
      renderJobId: job.renderJobId,
      failureCode: 'timeout',
      failureDetail: `deadline_expired_in_queue: el deadline (${job.deadline}) venció mientras el job esperaba — rendir para un proceso cerrado es quemar CPU.`
    })

    console.warn(`[render-dispatch] job ${job.renderJobId} cerrado por deadline vencido en cola`)
  }

  // 2 · Selección por prioridad (deadline + aging) — un dispatch por tick.
  const next = await selectNextRenderJobForDispatch()

  if (!next) {
    return { expiredClosed: expired.length, dispatched: [], postponed: [] }
  }

  let executionName: string

  try {
    executionName = await runArtifactWorkerJob(next.renderJobId)
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'artifact_render_dispatch' },
      extra: { renderJobId: next.renderJobId }
    })

    await markRenderJobFailed({
      renderJobId: next.renderJobId,
      failureCode: 'dispatch_error',
      failureDetail: `Jobs API run falló: ${error instanceof Error ? error.message : String(error)}`
    })

    return { expiredClosed: expired.length, dispatched: [], postponed: [] }
  }

  const dispatched = await markRenderJobDispatched(next.renderJobId, executionName)

  // 3 · Visibilidad de los pospuestos: los que siguen en cola tras este tick.
  const stillQueued = await listProposalRenderJobs({ ownerOrgId: next.ownerOrgId, state: 'queued', limit: 20 })

  const postponed = stillQueued.map(job => ({
    renderJobId: job.renderJobId,
    state: job.state,
    deadline: job.deadline
  }))

  if (postponed.length > 0) {
    console.log(
      `[render-dispatch] ${postponed.length} job(s) pospuesto(s) este tick: ${postponed
        .map(j => j.renderJobId)
        .join(', ')}`
    )
  }

  return {
    expiredClosed: expired.length,
    dispatched: [{ renderJobId: dispatched.renderJobId, executionName }],
    postponed
  }
}
