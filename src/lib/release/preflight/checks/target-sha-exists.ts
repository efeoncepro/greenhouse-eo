/**
 * TASK-850 — Preflight check: target SHA exists in GitHub repo.
 *
 * The first gate. If the SHA the operator wants to deploy doesn't exist in
 * the repo (typo, force-push deleted it, wrong fork), every downstream check
 * is meaningless. Severity error short-circuits the run.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import { fetchGithubWithTimeout, githubRepoCoords, resolveGithubToken, buildGithubAuthHeaders } from '../../github-helpers'
import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

interface CommitResponse {
  readonly sha: string
  readonly html_url: string
}

export const checkTargetShaExists = async (
  input: PreflightInput
): Promise<PreflightCheckResult> => {
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  const token = await resolveGithubToken()

  if (!token) {
    return {
      checkId: 'target_sha_exists',
      severity: 'unknown',
      status: 'not_configured',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'Sin GITHUB_RELEASE_OBSERVER_TOKEN ni GitHub App configurado',
      error: null,
      evidence: null,
      recommendation: 'Configurar GH App o PAT antes de re-ejecutar preflight.'
    }
  }

  const repo = input.githubRepo ?? githubRepoCoords()
  const endpoint = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits/${encodeURIComponent(input.targetSha)}`

  try {
    const response = await fetchGithubWithTimeout(endpoint, {
      headers: buildGithubAuthHeaders(token)
    })

    if (response.status === 404) {
      return {
        checkId: 'target_sha_exists',
        severity: 'error',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `Commit ${input.targetSha.slice(0, 12)} no existe en ${repo.owner}/${repo.repo}`,
        error: null,
        evidence: { sha: input.targetSha, exists: false, repo },
        recommendation: 'Verificar SHA correcto o pull-request mergeado antes de re-intentar.'
      }
    }

    if (!response.ok) {
      return {
        checkId: 'target_sha_exists',
        severity: 'unknown',
        status: 'error',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `GitHub API devolvio ${response.status}`,
        error: `GitHub API ${endpoint} returned ${response.status} ${response.statusText}`,
        evidence: null,
        recommendation: 'Verificar token + rate limit + reintentar.'
      }
    }

    const commit = (await response.json()) as CommitResponse

    return {
      checkId: 'target_sha_exists',
      severity: 'ok',
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: `Commit ${commit.sha.slice(0, 12)} verificado en ${repo.owner}/${repo.repo}`,
      error: null,
      evidence: { sha: commit.sha, exists: true, htmlUrl: commit.html_url, repo },
      recommendation: ''
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'target_sha_exists' }
    })

    return {
      checkId: 'target_sha_exists',
      severity: 'unknown',
      status: 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'No se pudo verificar SHA contra GitHub API',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation: 'Reintentar; si persiste, verificar conectividad GitHub API + token.'
    }
  }
}
