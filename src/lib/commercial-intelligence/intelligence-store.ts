import 'server-only'

import { query } from '@/lib/db'

import type {
  DriftDrivers,
  DriftSeverity,
  PipelineSnapshotRow,
  PipelineStage,
  ProfitabilitySnapshotRow
} from './contracts'

interface PipelineDbRow extends Record<string, unknown> {
  quotation_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  status: string
  pipeline_stage: string
  probability_pct: string | number | null
  total_amount_clp: string | number | null
  quoted_margin_pct: string | number | null
  business_line_code: string | null
  pricing_model: string | null
  currency: string | null
  quote_date: string | Date | null
  sent_at: string | Date | null
  approved_at: string | Date | null
  expiry_date: string | Date | null
  converted_at: string | Date | null
  rejected_at: string | Date | null
  expired_at: string | Date | null
  days_in_stage: number | null
  days_until_expiry: number | null
  is_renewal_due: boolean | null
  is_expired: boolean | null
  authorized_amount_clp: string | number | null
  invoiced_amount_clp: string | number | null
  snapshot_source_event: string | null
  materialized_at: string | Date
}

interface ProfitabilityDbRow extends Record<string, unknown> {
  quotation_id: string
  period_year: number
  period_month: number
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  quoted_total_clp: string | number | null
  quoted_margin_pct: string | number | null
  authorized_total_clp: string | number | null
  invoiced_total_clp: string | number | null
  realized_revenue_clp: string | number | null
  attributed_cost_clp: string | number | null
  effective_margin_pct: string | number | null
  margin_drift_pct: string | number | null
  drift_severity: string
  drift_drivers: unknown
  materialized_at: string | Date
}

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const toIsoTs = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const parseDrivers = (value: unknown): DriftDrivers => {
  if (!value) return {}

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as DriftDrivers
    } catch {
      return {}
    }
  }

  return value as DriftDrivers
}

const mapPipeline = (row: PipelineDbRow): PipelineSnapshotRow => ({
  quotationId: String(row.quotation_id),
  clientId: row.client_id ? String(row.client_id) : null,
  organizationId: row.organization_id ? String(row.organization_id) : null,
  spaceId: row.space_id ? String(row.space_id) : null,
  status: String(row.status),
  pipelineStage: String(row.pipeline_stage) as PipelineStage,
  probabilityPct: toNum(row.probability_pct) ?? 0,
  totalAmountClp: toNum(row.total_amount_clp),
  quotedMarginPct: toNum(row.quoted_margin_pct),
  businessLineCode: row.business_line_code ? String(row.business_line_code) : null,
  pricingModel: row.pricing_model ? String(row.pricing_model) : null,
  currency: row.currency ? String(row.currency) : null,
  quoteDate: toIsoDate(row.quote_date),
  sentAt: toIsoTs(row.sent_at),
  approvedAt: toIsoTs(row.approved_at),
  expiryDate: toIsoDate(row.expiry_date),
  convertedAt: toIsoTs(row.converted_at),
  rejectedAt: toIsoTs(row.rejected_at),
  expiredAt: toIsoTs(row.expired_at),
  daysInStage: row.days_in_stage ?? null,
  daysUntilExpiry: row.days_until_expiry ?? null,
  isRenewalDue: Boolean(row.is_renewal_due),
  isExpired: Boolean(row.is_expired),
  authorizedAmountClp: toNum(row.authorized_amount_clp),
  invoicedAmountClp: toNum(row.invoiced_amount_clp),
  snapshotSourceEvent: row.snapshot_source_event ? String(row.snapshot_source_event) : null,
  materializedAt: toIsoTs(row.materialized_at) ?? new Date().toISOString()
})

const mapProfitability = (row: ProfitabilityDbRow): ProfitabilitySnapshotRow => ({
  quotationId: String(row.quotation_id),
  periodYear: row.period_year,
  periodMonth: row.period_month,
  clientId: row.client_id ? String(row.client_id) : null,
  organizationId: row.organization_id ? String(row.organization_id) : null,
  spaceId: row.space_id ? String(row.space_id) : null,
  quotedTotalClp: toNum(row.quoted_total_clp),
  quotedMarginPct: toNum(row.quoted_margin_pct),
  authorizedTotalClp: toNum(row.authorized_total_clp),
  invoicedTotalClp: toNum(row.invoiced_total_clp),
  realizedRevenueClp: toNum(row.realized_revenue_clp),
  attributedCostClp: toNum(row.attributed_cost_clp),
  effectiveMarginPct: toNum(row.effective_margin_pct),
  marginDriftPct: toNum(row.margin_drift_pct),
  driftSeverity: String(row.drift_severity) as DriftSeverity,
  driftDrivers: parseDrivers(row.drift_drivers),
  materializedAt: toIsoTs(row.materialized_at) ?? new Date().toISOString()
})

export interface PipelineFilters {
  clientId?: string | null
  organizationId?: string | null
  spaceId?: string | null
  stage?: PipelineStage | null
  businessLineCode?: string | null
  renewalsDueOnly?: boolean
  expiredOnly?: boolean
}

/**
 * Lists pipeline snapshots filtered by tenant scope.
 *
 * At least one of `clientId`, `organizationId`, or `spaceId` should be provided
 * to keep queries tenant-bounded; admin callers pass no tenant filter and get
 * the full set.
 */
