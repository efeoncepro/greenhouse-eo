import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import { FinanceValidationError } from '@/lib/finance/shared'

/**
 * # Income payments — canonical CLP reader (TASK-766)
 *
 * Mirror del helper `expense-payments-reader.ts` para income_payments.
 * Cierra el mismo anti-patrón en KPIs de revenue (cash-in,
 * dashboard/pnl, etc).
 *
 * Lee desde la VIEW `income_payments_normalized` que aplica el COALESCE
 * canónico (`amount_clp` persistido > CLP-trivial > NULL+drift_flag) y
 * filtra 3-axis supersede.
 *
 * ⚠️ Mismo contrato que `expense-payments-reader.ts`. Ver allí para
 * reglas duras y rationale completo.
 */

export interface IncomePaymentsClpFilter {
  fromDate: string
  toDate: string
  isReconciled?: boolean
}

export interface IncomePaymentsClpSummary {
  totalClp: number
  totalPayments: number
  unreconciledCount: number
  /** Count of payments with `has_clp_drift = TRUE` (non-CLP without persisted amount_clp). */
  driftCount: number
  /**
   * TASK-768 — breakdown analítico por dimension `economic_category`.
   * 8 keys (matching INCOME_ECONOMIC_CATEGORIES). Backwards-compatible: campos
   * legacy se mantienen, este nuevo field agrega la dimension analitica.
   */
  byEconomicCategory: {
    service_revenue: number
    client_reimbursement: number
    factoring_proceeds: number
    partner_payout_offset: number
    internal_transfer_in: number
    tax_refund: number
    financial_income: number
    other: number
  }
  /** Count of rows where economic_category IS NULL (pre-cutover legacy). */
  economicCategoryUnresolvedCount: number
}

export interface IncomePaymentNormalized {
  paymentId: string
  incomeId: string
  paymentDate: string | null
  paymentAmountNative: number
  paymentCurrency: string
  paymentAmountClp: number | null
  exchangeRateAtPayment: number | null
  fxGainLossClp: number | null
  paymentAccountId: string | null
  paymentMethod: string | null
  paymentSource: string | null
  isReconciled: boolean
  reference: string | null
  recordedAt: string | null
  createdAt: string | null
  hasClpDrift: boolean
}

export interface ListIncomePaymentsNormalizedFilter extends IncomePaymentsClpFilter {
  page?: number
  pageSize?: number
}

export interface ListIncomePaymentsNormalizedResult {
  items: IncomePaymentNormalized[]
  total: number
  page: number
  pageSize: number
}

interface SummaryRow {
  total_clp: string | number | null
  total_payments: string | number | null
  unreconciled_count: string | number | null
  drift_count: string | number | null
  ec_service_revenue: string | number | null
  ec_client_reimbursement: string | number | null
  ec_factoring_proceeds: string | number | null
  ec_partner_payout_offset: string | number | null
  ec_internal_transfer_in: string | number | null
  ec_tax_refund: string | number | null
  ec_financial_income: string | number | null
  ec_other: string | number | null
  ec_unresolved_count: string | number | null
}

interface PaymentRow {
  payment_id: string
  income_id: string
  payment_date: string | null
  payment_amount_native: string | number | null
  payment_currency: string
  payment_amount_clp: string | number | null
  exchange_rate_at_payment: string | number | null
  fx_gain_loss_clp: string | number | null
  payment_account_id: string | null
  payment_method: string | null
  payment_source: string | null
  is_reconciled: boolean
  reference: string | null
  recorded_at: string | null
  created_at: string | null
  has_clp_drift: boolean
}

interface DriftCountRow {
  drift_count: string | number | null
}

const toNumberOrNull = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null

  const n = typeof value === 'string' ? Number(value) : value

  return Number.isFinite(n) ? n : null
}

const toNumber = (value: string | number | null | undefined): number => {
  return toNumberOrNull(value) ?? 0
}

const round = (value: number) => Math.round(value * 100) / 100

const validateFilter = (filter: IncomePaymentsClpFilter) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/

  if (!dateRegex.test(filter.fromDate)) {
    throw new FinanceValidationError('fromDate must match YYYY-MM-DD.')
  }

  if (!dateRegex.test(filter.toDate)) {
    throw new FinanceValidationError('toDate must match YYYY-MM-DD.')
  }

  if (filter.fromDate > filter.toDate) {
    throw new FinanceValidationError('fromDate must be <= toDate.')
  }
}

