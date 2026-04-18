import 'server-only'

import { query } from '@/lib/db'

import type { DriftDrivers, DriftSeverity, ProfitabilitySnapshotRow } from './contracts'
import {
  DRIFT_CRITICAL_THRESHOLD_PCT,
  DRIFT_WARNING_THRESHOLD_PCT
} from './contracts'

interface QuoteRow extends Record<string, unknown> {
  quotation_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  total_price: string | number | null
  total_amount_clp: string | number | null
  effective_margin_pct: string | number | null
  target_margin_pct: string | number | null
  approved_at: string | Date | null
  converted_at: string | Date | null
  quote_date: string | Date | null
}

interface AggRow extends Record<string, unknown> {
  authorized_clp: string | number | null
  invoiced_clp: string | number | null
}

interface IncomePeriodRow extends Record<string, unknown> {
  period_year: number | null
  period_month: number | null
  invoice_date: string | Date | null
  total_amount_clp: string | number | null
}

interface CostAttributionRow extends Record<string, unknown> {
  labor_cost_clp: string | number | null
  direct_overhead_clp: string | number | null
  shared_overhead_clp: string | number | null
  loaded_cost_clp: string | number | null
  client_headcount_fte: string | number | null
  client_loaded_cost_clp: string | number | null
  revenue_clp: string | number | null
}

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const round2 = (value: number | null): number | null =>
  value === null ? null : Math.round(value * 100) / 100

const round4 = (value: number | null): number | null =>
  value === null ? null : Math.round(value * 10_000) / 10_000

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const classifyDrift = (driftPct: number | null): DriftSeverity => {
  if (driftPct === null) return 'aligned'

  const abs = Math.abs(driftPct)

  if (abs >= DRIFT_CRITICAL_THRESHOLD_PCT) return 'critical'
  if (abs >= DRIFT_WARNING_THRESHOLD_PCT) return 'warning'

  return 'aligned'
}

interface QuoteContext {
  quotationId: string
  clientId: string | null
  organizationId: string | null
  spaceId: string | null
  quotedTotalClp: number | null
  quotedMarginPct: number | null
  authorizedTotalClp: number | null
  invoicedTotalClp: number | null
  earliestActivityDate: string | null
}

const loadQuoteContext = async (quotationId: string): Promise<QuoteContext | null> => {
  const rows = await query<QuoteRow>(
    `SELECT quotation_id, client_id, organization_id, space_id,
            total_price, total_amount_clp, effective_margin_pct, target_margin_pct,
            approved_at, converted_at, quote_date
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1
       LIMIT 1`,
    [quotationId]
  )

  const quote = rows[0]

  if (!quote) return null

  const aggregates = await query<AggRow>(
    `SELECT
        COALESCE((SELECT SUM(authorized_amount_clp) FROM greenhouse_finance.purchase_orders WHERE quotation_id = $1), 0) AS authorized_clp,
        COALESCE((SELECT SUM(total_amount_clp) FROM greenhouse_finance.income WHERE quotation_id = $1), 0) AS invoiced_clp`,
    [quotationId]
  )

  return {
    quotationId: String(quote.quotation_id),
    clientId: quote.client_id ? String(quote.client_id) : null,
    organizationId: quote.organization_id ? String(quote.organization_id) : null,
    spaceId: quote.space_id ? String(quote.space_id) : null,
    quotedTotalClp: toNum(quote.total_amount_clp) ?? toNum(quote.total_price),
    quotedMarginPct: toNum(quote.effective_margin_pct) ?? toNum(quote.target_margin_pct),
    authorizedTotalClp: toNum(aggregates[0]?.authorized_clp),
    invoicedTotalClp: toNum(aggregates[0]?.invoiced_clp),
    earliestActivityDate:
      toIsoDate(quote.approved_at) ??
      toIsoDate(quote.converted_at) ??
      toIsoDate(quote.quote_date)
  }
}

const listPeriodsWithIncome = async (quotationId: string): Promise<Array<{ year: number; month: number; revenueClp: number }>> => {
  const rows = await query<IncomePeriodRow>(
    `SELECT period_year, period_month, invoice_date, total_amount_clp
       FROM greenhouse_finance.income
       WHERE quotation_id = $1`,
    [quotationId]
  )

  const grouped = new Map<string, number>()

  for (const row of rows) {
    let year: number | null = row.period_year
    let month: number | null = row.period_month

    if ((year === null || month === null) && row.invoice_date) {
      const iso = toIsoDate(row.invoice_date)

      if (iso) {
        const parts = iso.split('-')

        year = Number(parts[0])
        month = Number(parts[1])
      }
    }

    if (!year || !month) continue

    const key = `${year}-${String(month).padStart(2, '0')}`
    const revenue = toNum(row.total_amount_clp) ?? 0

    grouped.set(key, (grouped.get(key) ?? 0) + revenue)
  }

  return Array.from(grouped.entries()).map(([key, revenue]) => {
    const [yearStr, monthStr] = key.split('-')

    return { year: Number(yearStr), month: Number(monthStr), revenueClp: round2(revenue) ?? 0 }
  })
}

