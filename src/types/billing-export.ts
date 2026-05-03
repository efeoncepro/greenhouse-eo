/**
 * GCP Billing Export — canonical types for Greenhouse observability
 *
 * Read-only surface over the BigQuery dataset `billing_export` populated
 * by Google Cloud Billing. The reader is graceful: when tables are not
 * yet materialized (latency natural ~24h post enable), we report
 * `availability='awaiting_data'` and the UI degrades honestly.
 *
 * Spec: docs/architecture/GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md
 */

export type BillingExportAvailability =
  | 'configured'
  | 'awaiting_data'
  | 'not_configured'
  | 'error'

export interface BillingExportPeriod {
  startDate: string
  endDate: string
  days: number
}

export interface GcpServiceCost {
  serviceId: string
  serviceDescription: string
  cost: number
  share?: number
  baselineDailyCost?: number
  recentDailyCost?: number
  deltaPercent?: number | null
  topResources?: GcpResourceCost[]
}

export interface GcpDailyCost {
  date: string
  totalCost: number
}

export interface GcpResourceCost {
  serviceDescription: string
  skuDescription: string
  projectId: string | null
  resourceName: string
  cost: number
  share: number
  firstUsageDate: string | null
  lastUsageDate: string | null
}

export type GcpCostDriverKind =
  | 'service_spike'
  | 'share_of_total'
  | 'forecast_risk'
  | 'resource_driver'

export type GcpCostDriverSeverity = 'ok' | 'warning' | 'error'

export interface GcpCostDriver {
  driverId: string
  kind: GcpCostDriverKind
  severity: GcpCostDriverSeverity
  serviceDescription: string
  resourceName: string | null
  summary: string
  currentCost: number
  baselineCost: number | null
  deltaPercent: number | null
  share: number
  threshold: string
  evidence: Array<{ label: string; value: string }>
}

export interface GcpBillingForecast {
  monthStartDate: string
  monthEndDate: string
  observedCompleteDays: number
  observedCost: number
  averageDailyCost: number
  monthEndCost: number
  method: 'current_month_daily_average' | 'rolling_period_average' | 'unavailable'
  confidence: 'high' | 'medium' | 'low'
  note: string
}

export interface GcpBillingAiCopilotSnapshot {
  severity: 'ok' | 'warning' | 'error' | 'skipped'
  executiveSummary: string
  recommendedActions: unknown[]
  attackPriority: unknown[]
  confidence: 'high' | 'medium' | 'low' | 'unknown'
  observedAt: string
  model: string
}

export interface GcpServiceSpotlight {
  serviceDescription: string
  cost: number
  share: number
}

export interface GcpBillingOverview {
  availability: BillingExportAvailability
  generatedAt: string
  period: BillingExportPeriod
  totalCost: number
  currency: string
  costByDay: GcpDailyCost[]
  costByService: GcpServiceCost[]
  costByResource?: GcpResourceCost[]
  topDrivers?: GcpCostDriver[]
  forecast?: GcpBillingForecast | null
  aiCopilot?: GcpBillingAiCopilotSnapshot | null
  spotlights: {
    cloudRun: GcpServiceSpotlight | null
    bigQuery: GcpServiceSpotlight | null
    cloudSql: GcpServiceSpotlight | null
    notionBqSync: {
      cost: number
      share: number
      detected: boolean
      detectionStrategy: 'service_description' | 'label_cloud_run_service' | 'unavailable'
    } | null
  }
  source: {
    dataset: string
    table: string | null
    resourceTable?: string | null
    latestUsageDate: string | null
  }
  notes: string[]
  error: string | null
}
