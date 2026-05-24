/**
 * GitHub Billing Usage — read-only cost observability contract.
 *
 * V1 consumes GitHub's official Billing Usage REST API and intentionally does
 * not persist rows. Missing credentials or empty usage degrade as operational
 * state, never as zero-cost healthy data.
 *
 * Spec: docs/tasks/in-progress/TASK-637-github-billing-actions-cost-observability.md
 */

export type GitHubBillingAvailability =
  | 'configured'
  | 'awaiting_data'
  | 'not_configured'
  | 'error'

export type GitHubBillingThresholdStatus =
  | 'ok'
  | 'warning'
  | 'critical'
  | 'unconfigured'

export interface GitHubBillingPeriod {
  year: number
  month: number
  day: number | null
  startDate: string
  endDate: string
  days: number
  daysInMonth: number
}

export interface GitHubBillingDailyCost {
  date: string
  grossAmount: number
  discountAmount: number
  netAmount: number
}

export interface GitHubBillingProductCost {
  product: string
  grossAmount: number
  discountAmount: number
  netAmount: number
  share: number
}

export interface GitHubBillingSkuCost {
  sku: string
  product: string
  unitType: string | null
  quantity: number
  grossAmount: number
  discountAmount: number
  netAmount: number
  share: number
}

export interface GitHubBillingRepositoryCost {
  repositoryName: string
  grossAmount: number
  discountAmount: number
  netAmount: number
  share: number
}

export interface GitHubBillingForecast {
  monthStartDate: string
  monthEndDate: string
  observedCompleteDays: number
  observedGrossAmount: number
  observedNetAmount: number
  averageDailyGrossAmount: number
  averageDailyNetAmount: number
  monthEndGrossAmount: number
  monthEndNetAmount: number
  method: 'current_month_daily_average' | 'unavailable'
  confidence: 'high' | 'medium' | 'low'
  thresholdStatus: GitHubBillingThresholdStatus
  note: string
}

export interface GitHubBillingGuardrails {
  monthlyWarnUsd: number | null
  monthlyCriticalUsd: number | null
  dailySpikePct: number | null
  spikeDetected: boolean
  spikeSeverity: Exclude<GitHubBillingThresholdStatus, 'unconfigured'> | 'unconfigured'
  spikeSummary: string | null
  baselineDailyGrossAmount: number | null
  maxDayGrossAmount: number | null
}

export interface GitHubBillingActionsOverview {
  grossAmount: number
  discountAmount: number
  netAmount: number
  minutes: number | null
  storageGigabyteHours: number | null
  topSku: string | null
  topRepository: string | null
}

export interface GitHubBillingOverview {
  availability: GitHubBillingAvailability
  generatedAt: string
  period: GitHubBillingPeriod
  totalGrossAmount: number
  totalDiscountAmount: number
  totalNetAmount: number
  currency: string
  daily: GitHubBillingDailyCost[]
  byProduct: GitHubBillingProductCost[]
  bySku: GitHubBillingSkuCost[]
  byRepository: GitHubBillingRepositoryCost[]
  actions: GitHubBillingActionsOverview
  forecast: GitHubBillingForecast | null
  guardrails: GitHubBillingGuardrails
  source: {
    provider: 'github'
    org: string | null
    endpoint: '/organizations/{org}/settings/billing/usage'
    summaryEndpoint: '/organizations/{org}/settings/billing/usage/summary'
    apiVersion: '2026-03-10'
    tokenSource: 'secret_manager' | 'env' | 'unconfigured'
    latestUsageDate: string | null
  }
  notes: string[]
  error: string | null
}
