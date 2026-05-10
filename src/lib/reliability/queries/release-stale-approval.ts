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
 * TASK-848 Slice 7 — Reliability signal: production stale approvals.
 *
 * Detecta el primer sintoma del incidente 2026-04-26 -> 2026-05-09:
 * runs antiguos en allowlist de production deploy workflows con
 * `status=waiting` esperando approval del environment `Production` por mas
 * de 24h (warning) o 7d (error). Cada run "stale waiting" en main bloquea
 * el concurrency group y deja pushes nuevos en cascada cancelada.
 *
 * **Detector logic** (mirror del spec TASK-848 §detailed-spec):
 *   status == "waiting"
 *   AND jobs[].status contains "waiting"
 *   AND pending_deployments[].environment.name == "Production"
 *   AND age > 24h
 *   AND workflowName in releaseDeployWorkflowAllowlist
 *
 * **Kind**: `drift`. Steady state esperado = 0.
 * **Severidad**: `warning` si edad >24h, `error` si edad >7d.
 *
 * **Degradacion honesta**: si no hay token (`GITHUB_TOKEN` env var ausente
 * en Vercel runtime) o GH API falla, el signal devuelve `severity='unknown'`
 * con summary "no fue posible consultar GitHub API". NO falla loud el
 * dashboard — el operador ve el degraded state y sabe que tiene que
 * configurar el token o investigar.
 *
 * Spec: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` §2.9 +
 * `docs/tasks/in-progress/TASK-848-production-release-control-plane.md`
 * §Detailed-Spec.
 *
 * Pattern reference: TASK-773 outbox-dead-letter.ts (graceful unknown signal).
 */
export const RELEASE_STALE_APPROVAL_SIGNAL_ID = 'platform.release.stale_approval'

const STALE_APPROVAL_WARNING_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h
const STALE_APPROVAL_ERROR_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000 // 7d

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
}

interface GithubPendingDeployment {
  environment: { id: number; name: string }
  current_user_can_approve: boolean
  reviewers: Array<{ type: string; reviewer: { login?: string; name?: string } }>
}

export interface StaleApprovalRecord {
  runId: number
  workflowName: string
  ageMs: number
  htmlUrl: string
  branch: string
  sha: string
}

/**
 * Lista runs con `status=waiting` para Production environment cuya edad
 * exceda el threshold de warning (24h). Helper publico desde TASK-850
 * Slice 3 — el preflight CLI lo consume directo en lugar de re-implementar
 * la query.
 */
export const listWaitingProductionRuns = async (
  token: string
): Promise<StaleApprovalRecord[]> => {
  const { owner, repo } = githubRepoCoords()
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?status=waiting&per_page=50`
  const response = await fetchGithubWithTimeout(url, { headers: buildGithubAuthHeaders(token) })

  if (!response.ok) {
    throw new Error(
      `GitHub API actions/runs returned ${response.status} ${response.statusText}`
    )
  }

  const payload = (await response.json()) as { workflow_runs: GithubWorkflowRun[] }
  const records: StaleApprovalRecord[] = []
  const now = Date.now()

  for (const run of payload.workflow_runs ?? []) {
    if (!RELEASE_DEPLOY_WORKFLOW_NAMES.has(run.name)) continue

    // Verificar que el run tiene pending deployment para Production specifically.
    const pendingUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${run.id}/pending_deployments`

    const pendingResponse = await fetchGithubWithTimeout(pendingUrl, {
      headers: buildGithubAuthHeaders(token)
    })

    if (!pendingResponse.ok) {
      // Si el pending_deployments endpoint falla per-run, lo skipeamos pero
      // NO bloqueamos el signal completo.
      continue
    }

    const pending = (await pendingResponse.json()) as GithubPendingDeployment[]

    const hasProductionPending = pending.some(
      (p) => p.environment?.name === 'Production'
    )

    if (!hasProductionPending) continue

    const ageMs = now - new Date(run.created_at).getTime()

    if (ageMs <= STALE_APPROVAL_WARNING_THRESHOLD_MS) continue

    records.push({
      runId: run.id,
      workflowName: run.name,
      ageMs,
      htmlUrl: run.html_url,
      branch: run.head_branch,
      sha: run.head_sha
    })
  }

  return records
}

const ageHoursLabel = (ms: number): string => {
  const hours = Math.round(ms / (60 * 60 * 1000))

  if (hours >= 48) {
    const days = Math.round(hours / 24)

    
return `${days}d`
  }

  
return `${hours}h`
}

const computeSeverity = (records: StaleApprovalRecord[]): ReliabilitySeverity => {
  if (records.length === 0) return 'ok'
  const maxAge = Math.max(...records.map((r) => r.ageMs))

  if (maxAge >= STALE_APPROVAL_ERROR_THRESHOLD_MS) return 'error'
  
return 'warning'
}

export const getReleaseStaleApprovalSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const token = await resolveGithubToken()

  if (!token) {
    return {
      signalId: RELEASE_STALE_APPROVAL_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleaseStaleApprovalSignal',
      label: 'Production approvals stale en GitHub Actions',
      severity: 'unknown',
      summary:
        'Sin GITHUB_RELEASE_OBSERVER_TOKEN configurado. Reader degradado — operador no puede ver stale approvals automaticamente. Configurar secret rotado o usar `gh run list --workflow=<name> --status=waiting` localmente.',
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
    const records = await listWaitingProductionRuns(token)
    const severity = computeSeverity(records)
    const count = records.length

    const summary =
      count === 0
        ? 'Sin runs production esperando approval > 24h. Workflows allowlist limpios.'
        : `${count} run${count === 1 ? '' : 's'} production esperando approval > 24h (max ${ageHoursLabel(Math.max(...records.map((r) => r.ageMs)))}). Cancelar runs viejos via \`gh run cancel <id>\` antes que bloqueen el concurrency group del proximo release.`

    const remediationDetail =
      records.length === 0
        ? undefined
        : records
            .slice(0, 5)
            .map(
              (r) =>
                `${r.workflowName} run ${r.runId} (${ageHoursLabel(r.ageMs)}, branch=${r.branch})`
            )
            .join('; ')

    return {
      signalId: RELEASE_STALE_APPROVAL_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleaseStaleApprovalSignal',
      label: 'Production approvals stale en GitHub Actions',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        ...(remediationDetail
          ? [{ kind: 'metric' as const, label: 'top_blockers', value: remediationDetail }]
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
      tags: { source: 'reliability_signal_release_stale_approval' }
    })

    return {
      signalId: RELEASE_STALE_APPROVAL_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleaseStaleApprovalSignal',
      label: 'Production approvals stale en GitHub Actions',
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
