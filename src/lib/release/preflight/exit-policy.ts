import type { ProductionPreflightV1 } from './types'

/**
 * CLI fail policy for production preflight.
 *
 * `readyToDeploy` is the canonical deploy gate. The broader `overallStatus`
 * remains useful for human triage, but a degraded or unknown preflight must
 * not return success when the caller explicitly asked for fail-fast behavior.
 *
 * **TASK-871 follow-up (2026-05-13)**: `bypassWarnings` exists as the
 * canonical operator override for the architectural intent documented in
 * CLAUDE.md ("`bypass_preflight_reason` >=20 chars" → orchestrator override).
 * Before this flag, `bypass_preflight_reason` only downgraded
 * `release_batch_policy` errors but left `playwright_smoke` (always warning
 * for main pushes — design quirk), `sentry_critical_issues` (1-9 issues =
 * warning), and `vercel_readiness` (timing race during Vercel build) blocking
 * the release. Detected live on attempts 2 + 3 of TASK-871 release runs
 * `25822955070` + `25823823716`.
 *
 * When `bypassWarnings=true`, only ERROR severity in the payload blocks. The
 * orchestrator workflow `production-release.yml` is responsible for passing
 * this flag only when `bypass_preflight_reason >= 20 chars` is provided
 * (audit trail persisted in `release_state_transitions.metadata_json`).
 */
export const shouldFailPreflightCommand = (
  payload: Pick<ProductionPreflightV1, 'readyToDeploy' | 'overallStatus'>,
  failOnError: boolean,
  bypassWarnings: boolean = false
): boolean => {
  if (!failOnError) return false

  if (bypassWarnings) {
    // Only `blocked` (any error severity) keeps the release gated. Degraded
    // (warnings only) and unknown are operator-acknowledged via the audited
    // bypass reason; the orchestrator records the reason for post-hoc audit.
    return payload.overallStatus === 'blocked'
  }

  return !payload.readyToDeploy
}
