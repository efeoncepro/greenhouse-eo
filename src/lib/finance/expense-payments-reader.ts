import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import { FinanceValidationError } from '@/lib/finance/shared'

/**
 * # Expense payments — canonical CLP reader (TASK-766)
 *
 * Single source of truth for "monto en CLP de un expense_payment".
 *
 * El bug del 2026-05-02 (KPIs `/finance/cash-out` inflados 88×) tuvo causa
 * raíz arquitectónica: SQL embebidos en API routes computaban
 * `SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1))`. Ese cálculo es
 * válido solo si `ep.currency == e.currency`, lo cual NO es invariante.
 * Caso CCA TASK-714c (HubSpot reembolsado vía CCA del accionista):
 * `expense.currency='USD'` con rate 910.55, `expense_payment.currency='CLP'`
 * con `amount=1,106,321 CLP`, `amount_clp=1,106,321` (correcto). El SQL
 * broken multiplicaba 1,106,321 × 910.55 = $1,007,363,090 fantasma.
 *
 * Este helper lee desde la VIEW `expense_payments_normalized` que ya
 * aplica el COALESCE canónico (`amount_clp` persistido > CLP-trivial >
 * NULL+drift_flag) y filtra 3-axis supersede.
 *
 * ⚠️ FOR AGENTS / FUTURE DEVS:
 *
 * - **Never** compute payment CLP via `ep.amount * exchange_rate_to_clp`
 *   in a new query. Use this helper or the VIEW directly.
 * - **Never** bypass the VIEW filter for supersede. Active payments only.
 * - When a new KPI/dashboard/P&L surface emerges, consume this helper.
 *   Never re-implement the COALESCE chain inline.
 * - Drift handling: `driftCount` reports `payment_amount_clp IS NULL`
 *   payments (non-CLP without persisted amount_clp). The reliability
 *   signal `expense_payments_clp_drift` consumes the same query path;
 *   any non-zero count is a Finance Data Quality breakage.
 *
 * Pattern reference: `getBankFxPnlBreakdown` (TASK-699) →
 * `src/lib/finance/fx-pnl.ts`. Same VIEW + helper + drift detection shape.
 *
 * Anti-pattern enforcement: lint rule `greenhouse/no-untokenized-fx-math`
 * (TASK-766 Slice 3, mode `error`) blocks any new SQL that multiplies
 * `ep.amount × exchange_rate_to_clp` outside this file.
 */

export interface ExpensePaymentsClpFilter {
  fromDate: string
  toDate: string
  expenseType?: string
  supplierId?: string
  isReconciled?: boolean
}

export interface ExpensePaymentsClpSummary {
  totalClp: number
  totalPayments: number
  unreconciledCount: number
  /** Legacy buckets (pre-TASK-768) — preserved for backwards-compat with TASK-766 consumers. */
  supplierClp: number
  payrollClp: number
  fiscalClp: number
  /** Count of payments in the period with `has_clp_drift = TRUE` (non-CLP without persisted amount_clp). */
  driftCount: number
  /**
   * TASK-768 — breakdown analítico por dimension `economic_category`.
   * Single source of truth para KPIs/ICO/Member Loaded Cost/Budget/Cost Attribution.
   * 11 keys (matching EXPENSE_ECONOMIC_CATEGORIES). NO usar legacy supplierClp/payrollClp/fiscalClp
   * para análisis nuevo — usar byEconomicCategory.
   */
  byEconomicCategory: {
    labor_cost_internal: number
    labor_cost_external: number
    vendor_cost_saas: number
    vendor_cost_professional_services: number
    regulatory_payment: number
    tax: number
    financial_cost: number
    bank_fee_real: number
    overhead: number
    financial_settlement: number
    other: number
  }
  /** Count of rows where economic_category IS NULL (pre-cutover legacy or trigger bypass). */
  economicCategoryUnresolvedCount: number
}

export interface ExpensePaymentNormalized {
  paymentId: string
  expenseId: string
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
  paymentOrderLineId: string | null
  reference: string | null
  recordedAt: string | null
  createdAt: string | null
  hasClpDrift: boolean
}

