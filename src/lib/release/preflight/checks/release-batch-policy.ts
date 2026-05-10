/**
 * TASK-850 — Preflight check #4: release_batch_policy.
 *
 * Computes the diff `origin/main...target_sha` (forward-only) via git
 * subprocess, classifies changed files by domain, and returns a decision:
 *   - ship: ok severity
 *   - split_batch: error severity
 *   - requires_break_glass: error severity unless override capability validated
 *
 * The git operations are local — the script must be run from a checkout
 * with `origin/main` available. CI runners satisfy this; the watchdog also
 * already runs in checkouts.
 */

import 'server-only'

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import { classifyReleaseBatch, decisionToSeverity } from '../batch-policy/classifier'
import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

const execFileAsync = promisify(execFile)
const GIT_TIMEOUT_MS = 8_000

const runGit = async (args: readonly string[]): Promise<string> => {
  const { stdout } = await execFileAsync('git', [...args], {
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: 10 * 1024 * 1024 // 10MB safe upper bound
  })

  return stdout
}

const collectChangedFiles = async (
  baseRef: string,
  targetSha: string
): Promise<readonly string[]> => {
  const stdout = await runGit(['diff', '--name-only', `${baseRef}...${targetSha}`])

  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

const collectCommitBodies = async (
  baseRef: string,
  targetSha: string
): Promise<string> => {
  // Format: %B = full commit message (subject + body) per commit, NUL separated.
  const stdout = await runGit(['log', '--format=%B%x00', `${baseRef}..${targetSha}`])

  return stdout
}

export const checkReleaseBatchPolicy = async (
  input: PreflightInput
): Promise<PreflightCheckResult> => {
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  // Resolve base ref. Default origin/main; targetBranch may differ during
  // pre-merge inspection (e.g. promoting feature/x → develop).
  const baseRef = `origin/${input.targetBranch}`

  try {
    const [changedFiles, commitBodyText] = await Promise.all([
      collectChangedFiles(baseRef, input.targetSha),
      collectCommitBodies(baseRef, input.targetSha)
    ])

    const evidence = classifyReleaseBatch({ changedFiles, commitBodyText })
    const severity = decisionToSeverity(evidence.decision, input.overrideBatchPolicy)

    let recommendation = ''

    if (severity === 'error') {
      recommendation = 'Resolver razones del classifier antes de promover release.'
    } else if (severity === 'warning') {
      recommendation =
        'Override aceptado — verificar audit row + reason >= 20 chars en orchestrator manifest.'
    }

    const summary =
      evidence.decision === 'ship'
        ? `${evidence.filesChanged} archivo(s) clasificados; decision=ship`
        : `${evidence.filesChanged} archivo(s) clasificados; decision=${evidence.decision} (${evidence.reasons[0] ?? 'sin razones'})`

    return {
      checkId: 'release_batch_policy',
      severity,
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary,
      error: null,
      evidence,
      recommendation
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'release_batch_policy' }
    })

    return {
      checkId: 'release_batch_policy',
      severity: 'unknown',
      status: 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'No se pudo computar diff git (verificar que origin/main esta sync)',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation:
        'Correr `git fetch origin` antes de re-ejecutar preflight. Si persiste, verificar checkout local.'
    }
  }
}