export const listPipelineSnapshots = async (
  filters: PipelineFilters = {}
): Promise<PipelineSnapshotRow[]> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (clause: string, value: unknown) => {
    idx++
    conditions.push(clause.replace('$$', `$${idx}`))
    values.push(value)
  }

  if (filters.clientId) push('client_id = $$', filters.clientId)
  if (filters.organizationId) push('organization_id = $$', filters.organizationId)
  if (filters.spaceId) push('space_id = $$', filters.spaceId)
  if (filters.stage) push('pipeline_stage = $$', filters.stage)
  if (filters.businessLineCode) push('business_line_code = $$', filters.businessLineCode)
  if (filters.renewalsDueOnly) conditions.push('is_renewal_due = TRUE')
  if (filters.expiredOnly) conditions.push('is_expired = TRUE')

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query<PipelineDbRow>(
    `SELECT quotation_id, client_id, organization_id, space_id,
            status, pipeline_stage, probability_pct,
            total_amount_clp, quoted_margin_pct, business_line_code, pricing_model, currency,
            quote_date, sent_at, approved_at, expiry_date, converted_at, rejected_at, expired_at,
            days_in_stage, days_until_expiry, is_renewal_due, is_expired,
            authorized_amount_clp, invoiced_amount_clp,
            snapshot_source_event, materialized_at
       FROM greenhouse_serving.quotation_pipeline_snapshots
       ${where}
       ORDER BY CASE pipeline_stage
         WHEN 'approved' THEN 1
         WHEN 'sent' THEN 2
         WHEN 'in_review' THEN 3
         WHEN 'draft' THEN 4
         WHEN 'converted' THEN 5
         WHEN 'rejected' THEN 6
         WHEN 'expired' THEN 7
         ELSE 8
       END, expiry_date ASC NULLS LAST`,
    values
  )

  return rows.map(mapPipeline)
}

export interface PipelineTotals {
  openPipelineClp: number
  weightedPipelineClp: number
  wonClp: number
  lostClp: number
  byStage: Record<PipelineStage, { count: number; totalClp: number; weightedClp: number }>
}

const emptyTotals = (): PipelineTotals => ({
  openPipelineClp: 0,
  weightedPipelineClp: 0,
  wonClp: 0,
  lostClp: 0,
  byStage: {
    draft: { count: 0, totalClp: 0, weightedClp: 0 },
    in_review: { count: 0, totalClp: 0, weightedClp: 0 },
    sent: { count: 0, totalClp: 0, weightedClp: 0 },
    approved: { count: 0, totalClp: 0, weightedClp: 0 },
    converted: { count: 0, totalClp: 0, weightedClp: 0 },
    rejected: { count: 0, totalClp: 0, weightedClp: 0 },
    expired: { count: 0, totalClp: 0, weightedClp: 0 }
  }
})

export const buildPipelineTotals = (rows: PipelineSnapshotRow[]): PipelineTotals => {
  const totals = emptyTotals()
  const openStages: PipelineStage[] = ['draft', 'in_review', 'sent', 'approved']

  for (const row of rows) {
    const amount = row.totalAmountClp ?? 0
    const stageBucket = totals.byStage[row.pipelineStage]

    stageBucket.count++
    stageBucket.totalClp = Math.round((stageBucket.totalClp + amount) * 100) / 100
    stageBucket.weightedClp =
      Math.round((stageBucket.weightedClp + amount * (row.probabilityPct / 100)) * 100) / 100

    if (openStages.includes(row.pipelineStage)) {
      totals.openPipelineClp += amount
      totals.weightedPipelineClp += amount * (row.probabilityPct / 100)
    } else if (row.pipelineStage === 'converted') {
      totals.wonClp += amount
    } else if (row.pipelineStage === 'rejected' || row.pipelineStage === 'expired') {
      totals.lostClp += amount
    }
  }

  totals.openPipelineClp = Math.round(totals.openPipelineClp * 100) / 100
  totals.weightedPipelineClp = Math.round(totals.weightedPipelineClp * 100) / 100
  totals.wonClp = Math.round(totals.wonClp * 100) / 100
  totals.lostClp = Math.round(totals.lostClp * 100) / 100

  return totals
}

export interface ProfitabilityFilters {
  clientId?: string | null
  organizationId?: string | null
  spaceId?: string | null
  periodYear?: number | null
  periodMonth?: number | null
  quotationId?: string | null
  driftSeverity?: DriftSeverity | null
}

export const listProfitabilitySnapshots = async (
  filters: ProfitabilityFilters = {}
): Promise<ProfitabilitySnapshotRow[]> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (clause: string, value: unknown) => {
    idx++
    conditions.push(clause.replace('$$', `$${idx}`))
    values.push(value)
  }

  if (filters.quotationId) push('quotation_id = $$', filters.quotationId)
  if (filters.clientId) push('client_id = $$', filters.clientId)
  if (filters.organizationId) push('organization_id = $$', filters.organizationId)
  if (filters.spaceId) push('space_id = $$', filters.spaceId)
  if (filters.periodYear !== null && filters.periodYear !== undefined) push('period_year = $$', filters.periodYear)
  if (filters.periodMonth !== null && filters.periodMonth !== undefined) push('period_month = $$', filters.periodMonth)
  if (filters.driftSeverity) push('drift_severity = $$', filters.driftSeverity)

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query<ProfitabilityDbRow>(
    `SELECT quotation_id, period_year, period_month,
            client_id, organization_id, space_id,
            quoted_total_clp, quoted_margin_pct,
            authorized_total_clp, invoiced_total_clp,
            realized_revenue_clp, attributed_cost_clp,
            effective_margin_pct, margin_drift_pct, drift_severity, drift_drivers,
            materialized_at
       FROM greenhouse_serving.quotation_profitability_snapshots
       ${where}
       ORDER BY period_year DESC, period_month DESC, quotation_id ASC`,
    values
  )

  return rows.map(mapProfitability)
}