export interface ListExpensePaymentsNormalizedFilter extends ExpensePaymentsClpFilter {
  page?: number
  pageSize?: number
}

export interface ListExpensePaymentsNormalizedResult {
  items: ExpensePaymentNormalized[]
  total: number
  page: number
  pageSize: number
}

interface SummaryRow {
  total_clp: string | number | null
  total_payments: string | number | null
  unreconciled_count: string | number | null
  supplier_clp: string | number | null
  payroll_clp: string | number | null
  fiscal_clp: string | number | null
  drift_count: string | number | null
  // TASK-768 — 11 economic_category buckets + unresolved counter
  ec_labor_cost_internal: string | number | null
  ec_labor_cost_external: string | number | null
  ec_vendor_cost_saas: string | number | null
  ec_vendor_cost_professional_services: string | number | null
  ec_regulatory_payment: string | number | null
  ec_tax: string | number | null
  ec_financial_cost: string | number | null
  ec_bank_fee_real: string | number | null
  ec_overhead: string | number | null
  ec_financial_settlement: string | number | null
  ec_other: string | number | null
  ec_unresolved_count: string | number | null
}

interface PaymentRow {
  payment_id: string
  expense_id: string
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
  payment_order_line_id: string | null
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

const validateFilter = (filter: ExpensePaymentsClpFilter) => {
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

/**
 * Aggregate canonical CLP totals for expense_payments in a date range.
 *
 * - Reads from VIEW `expense_payments_normalized` (auto filters supersede).
 * - JOINs `expenses` to enable `expense_type` filter and segment KPIs
 *   (supplier / payroll / fiscal).
 * - `driftCount` reports rows where `payment_amount_clp IS NULL` (non-CLP
 *   payments without persisted `amount_clp`). These rows are EXCLUDED from
 *   the SUMs (treated as missing data, not zero) — same convention as
 *   `getBankFxPnlBreakdown` which ignores degraded rows in totals but
 *   surfaces them via flags.
 */
export const sumExpensePaymentsClpForPeriod = async (
  filter: ExpensePaymentsClpFilter
): Promise<ExpensePaymentsClpSummary> => {
  validateFilter(filter)

  const db = await getDb()

  const expenseTypeClause = filter.expenseType
    ? sql`AND e.expense_type = ${filter.expenseType}`
    : sql``

  const supplierClause = filter.supplierId
    ? sql`AND e.supplier_id = ${filter.supplierId}`
    : sql``

  const reconciledClause =
    filter.isReconciled === undefined
      ? sql``
      : sql`AND ep.is_reconciled = ${filter.isReconciled}`

  const rows = (
    await sql<SummaryRow>`
      SELECT
        COALESCE(SUM(ep.payment_amount_clp), 0)::text                                      AS total_clp,
        COUNT(*)::text                                                                     AS total_payments,
        COUNT(*) FILTER (WHERE NOT ep.is_reconciled)::text                                 AS unreconciled_count,
        COUNT(*) FILTER (WHERE ep.has_clp_drift)::text                                     AS drift_count,
        COALESCE(SUM(ep.payment_amount_clp) FILTER (WHERE e.economic_category = 'labor_cost_internal'), 0)::text AS ec_labor_cost_internal,
        COALESCE(SUM(ep.payment_amount_clp) FILTER (WHERE e.economic_category = 'labor_cost_external'), 0)::text AS ec_labor_cost_external,
        COALESCE(SUM(ep.payment_amount_clp) FILTER (WHERE e.economic_category = 'vendor_cost_saas'), 0)::text AS ec_vendor_cost_saas,
        COALESCE(SUM(ep.payment_amount_clp) FILTER (WHERE e.economic_category = 'vendor_cost_professional_services'), 0)::text AS ec_vendor_cost_professional_services,
        COALESCE(SUM(ep.payment_amount_clp) FILTER (WHERE e.economic_category = 'regulatory_payment'), 0)::text AS ec_regulatory_payment,
        COALESCE(SUM(ep.payment_amount_clp) FILTER (WHERE e.economic_category = 'tax'), 0)::text AS ec_tax,
        COALESCE(SUM(ep.payment_amount_clp) FILTER (WHERE e.economic_category = 'financial_cost'), 0)::text AS ec_financial_cost,
        COALESCE(SUM(ep.payment_amount_clp) FILTER (WHERE e.economic_category = 'bank_fee_real'), 0)::text AS ec_bank_fee_real,
        COALESCE(SUM(ep.payment_amount_clp) FILTER (WHERE e.economic_category = 'overhead'), 0)::text AS ec_overhead,
        COALESCE(SUM(ep.payment_amount_clp) FILTER (WHERE e.economic_category = 'financial_settlement'), 0)::text AS ec_financial_settlement,
        COALESCE(SUM(ep.payment_amount_clp) FILTER (WHERE e.economic_category = 'other'), 0)::text AS ec_other,
        COUNT(*) FILTER (WHERE e.economic_category IS NULL)::text AS ec_unresolved_count
      FROM greenhouse_finance.expense_payments_normalized ep
      INNER JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
      WHERE ep.payment_date BETWEEN ${filter.fromDate}::date AND ${filter.toDate}::date
        ${expenseTypeClause}
        ${supplierClause}
        ${reconciledClause}
    `.execute(db)
  ).rows

  const row = rows[0]

  // TASK-768 followup — campos legacy ahora se computan DESDE economic_category.
  // Mapping canónico documentado:
  //   payrollClp  = labor_cost_internal + labor_cost_external (cost of labor económico)
  //   fiscalClp   = tax + regulatory_payment (cargas fiscales + previsionales)
  //   supplierClp = vendor_cost_saas + vendor_cost_professional_services + overhead
  //                 (cost of services/tools, NO incluye labor ni regulatorio ni FX fees reales)
  //
  // Razón del cambio (vs lectura desde expense_type): ~$3M de payments labor
  // caían en bucket fiscal-supplier porque el bank reconciler defaulteaba a
  // expense_type='supplier'. Ahora payrollClp refleja la realidad económica.
  // Cero migración de consumers downstream — todos los que ya leen el helper
  // heredan la dimensión correcta automáticamente.
  const ecLaborInternal = round(toNumber(row?.ec_labor_cost_internal))
  const ecLaborExternal = round(toNumber(row?.ec_labor_cost_external))
  const ecVendorSaas = round(toNumber(row?.ec_vendor_cost_saas))
  const ecVendorProfServices = round(toNumber(row?.ec_vendor_cost_professional_services))
  const ecRegulatory = round(toNumber(row?.ec_regulatory_payment))
  const ecTax = round(toNumber(row?.ec_tax))
  const ecFinancialCost = round(toNumber(row?.ec_financial_cost))
  const ecBankFeeReal = round(toNumber(row?.ec_bank_fee_real))
  const ecOverhead = round(toNumber(row?.ec_overhead))
  const ecFinancialSettlement = round(toNumber(row?.ec_financial_settlement))
  const ecOther = round(toNumber(row?.ec_other))

  return {
    totalClp: round(toNumber(row?.total_clp)),
    totalPayments: toNumber(row?.total_payments),
    unreconciledCount: toNumber(row?.unreconciled_count),
    supplierClp: round(ecVendorSaas + ecVendorProfServices + ecOverhead),
    payrollClp: round(ecLaborInternal + ecLaborExternal),
    fiscalClp: round(ecTax + ecRegulatory),
    driftCount: toNumber(row?.drift_count),
    byEconomicCategory: {
      labor_cost_internal: ecLaborInternal,
      labor_cost_external: ecLaborExternal,
      vendor_cost_saas: ecVendorSaas,
      vendor_cost_professional_services: ecVendorProfServices,
      regulatory_payment: ecRegulatory,
      tax: ecTax,
      financial_cost: ecFinancialCost,
      bank_fee_real: ecBankFeeReal,
      overhead: ecOverhead,
      financial_settlement: ecFinancialSettlement,
      other: ecOther
    },
    economicCategoryUnresolvedCount: toNumber(row?.ec_unresolved_count)
  }
}

/**
 * Paginated list of expense_payments with canonical CLP value resolved.
 *
 * Same VIEW + JOIN as `sumExpensePaymentsClpForPeriod`. Used by detail
 * surfaces (e.g. `/finance/cash-out` payments table) where consistency
 * between summary KPIs and per-row monto displayed is critical.
 */
export const listExpensePaymentsNormalized = async (
  filter: ListExpensePaymentsNormalizedFilter
): Promise<ListExpensePaymentsNormalizedResult> => {
  validateFilter(filter)

  const page = Math.max(1, Math.trunc(filter.page ?? 1))
  const pageSize = Math.min(200, Math.max(1, Math.trunc(filter.pageSize ?? 50)))
  const offset = (page - 1) * pageSize

  const db = await getDb()

  const expenseTypeClause = filter.expenseType
    ? sql`AND e.expense_type = ${filter.expenseType}`
    : sql``

  const supplierClause = filter.supplierId
    ? sql`AND e.supplier_id = ${filter.supplierId}`
    : sql``

  const reconciledClause =
    filter.isReconciled === undefined
      ? sql``
      : sql`AND ep.is_reconciled = ${filter.isReconciled}`

  const totalRows = (
    await sql<{ total: string | number }>`
      SELECT COUNT(*)::text AS total
      FROM greenhouse_finance.expense_payments_normalized ep
      INNER JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
      WHERE ep.payment_date BETWEEN ${filter.fromDate}::date AND ${filter.toDate}::date
        ${expenseTypeClause}
        ${supplierClause}
        ${reconciledClause}
    `.execute(db)
  ).rows

  const total = toNumber(totalRows[0]?.total ?? null)

  const rows = (
    await sql<PaymentRow>`
      SELECT
        ep.payment_id,
        ep.expense_id,
        ep.payment_date::text                  AS payment_date,
        ep.payment_amount_native::text         AS payment_amount_native,
        ep.payment_currency,
        ep.payment_amount_clp::text            AS payment_amount_clp,
        ep.exchange_rate_at_payment::text      AS exchange_rate_at_payment,
        ep.fx_gain_loss_clp::text              AS fx_gain_loss_clp,
        ep.payment_account_id,
        ep.payment_method,
        ep.payment_source,
        ep.is_reconciled,
        ep.payment_order_line_id,
        ep.reference,
        ep.recorded_at::text                   AS recorded_at,
        ep.created_at::text                    AS created_at,
        ep.has_clp_drift
      FROM greenhouse_finance.expense_payments_normalized ep
      INNER JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
      WHERE ep.payment_date BETWEEN ${filter.fromDate}::date AND ${filter.toDate}::date
        ${expenseTypeClause}
        ${supplierClause}
        ${reconciledClause}
      ORDER BY ep.payment_date DESC, ep.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `.execute(db)
  ).rows

  const items: ExpensePaymentNormalized[] = rows.map(row => ({
    paymentId: row.payment_id,
    expenseId: row.expense_id,
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
    paymentOrderLineId: row.payment_order_line_id,
    reference: row.reference,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
    hasClpDrift: row.has_clp_drift
  }))

  return { items, total, page, pageSize }
}

/**
 * Drift count: how many active expense_payments are non-CLP without
 * `amount_clp` persisted. Steady state = 0; non-zero means the FX
 * resolution at write time was bypassed or skipped, and downstream
 * KPIs degrade silently.
 *
 * Reliability signal `expense_payments_clp_drift` consumes this exact
 * query (Slice 2). The repair endpoint
 * `POST /api/admin/finance/payments-clp-repair` (Slice 5) reduces this
 * count to 0 by invoking `resolveExchangeRateToClp` with the historical
 * `payment_date`.
 */
export const getExpensePaymentsClpDriftCount = async (): Promise<number> => {
  const db = await getDb()

  const rows = (
    await sql<DriftCountRow>`
      SELECT COUNT(*)::text AS drift_count
      FROM greenhouse_finance.expense_payments_normalized
      WHERE has_clp_drift = TRUE
    `.execute(db)
  ).rows

  return toNumber(rows[0]?.drift_count)
}
