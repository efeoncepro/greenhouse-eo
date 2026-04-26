import type { NotionParityBucket, NotionParityPeriodField } from '@/lib/space-notion/notion-parity-audit'

export type IntegrationDataQualityRunSource = 'cron' | 'post_sync' | 'manual' | 'api'

export type IntegrationDataQualityRunExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export type IntegrationDataQualityStatus = 'healthy' | 'degraded' | 'broken' | 'unknown'

export type IntegrationDataQualityCheckSeverity = 'ok' | 'warning' | 'error'

export interface IntegrationDataQualityCheckResult {
  dataQualityCheckId: string
  checkKey: string
  severity: IntegrationDataQualityCheckSeverity
  summary: string
  observedValue: string | null
  expectedValue: string | null
  detail: Record<string, unknown>
  createdAt: string
}

export interface NotionDeliveryDataQualitySummary {
  rawCount: number
  conformedCount: number
  matchedCount: number
  diffCount: number
  bucketCounts: Record<NotionParityBucket, number>
  rawFreshnessReady: boolean
  rawFreshnessReasons: string[]
  conformedSyncedAt: string | null
}

export interface IntegrationDataQualityRunResult {
  dataQualityRunId: string
  integrationKey: string
  monitorKey: string
  pipelineKey: string
  spaceId: string
  executionSource: IntegrationDataQualityRunSource
  executionStatus: IntegrationDataQualityRunExecutionStatus
  qualityStatus: IntegrationDataQualityStatus
  periodField: NotionParityPeriodField
  periodYear: number
  periodMonth: number
  totalChecks: number
  warningChecks: number
  errorChecks: number
  checkedAt: string
  completedAt: string | null
  alertSentAt: string | null
  sourceSyncRunId: string | null
  summary: Record<string, unknown>
  metadata: Record<string, unknown>
}

export interface NotionDeliveryDataQualityRunDetail {
  run: IntegrationDataQualityRunResult
  checks: IntegrationDataQualityCheckResult[]
  summary: NotionDeliveryDataQualitySummary
}

export interface IntegrationDataQualityFailedCheckSummary {
  checkKey: string
  severity: IntegrationDataQualityCheckSeverity
  count: number
  observedValue: string | null
  expectedValue: string | null
  summary: string
}

export interface IntegrationDataQualitySpaceSnapshot {
  spaceId: string
  spaceName: string | null
  clientId: string | null
  qualityStatus: IntegrationDataQualityStatus
  checkedAt: string
  warningChecks: number
  errorChecks: number
  diffCount: number

  /**
   * Top failing checks for the latest run of this space, ordered by severity
   * (errors first). Empty when the space is healthy. Surfaced in the reliability
   * dashboard so on-call sees *which* check broke without drilling into the
   * audit run detail.
   */
  failedChecks: IntegrationDataQualityFailedCheckSummary[]

  /**
   * `auto_recoverable` when the only failures are transient parity lag
   * (`fresh_raw_after_conformed_sync`) — the conformed sync just needs to
   * catch up. The dashboard renders these with a yellow info chip + "auto"
   * label instead of red, and a watcher cron can re-trigger sync without
   * paging a human.
   *
   * `manual` when failures include hard parity buckets, schema drift, or
   * raw freshness gate — needs investigation.
   */
  recoveryClass: 'auto_recoverable' | 'manual' | 'healthy'
}

export interface IntegrationDataQualityOverview {
  integrationKey: string
  monitorKey: string
  generatedAt: string
  totals: {
    totalSpaces: number
    healthySpaces: number
    degradedSpaces: number
    brokenSpaces: number
    unknownSpaces: number

    /**
     * Spaces whose only failures are auto-recoverable lag. Counted toward
     * `brokenSpaces`/`degradedSpaces` for backwards compatibility but tracked
     * separately so the reliability summary can downgrade their visual weight.
     */
    autoRecoverableSpaces: number
  }
  latestBySpace: IntegrationDataQualitySpaceSnapshot[]
  recentRuns: IntegrationDataQualityRunResult[]
}

export interface RunNotionDeliveryDataQualityInput {
  spaceId: string
  year: number
  month: number
  periodField?: NotionParityPeriodField
  executionSource?: IntegrationDataQualityRunSource
  sourceSyncRunId?: string | null
  sampleLimit?: number
}

export interface RunNotionDeliveryDataQualitySweepResult {
  integrationKey: string
  monitorKey: string
  periodField: NotionParityPeriodField
  periodYear: number
  periodMonth: number
  executionSource: IntegrationDataQualityRunSource
  totalSpaces: number
  healthySpaces: number
  degradedSpaces: number
  brokenSpaces: number
  failedSpaces: number
  runs: NotionDeliveryDataQualityRunDetail[]
}