const loadClientCostAttribution = async ({
  clientId,
  year,
  month
}: {
  clientId: string | null
  year: number
  month: number
}): Promise<{ loadedCostClp: number | null; revenueClp: number | null; clientLoadedCostClp: number | null }> => {
  if (!clientId) return { loadedCostClp: null, revenueClp: null, clientLoadedCostClp: null }

  // 1. Read labor + overhead attributed to this client for the period from the
  //    commercial cost attribution serving table (populated by TASK-162/379).
  const rows = await query<CostAttributionRow>(
    `SELECT COALESCE(SUM(commercial_labor_cost_target), 0) AS labor_cost_clp,
            COALESCE(SUM(commercial_direct_overhead_target), 0) AS direct_overhead_clp,
            COALESCE(SUM(commercial_shared_overhead_target), 0) AS shared_overhead_clp,
            COALESCE(SUM(commercial_loaded_cost_target), 0) AS loaded_cost_clp,
            COUNT(DISTINCT member_id) AS client_headcount_fte,
            0 AS client_loaded_cost_clp,
            0 AS revenue_clp
       FROM greenhouse_serving.commercial_cost_attribution
       WHERE client_id = $1
         AND period_year = $2
         AND period_month = $3`,
    [clientId, year, month]
  )

  const loadedCost = toNum(rows[0]?.loaded_cost_clp)

  return {
    loadedCostClp: loadedCost,
    revenueClp: null,
    clientLoadedCostClp: loadedCost
  }
}

const buildAttributedCost = async ({
  quote,
  year,
  month,
  revenueClp
}: {
  quote: QuoteContext
  year: number
  month: number
  revenueClp: number
}): Promise<number | null> => {
  if (!quote.clientId) return null

  const { loadedCostClp, clientLoadedCostClp } = await loadClientCostAttribution({
    clientId: quote.clientId,
    year,
    month
  })

  if (loadedCostClp === null || clientLoadedCostClp === null || clientLoadedCostClp <= 0) {
    return null
  }

  // Prorate cost by the quote's share of client revenue for the period.
  // clientLoadedCostClp * (revenueClp / clientMonthlyRevenue) when knowable,
  // otherwise fall back to the full attributed cost since this quote is the
  // only revenue driver linked for the period.
  const clientRevenueRows = await query<{ total_clp: string | number | null }>(
    `SELECT COALESCE(SUM(total_amount_clp), 0) AS total_clp
       FROM greenhouse_finance.income
       WHERE client_id = $1
         AND period_year = $2
         AND period_month = $3`,
    [quote.clientId, year, month]
  )

  const clientPeriodRevenue = toNum(clientRevenueRows[0]?.total_clp) ?? 0

  if (clientPeriodRevenue <= 0 || revenueClp <= 0) {
    return round2(loadedCostClp)
  }

  const share = Math.min(1, revenueClp / clientPeriodRevenue)

  return round2(loadedCostClp * share)
}

const toProfitabilityRow = ({
  quote,
  year,
  month,
  revenueClp,
  attributedCostClp
}: {
  quote: QuoteContext
  year: number
  month: number
  revenueClp: number
  attributedCostClp: number | null
}): ProfitabilitySnapshotRow => {
  const effectiveMarginPct = (() => {
    if (revenueClp <= 0 || attributedCostClp === null) return null

    return round4(((revenueClp - attributedCostClp) / revenueClp) * 100)
  })()

  const marginDriftPct = (() => {
    if (effectiveMarginPct === null || quote.quotedMarginPct === null) return null

    return round4(effectiveMarginPct - quote.quotedMarginPct)
  })()

  const drivers: DriftDrivers = {
    authorizedVsQuotedPct: (() => {
      if (quote.quotedTotalClp === null || quote.quotedTotalClp <= 0) return null
      const authorized = quote.authorizedTotalClp ?? 0

      return round2(((authorized - quote.quotedTotalClp) / quote.quotedTotalClp) * 100)
    })(),
    invoicedVsQuotedPct: (() => {
      if (quote.quotedTotalClp === null || quote.quotedTotalClp <= 0) return null
      const invoiced = quote.invoicedTotalClp ?? 0

      return round2(((invoiced - quote.quotedTotalClp) / quote.quotedTotalClp) * 100)
    })(),
    realizedVsQuotedPct: (() => {
      if (quote.quotedTotalClp === null || quote.quotedTotalClp <= 0) return null

      return round2(((revenueClp - quote.quotedTotalClp) / quote.quotedTotalClp) * 100)
    })(),
    costVsQuotedPct: null
  }

  return {
    quotationId: quote.quotationId,
    periodYear: year,
    periodMonth: month,
    clientId: quote.clientId,
    organizationId: quote.organizationId,
    spaceId: quote.spaceId,

    quotedTotalClp: round2(quote.quotedTotalClp),
    quotedMarginPct: round4(quote.quotedMarginPct),
    authorizedTotalClp: round2(quote.authorizedTotalClp),
    invoicedTotalClp: round2(quote.invoicedTotalClp),
    realizedRevenueClp: round2(revenueClp),
    attributedCostClp: attributedCostClp === null ? null : round2(attributedCostClp),

    effectiveMarginPct,
    marginDriftPct,
    driftSeverity: classifyDrift(marginDriftPct),
    driftDrivers: drivers,

    materializedAt: new Date().toISOString()
  }
}

