/**
 * TASK-850 — Preflight check: CI green on target SHA.
 *
 * Queries `GET /repos/{owner}/{repo}/actions/runs?head_sha={sha}&per_page=100`,
 * filters out deploy workflows (those run on push to main, not preflight
 * checks), and asserts that ALL remaining workflow runs concluded `success`.
 *
 * Failure semantics:
 *   - Any non-deploy workflow with conclusion='failure' → severity error.
 *   - Any non-deploy workflow with conclusion=null AND status='in_progress'
 *     → severity warning (CI still running; operator must wait or re-check).
 *   - Zero non-deploy runs found → severity unknown (CI never ran on this SHA;
 *     could be brand-new commit not yet pushed, or workflows skipped).
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import { githubFetchJson, githubRepoCoords, resolveGithubToken } from '../../github-helpers'
import { RELEASE_DEPLOY_WORKFLOW_NAMES } from '../../workflow-allowlist'
import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

interface WorkflowRun {
  readonly id: number
  readonly name: string
  readonly path?: string
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
  readonly created_at?: string
}

interface WorkflowRunsResponse {
  readonly total_count: number
  readonly workflow_runs: readonly WorkflowRun[]
}

const isReleaseDeployWorkflow = (name: string): boolean => RELEASE_DEPLOY_WORKFLOW_NAMES.has(name)

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

export const checkCiGreen = async (input: PreflightInput): Promise<PreflightCheckResult> => {
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  const token = await resolveGithubToken()

  if (!token) {
    return {
      checkId: 'ci_green',
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

    const nonDeployRuns = latestRunPerWorkflow(
      data.workflow_runs.filter(run => !isReleaseDeployWorkflow(run.name))
    )

    if (nonDeployRuns.length === 0) {
      return {
        checkId: 'ci_green',
        severity: 'unknown',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `0 workflows CI corrieron en ${input.targetSha.slice(0, 12)}`,
        error: null,
        evidence: { totalRuns: 0, repo, targetSha: input.targetSha },
        recommendation:
          'Confirmar que push del commit gatillo CI; si no, push manual o disparar workflow_dispatch.'
      }
    }

    const failures = nonDeployRuns.filter(
      run =>
        run.conclusion === 'failure' ||
        run.conclusion === 'timed_out' ||
        run.conclusion === 'action_required'
    )

    const inProgress = nonDeployRuns.filter(
      run => run.status === 'in_progress' || run.status === 'queued' || run.status === 'requested'
    )

    const successes = nonDeployRuns.filter(run => run.conclusion === 'success')

    if (failures.length > 0) {
      return {
        checkId: 'ci_green',
        severity: 'error',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `${failures.length} workflow(s) CI fallaron en ${input.targetSha.slice(0, 12)}`,
        error: null,
        evidence: {
          repo,
          targetSha: input.targetSha,
          failedWorkflows: failures.map(run => ({ name: run.name, htmlUrl: run.html_url })),
          totalRuns: nonDeployRuns.length
        },
        recommendation: 'Resolver fallas en CI antes de promover a produccion.'
      }
    }

    if (inProgress.length > 0) {
      return {
        checkId: 'ci_green',
        severity: 'warning',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `${inProgress.length} workflow(s) CI aun corriendo en ${input.targetSha.slice(0, 12)}`,
        error: null,
        evidence: {
          repo,
          targetSha: input.targetSha,
          inProgressWorkflows: inProgress.map(run => ({ name: run.name, htmlUrl: run.html_url })),
          totalRuns: nonDeployRuns.length
        },
        recommendation: 'Esperar a que CI finalice antes de re-ejecutar preflight.'
      }
    }

    return {
      checkId: 'ci_green',
      severity: 'ok',
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: `${successes.length} workflow(s) CI verde en ${input.targetSha.slice(0, 12)}`,
      error: null,
      evidence: {
        repo,
        targetSha: input.targetSha,
        successCount: successes.length,
        totalRuns: nonDeployRuns.length
      },
      recommendation: ''
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'ci_green' }
    })

    return {
      checkId: 'ci_green',
      severity: 'unknown',
      status: 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'No se pudo consultar workflow runs',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation: 'Reintentar; si persiste, verificar GitHub API + token + rate limit.'
    }
  }
}
