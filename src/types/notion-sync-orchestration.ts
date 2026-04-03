export type NotionSyncOrchestrationStatus =
  | 'waiting_for_raw'
  | 'retry_scheduled'
  | 'retry_running'
  | 'sync_completed'
  | 'sync_failed'
  | 'cancelled'

export type NotionSyncOrchestrationTriggerSource =
  | 'cron_primary'
  | 'cron_recovery'
  | 'manual_admin'

export type NotionSyncOrchestrationExecutionSource =
  | 'scheduled_primary'
  | 'scheduled_retry'
  | 'manual_admin'

export interface NotionSyncRetrySchedule {
  retryAttempt: number
  delayMinutes: number
  nextRetryAt: string
}

export interface NotionSyncOrchestrationRunRecord {
  orchestrationRunId: string
  integrationKey: string
  pipelineKey: string
  spaceId: string
  sourceSyncRunId: string | null
  orchestrationStatus: NotionSyncOrchestrationStatus
  triggerSource: NotionSyncOrchestrationTriggerSource
  retryAttempt: number
  maxRetryAttempts: number
  rawBoundaryStartAt: string | null
  latestRawSyncedAt: string | null
  waitingReason: string | null
  nextRetryAt: string | null
  completedAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface NotionSyncDataQualityMonitorResult {
  executed: boolean
  healthySpaces: number
  degradedSpaces: number
  brokenSpaces: number
  failedSpaces: number
  error?: string
}

export interface NotionSyncRecoveryResult {
  triggered: boolean
  pendingSpaces: number
  retriedSpaces: number
  blockedSpaces: number
  completedSpaces: number
  failedSpaces: number
  reason: string
  nextRetryAt: string | null
  syncRunId: string | null
  dataQualityMonitor: NotionSyncDataQualityMonitorResult | null
}

export type NotionSyncOrchestrationResult = NotionSyncRecoveryResult

export interface NotionSyncOrchestrationSpaceSnapshot {
  spaceId: string
  spaceName: string | null
  clientId: string | null
  orchestrationStatus: NotionSyncOrchestrationStatus | 'unknown'
  retryAttempt: number
  nextRetryAt: string | null
  waitingReason: string | null
  updatedAt: string | null
}

export interface NotionSyncOrchestrationOverview {
  integrationKey: string
  pipelineKey: string
  generatedAt: string
  totals: {
    totalSpaces: number
    openSpaces: number
    waitingForRaw: number
    retryScheduled: number
    retryRunning: number
    syncCompleted: number
    syncFailed: number
    cancelled: number
    unknownSpaces: number
  }
  latestBySpace: NotionSyncOrchestrationSpaceSnapshot[]
  recentRuns: NotionSyncOrchestrationRunRecord[]
}

export interface TenantNotionSyncOrchestrationDetail {
  clientId: string
  space: {
    spaceId: string
    spaceName: string
  }
  latestRun: NotionSyncOrchestrationRunRecord | null
  openRun: NotionSyncOrchestrationRunRecord | null
  recentRuns: NotionSyncOrchestrationRunRecord[]
}