const upsertProfitabilityRow = async (row: ProfitabilitySnapshotRow): Promise<void> => {
  await query(
    `INSERT INTO greenhouse_serving.quotation_profitability_snapshots (
       quotation_id, period_year, period_month,
       client_id, organization_id, space_id,
       quoted_total_clp, quoted_margin_pct,
       authorized_total_clp, invoiced_total_clp,
       realized_revenue_clp, attributed_cost_clp,
       effective_margin_pct, margin_drift_pct, drift_severity, drift_drivers,
       materialized_at
     ) VALUES (
       $1, $2, $3,
       $4, $5, $6,
       $7, $8,
       $9, $10,
       $11, $12,
       $13, $14, $15, $16::jsonb,
       $17::timestamptz
     )
     ON CONFLICT (quotation_id, period_year, period_month) DO UPDATE SET
       client_id = EXCLUDED.client_id,
       organization_id = EXCLUDED.organization_id,
       space_id = EXCLUDED.space_id,
       quoted_total_clp = EXCLUDED.quoted_total_clp,
       quoted_margin_pct = EXCLUDED.quoted_margin_pct,
       authorized_total_clp = EXCLUDED.authorized_total_clp,
       invoiced_total_clp = EXCLUDED.invoiced_total_clp,
       realized_revenue_clp = EXCLUDED.realized_revenue_clp,
       attributed_cost_clp = EXCLUDED.attributed_cost_clp,
       effective_margin_pct = EXCLUDED.effective_margin_pct,
       margin_drift_pct = EXCLUDED.margin_drift_pct,
       drift_severity = EXCLUDED.drift_severity,
       drift_drivers = EXCLUDED.drift_drivers,
       materialized_at = EXCLUDED.materialized_at`,
    [
      row.quotationId, row.periodYear, row.periodMonth,
      row.clientId, row.organizationId, row.spaceId,
      row.quotedTotalClp, row.quotedMarginPct,
      row.authorizedTotalClp, row.invoicedTotalClp,
      row.realizedRevenueClp, row.attributedCostClp,
      row.effectiveMarginPct, row.marginDriftPct, row.driftSeverity, JSON.stringify(row.driftDrivers),
      row.materializedAt
    ]
  )
}

/**
 * Materializes profitability snapshots for a quotation across every period
 * where it has associated income. Idempotent — safe to re-run.
 *
 * Returns the list of upserted rows.
 */
export const materializeProfitabilitySnapshots = async ({
  quotationId
}: {
  quotationId: string
}): Promise<ProfitabilitySnapshotRow[]> => {
  const quote = await loadQuoteContext(quotationId)

  if (!quote) return []

  const periods = await listPeriodsWithIncome(quotationId)

  if (periods.length === 0) {
    // No realized revenue yet — seed a row for the approval/quote-date period
    // so the quote appears on dashboards even before the first invoice.
    const iso = quote.earliestActivityDate

    if (!iso) return []

    const parts = iso.split('-')
    const year = Number(parts[0])
    const month = Number(parts[1])

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return []
    }

    periods.push({ year, month, revenueClp: 0 })
  }

  const results: ProfitabilitySnapshotRow[] = []

  for (const period of periods) {
    const attributedCost = await buildAttributedCost({
      quote,
      year: period.year,
      month: period.month,
      revenueClp: period.revenueClp
    })

    const row = toProfitabilityRow({
      quote,
      year: period.year,
      month: period.month,
      revenueClp: period.revenueClp,
      attributedCostClp: attributedCost
    })

    await upsertProfitabilityRow(row)
    results.push(row)
  }

  return results
}

/**
 * Materializes profitability for all quotations whose income touches a period.
 *
 * Called from the `accounting.commercial_cost_attribution.period_materialized`
 * event to keep drift numbers aligned with the latest cost re-calculation.
 */
export const materializeProfitabilityForPeriod = async ({
  year,
  month
}: {
  year: number
  month: number
}): Promise<{ quotationCount: number }> => {
  const rows = await query<{ quotation_id: string }>(
    `SELECT DISTINCT quotation_id
       FROM greenhouse_finance.income
       WHERE quotation_id IS NOT NULL
         AND period_year = $1
         AND period_month = $2`,
    [year, month]
  )

  for (const row of rows) {
    await materializeProfitabilitySnapshots({ quotationId: String(row.quotation_id) })
  }

  return { quotationCount: rows.length }
}
