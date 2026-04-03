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

export interface IntegrationDataQualitySpaceSnapshot {
  spaceId: string
  spaceName: string | null
  clientId: string | null
  qualityStatus: IntegrationDataQualityStatus
  checkedAt: string
  warningChecks: number
  errorChecks: number
  diffCount: number
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
