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
 * detection de revision drift contra ese servicio. HubSpot Greenhouse
 * Integration SI participa en drift detection porque es Cloud Run y forma
 * parte del release orchestrator. Workflows sin mapping (Azure) no participan
 * en revision drift.
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
    // TASK-1828 / EPIC-044 — authorization server propio de Efeonce (auth.efeonce.org).
    // Registrado ANTES del primer deploy production, como exige la regla dura del
    // control plane. Con cloudRunService: el orquestador lo despliega vía workflow_call
    // y el watchdog compara su GIT_SHA (deploy change-gated como los demás workers).
    workflowName: 'Auth Server Deploy',
    cloudRunService: 'auth-server',
    cloudRunRegion: 'us-east4'
  },
  {
    // TASK-1378 — Scanner de firmas de assets de candidato. Registrado ANTES
    // del primer deploy production, como exige la regla dura del control plane.
    //
    // SIN cloudRunService a propósito, igual que los deploys de Azure: el
    // orquestador production NO lo despliega (no está en los `uses:` de
    // production-release.yml) porque su imagen no cambia con el código del
    // portal — sólo con `services/clamav/**`, y rebuildearla hornea la base de
    // firmas, varios minutos por promoción. Con mapping, el drift por GIT_SHA
    // marcaría este servicio como desalineado en CADA release, para siempre, y
    // un detector que siempre grita deja de ser un detector.
    //
    // La pregunta de salud correcta para este servicio no es "¿su SHA coincide
    // con el release?" sino "¿está arriba y con firmas frescas?". Eso lo
    // responden `/health` y el signal `storage.asset_scan.open_quarantine`, que
    // se llena de veredictos `error` si el scanner deja de responder.
    workflowName: 'ClamAV Scanner Deploy'
  },
  {
    workflowName: 'Azure Teams Deploy'
    // Azure deploys: no Cloud Run revision para drift detection
  },
  {
    workflowName: 'Azure Teams Bot Deploy'
  },
  {
    // El orquestador production despliega via los workflows worker_call. Esta
    // entry lo agrega al allowlist canonico para que el preflight check ci_green
    // (TASK-850) NO cuente runs previos del propio orchestrator como CI failures
    // — sin esto, cada attempt fallido bloquea el siguiente (self-reference loop
    // detectado live 2026-05-10 run 25635058162).
    //
    // El orchestrator NO tiene Cloud Run mapping (no participa en revision drift
    // detection — los workers que despliega via workflow_call si tienen, y el
    // watchdog los chequea via WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION).
    //
    // Stale-approval + pending-without-jobs readers (TASK-848) si lo cuentan,
    // que es semánticamente correcto: si el orchestrator queda waiting >24h
    // por la approval-gate, eso ES un blocker production legitimo.
    workflowName: 'Production Release Orchestrator'
  },
  {
    // El watchdog scheduled (TASK-849) corre cada 30min y reporta drift
    // pre-existente del worker_revision_drift signal — por diseño FAILA loud
    // cuando hay drift activo. NO es un workflow CI: es un detector monitoring.
    //
    // Incluir el watchdog en el allowlist canonico evita el mismo self-reference
    // loop que `Production Release Orchestrator` ya cubre: sin esto, cualquier
    // drift pre-existente bloquea TODA promoción a production porque el preflight
    // `ci_green` lo cuenta como CI failure → orchestrator no puede deployar para
    // fixear el drift que el propio watchdog está reportando. Detectado live
    // 2026-05-13 run 25822955070 attempt 2 con drift en hubspot + ico-batch +
    // commercial-cost workers.
    //
    // El watchdog NO tiene Cloud Run mapping (no se deploya como service; es un
    // GitHub Actions scheduled workflow). Stale-approval/pending-without-jobs NO
    // aplican (es scheduled, no manual workflow_dispatch).
    workflowName: 'Production Release Watchdog'
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