export const sumIncomePaymentsClpForPeriod = async (
  filter: IncomePaymentsClpFilter
): Promise<IncomePaymentsClpSummary> => {
  validateFilter(filter)

  const db = await getDb()

  const reconciledClause =
    filter.isReconciled === undefined
      ? sql``
      : sql`AND ip.is_reconciled = ${filter.isReconciled}`

  const rows = (
    await sql<SummaryRow>`
      SELECT
        COALESCE(SUM(ip.payment_amount_clp), 0)::text                   AS total_clp,
        COUNT(*)::text                                                  AS total_payments,
        COUNT(*) FILTER (WHERE NOT ip.is_reconciled)::text              AS unreconciled_count,
        COUNT(*) FILTER (WHERE ip.has_clp_drift)::text                  AS drift_count,
        COALESCE(SUM(ip.payment_amount_clp) FILTER (WHERE i.economic_category = 'service_revenue'), 0)::text AS ec_service_revenue,
        COALESCE(SUM(ip.payment_amount_clp) FILTER (WHERE i.economic_category = 'client_reimbursement'), 0)::text AS ec_client_reimbursement,
        COALESCE(SUM(ip.payment_amount_clp) FILTER (WHERE i.economic_category = 'factoring_proceeds'), 0)::text AS ec_factoring_proceeds,
        COALESCE(SUM(ip.payment_amount_clp) FILTER (WHERE i.economic_category = 'partner_payout_offset'), 0)::text AS ec_partner_payout_offset,
        COALESCE(SUM(ip.payment_amount_clp) FILTER (WHERE i.economic_category = 'internal_transfer_in'), 0)::text AS ec_internal_transfer_in,
        COALESCE(SUM(ip.payment_amount_clp) FILTER (WHERE i.economic_category = 'tax_refund'), 0)::text AS ec_tax_refund,
        COALESCE(SUM(ip.payment_amount_clp) FILTER (WHERE i.economic_category = 'financial_income'), 0)::text AS ec_financial_income,
        COALESCE(SUM(ip.payment_amount_clp) FILTER (WHERE i.economic_category = 'other'), 0)::text AS ec_other,
        COUNT(*) FILTER (WHERE i.economic_category IS NULL)::text AS ec_unresolved_count
      FROM greenhouse_finance.income_payments_normalized ip
      LEFT JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
      WHERE ip.payment_date BETWEEN ${filter.fromDate}::date AND ${filter.toDate}::date
        ${reconciledClause}
    `.execute(db)
  ).rows

  const row = rows[0]

  return {
    totalClp: round(toNumber(row?.total_clp)),
    totalPayments: toNumber(row?.total_payments),
    unreconciledCount: toNumber(row?.unreconciled_count),
    driftCount: toNumber(row?.drift_count),
    byEconomicCategory: {
      service_revenue: round(toNumber(row?.ec_service_revenue)),
      client_reimbursement: round(toNumber(row?.ec_client_reimbursement)),
      factoring_proceeds: round(toNumber(row?.ec_factoring_proceeds)),
      partner_payout_offset: round(toNumber(row?.ec_partner_payout_offset)),
      internal_transfer_in: round(toNumber(row?.ec_internal_transfer_in)),
      tax_refund: round(toNumber(row?.ec_tax_refund)),
      financial_income: round(toNumber(row?.ec_financial_income)),
      other: round(toNumber(row?.ec_other))
    },
    economicCategoryUnresolvedCount: toNumber(row?.ec_unresolved_count)
  }
}

export const listIncomePaymentsNormalized = async (
  filter: ListIncomePaymentsNormalizedFilter
): Promise<ListIncomePaymentsNormalizedResult> => {
  validateFilter(filter)

  const page = Math.max(1, Math.trunc(filter.page ?? 1))
  const pageSize = Math.min(200, Math.max(1, Math.trunc(filter.pageSize ?? 50)))
  const offset = (page - 1) * pageSize

  const db = await getDb()

  const reconciledClause =
    filter.isReconciled === undefined
      ? sql``
      : sql`AND ip.is_reconciled = ${filter.isReconciled}`

  const totalRows = (
    await sql<{ total: string | number }>`
      SELECT COUNT(*)::text AS total
      FROM greenhouse_finance.income_payments_normalized ip
      WHERE ip.payment_date BETWEEN ${filter.fromDate}::date AND ${filter.toDate}::date
        ${reconciledClause}
    `.execute(db)
  ).rows

  const total = toNumber(totalRows[0]?.total ?? null)

  const rows = (
    await sql<PaymentRow>`
      SELECT
        ip.payment_id,
        ip.income_id,
        ip.payment_date::text                  AS payment_date,
        ip.payment_amount_native::text         AS payment_amount_native,
        ip.payment_currency,
        ip.payment_amount_clp::text            AS payment_amount_clp,
        ip.exchange_rate_at_payment::text      AS exchange_rate_at_payment,
        ip.fx_gain_loss_clp::text              AS fx_gain_loss_clp,
        ip.payment_account_id,
        ip.payment_method,
        ip.payment_source,
        ip.is_reconciled,
        ip.reference,
        ip.recorded_at::text                   AS recorded_at,
        ip.created_at::text                    AS created_at,
        ip.has_clp_drift
      FROM greenhouse_finance.income_payments_normalized ip
      WHERE ip.payment_date BETWEEN ${filter.fromDate}::date AND ${filter.toDate}::date
        ${reconciledClause}
      ORDER BY ip.payment_date DESC, ip.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `.execute(db)
  ).rows

  const items: IncomePaymentNormalized[] = rows.map(row => ({
    paymentId: row.payment_id,
    incomeId: row.income_id,
    paymentDate: row.payment_date,
    paymentAmountNative: round(toNumber(row.payment_amount_native)),
    paymentCurrency: row.payment_currency,
    paymentAmountClp:
      row.payment_amount_clp === null ? null : round(toNumber(row.payment_amount_clp)),
    exchangeRateAtPayment: toNumberOrNull(row.exchange_rate_at_payment),
    fxGainLossClp: toNumberOrNull(row.fx_gain_loss_clp),
    paymentAccountId: row.payment_account_id,
    paymentMethod: row.payment_method,
    paymentSource: row.payment_source,
    isReconciled: row.is_reconciled,
    reference: row.reference,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
    hasClpDrift: row.has_clp_drift
  }))

  return { items, total, page, pageSize }
}

export const getIncomePaymentsClpDriftCount = async (): Promise<number> => {
  const db = await getDb()

  const rows = (
    await sql<DriftCountRow>`
      SELECT COUNT(*)::text AS drift_count
      FROM greenhouse_finance.income_payments_normalized
      WHERE has_clp_drift = TRUE
    `.execute(db)
  ).rows

  return toNumber(rows[0]?.drift_count)
}
