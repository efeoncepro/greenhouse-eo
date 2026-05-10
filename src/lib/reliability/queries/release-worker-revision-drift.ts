import 'server-only'

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
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
 * **Detector logic** (mirror del spec TASK-849 §Slice 1 §worker_revision_drift):
 *   for each worker in WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION:
 *     ghSha   = ultimo workflow run success → headSha
 *     runSha  = Cloud Run latest ready revision env GIT_SHA
 *     drift   = ghSha !== runSha (case-insensitive 12-char prefix compare)
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
  runSha: string | null
  hasDrift: boolean
  dataMissing: boolean
  detail: string
}

const normalizeSha = (sha: string | null | undefined): string | null => {
  if (!sha) return null
  const trimmed = sha.trim().toLowerCase()

  if (!trimmed || trimmed === 'unknown') return null
  if (!/^[0-9a-f]+$/.test(trimmed)) return null

  return trimmed.slice(0, SHA_COMPARE_LENGTH)
}

/**
 * Resuelve el ultimo successful workflow run SHA via GitHub API.
 * Usa filter `branch=main` + `status=success` para limitar a deploys
 * production validados.
 */
const resolveLastSuccessSha = async (
  token: string,
  workflowName: string
): Promise<string | null> => {
  const { owner, repo } = githubRepoCoords()
  // Workflow name puede contener espacios; URL-encode necesario.
  const encodedWorkflow = encodeURIComponent(workflowName)
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodedWorkflow}/runs?status=success&branch=main&per_page=1`

  const response = await fetchGithubWithTimeout(url, {
    headers: buildGithubAuthHeaders(token)
  })

  if (response.status === 404) {
    // Workflow no encontrado por nombre exacto. GitHub API requiere el
    // workflow ID o el path del archivo (.github/workflows/<file>.yml).
    // Fallback: query global runs filtrando por nombre client-side.
    return resolveLastSuccessShaFallback(token, workflowName)
  }

  if (!response.ok) {
    throw new Error(
      `GitHub API workflows/${workflowName}/runs returned ${response.status} ${response.statusText}`
    )
  }

  const payload = (await response.json()) as GithubWorkflowRunSuccessResponse
  const lastRun = payload.workflow_runs?.[0]

  return normalizeSha(lastRun?.head_sha)
}

const resolveLastSuccessShaFallback = async (
  token: string,
  workflowName: string
): Promise<string | null> => {
  const { owner, repo } = githubRepoCoords()
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?status=success&branch=main&per_page=50`

  const response = await fetchGithubWithTimeout(url, {
    headers: buildGithubAuthHeaders(token)
  })

  if (!response.ok) return null

  const payload = (await response.json()) as {
    workflow_runs: Array<{ name: string; head_sha: string }>
  }

  const matching = payload.workflow_runs?.find((r) => r.name === workflowName)

  return normalizeSha(matching?.head_sha)
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

  const [ghSha, runSha] = await Promise.all([
    resolveLastSuccessSha(token, workflow.workflowName).catch(() => null),
    resolveCloudRunRevisionSha(cloudRunService, cloudRunRegion)
  ])

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

  return {
    workflowName: workflow.workflowName,
    cloudRunService,
    cloudRunRegion,
    ghSha,
    runSha,
    hasDrift,
    dataMissing,
    detail
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
