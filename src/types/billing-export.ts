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
}

export interface GcpDailyCost {
  date: string
  totalCost: number
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
    latestUsageDate: string | null
  }
  notes: string[]
  error: string | null
}
