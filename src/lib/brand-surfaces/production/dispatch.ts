import 'server-only'

/**
 * TASK-1921 — despachador del render de piezas de marca.
 *
 * El `artifact-worker` es un Job multiconsumidor: cada dominio decide si hay trabajo y el worker decide cuál toma. Este
 * despachador responde sólo "¿hay pedidos de marca en cola?" y, si los hay, lanza UNA ejecución por tick (el Job es
 * `parallelism=1`). No cierra vencidos ni cuenta huérfanos: eso lo reporta la señal `brand.render.stuck_job`.
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { runArtifactWorkerJob } from '@/lib/render-dispatch/job-runner'

import { isBrandRenderEnabled } from './flags'
import { hasDispatchableBrandRenderJob } from './store'

export interface BrandRenderDispatchResult {
  skipped?: 'flag_off' | 'empty_queue'
  hasWork: boolean
  executionName: string | null
}

export const dispatchNextBrandRender = async (): Promise<BrandRenderDispatchResult> => {
  if (!isBrandRenderEnabled()) return { skipped: 'flag_off', hasWork: false, executionName: null }

  if (!(await hasDispatchableBrandRenderJob())) return { skipped: 'empty_queue', hasWork: false, executionName: null }

  try {
    return { hasWork: true, executionName: await runArtifactWorkerJob() }
  } catch (error) {
    // El fallo es del despacho, no del render: el job sigue en cola y el próximo tick lo reintenta sin gastar intentos.
    captureWithDomain(error, 'brand_render', { tags: { source: 'brand_render_dispatch' } })

    return { hasWork: true, executionName: null }
  }
}
