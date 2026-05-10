/**
 * TASK-850 — Production Preflight async runner.
 *
 * Composes the 12 checks via `Promise.all` with per-check timeouts. Mirrors
 * the TASK-672 platform-health pattern: every check is wrapped via the
 * shared `withSourceTimeout` helper so a slow or broken source produces a
 * structured `unknown/timeout/error` result instead of bubbling up.
 *
 * Each check is a function `(input: PreflightInput) => Promise<PreflightCheckResult>`.
 * The runner does NOT know how a check resolves data — that lives in
 * `src/lib/release/preflight/checks/<check>.ts`. This decouples I/O policy
 * from rollup policy.
 */

import 'server-only'

import { withSourceTimeout, type SourceResult } from '@/lib/platform-health/with-source-timeout'

import { buildMissingCheckPlaceholder, composeFromCheckResults } from './composer'
import type {
  PreflightAudience,
  PreflightCheckId,
  PreflightCheckResult,
  ProductionPreflightV1
} from './types'

/**
 * Input passed to every check. Stable contract — adding fields requires
 * extending this interface AND every check signature.
 */
export interface PreflightInput {
  /** SHA the operator wants to deploy (resolved upstream from branch/HEAD). */
  readonly targetSha: string
  /** Branch we are promoting INTO (defaults to `main`). */
  readonly targetBranch: string
  /** GitHub repo coords. Always `efeoncepro/greenhouse-eo` in prod. */
  readonly githubRepo: { readonly owner: string; readonly repo: string }
  /** Subject who triggered the run. CLI: `process.env.USER`; orchestrator: actor login. */
  readonly triggeredBy: string | null
  /**
   * If true, the batch policy check is allowed to short-circuit `error`
   * decisions to `warning`. Set ONLY when the orchestrator validated
   * `platform.release.preflight.override_batch_policy` capability + reason.
   * Default false.
   */
  readonly overrideBatchPolicy: boolean
}

/**
 * A single check definition.
 */
export interface PreflightCheckDefinition {
  readonly id: PreflightCheckId
  /** Per-check timeout in ms. Defaults to 6_000 if unset. */
  readonly timeoutMs?: number
  readonly run: (input: PreflightInput) => Promise<PreflightCheckResult>
}

const DEFAULT_CHECK_TIMEOUT_MS = 6_000

/**
 * Convert a SourceResult<PreflightCheckResult> back into a check result.
 * If the wrapper signaled timeout/error, we synthesize a `severity='unknown'`
 * placeholder so the composer always has 12 entries.
 */
const adaptSourceResult = (
  checkId: PreflightCheckId,
  source: SourceResult<PreflightCheckResult>
): PreflightCheckResult => {
  if (source.status === 'ok' && source.value) {
    return source.value
  }

  return {
    checkId,
    severity: 'unknown',
    status: source.status === 'ok' ? 'error' : source.status,
    observedAt: source.observedAt,
    durationMs: source.durationMs,
    summary:
      source.status === 'timeout'
        ? `Check '${checkId}' excedio el budget de ${DEFAULT_CHECK_TIMEOUT_MS}ms.`
        : `Check '${checkId}' degradada: ${source.error ?? source.status}.`,
    error: source.error,
    evidence: null,
    recommendation: 'Reintentar preflight; si persiste, revisar runtime del check.'
  }
}

export interface RunPreflightOptions {
  readonly audience?: PreflightAudience
  readonly input: PreflightInput
  readonly checks: readonly PreflightCheckDefinition[]
}

/**
 * Run the preflight end-to-end. All checks execute in parallel via
 * `Promise.all` with independent timeouts. Returns a fully-populated
 * `ProductionPreflightV1` payload regardless of which checks succeeded
 * (degraded sources surface via `degradedSources[]` + lowered confidence).
 *
 * Composer-level exceptions (defensive) collapse into a payload with all
 * placeholders + overallStatus = 'unknown'.
 */
export const runPreflight = async (
  options: RunPreflightOptions
): Promise<ProductionPreflightV1> => {
  const audience = options.audience ?? 'admin'
  const startedAt = new Date().toISOString()

  try {
    const sourceResults = await Promise.all(
      options.checks.map(async definition => {
        const source = await withSourceTimeout(() => definition.run(options.input), {
          source: definition.id,
          timeoutMs: definition.timeoutMs ?? DEFAULT_CHECK_TIMEOUT_MS
        })

        return adaptSourceResult(definition.id, source)
      })
    )

    const completedAt = new Date().toISOString()

    return composeFromCheckResults({
      audience,
      targetSha: options.input.targetSha,
      targetBranch: options.input.targetBranch,
      triggeredBy: options.input.triggeredBy,
      startedAt,
      completedAt,
      checks: sourceResults
    })
  } catch {
    // Defensive: composer-level exception means no checks ran. Build all
    // placeholders so the payload still satisfies V1 shape.
    const completedAt = new Date().toISOString()

    const placeholders = options.checks.map(definition =>
      buildMissingCheckPlaceholder(definition.id, 'composer-level exception')
    )

    return composeFromCheckResults({
      audience,
      targetSha: options.input.targetSha,
      targetBranch: options.input.targetBranch,
      triggeredBy: options.input.triggeredBy,
      startedAt,
      completedAt,
      checks: placeholders
    })
  }
}
