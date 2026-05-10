/**
 * TASK-850 — Production Preflight V1 contract types.
 *
 * Stable, versioned contract consumed by:
 *   - `scripts/release/production-preflight.ts` CLI (this task).
 *   - TASK-851 orchestrator workflow `production-release.yml` (future).
 *   - TASK-855 release dashboard UI (future).
 *
 * Contract version is independent from the Greenhouse release version: it
 * bumps only when the response SHAPE changes in a backwards-incompatible
 * way. New optional fields can be added without bumping the version, in line
 * with TASK-672 platform-health convention.
 *
 * Spec: `docs/tasks/in-progress/TASK-850-production-preflight-cli-complete.md`.
 */

export type PreflightContractVersion = 'production-preflight.v1'

export const PRODUCTION_PREFLIGHT_CONTRACT_VERSION: PreflightContractVersion =
  'production-preflight.v1'

/**
 * Severity of a single preflight check result.
 *
 * Mirrors `WatchdogSeverity` but does NOT include `critical` — preflight is a
 * pre-deploy gate, not an active alert. Critical anomalies (e.g. worker
 * revision drift mid-deploy) are watchdog territory (TASK-849).
 */
export type PreflightSeverity = 'ok' | 'warning' | 'error' | 'unknown'

/**
 * Status of a preflight check execution. Mirrors `PlatformHealthSourceStatusKind`
 * with the same semantics — the timeout/error wrapper is shared via
 * `src/lib/platform-health/with-source-timeout.ts`.
 */
export type PreflightCheckStatusKind =
  | 'ok'
  | 'timeout'
  | 'error'
  | 'unavailable'
  | 'not_configured'

/**
 * Decision recommendation from check `release_batch_policy`.
 *
 * - `ship` — diff is safe to release as-is.
 * - `split_batch` — operator must split into smaller releases (sensitive
 *   domain mix without documented dependency).
 * - `requires_break_glass` — irreversible domain (migrations, schema/runtime
 *   shared, access model, payment/payroll/accounting semantics) requires
 *   `platform.release.preflight.override_batch_policy` capability + reason.
 */
export type ReleaseBatchPolicyDecision = 'ship' | 'split_batch' | 'requires_break_glass'

/**
 * Audience controls redaction depth in the response. Mirrors
 * `PlatformHealthAudience`:
 *   - `admin` — full evidence, raw error messages (already sanitized via
 *     `redactErrorForResponse`), all check details.
 *   - `ecosystem` — summaries truncated, evidence references stripped to
 *     opaque counts.
 *
 * V1 default consumer is `admin` (CLI invoked by EFEONCE_ADMIN /
 * DEVOPS_OPERATOR). The `ecosystem` lane is reserved for the future
 * `/api/platform/release/preflight` endpoint when TASK-855 dashboard ships.
 */
export type PreflightAudience = 'admin' | 'ecosystem'

/**
 * Identifier of a preflight check. Stable strings — appear in JSON output,
 * Teams alerts, and orchestrator workflow conditions. Adding a new check
 * requires extending this union, the registry, and the composer.
 */
export type PreflightCheckId =
  | 'target_sha_exists'
  | 'ci_green'
  | 'playwright_smoke'
  | 'release_batch_policy'
  | 'stale_approvals'
  | 'pending_without_jobs'
  | 'vercel_readiness'
  | 'postgres_health'
  | 'postgres_migrations'
  | 'gcp_wif_subject'
  | 'azure_wif_subject'
  | 'sentry_critical_issues'

/**
 * Module classification for a single changed file inside the
 * `release_batch_policy` heuristic. Stable strings — appear in evidence and
 * machine-readable JSON output. Adding a new domain requires updating the
 * `DOMAIN_PATTERNS` map in `batch-policy/domains.ts`.
 */
export type ReleaseBatchPolicyDomain =
  | 'payroll'
  | 'finance'
  | 'auth_access'
  | 'cloud_release'
  | 'db_migrations'
  | 'ui'
  | 'docs'
  | 'tests'
  | 'config'
  | 'unclassified'

export interface ReleaseBatchPolicyEvidence {
  /**
   * Files included in the diff `origin/main...target_sha` classified by
   * domain. Counts only — full file list lives in `details` for admin
   * audience to avoid blowing up payload size for ecosystem consumers.
   */
  readonly domains: Readonly<Partial<Record<ReleaseBatchPolicyDomain, number>>>
  /**
   * Sensitive paths matched (e.g. `migrations/`, `src/lib/db/`,
   * `.github/workflows/`). Subset of `domains` but called out explicitly
   * because operator scrutiny is higher.
   */
  readonly sensitivePathsMatched: readonly string[]
  /**
   * Irreversibility heuristic flags raised by the classifier. Empty array
   * means the diff is reversible by ordinary deploy + revert. One or more
   * entries flag domains where revert is non-trivial (e.g. data migrations,
   * payment ledger writes, access model changes).
   */
  readonly irreversibilityFlags: readonly string[]
  /** Total files diffed. */
  readonly filesChanged: number
  /** Decision the classifier recommends. */
  readonly decision: ReleaseBatchPolicyDecision
  /**
   * Human-readable reasons aligned with the decision. Multiple entries =
   * multiple independent reasons; operator should resolve all of them
   * before re-running preflight.
   */
  readonly reasons: readonly string[]
}

