import 'server-only'

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  buildGithubAuthHeaders,
  fetchGithubWithTimeout,
  githubRepoCoords,
  resolveGithubToken
} from '@/lib/release/github-helpers'
import {
  WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION,
  type ReleaseDeployWorkflow
} from '@/lib/release/workflow-allowlist'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

/**
 * TASK-849 Slice 2 — Reliability signal: worker revision drift.
 *
 * Detecta cuando la revision Cloud Run actualmente sirviendo NO matchea el
 * SHA del ultimo workflow run `success` correspondiente. Drift = deploy mas
 * reciente fallo silente o alguien deployo manualmente sin pasar por workflow.
 *
 * **Detector logic** (canonical post-fix 2026-05-10):
 *   for each worker in WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION:
 *     ghSha   = ultimo release manifest released|degraded.target_sha (PG SSoT
 *               canonica TASK-848 V1.0). Fallback a workflow run success de
 *               'Production Release Orchestrator' o del workflow individual
 *               del worker (combinacion del mas reciente por updated_at).
 *     runSha  = Cloud Run latest ready revision env GIT_SHA
 *     drift   = ghSha !== runSha (case-insensitive 12-char prefix compare)
 *
 * **Por que manifest_store es SSoT y NO el workflow run conclusion**:
 *   Caso real 2026-05-10 run 25636508367: orchestrator termino con
 *   conclusion='cancelled' porque el job hubspot pytest fue cancelado, pero
 *   el manifest transito state='degraded' (released con observabilidad de
 *   issues). Workers Cloud Run SI fueron actualizados al SHA correcto. El
 *   reader anterior (workflow run conclusion='success' filter) ignoraba el
 *   release exitoso y reportaba falso positivo permanente. Manifest store
 *   per TASK-848 V1.0 es la single source of truth canonica del estado del
 *   release; workflow conclusion es derivativo y puede divergir.
 *
 * **Kind**: `drift`. Steady state esperado = 0.
 * **Severidad**: `error` cuando count > 0 (drift confirmado en >=1 worker).
 *   Critical en spec V1 colapsa a `error` para reliability registry tier.
 *
 * **Degradacion honesta**:
 *   - Sin GITHUB_TOKEN → severity='unknown' con summary explicativo.
 *   - Sin gcloud disponible → severity='unknown' (CLI ausente; comun en
 *     Vercel runtime que no incluye gcloud SDK).
 *   - GIT_SHA env var ausente en revision Cloud Run (worker sin TASK-849
 *     Slice 1 deployado aun) → revision marcada como `data_missing`,
 *     no como drift falso positivo. Severity warning si data_missing > 0.
 *
 * **Contract con consumer (CLI watchdog)**:
 *   El CLI `scripts/release/production-release-watchdog.ts` reusa este reader
 *   pero ademas alerta a Teams. Reader se mantiene puro/read-only.
 *
 * Spec: docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9 +
 * docs/tasks/in-progress/TASK-849-production-release-watchdog-alerts.md
 * §Slice 1.
 *
 * Pattern reference: TASK-848 release-stale-approval.ts + release-pending-without-jobs.ts.
 */
export const RELEASE_WORKER_REVISION_DRIFT_SIGNAL_ID =
  'platform.release.worker_revision_drift'

const SHA_COMPARE_LENGTH = 12

const execFileAsync = promisify(execFile)

interface GithubWorkflowRunSuccessResponse {
  workflow_runs: Array<{ id: number; head_sha: string; html_url: string; updated_at: string }>
}

interface WorkerDriftRecord {
  workflowName: string
  cloudRunService: string
  cloudRunRegion: string
  ghSha: string | null
  targetSha: string | null
  runSha: string | null
  hasDrift: boolean
  dataMissing: boolean
  detail: string
  recommendedAction: string | null
}

interface CanonicalReleaseSha {
  compareSha: string
  fullSha: string
}

const normalizeSha = (sha: string | null | undefined): string | null => {
  if (!sha) return null
  const trimmed = sha.trim().toLowerCase()

  if (!trimmed || trimmed === 'unknown') return null
  if (!/^[0-9a-f]+$/.test(trimmed)) return null

  return trimmed.slice(0, SHA_COMPARE_LENGTH)
}

const normalizeFullSha = (sha: string | null | undefined): string | null => {
  if (!sha) return null
  const trimmed = sha.trim().toLowerCase()

  if (!trimmed || trimmed === 'unknown') return null
  if (!/^[0-9a-f]+$/.test(trimmed)) return null

  return trimmed
}

const toCanonicalReleaseSha = (sha: string | null | undefined): CanonicalReleaseSha | null => {
  const compareSha = normalizeSha(sha)
  const fullSha = normalizeFullSha(sha)

  if (!compareSha || !fullSha) return null

  return { compareSha, fullSha }
}

