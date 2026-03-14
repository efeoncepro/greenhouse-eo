import type { GreenhouseKpiTone } from '@/types/greenhouse-dashboard'

export type CapabilityModuleTheme = 'creative' | 'crm' | 'onboarding' | 'web'
export type CapabilityModuleCardType =
  | 'metric'
  | 'project-list'
  | 'tooling-list'
  | 'quality-list'
  | 'metric-list'
  | 'chart-bar'
  | 'section-header'
  | 'pipeline'
  | 'metrics-row'
  | 'alert-list'
export type CapabilityModuleCardSize = 'sm' | 'md' | 'lg' | 'full'

export interface CapabilityDataSourceRef {
  dataset: string
  table: string
  requiredColumns: string[]
}

export interface CapabilityModuleCard {
  id: string
  title: string
  type: CapabilityModuleCardType
  size: CapabilityModuleCardSize
  description: string
}

export interface CapabilityModuleDefinition {
  id: string
  label: string
  description: string
  icon: string
  route: string
  priority: number
  theme: CapabilityModuleTheme
  requiredBusinessLines?: string[]
  requiredServiceModules?: string[]
  dataSources: CapabilityDataSourceRef[]
  cards: CapabilityModuleCard[]
}

export interface ResolvedCapabilityModule extends CapabilityModuleDefinition {
  matchedBusinessLines: string[]
  matchedServiceModules: string[]
}

export interface CapabilityHeroSummary {
  eyebrow: string
  title: string
  description: string
  summaryLabel: string
  summaryValue: string
  summaryDetail: string
  highlights: Array<{
    label: string
    value: string
  }>
  badges: string[]
}

export interface CapabilityMetric {
  id: string
  chipLabel: string
  chipTone: GreenhouseKpiTone
  title: string
  value: string
  detail: string
}

export interface CapabilityProjectItem {
  id: string
  name: string
  status: string
  detail: string
  href: string
}

export interface CapabilityToolItem {
  key: string
  label: string
  category: string
  description: string
  href: string | null
}

export interface CapabilityQualityItem {
  month: string
  avgRpa: string
  firstTimeRight: string
}

export interface CapabilityMetricListItem {
  label: string
  value: string
  detail: string
}

export interface CapabilityBarChartSeries {
  name: string
  data: number[]
}

export interface CapabilityBarChartData {
  categories: string[]
  series: CapabilityBarChartSeries[]
  summaryLabel: string
  summaryValue: string
  summaryDetail: string
  totalLabel: string
  totalValue: string
}

export interface CapabilityPipelinePhase {
  id: string
  label: string
  color: string
  count: number
}

export interface CapabilityMetricsRowItem {
  id: string
  label: string
  value: string | null
  description: string
  tone: 'success' | 'warning' | 'error' | 'info'
}

export interface CapabilityAlertItem {
  id: string
  name: string
  project: string
  phase: string
  daysStuck: number
  severity: 'warning' | 'danger'
  frameUrl?: string | null
}

export type CapabilityCardData =
  | { type: 'metric'; metrics: CapabilityMetric[] }
  | { type: 'project-list'; items: CapabilityProjectItem[] }
  | { type: 'tooling-list'; items: CapabilityToolItem[] }
  | { type: 'quality-list'; items: CapabilityQualityItem[] }
  | { type: 'metric-list'; items: CapabilityMetricListItem[] }
  | { type: 'chart-bar'; chart: CapabilityBarChartData }
  | { type: 'section-header'; subtitle: string; icon: string }
  | { type: 'pipeline'; phases: CapabilityPipelinePhase[]; total: number }
  | { type: 'metrics-row'; items: CapabilityMetricsRowItem[] }
  | { type: 'alert-list'; items: CapabilityAlertItem[]; emptyMessage: string }

export interface CapabilityModuleData {
  module: ResolvedCapabilityModule
  hero: CapabilityHeroSummary
  metrics: CapabilityMetric[]
  projects: CapabilityProjectItem[]
  tools: CapabilityToolItem[]
  quality: CapabilityQualityItem[]
  cardData: Record<string, CapabilityCardData>
  scope: {
    projectCount: number
    businessLines: string[]
    serviceModules: string[]
    lastActivityAt: string | null
    lastSyncedAt: string | null
  }
}

export interface CapabilityViewerContext {
  clientId: string
  clientName: string
  projectIds: string[]
  businessLines: string[]
  serviceModules: string[]
}
