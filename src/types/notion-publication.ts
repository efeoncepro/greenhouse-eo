export type NotionPublicationKey = 'delivery_performance_reports'

export interface SpaceNotionPublicationTarget {
  targetId: string
  spaceId: string
  publicationKey: NotionPublicationKey
  notionWorkspaceId: string | null
  notionDatabaseId: string | null
  notionDataSourceId: string | null
  notionParentPageId: string | null
  active: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

export interface DeliveryPerformancePublicationPayload {
  title: string
  periodYear: number
  periodMonth: number
  reportScope: 'agency'
  properties: Record<string, string | number | null>
  blocks: Array<Record<string, unknown>>
  summary: {
    onTimePct: number | null
    lateDrops: number
    overdue: number
    carryOver: number
    totalTasks: number
    efeonceTasks: number
    skyTasks: number
    trendLabel: string
  }
}

export interface NotionPublicationRun {
  publicationRunId: string
  integrationKey: string
  targetId: string
  spaceId: string
  publicationKey: NotionPublicationKey
  reportScope: string
  periodYear: number
  periodMonth: number
  targetPageId: string | null
  targetDatabaseId: string | null
  payloadHash: string | null
  source: string
  status: 'running' | 'succeeded' | 'failed' | 'skipped'
  resultSummary: string | null
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
  createdBy: string | null
  metadata: Record<string, unknown>
}

export interface PublishDeliveryPerformanceReportResult {
  publicationRunId: string
  status: 'succeeded' | 'failed' | 'skipped'
  periodYear: number
  periodMonth: number
  reportScope: 'agency'
  targetPageId: string | null
  targetDatabaseId: string | null
  spaceId: string
  payloadHash: string | null
  dryRun?: boolean
  message: string
}
