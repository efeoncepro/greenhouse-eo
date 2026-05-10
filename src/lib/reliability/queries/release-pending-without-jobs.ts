import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import {
  buildGithubAuthHeaders,
  fetchGithubWithTimeout,
  githubRepoCoords,
  resolveGithubToken
} from '@/lib/release/github-helpers'
import { RELEASE_DEPLOY_WORKFLOW_NAMES } from '@/lib/release/workflow-allowlist'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

/**
 * TASK-848 Slice 7 — Reliability signal: pending runs sin jobs.
 *
 * Detecta el sintoma downstream EXACTO del incidente 2026-04-26 -> 2026-05-09:
 * runs en `status='queued'`/`'pending'`/`'in_progress'` con `jobs.length === 0`
 * y antiguedad > 5 min. Sintoma de concurrency deadlock por stale approval
 * upstream (ver release-stale-approval.ts).
 *
 * **Detector logic** (mirror del spec TASK-848 §detailed-spec):
 *   status in ["queued","pending","in_progress"] durante mas de 5 min
 *   AND jobs.length === 0
 *   AND workflowName in releaseDeployWorkflowAllowlist
 *
 * **Kind**: `drift`. Steady state esperado = 0.
 * **Severidad**: `error` siempre que count > 0 sostenido > 5min — es bug
 * critico EN VIVO. El concurrency fix Opcion A (Slice 3) deberia mantener
 * este signal en 0 indefinidamente; cualquier valor > 0 indica regresion
 * o nuevo bug class.
 *
 * **Degradacion honesta**: si no hay token (`GITHUB_TOKEN` env var ausente
 * en Vercel runtime) o GH API falla, el signal devuelve `severity='unknown'`.
 * NO falla loud el dashboard.
 *
 * Spec: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` §2.9 +
 * `docs/tasks/in-progress/TASK-848-production-release-control-plane.md`
 * §Detailed-Spec.
 */
export const RELEASE_PENDING_WITHOUT_JOBS_SIGNAL_ID =
  'platform.release.pending_without_jobs'

const PENDING_WITHOUT_JOBS_THRESHOLD_MS = 5 * 60 * 1000 // 5 min

interface GithubWorkflowRun {
  id: number
  name: string
  html_url: string
  status: string
  conclusion: string | null
  created_at: string
  updated_at: string
  head_sha: string
  head_branch: string
  jobs_url: string
}

interface GithubJobsResponse {
  total_count: number
  jobs: Array<{ id: number; status: string }>
}

export interface PendingWithoutJobsRecord {
  runId: number
  workflowName: string
  status: string
  ageMs: number
  htmlUrl: string
  branch: string
  sha: string
}

const RELEVANT_STATUSES = new Set(['queued', 'pending', 'in_progress'])

/**
 * Lista runs en estados queued/in_progress con `jobs.length === 0` y edad
 * superior a 5 min. Helper publico desde TASK-850 Slice 3 — el preflight CLI
 * lo consume directo en lugar de re-implementar la query.
 */
