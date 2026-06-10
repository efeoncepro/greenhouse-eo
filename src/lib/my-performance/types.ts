import type { MemberNexaInsightsPayload } from '@/lib/ico-engine/ai/llm-types'

/**
 * Self-service performance DTO types — TASK-1027.
 *
 * Lives separate from `dto.ts` (which is `server-only`) so the client view
 * `MyPerformanceView` can `import type` these without pulling a server-only
 * module into the client bundle (TASK-827 bug class).
 */

export type MyPerformancePeriodStatus =
  | 'current_partial'
  | 'closed_snapshot'
  | 'no_data'
  | 'degraded'

export type MyPerformanceDegradedSource = 'ico' | 'trend' | 'operational' | 'nexa'

export interface MyPerformanceMetric {
  metricId: string
  value: number | null
  zone: string | null
}

export interface MyPerformanceCscEntry {
  phase: string
  label: string
  count: number
  pct: number
}

export interface MyPerformanceTrendPoint {
  periodYear: number
  periodMonth: number
  otdPct: number | null
  ftrPct: number | null
}

export interface MyPerformanceIco {
  hasData: boolean
  metrics: MyPerformanceMetric[]
  context: {
    totalTasks: number
    completedTasks: number
    activeTasks: number
    carryOverTasks: number
  }
  cscDistribution: MyPerformanceCscEntry[]
}

export interface MyPerformanceOperational {
  tasksCompleted: number
  tasksActive: number
  stuckAssetCount: number
}

export interface MyPerformanceResponse {
  subject: {
    memberId: string
  }
  period: {
    year: number
    month: number
    label: string
    isCurrentPeriod: boolean
    status: MyPerformancePeriodStatus
  }
  ico: MyPerformanceIco | null
  trend: MyPerformanceTrendPoint[]
  nexaInsights: MemberNexaInsightsPayload | null
  operational: MyPerformanceOperational | null
  meta: {
    materializedAt: string | null
    degradedSources: MyPerformanceDegradedSource[]
  }
}
