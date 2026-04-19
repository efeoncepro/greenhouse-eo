import 'server-only'

import { query } from '@/lib/db'
import { publishContractProfitabilityMaterialized } from '@/lib/commercial/contract-events'

import type {
  ContractProfitabilitySnapshotRow,
  DriftDrivers,
  DriftSeverity
} from './contracts'
import {
  DRIFT_CRITICAL_THRESHOLD_PCT,
  DRIFT_WARNING_THRESHOLD_PCT
} from './contracts'

interface ContractRow extends Record<string, unknown> {
  contract_id: string
  contract_number: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  originator_quote_id: string | null
  commercial_model: string | null
  staffing_model: string | null
  status: string
  start_date: string | Date | null
  end_date: string | Date | null
  mrr_clp: string | number | null
  arr_clp: string | number | null
  tcv_clp: string | number | null
  acv_clp: string | number | null
  currency: string | null
  pricing_model: string | null
  quoted_margin_pct: string | number | null
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
  loaded_cost_clp: string | number | null
}

interface ContractContext {
  contractId: string
  contractNumber: string
  clientId: string | null
  organizationId: string | null
  spaceId: string | null
  originatorQuoteId: string | null
  quotedTotalClp: number | null
  quotedMarginPct: number | null
  pricingModel: string | null
  commercialModel: string | null
  staffingModel: string | null
  authorizedTotalClp: number | null
  invoicedTotalClp: number | null
  earliestActivityDate: string | null
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

const loadContractContext = async (contractId: string): Promise<ContractContext | null> => {
  const rows = await query<ContractRow>(
    `SELECT
       c.contract_id,
       c.contract_number,
       c.client_id,
       c.organization_id,
       c.space_id,
       c.originator_quote_id,
       c.commercial_model,
       c.staffing_model,
       c.status,
       c.start_date,
       c.end_date,
       c.mrr_clp,
       c.arr_clp,
       c.tcv_clp,
       c.acv_clp,
       c.currency,
       q.pricing_model,
       COALESCE(q.effective_margin_pct, q.target_margin_pct) AS quoted_margin_pct
     FROM greenhouse_commercial.contracts c
     LEFT JOIN greenhouse_commercial.quotations q
       ON q.quotation_id = c.originator_quote_id
    WHERE c.contract_id = $1
    LIMIT 1`,
    [contractId]
  )

  const contract = rows[0]

  if (!contract) return null

  const aggregates = await query<AggRow>(
    `SELECT
        COALESCE((SELECT SUM(authorized_amount_clp) FROM greenhouse_finance.purchase_orders WHERE contract_id = $1), 0) AS authorized_clp,
        COALESCE((SELECT SUM(total_amount_clp) FROM greenhouse_finance.income WHERE contract_id = $1), 0) AS invoiced_clp`,
    [contractId]
  )

  return {
    contractId: String(contract.contract_id),
    contractNumber: String(contract.contract_number),
    clientId: contract.client_id ? String(contract.client_id) : null,
    organizationId: contract.organization_id ? String(contract.organization_id) : null,
    spaceId: contract.space_id ? String(contract.space_id) : null,
    originatorQuoteId: contract.originator_quote_id ? String(contract.originator_quote_id) : null,
    quotedTotalClp:
      toNum(contract.tcv_clp)
      ?? toNum(contract.acv_clp)
      ?? toNum(contract.arr_clp)
      ?? toNum(contract.mrr_clp),
    quotedMarginPct: toNum(contract.quoted_margin_pct),
    pricingModel: contract.pricing_model ? String(contract.pricing_model) : null,
    commercialModel: contract.commercial_model ? String(contract.commercial_model) : null,
    staffingModel: contract.staffing_model ? String(contract.staffing_model) : null,
    authorizedTotalClp: toNum(aggregates[0]?.authorized_clp),
    invoicedTotalClp: toNum(aggregates[0]?.invoiced_clp),
    earliestActivityDate: toIsoDate(contract.start_date) ?? toIsoDate(contract.end_date)
  }
}

const listPeriodsWithIncome = async (contractId: string) => {
  const rows = await query<IncomePeriodRow>(
    `SELECT period_year, period_month, invoice_date, total_amount_clp
       FROM greenhouse_finance.income
      WHERE contract_id = $1`,
    [contractId]
  )

  const grouped = new Map<string, number>()

  for (const row of rows) {
    let year: number | null = row.period_year
    let month: number | null = row.period_month

    if ((year === null || month === null) && row.invoice_date) {
      const iso = toIsoDate(row.invoice_date)

      if (iso) {
        const [yearStr, monthStr] = iso.split('-')

        year = Number(yearStr)
        month = Number(monthStr)
      }
    }

    if (!year || !month) continue

    const key = `${year}-${String(month).padStart(2, '0')}`

    grouped.set(key, (grouped.get(key) ?? 0) + (toNum(row.total_amount_clp) ?? 0))
  }

  return Array.from(grouped.entries()).map(([key, revenue]) => {
    const [yearStr, monthStr] = key.split('-')

    return {
      year: Number(yearStr),
      month: Number(monthStr),
      revenueClp: round2(revenue) ?? 0
    }
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
}) => {
  if (!clientId) return null

  const rows = await query<CostAttributionRow>(
    `SELECT COALESCE(SUM(commercial_loaded_cost_target), 0) AS loaded_cost_clp
       FROM greenhouse_serving.commercial_cost_attribution
      WHERE client_id = $1
        AND period_year = $2
        AND period_month = $3`,
    [clientId, year, month]
  )

  return toNum(rows[0]?.loaded_cost_clp)
}

const buildAttributedCost = async ({
  contract,
  year,
  month,
  revenueClp
}: {
  contract: ContractContext
  year: number
  month: number
  revenueClp: number
}) => {
  if (!contract.clientId) return null

  const loadedCostClp = await loadClientCostAttribution({
    clientId: contract.clientId,
    year,
    month
  })

  if (loadedCostClp === null) return null

  const clientRevenueRows = await query<{ total_clp: string | number | null }>(
    `SELECT COALESCE(SUM(total_amount_clp), 0) AS total_clp
       FROM greenhouse_finance.income
      WHERE client_id = $1
        AND period_year = $2
        AND period_month = $3`,
    [contract.clientId, year, month]
  )

  const clientPeriodRevenue = toNum(clientRevenueRows[0]?.total_clp) ?? 0

  if (clientPeriodRevenue <= 0 || revenueClp <= 0) {
    return round2(loadedCostClp)
  }

  const share = Math.min(1, revenueClp / clientPeriodRevenue)

  return round2(loadedCostClp * share)
}

const toSnapshotRow = ({
  contract,
  year,
  month,
  revenueClp,
  attributedCostClp
}: {
  contract: ContractContext
  year: number
  month: number
  revenueClp: number
  attributedCostClp: number | null
}): ContractProfitabilitySnapshotRow => {
  const effectiveMarginPct = (() => {
    if (revenueClp <= 0 || attributedCostClp === null) return null

    return round4(((revenueClp - attributedCostClp) / revenueClp) * 100)
  })()

  const marginDriftPct = (() => {
    if (effectiveMarginPct === null || contract.quotedMarginPct === null) return null

    return round4(effectiveMarginPct - contract.quotedMarginPct)
  })()

  const driftDrivers: DriftDrivers = {
    authorizedVsQuotedPct: (() => {
      if (!contract.quotedTotalClp || contract.quotedTotalClp <= 0) return null
      const authorized = contract.authorizedTotalClp ?? 0

      return round2(((authorized - contract.quotedTotalClp) / contract.quotedTotalClp) * 100)
    })(),
    invoicedVsQuotedPct: (() => {
      if (!contract.quotedTotalClp || contract.quotedTotalClp <= 0) return null
      const invoiced = contract.invoicedTotalClp ?? 0

      return round2(((invoiced - contract.quotedTotalClp) / contract.quotedTotalClp) * 100)
    })(),
    realizedVsQuotedPct: (() => {
      if (!contract.quotedTotalClp || contract.quotedTotalClp <= 0) return null

      return round2(((revenueClp - contract.quotedTotalClp) / contract.quotedTotalClp) * 100)
    })(),
    costVsQuotedPct: null
  }

  return {
    contractId: contract.contractId,
    periodYear: year,
    periodMonth: month,
    clientId: contract.clientId,
    organizationId: contract.organizationId,
    spaceId: contract.spaceId,
    quotedTotalClp: round2(contract.quotedTotalClp),
    quotedMarginPct: round4(contract.quotedMarginPct),
    pricingModel: contract.pricingModel,
    commercialModel: contract.commercialModel,
    staffingModel: contract.staffingModel,
    authorizedTotalClp: round2(contract.authorizedTotalClp),
    invoicedTotalClp: round2(contract.invoicedTotalClp),
    realizedRevenueClp: round2(revenueClp),
    attributedCostClp: round2(attributedCostClp),
    effectiveMarginPct,
    marginDriftPct,
    driftSeverity: classifyDrift(marginDriftPct),
    driftDrivers,
    materializedAt: new Date().toISOString()
  }
}

const upsertSnapshotRow = async (row: ContractProfitabilitySnapshotRow) => {
  await query(
    `INSERT INTO greenhouse_serving.contract_profitability_snapshots (
       contract_id, period_year, period_month,
       client_id, organization_id, space_id,
       quoted_total_clp, quoted_margin_pct, pricing_model, commercial_model, staffing_model,
       authorized_total_clp, invoiced_total_clp,
       realized_revenue_clp, attributed_cost_clp,
       effective_margin_pct, margin_drift_pct, drift_severity, drift_drivers,
       materialized_at
     ) VALUES (
       $1, $2, $3,
       $4, $5, $6,
       $7, $8, $9, $10, $11,
       $12, $13,
       $14, $15,
       $16, $17, $18, $19::jsonb,
       $20::timestamptz
     )
     ON CONFLICT (contract_id, period_year, period_month) DO UPDATE SET
       client_id = EXCLUDED.client_id,
       organization_id = EXCLUDED.organization_id,
       space_id = EXCLUDED.space_id,
       quoted_total_clp = EXCLUDED.quoted_total_clp,
       quoted_margin_pct = EXCLUDED.quoted_margin_pct,
       pricing_model = EXCLUDED.pricing_model,
       commercial_model = EXCLUDED.commercial_model,
       staffing_model = EXCLUDED.staffing_model,
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
      row.contractId, row.periodYear, row.periodMonth,
      row.clientId, row.organizationId, row.spaceId,
      row.quotedTotalClp, row.quotedMarginPct, row.pricingModel, row.commercialModel, row.staffingModel,
      row.authorizedTotalClp, row.invoicedTotalClp,
      row.realizedRevenueClp, row.attributedCostClp,
      row.effectiveMarginPct, row.marginDriftPct, row.driftSeverity, JSON.stringify(row.driftDrivers),
      row.materializedAt
    ]
  )
}

export const materializeContractProfitabilitySnapshots = async ({
  contractId
}: {
  contractId: string
}): Promise<ContractProfitabilitySnapshotRow[]> => {
  const contract = await loadContractContext(contractId)

  if (!contract) return []

  const periods = await listPeriodsWithIncome(contractId)

  if (periods.length === 0 && contract.earliestActivityDate) {
    const [yearStr, monthStr] = contract.earliestActivityDate.split('-')

    periods.push({
      year: Number(yearStr),
      month: Number(monthStr),
      revenueClp: 0
    })
  }

  const results: ContractProfitabilitySnapshotRow[] = []

  for (const period of periods) {
    const attributedCost = await buildAttributedCost({
      contract,
      year: period.year,
      month: period.month,
      revenueClp: period.revenueClp
    })

    const row = toSnapshotRow({
      contract,
      year: period.year,
      month: period.month,
      revenueClp: period.revenueClp,
      attributedCostClp: attributedCost
    })

    await upsertSnapshotRow(row)
    results.push(row)
  }

  if (results.length > 0) {
    const last = results[0]

    await publishContractProfitabilityMaterialized({
      contractId: contract.contractId,
      contractNumber: contract.contractNumber,
      clientId: contract.clientId,
      organizationId: contract.organizationId,
      spaceId: contract.spaceId,
      status: null,
      commercialModel: contract.commercialModel,
      staffingModel: contract.staffingModel,
      originatorQuoteId: contract.originatorQuoteId,
      periodYear: last.periodYear,
      periodMonth: last.periodMonth,
      realizedRevenueClp: last.realizedRevenueClp,
      attributedCostClp: last.attributedCostClp,
      effectiveMarginPct: last.effectiveMarginPct,
      marginDriftPct: last.marginDriftPct
    })
  }

  return results
}

export const materializeContractProfitabilityForPeriod = async ({
  year,
  month
}: {
  year: number
  month: number
}) => {
  const rows = await query<{ contract_id: string }>(
    `SELECT DISTINCT contract_id
       FROM greenhouse_finance.income
      WHERE contract_id IS NOT NULL
        AND period_year = $1
        AND period_month = $2`,
    [year, month]
  )

  for (const row of rows) {
    await materializeContractProfitabilitySnapshots({ contractId: String(row.contract_id) })
  }

  return { contractCount: rows.length }
}
