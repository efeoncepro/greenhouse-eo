/**
 * TASK-848 / TASK-849 — Allowlist canonica de workflows production deploy.
 *
 * Workflows que despliegan a production y aceptan environment approval. Si
 * emerge un workflow nuevo, agregarlo aca + verificar WIF subjects para
 * `environment:production` (TASK-848 §Hard Rules).
 *
 * **Usado por**:
 *   - `src/lib/reliability/queries/release-stale-approval.ts`
 *   - `src/lib/reliability/queries/release-pending-without-jobs.ts`
 *   - `src/lib/reliability/queries/release-worker-revision-drift.ts` (TASK-849)
 *   - `scripts/release/production-release-watchdog.ts` (TASK-849)
 *   - `scripts/release/production-preflight.ts` (TASK-850 follow-up V1.1)
 *
 * **Mapping production deploy worker workflow → Cloud Run service** (TASK-849):
 * Cuando un workflow tiene un `cloudRunService` mapeado, el watchdog corre la
 * detection de revision drift contra ese servicio. Workflows sin mapping
 * (Azure, HubSpot bridge) no participan en revision drift.
 */

export interface ReleaseDeployWorkflow {
  /** Nombre canonico del workflow tal como aparece en `.github/workflows/*.yml`. */
  workflowName: string
  /** Optional: nombre del Cloud Run service para revision drift detection. */
  cloudRunService?: string
  /** Optional: Cloud Run region del service. Default us-east4. */
  cloudRunRegion?: string
}

export const RELEASE_DEPLOY_WORKFLOWS: readonly ReleaseDeployWorkflow[] = [
  {
    workflowName: 'Ops Worker Deploy',
    cloudRunService: 'ops-worker',
    cloudRunRegion: 'us-east4'
  },
  {
    workflowName: 'Commercial Cost Worker Deploy',
    cloudRunService: 'commercial-cost-worker',
    cloudRunRegion: 'us-east4'
  },
  {
    workflowName: 'ICO Batch Worker Deploy',
    cloudRunService: 'ico-batch-worker',
    cloudRunRegion: 'us-east4'
  },
  {
    workflowName: 'HubSpot Greenhouse Integration Deploy',
    cloudRunService: 'hubspot-greenhouse-integration',
    cloudRunRegion: 'us-central1'
  },
  {
    workflowName: 'Azure Teams Deploy'
    // Azure deploys: no Cloud Run revision para drift detection
  },
  {
    workflowName: 'Azure Teams Bot Deploy'
  }
] as const

/**
 * Set lookup helper — preserva el shape O(1) que los V1.0 readers ya usaban.
 */
export const RELEASE_DEPLOY_WORKFLOW_NAMES: ReadonlySet<string> = new Set(
  RELEASE_DEPLOY_WORKFLOWS.map((w) => w.workflowName)
)

/**
 * Workflows que SI tienen Cloud Run mapping para revision drift detection.
 */
export const WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION: readonly ReleaseDeployWorkflow[] =
  RELEASE_DEPLOY_WORKFLOWS.filter((w) => Boolean(w.cloudRunService))

/**
 * Lookup helper: dado workflow name, devuelve la entrada o null.
 */
export const findWorkflow = (workflowName: string): ReleaseDeployWorkflow | null => {
  return RELEASE_DEPLOY_WORKFLOWS.find((w) => w.workflowName === workflowName) ?? null
}
