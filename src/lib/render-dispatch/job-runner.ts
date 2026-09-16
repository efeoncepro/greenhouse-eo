import 'server-only'

/**
 * TASK-1846 — lanzador del Cloud Run Job del artifact-worker, DOMAIN-FREE.
 *
 * Vivía dentro del dispatcher de Proposal. Con un segundo consumer del motor tiene que ser uno
 * solo: lanzar la ejecución es infraestructura, no negocio — quién decide CUÁNDO lanzarla sigue
 * siendo de cada dominio.
 *
 * ⚠️ POR QUÉ ACÁ y no en `artifact-composer/`: el composer es un primitive PORTABLE y su boundary
 * sólo admite imports relativos internos, `node:*` y dependencias declaradas. Intentarlo ahí lo
 * rechazaron DOS gates independientes: el lint (`server-only` prohibido) y
 * `artifact-composer/__tests__/package-boundary.test.ts` (`google-auth-library` no es del paquete).
 * Componer un artefacto y lanzar una ejecución en Cloud Run son capas distintas: ésta es
 * orquestación de infraestructura, no composición.
 *
 * ⚠️ Deliberado: se lanza SIN overrides de env. `runWithOverrides` exige un permiso IAM que
 * `run.invoker` NO incluye; en vez de escalar el privilegio del dispatcher, el WORKER hace el claim
 * atómico del próximo job (`FOR UPDATE SKIP LOCKED`). El dispatcher decide CUÁNDO hay que ejecutar;
 * el worker decide CUÁL toma — sin riesgo de doble ejecución.
 */

import { GoogleAuth } from 'google-auth-library'

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
const REGION = process.env.ARTIFACT_WORKER_REGION || 'us-east4'
const JOB_NAME = process.env.ARTIFACT_WORKER_JOB_NAME || 'artifact-worker'

export const runArtifactWorkerJob = async (): Promise<string> => {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
  const client = await auth.getClient()

  const url = `https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}:run`

  const response = await client.request<{ metadata?: { name?: string }; name?: string }>({
    url,
    method: 'POST'
  })

  // La operación devuelve el nombre de la ejecución (…/executions/<name>).
  return response.data.metadata?.name ?? response.data.name ?? 'unknown-execution'
}