/**
 * Single preflight check result.
 *
 * Every check produces this shape, regardless of how it sources data
 * (gh API, gcloud CLI, az CLI, pnpm subprocess, Sentry API, git diff).
 * Severity rules are check-specific and live in each check's reader; the
 * composer never re-derives severity from raw data.
 */
export interface PreflightCheckResult<TEvidence = unknown> {
  /** Stable check id. */
  readonly checkId: PreflightCheckId
  /** Severity. `unknown` = source unreachable, treat as warning by default. */
  readonly severity: PreflightSeverity
  /** Wrapper status — exposes whether the check actually ran. */
  readonly status: PreflightCheckStatusKind
  /** ISO 8601 timestamp at which the check resolved. */
  readonly observedAt: string
  /** Elapsed milliseconds for this check. */
  readonly durationMs: number
  /** One-sentence summary safe for Teams/Slack/CLI human output. */
  readonly summary: string
  /**
   * Sanitized error string when `severity = 'error'` or `severity = 'unknown'`.
   * Null otherwise. Always passes through `redactErrorForResponse`.
   */
  readonly error: string | null
  /**
   * Check-specific evidence (typed per check). Admin audience receives the
   * full evidence object; ecosystem audience may receive a redacted subset.
   */
  readonly evidence: TEvidence | null
  /**
   * Recommendation when severity != ok. Empty string when severity = ok.
   * Operator-facing copy in es-CL — surfaces in CLI human output and
   * dashboard UI.
   */
  readonly recommendation: string
}

/**
 * Specialized type for the batch policy check result so consumers can rely
 * on the typed evidence without an `as` cast.
 */
export type ReleaseBatchPolicyCheckResult = PreflightCheckResult<ReleaseBatchPolicyEvidence>

/**
 * Source-level degradation detail. Surfaces when one of the underlying
 * sources (gh API, gcloud, az, Sentry, etc.) fails or times out.
 */
export interface PreflightDegradedSource {
  readonly checkId: PreflightCheckId
  readonly status: PreflightCheckStatusKind
  readonly observedAt: string
  readonly summary: string
}

/**
 * Rolled-up overall status of the preflight run. Worst-of-N rule across
 * the 12 checks (mirror of TASK-672 `rollupOverallStatus`):
 *   - ANY check with `severity = 'error'` → `'blocked'`
 *   - ELSE ANY check with `severity = 'warning'` → `'degraded'`
 *   - ELSE ALL checks with `severity = 'ok'` → `'healthy'`
 *   - ELSE → `'unknown'`
 */
export type PreflightOverallStatus = 'healthy' | 'degraded' | 'blocked' | 'unknown'

/**
 * Confidence in the overall result. Lowered by degraded sources
 * (timeout / error / not_configured). Calling code should NOT auto-promote
 * a `blocked` status to `degraded` based on confidence — confidence is
 * informational, not a gate.
 */
export type PreflightConfidence = 'high' | 'medium' | 'low' | 'unknown'

export interface ProductionPreflightV1 {
  readonly contractVersion: PreflightContractVersion
  /** ISO 8601 timestamp at which the run started. */
  readonly startedAt: string
  /** ISO 8601 timestamp at which the run finished. */
  readonly completedAt: string
  /** Total elapsed milliseconds for the entire run (composer + all checks). */
  readonly durationMs: number
  /** Audience the response was redacted for. */
  readonly audience: PreflightAudience
  /** Target SHA the preflight ran against. */
  readonly targetSha: string
  /** Operator-supplied target branch (defaults to `main`). */
  readonly targetBranch: string
  /** Subject who ran the preflight (CLI: `actor` from env; orchestrator: `triggered_by`). */
  readonly triggeredBy: string | null
  /** Worst-of-N rollup. */
  readonly overallStatus: PreflightOverallStatus
  /** Confidence in the rollup. */
  readonly confidence: PreflightConfidence
  /**
   * Check results, ordered canonically (matches `CHECK_ORDER` in the
   * composer). Length is exactly 12 — missing entries mean the composer
   * itself failed and the partial response is degraded.
   */
  readonly checks: readonly PreflightCheckResult[]
  /** Subset of checks with status != 'ok' (timeout/error/not_configured). */
  readonly degradedSources: readonly PreflightDegradedSource[]
  /**
   * Whether the operator may proceed to deploy. Conservative:
   *   - `overallStatus = 'healthy'` AND no degraded sources → `true`
   *   - else → `false`
   *
   * Override is not encoded here; the orchestrator (TASK-851) is responsible
   * for accepting an override flag tied to `platform.release.preflight.override_batch_policy`
   * capability + reason audit.
   */
  readonly readyToDeploy: boolean
}
