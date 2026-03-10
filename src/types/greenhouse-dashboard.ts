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

export interface GreenhouseDashboardMonthlyDeliveryPoint {
  month: string
  label: string
  totalDeliverables: number
  onTimePct: number | null
  withoutClientAdjustments: number
  withClientAdjustments: number
  totalClientAdjustmentRounds: number
}

export interface GreenhouseDashboardMixItem {
  key: string
  label: string
  value: number
}

export interface GreenhouseDashboardRelationship {
  startedAt: string | null
  months: number
  days: number
  label: string
}

export interface GreenhouseDashboardTeamMember {
  id: string
  name: string
  role: string
  allocationPct: number | null
  monthlyHours: number | null
  source: 'derived' | 'override'
}

export interface GreenhouseDashboardAccountTeam {
  members: GreenhouseDashboardTeamMember[]
  totalMonthlyHours: number
  averageAllocationPct: number | null
}

export interface GreenhouseDashboardTool {
  key: string
  label: string
  category: string
  source: 'service_module_default' | 'override'
}

export interface GreenhouseDashboardTooling {
  technologyTools: GreenhouseDashboardTool[]
  aiTools: GreenhouseDashboardTool[]
}

export interface GreenhouseDashboardQualityPoint {
  month: string
  label: string
  avgRpa: number | null
  firstTimeRightPct: number | null
  rpaSource: 'measured' | 'seeded' | 'unavailable'
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
  relationship: GreenhouseDashboardRelationship
  accountTeam: GreenhouseDashboardAccountTeam
  tooling: GreenhouseDashboardTooling
  qualitySignals: GreenhouseDashboardQualityPoint[]
  charts: {
    throughput: GreenhouseDashboardThroughputPoint[]
    monthlyDelivery: GreenhouseDashboardMonthlyDeliveryPoint[]
    statusMix: GreenhouseDashboardMixItem[]
    effortMix: GreenhouseDashboardMixItem[]
  }
  projects: GreenhouseDashboardProjectRisk[]
}
