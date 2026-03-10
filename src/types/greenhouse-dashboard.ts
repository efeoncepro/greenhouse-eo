export type GreenhouseKpiTone = 'success' | 'warning' | 'info' | 'error'

export interface GreenhouseDashboardKpi {
  label: string
  value: string
  detail: string
  tone: GreenhouseKpiTone
}

export interface GreenhouseDashboardScope {
  clientId: string
  projectCount: number
  projectIds: string[]
  businessLines: string[]
  serviceModules: string[]
  lastSyncedAt: string | null
}

export interface GreenhouseDashboardSummary {
  avgOnTimePct: number
  activeWorkItems: number
  blockedTasks: number
  clientChangeTasks: number
  completedLast30Days: number
  completedTasks: number
  completionRate: number
  createdLast30Days: number
  healthyProjects: number
  netFlowLast30Days: number
  openFrameComments: number
  projectsAtRisk: number
  queuedWorkItems: number
  reviewPressureTasks: number
  totalTasks: number
}

export interface GreenhouseDashboardThroughputPoint {
  month: string
  label: string
  created: number
  completed: number
}

export interface GreenhouseDashboardMixItem {
  key: string
  label: string
  value: number
}

export interface GreenhouseDashboardProjectRisk {
  id: string
  name: string
  status: string
  onTimePct: number | null
  activeWorkItems: number
  blockedTasks: number
  reviewPressureTasks: number
  queuedWorkItems: number
  openFrameComments: number
  attentionScore: number
  pageUrl: string | null
}

export interface GreenhouseDashboardData {
  kpis: GreenhouseDashboardKpi[]
  scope: GreenhouseDashboardScope
  summary: GreenhouseDashboardSummary
  charts: {
    throughput: GreenhouseDashboardThroughputPoint[]
    statusMix: GreenhouseDashboardMixItem[]
    effortMix: GreenhouseDashboardMixItem[]
  }
  projects: GreenhouseDashboardProjectRisk[]
}
