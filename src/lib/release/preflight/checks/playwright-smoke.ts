/**
 * TASK-850 — Preflight check: Playwright smoke green on target SHA.
 *
 * Subset of the CI-green check focused on the Playwright smoke workflow
 * specifically. This is broken out as a separate check (not folded into
 * `ci_green`) because:
 *   1. Smoke tests cover golden-path UX flows that pure unit tests don't.
 *   2. Operators want to be able to override `ci_green` (e.g. lint warning)
 *      while keeping smoke as a hard gate, or vice versa.
 *
 * The workflow name pattern is matched against `PLAYWRIGHT_SMOKE_WORKFLOW_NAMES`.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import { githubFetchJson, githubRepoCoords, resolveGithubToken } from '../../github-helpers'
import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

interface WorkflowRun {
  readonly id: number
  readonly name: string
  readonly status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested'
  readonly conclusion:
    | 'success'
    | 'failure'
    | 'cancelled'
    | 'skipped'
    | 'timed_out'
    | 'action_required'
    | 'neutral'
    | null
  readonly html_url: string
  readonly head_sha: string
  readonly path: string
  readonly created_at?: string
}

interface WorkflowRunsResponse {
  readonly total_count: number
  readonly workflow_runs: readonly WorkflowRun[]
}

/**
 * Workflow names + path fragments that classify a run as Playwright smoke.
 *
 * Stable list — adding a new smoke workflow requires extending this set.
 * Match by name OR path so renamed workflows are detected via path.
 */
const PLAYWRIGHT_SMOKE_NAME_PATTERNS = ['playwright', 'smoke', 'e2e'] as const

const isPlaywrightSmokeRun = (run: WorkflowRun): boolean => {
  const lowerName = run.name.toLowerCase()
  const lowerPath = (run.path ?? '').toLowerCase()

  return PLAYWRIGHT_SMOKE_NAME_PATTERNS.some(
    pattern => lowerName.includes(pattern) || lowerPath.includes(pattern)
  )
}

const runCreatedAtMs = (run: WorkflowRun): number => {
  const parsed = Date.parse(run.created_at ?? '')

  return Number.isFinite(parsed) ? parsed : 0
}

const latestRunPerWorkflow = (runs: readonly WorkflowRun[]): readonly WorkflowRun[] => {
  const latest = new Map<string, WorkflowRun>()

  for (const run of runs) {
    const key = `${run.name}::${run.path ?? ''}`
    const current = latest.get(key)

    if (!current || runCreatedAtMs(run) >= runCreatedAtMs(current)) {
      latest.set(key, run)
    }
  }

  return [...latest.values()]
}

export const checkPlaywrightSmoke = async (
  input: PreflightInput
): Promise<PreflightCheckResult> => {
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  const token = await resolveGithubToken()

  if (!token) {
    return {
      checkId: 'playwright_smoke',
      severity: 'unknown',
      status: 'not_configured',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'Sin token GitHub configurado',
      error: null,
      evidence: null,
      recommendation: 'Configurar GH App o PAT antes de re-ejecutar preflight.'
    }
  }

  const repo = input.githubRepo ?? githubRepoCoords()
  const endpoint = `/repos/${repo.owner}/${repo.repo}/actions/runs?head_sha=${encodeURIComponent(input.targetSha)}&per_page=100`

  try {
    const data = await githubFetchJson<WorkflowRunsResponse>(endpoint, token)
    const smokeRuns = latestRunPerWorkflow(data.workflow_runs.filter(isPlaywrightSmokeRun))

    if (smokeRuns.length === 0) {
      return {
        checkId: 'playwright_smoke',
        severity: 'warning',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `0 workflows Playwright smoke corrieron en ${input.targetSha.slice(0, 12)}`,
        error: null,
        evidence: { repo, targetSha: input.targetSha, smokeRunCount: 0 },
        recommendation:
          'Disparar workflow smoke manualmente (workflow_dispatch) o verificar trigger config.'
      }
    }

    const failures = smokeRuns.filter(
      run =>
        run.conclusion === 'failure' ||
        run.conclusion === 'timed_out' ||
        run.conclusion === 'action_required'
    )

    const inProgress = smokeRuns.filter(
      run => run.status === 'in_progress' || run.status === 'queued' || run.status === 'requested'
    )

    const successes = smokeRuns.filter(run => run.conclusion === 'success')

    if (failures.length > 0) {
      return {
        checkId: 'playwright_smoke',
        severity: 'error',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `${failures.length} workflow(s) Playwright smoke fallaron en ${input.targetSha.slice(0, 12)}`,
        error: null,
        evidence: {
          repo,
          targetSha: input.targetSha,
          failedSmokeWorkflows: failures.map(run => ({ name: run.name, htmlUrl: run.html_url }))
        },
        recommendation: 'Resolver fallas Playwright antes de promover a produccion.'
      }
    }

    if (inProgress.length > 0) {
      return {
        checkId: 'playwright_smoke',
        severity: 'warning',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `${inProgress.length} workflow(s) Playwright smoke aun corriendo`,
        error: null,
        evidence: {
          repo,
          targetSha: input.targetSha,
          inProgressSmokeWorkflows: inProgress.map(run => ({
            name: run.name,
            htmlUrl: run.html_url
          }))
        },
        recommendation: 'Esperar a que Playwright finalice antes de re-ejecutar preflight.'
      }
    }

    return {
      checkId: 'playwright_smoke',
      severity: 'ok',
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: `${successes.length} workflow(s) Playwright smoke verde en ${input.targetSha.slice(0, 12)}`,
      error: null,
      evidence: { repo, targetSha: input.targetSha, successCount: successes.length },
      recommendation: ''
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'playwright_smoke' }
    })

    return {
      checkId: 'playwright_smoke',
      severity: 'unknown',
      status: 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'No se pudo consultar Playwright smoke runs',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation: 'Reintentar; si persiste, verificar GitHub API + token + rate limit.'
    }
  }
}