export const listPendingRuns = async (
  token: string
): Promise<PendingWithoutJobsRecord[]> => {
  const records: PendingWithoutJobsRecord[] = []
  const now = Date.now()
  const { owner, repo } = githubRepoCoords()

  // Fetch un batch reciente que cubre los 3 estados relevantes.
  // GH API filter por status acepta valores individuales — paralelizamos.
  const statuses: Array<'queued' | 'in_progress'> = ['queued', 'in_progress']

  const responses = await Promise.all(
    statuses.map((status) =>
      fetchGithubWithTimeout(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs?status=${status}&per_page=50`,
        { headers: buildGithubAuthHeaders(token) }
      )
    )
  )

  for (const response of responses) {
    if (!response.ok) {
      throw new Error(
        `GitHub API actions/runs returned ${response.status} ${response.statusText}`
      )
    }
  }

  const payloads = await Promise.all(
    responses.map(
      (r) => r.json() as Promise<{ workflow_runs: GithubWorkflowRun[] }>
    )
  )

  const seenRunIds = new Set<number>()

  for (const payload of payloads) {
    for (const run of payload.workflow_runs ?? []) {
      if (seenRunIds.has(run.id)) continue
      seenRunIds.add(run.id)

      if (!RELEASE_DEPLOY_WORKFLOW_NAMES.has(run.name)) continue
      if (!RELEVANT_STATUSES.has(run.status)) continue

      const ageMs = now - new Date(run.created_at).getTime()

      if (ageMs <= PENDING_WITHOUT_JOBS_THRESHOLD_MS) continue

      // Verificar jobs.length === 0 — esa es la firma del deadlock.
      const jobsResponse = await fetchGithubWithTimeout(run.jobs_url, {
        headers: buildGithubAuthHeaders(token)
      })

      if (!jobsResponse.ok) {
        // Per-run jobs API failure: skipear pero NO bloquear el signal.
        continue
      }

      const jobsPayload = (await jobsResponse.json()) as GithubJobsResponse
      const totalJobs = jobsPayload.total_count ?? jobsPayload.jobs?.length ?? 0

      if (totalJobs > 0) continue

      records.push({
        runId: run.id,
        workflowName: run.name,
        status: run.status,
        ageMs,
        htmlUrl: run.html_url,
        branch: run.head_branch,
        sha: run.head_sha
      })
    }
  }

  return records
}

const ageMinutesLabel = (ms: number): string => {
  const minutes = Math.round(ms / (60 * 1000))

  if (minutes >= 60) {
    const hours = Math.round(minutes / 60)

    
return `${hours}h`
  }

  
return `${minutes}m`
}

const computeSeverity = (count: number): ReliabilitySeverity => {
  return count === 0 ? 'ok' : 'error'
}

export const getReleasePendingWithoutJobsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const token = await resolveGithubToken()

  if (!token) {
    return {
      signalId: RELEASE_PENDING_WITHOUT_JOBS_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleasePendingWithoutJobsSignal',
      label: 'Production deploys pending sin jobs (concurrency deadlock)',
      severity: 'unknown',
      summary:
        'Sin GITHUB_RELEASE_OBSERVER_TOKEN configurado. Reader degradado — operador no puede ver runs pending sin jobs automaticamente. Configurar secret rotado para activar deteccion del deadlock historico TASK-848.',
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
    const records = await listPendingRuns(token)
    const severity = computeSeverity(records.length)

    const summary =
      records.length === 0
        ? 'Sin runs pending > 5min con jobs vacios. Concurrency fix Opcion A (Slice 3) operando.'
        : `${records.length} run${records.length === 1 ? '' : 's'} pending > 5min con jobs:[] — sintoma del concurrency deadlock TASK-848. Investigar runs viejos en stale_approval (signal complementario) y cancelar.`

    const detail =
      records.length === 0
        ? undefined
        : records
            .slice(0, 5)
            .map(
              (r) =>
                `${r.workflowName} run ${r.runId} (${ageMinutesLabel(r.ageMs)}, status=${r.status}, branch=${r.branch})`
            )
            .join('; ')

    return {
      signalId: RELEASE_PENDING_WITHOUT_JOBS_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleasePendingWithoutJobsSignal',
      label: 'Production deploys pending sin jobs (concurrency deadlock)',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'count',
          value: String(records.length)
        },
        ...(detail
          ? [{ kind: 'metric' as const, label: 'top_blockers', value: detail }]
          : []),
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_release_pending_without_jobs' }
    })

    return {
      signalId: RELEASE_PENDING_WITHOUT_JOBS_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleasePendingWithoutJobsSignal',
      label: 'Production deploys pending sin jobs (concurrency deadlock)',
      severity: 'unknown',
      summary: `No fue posible consultar GitHub API: ${redactErrorForResponse(error)}`,
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
