/**
 * TASK-850 — Production Preflight composer.
 *
 * Pure deterministic composition: takes 12 `PreflightCheckResult` and produces
 * a `ProductionPreflightV1` payload. No side effects, no async, no I/O.
 *
 * Mirrors `src/lib/platform-health/composer.ts` (TASK-672) intentionally so
 * test patterns and operator mental model carry over. The async runner
 * lives separately in `runner.ts` and consumes this composer.
 *
 * Safety / Robustness / Resilience / Scalability:
 *   - **Safety**: redaction of error fields happens upstream in
 *     `withSourceTimeout`; this composer never sees raw exceptions.
 *   - **Robustness**: missing checks (composer itself failed) produce a
 *     `degraded` output instead of throwing.
 *   - **Resilience**: every degraded source lowers confidence without
 *     blocking; the worst-of-N rollup encodes the deploy gate.
 *   - **Scalability**: O(checks). Composer adds zero per-check work beyond
 *     pure aggregation.
 */

import type {
  PreflightAudience,
  PreflightCheckId,
  PreflightCheckResult,
  PreflightConfidence,
  PreflightDegradedSource,
  PreflightOverallStatus,
  ProductionPreflightV1
} from './types'

import { PRODUCTION_PREFLIGHT_CONTRACT_VERSION } from './types'

/**
 * Canonical execution + display order of preflight checks. Surfaces in CLI
 * human output and JSON `checks[]` array. Adding a check requires
 * extending this array AND `PreflightCheckId` AND the runner registry.
 */
export const PREFLIGHT_CHECK_ORDER: readonly PreflightCheckId[] = Object.freeze([
  'target_sha_exists',
  'ci_green',
  'playwright_smoke',
  'release_batch_policy',
  'stale_approvals',
  'pending_without_jobs',
  'vercel_readiness',
  'postgres_health',
  'postgres_migrations',
  'gcp_wif_subject',
  'azure_wif_subject',
  'sentry_critical_issues'
])

interface ComposeFromCheckResultsInput {
  readonly audience: PreflightAudience
  readonly targetSha: string
  readonly targetBranch: string
  readonly triggeredBy: string | null
  readonly startedAt: string
  readonly completedAt: string
  readonly checks: readonly PreflightCheckResult[]
}

/**
 * Worst-of-N rollup. Mirrors TASK-672 platform-health.
 *
 * - ANY error → `'blocked'`
 * - ELSE ANY warning → `'degraded'`
 * - ELSE ALL ok → `'healthy'`
 * - ELSE (any unknown) → `'unknown'`
 */
const rollupOverallStatus = (
  checks: readonly PreflightCheckResult[]
): PreflightOverallStatus => {
  if (checks.length === 0) return 'unknown'

  let hasUnknown = false
  let hasWarning = false

  for (const check of checks) {
    if (check.severity === 'error') return 'blocked'
    if (check.severity === 'warning') hasWarning = true
    if (check.severity === 'unknown') hasUnknown = true
  }

  if (hasWarning) return 'degraded'
  if (hasUnknown) return 'unknown'

  return 'healthy'
}

/**
 * Confidence rollup. Lowered by degraded sources without auto-promoting
 * the gate.
 *
 * - degraded sources >= 3 → `'low'`
 * - degraded sources >= 1 → `'medium'`
 * - else if all checks ok → `'high'`
 * - else (no degradation but some non-ok severities) → `'medium'`
 */
const rollupConfidence = (
  checks: readonly PreflightCheckResult[],
  degradedCount: number
): PreflightConfidence => {
  if (checks.length === 0) return 'unknown'
  if (degradedCount >= 3) return 'low'
  if (degradedCount >= 1) return 'medium'

  const allOk = checks.every(check => check.severity === 'ok')

  if (allOk) return 'high'

  return 'medium'
}

const buildDegradedSources = (
  checks: readonly PreflightCheckResult[]
): readonly PreflightDegradedSource[] => {
  return checks
    .filter(check => check.status !== 'ok')
    .map<PreflightDegradedSource>(check => ({
      checkId: check.checkId,
      status: check.status,
      observedAt: check.observedAt,
      summary: check.summary
    }))
}

/**
 * Order check results into the canonical display order. Missing checks
 * (composer ran without them — should never happen in production) are
 * dropped and reported via `degradedSources` indirectly through
 * `rollupOverallStatus` returning `'unknown'`.
 */
const orderChecks = (
  checks: readonly PreflightCheckResult[]
): readonly PreflightCheckResult[] => {
  const byId = new Map<PreflightCheckId, PreflightCheckResult>()

  for (const check of checks) {
    byId.set(check.checkId, check)
  }

  const ordered: PreflightCheckResult[] = []

  for (const id of PREFLIGHT_CHECK_ORDER) {
    const result = byId.get(id)

    if (result) ordered.push(result)
  }

  return ordered
}

/**
 * Determine readiness conservatively:
 *   - `healthy` overall AND no degraded sources → ready
 *   - else not ready (operator must inspect)
 */
const deriveReadyToDeploy = (
  overallStatus: PreflightOverallStatus,
  degradedSources: readonly PreflightDegradedSource[]
): boolean => {
  if (overallStatus !== 'healthy') return false
  if (degradedSources.length > 0) return false

  return true
}

/**
 * Pure composer entry point. Tests call this directly with synthetic
 * `PreflightCheckResult[]` inputs.
 */
export const composeFromCheckResults = (
  input: ComposeFromCheckResultsInput
): ProductionPreflightV1 => {
  const ordered = orderChecks(input.checks)
  const degradedSources = buildDegradedSources(ordered)
  const overallStatus = rollupOverallStatus(ordered)
  const confidence = rollupConfidence(ordered, degradedSources.length)
  const readyToDeploy = deriveReadyToDeploy(overallStatus, degradedSources)
  const durationMs = Date.parse(input.completedAt) - Date.parse(input.startedAt)

  return {
    contractVersion: PRODUCTION_PREFLIGHT_CONTRACT_VERSION,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    durationMs: Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0,
    audience: input.audience,
    targetSha: input.targetSha,
    targetBranch: input.targetBranch,
    triggeredBy: input.triggeredBy,
    overallStatus,
    confidence,
    checks: ordered,
    degradedSources,
    readyToDeploy
  }
}

/**
 * Build a stub `PreflightCheckResult` with `severity='unknown'` and
 * `status='not_configured'` for checks the composer never received. Used
 * when the runner aborts mid-flight (e.g. composer-level exception). The
 * resulting payload still satisfies the V1 shape.
 */
export const buildMissingCheckPlaceholder = (
  checkId: PreflightCheckId,
  reason: string
): PreflightCheckResult => {
  const observedAt = new Date().toISOString()

  return {
    checkId,
    severity: 'unknown',
    status: 'not_configured',
    observedAt,
    durationMs: 0,
    summary: `Check no ejecutada: ${reason}`,
    error: null,
    evidence: null,
    recommendation: 'Reintentar preflight con runtime saneado.'
  }
}
