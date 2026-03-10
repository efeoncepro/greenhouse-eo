export type GreenhouseKpiTone = 'success' | 'warning' | 'info' | 'error'

export interface GreenhouseDashboardKpi {
  label: string
  value: string
  detail: string
  tone: GreenhouseKpiTone
}

export interface GreenhouseDashboardStatusRow {
  label: string
  value: number
  color: string
}

export interface GreenhouseDashboardProject {
  id: string
  name: string
  activeTasks: number
  avgRpa: number
  progress: number
  pageUrl: string | null
}

export interface GreenhouseDashboardScope {
  clientId: string
  projectCount: number
  projectIds: string[]
  lastSyncedAt: string | null
}

export interface GreenhouseDashboardData {
  kpis: GreenhouseDashboardKpi[]
  statusRows: GreenhouseDashboardStatusRow[]
  projects: GreenhouseDashboardProject[]
  summary: {
    completionRate: number
  }
  scope: GreenhouseDashboardScope
}
