/**
 * Platform Health V1 — programmatic preflight contract.
 *
 * Stable, versioned contract consumed by agents (MCP, Teams bot, CI), the
 * API Platform ecosystem lane, and the admin UI. Composes Reliability
 * Control Plane, Operations Overview, internal runtime checks, integration
 * readiness, synthetic monitoring and webhook delivery state into a single
 * read-only response.
 *
 * Contract version is independent from the platform version: it changes
 * only when the SHAPE of this object changes in a backwards-incompatible
 * way. New optional fields can be added without bumping the version.
 *
 * Spec: docs/tasks/in-progress/TASK-672-platform-health-api-contract.md
 */

export type PlatformHealthContractVersion = 'platform-health.v1'

export type PlatformOverallStatus = 'healthy' | 'degraded' | 'blocked' | 'unknown'

export type PlatformConfidence = 'high' | 'medium' | 'low' | 'unknown'

export type PlatformHealthSeverity = 'ok' | 'warning' | 'error' | 'unknown'

export type PlatformHealthSourceStatusKind =
  | 'ok'
  | 'timeout'
  | 'error'
  | 'unavailable'
  | 'not_configured'

export type PlatformEnvironment =
  | 'development'
  | 'preview'
  | 'staging'
  | 'production'
  | 'unknown'

/**
 * Safe modes are deterministic booleans the caller can use to gate behaviour
 * without re-implementing the rollup policy. They are derived from module
 * states; do not parse `overallStatus` and try to infer them.
 */
export interface PlatformSafeModes {
  /** Reads against PG/BQ are safe. False if Postgres or BigQuery is down. */
  readSafe: boolean
  /** Writes are safe. False on dead-letter explosions, schema drift, or auth failures. */
  writeSafe: boolean
  /** Deploying is safe. False if CI/runtime checks are red. */
  deploySafe: boolean
  /** Backfills/long-running jobs are safe. False if reactive backlog is unhealthy. */
  backfillSafe: boolean
  /** Outbound notifications (email/Teams/Slack) are safe. False if delivery channels degraded. */
  notifySafe: boolean
  /** Agent automation can take action. False if any blocking issue exists. */
  agentAutomationSafe: boolean
}

export interface PlatformHealthIssue {
  moduleKey: string
  severity: PlatformHealthSeverity
  source: string
  summary: string
  evidenceRefs: string[]
  ownerDomain: string
  observedAt: string | null
}

export interface PlatformHealthRecommendedCheck {
  id: string
  label: string
  command?: string
  docs?: string
  appliesWhen: string[]
}

export interface PlatformHealthDegradedSource {
  source: string
  status: PlatformHealthSourceStatusKind
  observedAt: string
  summary: string
}

export interface PlatformHealthModule {
  moduleKey: string
  label: string
  domain: string
  status: PlatformOverallStatus
  confidence: PlatformConfidence
  summary: string
  topIssues: PlatformHealthIssue[]
  sourceFreshness: Record<string, string | null>
}

export interface PlatformHealthV1 {
  contractVersion: PlatformHealthContractVersion
  generatedAt: string
  environment: PlatformEnvironment
  overallStatus: PlatformOverallStatus
  confidence: PlatformConfidence
  safeModes: PlatformSafeModes
  modules: PlatformHealthModule[]
  blockingIssues: PlatformHealthIssue[]
  warnings: PlatformHealthIssue[]
  recommendedChecks: PlatformHealthRecommendedCheck[]
  degradedSources: PlatformHealthDegradedSource[]
}

/**
 * Audience controls how aggressively the composer redacts and trims.
 *
 *  - `admin`:    full payload (issues with summaries, evidence refs,
 *                degraded source error details). Consumed by the admin
 *                UI and authenticated operators.
 *  - `ecosystem` (V1): summary + safeModes + module status only. No
 *                topIssues evidence detail until TASK-658 lands the
 *                `platform.health.detail` capability gate.
 */
export type PlatformHealthAudience = 'admin' | 'ecosystem'

export const PLATFORM_HEALTH_CONTRACT_VERSION: PlatformHealthContractVersion =
  'platform-health.v1'