/**
 * Resuelve el SHA del ultimo release verde (released | degraded) desde el
 * manifest store canonico TASK-848 V1.0. SSoT del estado del release —
 * NO depende de workflow run conclusion (que puede divergir, caso real
 * 2026-05-10 run 25636508367: orchestrator conclusion=cancelled pero
 * manifest state=degraded por hubspot pytest cancelled downstream).
 *
 * Returns null si:
 *   - PG no disponible (CLI local sin proxy o connector down) → caller
 *     fallback a resolveLastSuccessShaFromGithub honest degradation
 *   - Tabla vacia (no hay releases nunca) → no es drift, es initial state
 */
const resolveLastReleasedShaFromManifest = async (): Promise<CanonicalReleaseSha | null> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ target_sha: string | null }>(`
      SELECT target_sha
      FROM greenhouse_sync.release_manifests
      WHERE target_branch = 'main'
        AND state IN ('released', 'degraded')
      ORDER BY started_at DESC
      LIMIT 1
    `)

    return toCanonicalReleaseSha(rows[0]?.target_sha ?? null)
  } catch (error) {
    // PG unavailable. Caller fallback to GitHub API path. NO crash.
    captureWithDomain(error, 'cloud', {
      tags: { source: 'worker_revision_drift', stage: 'manifest_read' },
      extra: { error: redactErrorForResponse(error) }
    })

    return null
  }
}

/**
 * Fallback honest cuando PG no disponible: resuelve `ghSha` combinando dos
 * sources de workflow runs (ambos en GitHub API, sin PG dependency):
 *   1. Ultimo workflow run success del workflow individual del worker (push
 *      directo a paths del worker)
 *   2. Ultimo workflow run success del orchestrator (deploys via workflow_call)
 *
 * Toma el mas reciente por `updated_at`. Eso captura ambos paths canonicos
 * de deploy (manual via push individual o coordinado via orchestrator).
 *
 * NOTA: Acepta tambien `conclusion='cancelled'` del orchestrator porque el
 * caso real 2026-05-10 demostro que orchestrator puede terminar cancelled
 * con manifest state=released/degraded (deploy real fue exitoso). El reader
 * de manifest store es la SSoT canonica; este fallback es best-effort
 * cuando PG down.
 */
const ORCHESTRATOR_WORKFLOW_NAME = 'Production Release Orchestrator'

const resolveLastSuccessShaFromGithub = async (
  token: string,
  workflowName: string
): Promise<CanonicalReleaseSha | null> => {
  const candidates = await Promise.all([
    fetchLastSuccessRun(token, workflowName).catch(() => null),
    fetchLastSuccessRun(token, ORCHESTRATOR_WORKFLOW_NAME).catch(() => null)
  ])

  const valid = candidates.filter((r): r is { headSha: string; updatedAt: string } => r !== null)

  if (valid.length === 0) return null

  // Most recent by updated_at (ISO8601 string compare safe).
  const mostRecent = valid.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

  return toCanonicalReleaseSha(mostRecent.headSha)
}

const fetchLastSuccessRun = async (
  token: string,
  workflowName: string
): Promise<{ headSha: string; updatedAt: string } | null> => {
  const { owner, repo } = githubRepoCoords()
  const encodedWorkflow = encodeURIComponent(workflowName)
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodedWorkflow}/runs?status=success&branch=main&per_page=1`

  const response = await fetchGithubWithTimeout(url, {
    headers: buildGithubAuthHeaders(token)
  })

  if (response.status === 404) {
    return fetchLastSuccessRunFallback(token, workflowName)
  }

  if (!response.ok) return null

  const payload = (await response.json()) as GithubWorkflowRunSuccessResponse
  const lastRun = payload.workflow_runs?.[0]

  return lastRun ? { headSha: lastRun.head_sha, updatedAt: lastRun.updated_at } : null
}

const fetchLastSuccessRunFallback = async (
  token: string,
  workflowName: string
): Promise<{ headSha: string; updatedAt: string } | null> => {
  const { owner, repo } = githubRepoCoords()
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?status=success&branch=main&per_page=50`

  const response = await fetchGithubWithTimeout(url, {
    headers: buildGithubAuthHeaders(token)
  })

  if (!response.ok) return null

  const payload = (await response.json()) as {
    workflow_runs: Array<{ name: string; head_sha: string; updated_at: string }>
  }

  const matching = payload.workflow_runs?.find((r) => r.name === workflowName)

  return matching ? { headSha: matching.head_sha, updatedAt: matching.updated_at } : null
}

/**
 * Resolver canonico end-to-end para `ghSha`:
 *   1. PG manifest store (SSoT TASK-848 V1.0) — preferred
 *   2. GitHub API workflow runs (fallback honest cuando PG down)
 *
 * Compartido per-call entre los N workers (manifest SHA es global per release,
 * no per worker). Cache local-call para evitar N queries PG identicas.
 */
