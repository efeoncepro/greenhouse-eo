/**
 * Vercel Billing FOCUS — read-only cost observability contract.
 *
 * V1 consumes Vercel's official `/v1/billing/charges` JSONL endpoint and
 * intentionally does not persist rows. Missing credentials or empty exports
 * degrade as operational state, never as zero-cost healthy data.
 *
 * Spec: docs/tasks/in-progress/TASK-636-vercel-billing-focus-observability.md
 */

export type VercelBillingAvailability =
  | 'configured'
  | 'awaiting_data'
  | 'not_configured'
  | 'error'

export type VercelBillingThresholdStatus =
  | 'ok'
  | 'warning'
  | 'critical'
  | 'unconfigured'

export interface VercelBillingPeriod {
  startDate: string
  endDate: string
  days: number
}

export interface VercelBillingDailyCost {
  date: string
  billedCost: number
  effectiveCost: number
}

export interface VercelBillingServiceCost {
  serviceName: string
  serviceCategory: string | null
  billedCost: number
  effectiveCost: number
  share: number
}

export interface VercelBillingProjectCost {
  projectId: string | null
  projectName: string
  billedCost: number
  effectiveCost: number
  share: number
}

export interface VercelBillingCategoryCost {
  chargeCategory: string
  billedCost: number
  effectiveCost: number
  share: number
}

export interface VercelBillingForecast {
  monthStartDate: string
  monthEndDate: string
  observedCompleteDays: number
  observedBilledCost: number
  observedEffectiveCost: number
  averageDailyBilledCost: number
  averageDailyEffectiveCost: number
  monthEndBilledCost: number
  monthEndEffectiveCost: number
  method: 'current_month_daily_average' | 'rolling_period_average' | 'unavailable'
  confidence: 'high' | 'medium' | 'low'
  thresholdStatus: VercelBillingThresholdStatus
  note: string
}

export interface VercelBillingGuardrails {
  monthlyWarnUsd: number | null
  monthlyCriticalUsd: number | null
  dailySpikePct: number | null
  spikeDetected: boolean
  spikeSeverity: Exclude<VercelBillingThresholdStatus, 'unconfigured'> | 'unconfigured'
  spikeSummary: string | null
  baselineDailyBilledCost: number | null
  maxDayCost: number | null
}

export interface VercelBillingOverview {
  availability: VercelBillingAvailability
  generatedAt: string
  period: VercelBillingPeriod
  totalBilledCost: number
  totalEffectiveCost: number
  currency: string
  costByDay: VercelBillingDailyCost[]
  costByService: VercelBillingServiceCost[]
  costByProject: VercelBillingProjectCost[]
  costByCategory: VercelBillingCategoryCost[]
  forecast: VercelBillingForecast | null
  guardrails: VercelBillingGuardrails
  source: {
    endpoint: string
    focusVersion: '1.3'
    teamId: string | null
    teamSlug: string | null
    tokenSource: 'secret_manager' | 'env' | 'unconfigured'
    latestChargeDate: string | null
  }
  notes: string[]
  error: string | null
}
