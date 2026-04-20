import 'server-only'

import { query } from '@/lib/db'

import type { PipelineSnapshotRow, PipelineStage } from './contracts'
import { PIPELINE_STAGE_PROBABILITY, RENEWAL_LOOKAHEAD_DAYS } from './contracts'

interface QuotationRow extends Record<string, unknown> {
  quotation_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  status: string
  legacy_status: string | null
  total_price: string | number | null
  total_amount_clp: string | number | null
  currency: string | null
  effective_margin_pct: string | number | null
  target_margin_pct: string | number | null
  business_line_code: string | null
  pricing_model: string | null
  commercial_model: string | null
  staffing_model: string | null
  quote_date: string | Date | null
  issued_at: string | Date | null
  sent_at: string | Date | null
  approved_at: string | Date | null
  converted_at: string | Date | null
  expired_at: string | Date | null
  expiry_date: string | Date | null
  updated_at: string | Date | null
}

interface AuthorizedRow extends Record<string, unknown> {
  authorized_clp: string | number | null
}

interface InvoicedRow extends Record<string, unknown> {
  invoiced_clp: string | number | null
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

const toIsoTimestamp = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const deriveStage = (status: string): PipelineStage => {
  switch (status) {
    case 'draft':
      return 'draft'
    case 'pending_approval':
    case 'in_review':
      return 'in_review'
    case 'issued':
    case 'sent':
      return 'sent'
    case 'approval_rejected':
    case 'approved':
    case 'accepted':
      return status === 'approval_rejected' ? 'rejected' : 'approved'
    case 'converted':
      return 'converted'
    case 'rejected':
      return 'rejected'
    case 'expired':
      return 'expired'
    default:
      return 'draft'
  }
}

const daysBetween = (fromIso: string | null, toIso: string | null): number | null => {
  if (!fromIso || !toIso) return null

  const from = new Date(fromIso)
  const to = new Date(toIso)

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null

  const msPerDay = 24 * 60 * 60 * 1000

  return Math.round((to.getTime() - from.getTime()) / msPerDay)
}

const stageEnteredAt = (row: QuotationRow): string | null => {
  const stage = deriveStage(row.status)

  switch (stage) {
    case 'converted':
      return toIsoTimestamp(row.converted_at) ?? toIsoTimestamp(row.approved_at) ?? toIsoTimestamp(row.issued_at) ?? toIsoTimestamp(row.sent_at) ?? toIsoDate(row.quote_date)
    case 'approved':
      return toIsoTimestamp(row.approved_at) ?? toIsoTimestamp(row.issued_at) ?? toIsoTimestamp(row.sent_at) ?? toIsoDate(row.quote_date)
    case 'sent':
      return toIsoTimestamp(row.issued_at) ?? toIsoTimestamp(row.sent_at) ?? toIsoDate(row.quote_date)
    case 'rejected':
      return toIsoTimestamp(row.updated_at) ?? toIsoTimestamp(row.issued_at) ?? toIsoTimestamp(row.sent_at) ?? toIsoDate(row.quote_date)
    case 'expired':
      return toIsoTimestamp(row.expired_at) ?? toIsoDate(row.expiry_date) ?? toIsoDate(row.quote_date)
    default:
      return toIsoDate(row.quote_date)
  }
}

/**
 * Computes a pipeline snapshot row for a single quotation.
 *
 * Idempotent: reads the canonical quote + aggregated authorized/invoiced totals
 * from the quote-to-cash bridge tables and produces a serving row ready to be
 * upserted into `greenhouse_serving.quotation_pipeline_snapshots`.
 */
export const buildPipelineSnapshot = async ({
  quotationId,
  sourceEvent
}: {
  quotationId: string
  sourceEvent?: string | null
}): Promise<PipelineSnapshotRow | null> => {
  const rows = await query<QuotationRow>(
    `SELECT quotation_id, client_id, organization_id, space_id,
            status, legacy_status, total_price, total_amount_clp, currency,
            effective_margin_pct, target_margin_pct, business_line_code, pricing_model,
            commercial_model, staffing_model,
            quote_date, issued_at, sent_at, approved_at, converted_at, expired_at, expiry_date,
            updated_at
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1
       LIMIT 1`,
    [quotationId]
  )

  const quote = rows[0]

  if (!quote) return null

  const authorizedRows = await query<AuthorizedRow>(
    `SELECT COALESCE(SUM(authorized_amount_clp), 0) AS authorized_clp
       FROM greenhouse_finance.purchase_orders
       WHERE quotation_id = $1`,
    [quotationId]
  )

  const invoicedRows = await query<InvoicedRow>(
    `SELECT COALESCE(SUM(total_amount_clp), 0) AS invoiced_clp
       FROM greenhouse_finance.income
       WHERE quotation_id = $1`,
    [quotationId]
  )

  const stage = deriveStage(quote.status)
  const probability = PIPELINE_STAGE_PROBABILITY[stage]
  const nowIso = new Date().toISOString()
  const stageSince = stageEnteredAt(quote)
  const daysInStage = daysBetween(stageSince, nowIso)
  const expiryIso = toIsoDate(quote.expiry_date)
  const daysUntilExpiry = daysBetween(new Date().toISOString().slice(0, 10), expiryIso)

  const isExpired = stage === 'expired' || (daysUntilExpiry !== null && daysUntilExpiry < 0 && stage !== 'converted' && stage !== 'rejected')

  const isRenewalDue = !isExpired &&
    stage !== 'converted' &&
    stage !== 'rejected' &&
    daysUntilExpiry !== null &&
    daysUntilExpiry >= 0 &&
    daysUntilExpiry <= RENEWAL_LOOKAHEAD_DAYS

  const totalAmountClp = toNum(quote.total_amount_clp) ?? toNum(quote.total_price)

  return {
    quotationId: String(quote.quotation_id),
    clientId: quote.client_id ? String(quote.client_id) : null,
    organizationId: quote.organization_id ? String(quote.organization_id) : null,
    spaceId: quote.space_id ? String(quote.space_id) : null,

    status: String(quote.status),
    pipelineStage: stage,
    probabilityPct: probability,

    totalAmountClp,
    quotedMarginPct: toNum(quote.effective_margin_pct),
    businessLineCode: quote.business_line_code ? String(quote.business_line_code) : null,
    pricingModel: quote.pricing_model ? String(quote.pricing_model) : null,
    commercialModel: quote.commercial_model ? String(quote.commercial_model) : null,
    staffingModel: quote.staffing_model ? String(quote.staffing_model) : null,
    currency: quote.currency ? String(quote.currency) : null,

    quoteDate: toIsoDate(quote.quote_date),
    sentAt: toIsoTimestamp(quote.issued_at) ?? toIsoTimestamp(quote.sent_at),
    approvedAt: toIsoTimestamp(quote.approved_at),
    expiryDate: expiryIso,
    convertedAt: toIsoTimestamp(quote.converted_at),
    rejectedAt: stage === 'rejected' ? toIsoTimestamp(quote.updated_at) : null,
    expiredAt: toIsoTimestamp(quote.expired_at),

    daysInStage,
    daysUntilExpiry,
    isRenewalDue,
    isExpired,

    authorizedAmountClp: toNum(authorizedRows[0]?.authorized_clp),
    invoicedAmountClp: toNum(invoicedRows[0]?.invoiced_clp),

    snapshotSourceEvent: sourceEvent ?? null,
    materializedAt: nowIso
  }
}

/**
 * Upserts a pipeline snapshot row.
 *
 * Uses `INSERT ... ON CONFLICT (quotation_id) DO UPDATE` so the operation is
 * idempotent under concurrent materializations.
 */
export const upsertPipelineSnapshot = async (row: PipelineSnapshotRow): Promise<void> => {
  await query(
    `INSERT INTO greenhouse_serving.quotation_pipeline_snapshots (
       quotation_id, client_id, organization_id, space_id,
       status, pipeline_stage, probability_pct,
       total_amount_clp, quoted_margin_pct, business_line_code, pricing_model, commercial_model, staffing_model, currency,
       quote_date, sent_at, approved_at, expiry_date, converted_at, rejected_at, expired_at,
       days_in_stage, days_until_expiry, is_renewal_due, is_expired,
       authorized_amount_clp, invoiced_amount_clp,
       snapshot_source_event, materialized_at
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7,
       $8, $9, $10, $11, $12, $13, $14,
       $15::date, $16::timestamptz, $17::timestamptz, $18::date, $19::timestamptz, $20::timestamptz, $21::timestamptz,
       $22, $23, $24, $25,
       $26, $27,
       $28, $29::timestamptz
     )
     ON CONFLICT (quotation_id) DO UPDATE SET
       client_id = EXCLUDED.client_id,
       organization_id = EXCLUDED.organization_id,
       space_id = EXCLUDED.space_id,
       status = EXCLUDED.status,
       pipeline_stage = EXCLUDED.pipeline_stage,
       probability_pct = EXCLUDED.probability_pct,
       total_amount_clp = EXCLUDED.total_amount_clp,
       quoted_margin_pct = EXCLUDED.quoted_margin_pct,
       business_line_code = EXCLUDED.business_line_code,
       pricing_model = EXCLUDED.pricing_model,
       commercial_model = EXCLUDED.commercial_model,
       staffing_model = EXCLUDED.staffing_model,
       currency = EXCLUDED.currency,
       quote_date = EXCLUDED.quote_date,
       sent_at = EXCLUDED.sent_at,
       approved_at = EXCLUDED.approved_at,
       expiry_date = EXCLUDED.expiry_date,
       converted_at = EXCLUDED.converted_at,
       rejected_at = EXCLUDED.rejected_at,
       expired_at = EXCLUDED.expired_at,
       days_in_stage = EXCLUDED.days_in_stage,
       days_until_expiry = EXCLUDED.days_until_expiry,
       is_renewal_due = EXCLUDED.is_renewal_due,
       is_expired = EXCLUDED.is_expired,
       authorized_amount_clp = EXCLUDED.authorized_amount_clp,
       invoiced_amount_clp = EXCLUDED.invoiced_amount_clp,
       snapshot_source_event = EXCLUDED.snapshot_source_event,
       materialized_at = EXCLUDED.materialized_at`,
    [
      row.quotationId, row.clientId, row.organizationId, row.spaceId,
      row.status, row.pipelineStage, row.probabilityPct,
      row.totalAmountClp, row.quotedMarginPct, row.businessLineCode, row.pricingModel, row.commercialModel, row.staffingModel, row.currency,
      row.quoteDate, row.sentAt, row.approvedAt, row.expiryDate, row.convertedAt, row.rejectedAt, row.expiredAt,
      row.daysInStage, row.daysUntilExpiry, row.isRenewalDue, row.isExpired,
      row.authorizedAmountClp, row.invoicedAmountClp,
      row.snapshotSourceEvent, row.materializedAt
    ]
  )
}

export const materializePipelineSnapshot = async ({
  quotationId,
  sourceEvent
}: {
  quotationId: string
  sourceEvent?: string | null
}): Promise<PipelineSnapshotRow | null> => {
  const row = await buildPipelineSnapshot({ quotationId, sourceEvent })

  if (!row) return null

  await upsertPipelineSnapshot(row)

  return row
}