let manifestShaCache: { value: CanonicalReleaseSha | null; cached: boolean } = {
  value: null,
  cached: false
}

const resolveCanonicalReleaseSha = async (
  token: string,
  workflowName: string
): Promise<CanonicalReleaseSha | null> => {
  if (!manifestShaCache.cached) {
    manifestShaCache = {
      value: await resolveLastReleasedShaFromManifest(),
      cached: true
    }
  }

  if (manifestShaCache.value) return manifestShaCache.value

  // Fallback honest a GitHub API (PG indisponible o tabla vacia).
  return resolveLastSuccessShaFromGithub(token, workflowName)
}

const resetManifestShaCache = () => {
  manifestShaCache = { value: null, cached: false }
}

const HUBSPOT_CLOUD_RUN_SERVICE = 'hubspot-greenhouse-integration'
const HUBSPOT_WORKFLOW_FILE = 'hubspot-greenhouse-integration-deploy.yml'
const HUBSPOT_PUBLIC_URL = 'https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app'

const buildRecommendedAction = (record: {
  cloudRunService: string
  targetSha: string | null
}): string | null => {
  if (record.cloudRunService !== HUBSPOT_CLOUD_RUN_SERVICE) return null

  const expectedSha = record.targetSha ?? '<release target_sha>'

  return [
    `Run: gh workflow run ${HUBSPOT_WORKFLOW_FILE} --ref main -f environment=production -f expected_sha=${expectedSha} -f skip_tests=false`,
    `Verify: curl ${HUBSPOT_PUBLIC_URL}/health && curl ${HUBSPOT_PUBLIC_URL}/contract`,
    'Then rerun: GITHUB_RELEASE_OBSERVER_TOKEN="$(gh auth token)" pnpm release:watchdog --json and confirm drift_count=0',
    'Do not edit greenhouse_sync.release_manifests by SQL'
  ].join(' ; ')
}

/**
 * Resuelve GIT_SHA de la latest ready revision Cloud Run via gcloud CLI.
 *
 * Usa execFile (NO shell) para evitar inyeccion. Args validados (regex
 * sobre service y region en workflow-allowlist).
 *
 * Returns null si gcloud no esta disponible (Vercel runtime) o si la revision
 * no expone GIT_SHA (worker pre-TASK-849 Slice 1).
 */
const resolveCloudRunRevisionSha = async (
  service: string,
  region: string
): Promise<string | null> => {
  // Defense in depth: validate inputs even though they come from canonical allowlist.
  if (!/^[a-z0-9-]+$/.test(service) || !/^[a-z0-9-]+$/.test(region)) {
    return null
  }

  try {
    // Verificado live 2026-05-10: gcloud rechaza el syntax inline
    // `.filter('name','GIT_SHA').extract('value')` con
    // `TransformFilter() takes 2 positional arguments but 3 were given`.
    // Solucion canonica: dump JSON + parse client-side. Robusto cross-version
    // de gcloud y mas legible.
    const { stdout } = await execFileAsync(
      'gcloud',
      [
        'run',
        'services',
        'describe',
        service,
        `--region=${region}`,
        '--project=efeonce-group',
        '--format=json'
      ],
      { timeout: 10_000 }
    )

    const parsed = JSON.parse(stdout) as {
      spec?: {
        template?: {
          spec?: {
            containers?: Array<{ env?: Array<{ name: string; value?: string }> }>
          }
        }
      }
    }

    const envEntries = parsed.spec?.template?.spec?.containers?.[0]?.env ?? []
    const gitShaEntry = envEntries.find((e) => e.name === 'GIT_SHA')

    return normalizeSha(gitShaEntry?.value ?? null)
  } catch {
    // gcloud absent (Vercel runtime), or query failure. Caller treats as
    // data_missing, not drift. Silenced because runtime context is the
    // expected reason and crashes would degrade dashboard.
    return null
  }
}

const checkWorker = async (
  workflow: ReleaseDeployWorkflow,
  token: string
): Promise<WorkerDriftRecord> => {
  const cloudRunService = workflow.cloudRunService!
  const cloudRunRegion = workflow.cloudRunRegion ?? 'us-east4'

  const [canonicalSha, runSha] = await Promise.all([
    resolveCanonicalReleaseSha(token, workflow.workflowName).catch(() => null),
    resolveCloudRunRevisionSha(cloudRunService, cloudRunRegion)
  ])

  const ghSha = canonicalSha?.compareSha ?? null
  const targetSha = canonicalSha?.fullSha ?? null
  const dataMissing = ghSha === null || runSha === null
  const hasDrift = !dataMissing && ghSha !== runSha

  let detail: string

  if (dataMissing) {
    detail = `${cloudRunService}: gh=${ghSha ?? 'n/a'} run=${runSha ?? 'n/a'} (data missing — gcloud absent o GIT_SHA no inyectado aun)`
  } else if (hasDrift) {
    detail = `${cloudRunService}: gh=${ghSha} != run=${runSha} (DRIFT — revision Cloud Run no matchea ultimo deploy verde)`
  } else {
    detail = `${cloudRunService}: gh=${ghSha} == run=${runSha} (synced)`
  }

  const recommendedAction = hasDrift
    ? buildRecommendedAction({ cloudRunService, targetSha })
    : null

  return {
    workflowName: workflow.workflowName,
    cloudRunService,
    cloudRunRegion,
    ghSha,
    targetSha,
    runSha,
    hasDrift,
    dataMissing,
    detail,
    recommendedAction
  }
}

const computeSeverity = (records: WorkerDriftRecord[]): ReliabilitySeverity => {
  const driftCount = records.filter((r) => r.hasDrift).length
  const dataMissingCount = records.filter((r) => r.dataMissing).length

  if (driftCount > 0) return 'error'
  if (dataMissingCount > 0) return 'warning'

  return 'ok'
}

const buildSummary = (records: WorkerDriftRecord[]): string => {
  const driftCount = records.filter((r) => r.hasDrift).length
  const dataMissingCount = records.filter((r) => r.dataMissing).length
  const syncedCount = records.length - driftCount - dataMissingCount

  if (driftCount > 0) {
    const driftWorkers = records
      .filter((r) => r.hasDrift)
      .map((r) => r.cloudRunService)
      .join(', ')

    return `${driftCount} worker${driftCount === 1 ? '' : 's'} con revision drift confirmado (${driftWorkers}). Verificar deploy manual o workflow fallido.`
  }

  if (dataMissingCount > 0) {
    return `${syncedCount}/${records.length} workers synced. ${dataMissingCount} con data_missing — gcloud no disponible en runtime o GIT_SHA no inyectado aun (deploy pre TASK-849 Slice 1).`
  }

  return `${records.length}/${records.length} workers synced. Cloud Run revision matchea ultimo workflow run success.`
}

export const getReleaseWorkerRevisionDriftSignal = async (): Promise<ReliabilitySignal> => {
  // Reset cache per-invocation. Manifest store puede haber cambiado entre
  // ejecuciones del signal (releases concurrentes). Cache vive solo dentro
  // de una invocacion para evitar N queries PG identicas (1 por worker).
  resetManifestShaCache()

  const observedAt = new Date().toISOString()
  const token = await resolveGithubToken()

  if (!token) {
    return {
      signalId: RELEASE_WORKER_REVISION_DRIFT_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleaseWorkerRevisionDriftSignal',
      label: 'Worker Cloud Run revision drift vs ultimo deploy verde',
      severity: 'unknown',
      summary:
        'Sin GITHUB_RELEASE_OBSERVER_TOKEN configurado. Reader degradado — operador no puede detectar drift de revision automaticamente. Configurar secret rotado.',
      observedAt,
      evidence: [
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9'
        }
      ]
    }
  }

  try {
    const records = await Promise.all(
      WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION.map((w) => checkWorker(w, token))
    )

    const severity = computeSeverity(records)
    const summary = buildSummary(records)
    const detailLines = records.map((r) => r.detail).join(' | ')

    const recommendedActions = records
      .map((r) => r.recommendedAction)
      .filter((action): action is string => Boolean(action))

    return {
      signalId: RELEASE_WORKER_REVISION_DRIFT_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleaseWorkerRevisionDriftSignal',
      label: 'Worker Cloud Run revision drift vs ultimo deploy verde',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'workers_checked',
          value: String(records.length)
        },
        {
          kind: 'metric',
          label: 'drift_count',
          value: String(records.filter((r) => r.hasDrift).length)
        },
        {
          kind: 'metric',
          label: 'data_missing_count',
          value: String(records.filter((r) => r.dataMissing).length)
        },
        {
          kind: 'metric',
          label: 'detail',
          value: detailLines
        },
        ...(
          recommendedActions.length > 0
            ? [
                {
                  kind: 'metric' as const,
                  label: 'recommended_action',
                  value: recommendedActions.join(' | ')
                }
              ]
            : []
        ),
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_release_worker_revision_drift' }
    })

    return {
      signalId: RELEASE_WORKER_REVISION_DRIFT_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleaseWorkerRevisionDriftSignal',
      label: 'Worker Cloud Run revision drift vs ultimo deploy verde',
      severity: 'unknown',
      summary: `No fue posible computar drift: ${redactErrorForResponse(error)}`,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: redactErrorForResponse(error)
        }
      ]
    }
  }
}
