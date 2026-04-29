import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import {
  getBankOverview,
  type TreasuryBankAccountOverview,
  type TreasuryFxBreakdown,
  type TreasuryFreshness
} from '@/lib/finance/account-balances'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

type NullableNumeric = string | number | null | undefined

export type CashPositionMonthlySource = 'monthly_read_model' | 'legacy_safe_fallback'

export type CashPositionOverview = {
  period: {
    year: number
    month: number
    startDate: string
    endDate: string
  }
  kpis: {
    cashAvailableClp: number
    creditUsedClp: number
    platformInternalClp: number
    receivableClp: number
    payableClp: number
    netPositionClp: number
    activeAccounts: number
  }
  fxGainLoss: TreasuryFxBreakdown
  monthlySeries: Array<{
    year: number
    month: number
    cashInClp: number
    cashOutClp: number
    netFlowClp: number
    source: CashPositionMonthlySource
    isDegraded: boolean
  }>
  accounts: Array<{
    accountId: string
    accountName: string
    bankName: string | null
    currency: string
    instrumentCategory: string | null
    providerSlug: string | null
    openingBalance: number
    closingBalance: number
    closingBalanceClp: number | null
    periodInflows: number
    periodOutflows: number
    accountKind: 'asset' | 'liability'
    reconciliationStatus: string | null
    driftAmount: number | null
    isActive: boolean
  }>
  freshness: TreasuryFreshness
  legacy: {
    receivable: { totalClp: number; pendingInvoices: number }
    payable: { totalClp: number; pendingExpenses: number }
    fxGainLossClp: number
    netPosition: number
  }
}

type MonthlyReadModelRow = {
  year: number
  month: number
  cash_in_clp: string | number | null
  cash_out_clp: string | number | null
  snapshot_count: string | number
}

type ReceivablePayableRow = {
  total_clp: string | number | null
  pending_count: string | number
}

export const resolvePaymentAmountClp = ({
  amountClp,
  amount,
  exchangeRateAtPayment,
  documentExchangeRateToClp
}: {
  amountClp: NullableNumeric
  amount: NullableNumeric
  exchangeRateAtPayment: NullableNumeric
  documentExchangeRateToClp: NullableNumeric
}) => {
  const explicitAmountClp = toNumber(amountClp)

  if (explicitAmountClp > 0) {
    return roundCurrency(explicitAmountClp)
  }

  const baseAmount = toNumber(amount)
  const paymentRate = toNumber(exchangeRateAtPayment)
  const documentRate = toNumber(documentExchangeRateToClp)
  const fallbackRate = paymentRate > 0 ? paymentRate : documentRate > 0 ? documentRate : 1

  return roundCurrency(baseAmount * fallbackRate)
}

const startOfMonth = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-01`

const endOfMonth = (year: number, month: number) => {
  const date = new Date(Date.UTC(year, month, 0))

  return date.toISOString().slice(0, 10)
}

const shiftMonth = (year: number, month: number, delta: number) => {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1
  }
}

export const buildRollingMonths = (year: number, month: number, count = 12) =>
  Array.from({ length: count }, (_, index) => shiftMonth(year, month, index - count + 1))

const mapAccount = (account: TreasuryBankAccountOverview): CashPositionOverview['accounts'][number] => ({
  accountId: account.accountId,
  accountName: account.accountName,
  bankName: account.bankName,
  currency: account.currency,
  instrumentCategory: account.instrumentCategory,
  providerSlug: account.providerSlug,
  openingBalance: account.openingBalance,
  closingBalance: account.closingBalance,
  closingBalanceClp: account.closingBalanceClp,
  periodInflows: account.periodInflows,
  periodOutflows: account.periodOutflows,
  accountKind: account.accountKind,
  reconciliationStatus: account.reconciliationStatus,
  driftAmount: account.drift?.hasOpenDrift ? account.drift.driftAmount : null,
  isActive: true
})

const getLegacySafeMonthlyRows = async ({
  fromYear,
  fromMonth,
  toYear,
  toMonth,
  spaceId
}: {
  fromYear: number
  fromMonth: number
  toYear: number
  toMonth: number
  spaceId: string | null
}) => {
  const db = await getDb()

  const rows = (
    await sql<MonthlyReadModelRow>`
      WITH months AS (
        SELECT generate_series(
          ${startOfMonth(fromYear, fromMonth)}::date,
          ${startOfMonth(toYear, toMonth)}::date,
          '1 month'::interval
        )::date AS month_start
      ),
      cash_in AS (
        SELECT
          date_trunc('month', ip.payment_date)::date AS month_start,
          SUM(
            COALESCE(
              ip.amount_clp,
              ip.amount * COALESCE(ip.exchange_rate_at_payment, i.exchange_rate_to_clp, 1)
            )
          )::text AS total_clp
        FROM greenhouse_finance.income_payments ip
        INNER JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
        WHERE ip.payment_date BETWEEN ${startOfMonth(fromYear, fromMonth)}::date AND ${endOfMonth(toYear, toMonth)}::date
          AND ip.superseded_by_payment_id IS NULL
          AND ip.superseded_by_otb_id IS NULL
          AND ip.superseded_at IS NULL
          AND (${spaceId}::text IS NULL OR ip.space_id = ${spaceId})
        GROUP BY 1
      ),
      cash_out AS (
        SELECT
          date_trunc('month', ep.payment_date)::date AS month_start,
          SUM(
            COALESCE(
              ep.amount_clp,
              ep.amount * COALESCE(ep.exchange_rate_at_payment, e.exchange_rate_to_clp, 1)
            )
          )::text AS total_clp
        FROM greenhouse_finance.expense_payments ep
        INNER JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
        WHERE ep.payment_date BETWEEN ${startOfMonth(fromYear, fromMonth)}::date AND ${endOfMonth(toYear, toMonth)}::date
          AND ep.superseded_by_payment_id IS NULL
          AND ep.superseded_by_otb_id IS NULL
          AND ep.superseded_at IS NULL
          AND (${spaceId}::text IS NULL OR ep.space_id = ${spaceId} OR e.space_id = ${spaceId})
        GROUP BY 1
      )
      SELECT
        EXTRACT(YEAR FROM m.month_start)::int AS year,
        EXTRACT(MONTH FROM m.month_start)::int AS month,
        COALESCE(ci.total_clp, '0') AS cash_in_clp,
        COALESCE(co.total_clp, '0') AS cash_out_clp,
        0::text AS snapshot_count
      FROM months m
      LEFT JOIN cash_in ci ON ci.month_start = m.month_start
      LEFT JOIN cash_out co ON co.month_start = m.month_start
      ORDER BY m.month_start ASC
    `.execute(db)
  ).rows

  return rows
}

const getMonthlyReadModelRows = async ({
  fromYear,
  fromMonth,
  toYear,
  toMonth,
  spaceId
}: {
  fromYear: number
  fromMonth: number
  toYear: number
  toMonth: number
  spaceId: string | null
}) => {
  const db = await getDb()

  const rows = (
    await sql<MonthlyReadModelRow>`
      WITH months AS (
        SELECT generate_series(
          ${startOfMonth(fromYear, fromMonth)}::date,
          ${startOfMonth(toYear, toMonth)}::date,
          '1 month'::interval
        )::date AS month_start
      ),
      monthly AS (
        SELECT
          abm.balance_year AS year,
          abm.balance_month AS month,
          SUM(CASE WHEN rules.contributes_to_cash THEN abm.period_inflows ELSE 0 END)::text AS cash_in_clp,
          SUM(CASE WHEN rules.contributes_to_cash THEN abm.period_outflows ELSE 0 END)::text AS cash_out_clp,
          COUNT(*)::text AS snapshot_count
        FROM greenhouse_finance.account_balances_monthly abm
        INNER JOIN greenhouse_finance.accounts a ON a.account_id = abm.account_id
        LEFT JOIN greenhouse_finance.instrument_category_kpi_rules rules
          ON rules.instrument_category = a.instrument_category
        WHERE (abm.balance_year * 100 + abm.balance_month)
          BETWEEN (${fromYear} * 100 + ${fromMonth}) AND (${toYear} * 100 + ${toMonth})
          AND a.is_active = TRUE
          AND (${spaceId}::text IS NULL OR abm.space_id = ${spaceId} OR a.space_id = ${spaceId})
        GROUP BY abm.balance_year, abm.balance_month
      )
      SELECT
        EXTRACT(YEAR FROM m.month_start)::int AS year,
        EXTRACT(MONTH FROM m.month_start)::int AS month,
        COALESCE(monthly.cash_in_clp, '0') AS cash_in_clp,
        COALESCE(monthly.cash_out_clp, '0') AS cash_out_clp,
        COALESCE(monthly.snapshot_count, '0') AS snapshot_count
      FROM months m
      LEFT JOIN monthly
        ON monthly.year = EXTRACT(YEAR FROM m.month_start)::int
       AND monthly.month = EXTRACT(MONTH FROM m.month_start)::int
      ORDER BY m.month_start ASC
    `.execute(db)
  ).rows

  return rows
}

const getReceivableSummary = async (spaceId: string | null) => {
  const db = await getDb()

  const rows = (
    await sql<ReceivablePayableRow>`
      WITH paid AS (
        SELECT
          ip.income_id,
          SUM(
            COALESCE(
              ip.amount_clp,
              ip.amount * COALESCE(ip.exchange_rate_at_payment, i.exchange_rate_to_clp, 1)
            )
          )::numeric AS paid_clp
        FROM greenhouse_finance.income_payments ip
        INNER JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
        WHERE ip.superseded_by_payment_id IS NULL
          AND ip.superseded_by_otb_id IS NULL
          AND ip.superseded_at IS NULL
          AND (${spaceId}::text IS NULL OR ip.space_id = ${spaceId})
        GROUP BY ip.income_id
      ),
      pending AS (
        SELECT
          GREATEST(i.total_amount_clp - COALESCE(paid.paid_clp, 0), 0)::numeric AS remaining_clp
        FROM greenhouse_finance.income i
        LEFT JOIN paid ON paid.income_id = i.income_id
        WHERE i.payment_status IN ('pending', 'partial')
          AND i.total_amount_clp > 0
          AND COALESCE(i.is_annulled, FALSE) = FALSE
      )
      SELECT
        COALESCE(SUM(remaining_clp), 0)::text AS total_clp,
        COUNT(*) FILTER (WHERE remaining_clp > 0)::text AS pending_count
      FROM pending
    `.execute(db)
  ).rows

  return {
    totalClp: roundCurrency(toNumber(rows[0]?.total_clp)),
    pendingInvoices: Math.round(toNumber(rows[0]?.pending_count))
  }
}

const getPayableSummary = async (spaceId: string | null) => {
  const db = await getDb()

  const rows = (
    await sql<ReceivablePayableRow>`
      WITH paid AS (
        SELECT
          ep.expense_id,
          SUM(
            COALESCE(
              ep.amount_clp,
              ep.amount * COALESCE(ep.exchange_rate_at_payment, e.exchange_rate_to_clp, 1)
            )
          )::numeric AS paid_clp
        FROM greenhouse_finance.expense_payments ep
        INNER JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
        WHERE ep.superseded_by_payment_id IS NULL
          AND ep.superseded_by_otb_id IS NULL
          AND ep.superseded_at IS NULL
          AND (${spaceId}::text IS NULL OR ep.space_id = ${spaceId} OR e.space_id = ${spaceId})
        GROUP BY ep.expense_id
      ),
      pending AS (
        SELECT
          GREATEST(e.total_amount_clp - COALESCE(paid.paid_clp, 0), 0)::numeric AS remaining_clp
        FROM greenhouse_finance.expenses e
        LEFT JOIN paid ON paid.expense_id = e.expense_id
        WHERE e.payment_status IN ('pending', 'partial')
          AND e.total_amount_clp > 0
          AND (${spaceId}::text IS NULL OR e.space_id = ${spaceId})
      )
      SELECT
        COALESCE(SUM(remaining_clp), 0)::text AS total_clp,
        COUNT(*) FILTER (WHERE remaining_clp > 0)::text AS pending_count
      FROM pending
    `.execute(db)
  ).rows

  return {
    totalClp: roundCurrency(toNumber(rows[0]?.total_clp)),
    pendingExpenses: Math.round(toNumber(rows[0]?.pending_count))
  }
}

export const getCashPositionOverview = async ({
  year,
  month,
  actorUserId,
  spaceId
}: {
  year?: number | null
  month?: number | null
  actorUserId?: string | null
  spaceId?: string | null
}): Promise<CashPositionOverview> => {
  const bankOverview = await getBankOverview({
    year: year ?? null,
    month: month ?? null,
    actorUserId: actorUserId ?? null,
    materialize: 'skip'
  })

  const rollingMonths = buildRollingMonths(bankOverview.period.year, bankOverview.period.month)
  const firstMonth = rollingMonths[0]
  const lastMonth = rollingMonths[rollingMonths.length - 1]
  const scopedSpaceId = spaceId ?? null

  const [monthlyReadModelRows, legacySafeRows, receivable, payable] = await Promise.all([
    getMonthlyReadModelRows({
      fromYear: firstMonth.year,
      fromMonth: firstMonth.month,
      toYear: lastMonth.year,
      toMonth: lastMonth.month,
      spaceId: scopedSpaceId
    }),
    getLegacySafeMonthlyRows({
      fromYear: firstMonth.year,
      fromMonth: firstMonth.month,
      toYear: lastMonth.year,
      toMonth: lastMonth.month,
      spaceId: scopedSpaceId
    }),
    getReceivableSummary(scopedSpaceId),
    getPayableSummary(scopedSpaceId)
  ])

  const readModelByPeriod = new Map(monthlyReadModelRows.map(row => [`${row.year}-${row.month}`, row]))
  const legacyByPeriod = new Map(legacySafeRows.map(row => [`${row.year}-${row.month}`, row]))

  const monthlySeries = rollingMonths.map(period => {
    const key = `${period.year}-${period.month}`
    const readModelRow = readModelByPeriod.get(key)
    const legacyRow = legacyByPeriod.get(key)
    const useReadModel = toNumber(readModelRow?.snapshot_count) > 0
    const source: CashPositionMonthlySource = useReadModel ? 'monthly_read_model' : 'legacy_safe_fallback'
    const row = useReadModel ? readModelRow : legacyRow
    const cashInClp = roundCurrency(toNumber(row?.cash_in_clp))
    const cashOutClp = roundCurrency(toNumber(row?.cash_out_clp))

    return {
      year: period.year,
      month: period.month,
      cashInClp,
      cashOutClp,
      netFlowClp: roundCurrency(cashInClp - cashOutClp),
      source,
      isDegraded: !useReadModel
    }
  })

  const cashAvailableClp = roundCurrency(bankOverview.kpis.breakdown.cash)
  const creditUsedClp = roundCurrency(bankOverview.kpis.breakdown.credit)
  const platformInternalClp = roundCurrency(bankOverview.kpis.breakdown.platformInternal)
  const netPositionClp = roundCurrency(cashAvailableClp + receivable.totalClp - payable.totalClp - creditUsedClp)

  return {
    period: {
      year: bankOverview.period.year,
      month: bankOverview.period.month,
      startDate: bankOverview.period.startDate,
      endDate: bankOverview.period.endDate
    },
    kpis: {
      cashAvailableClp,
      creditUsedClp,
      platformInternalClp,
      receivableClp: receivable.totalClp,
      payableClp: payable.totalClp,
      netPositionClp,
      activeAccounts: bankOverview.kpis.activeAccounts
    },
    fxGainLoss: bankOverview.kpis.fxGainLoss,
    monthlySeries,
    accounts: bankOverview.accounts.map(mapAccount),
    freshness: bankOverview.freshness ?? {
      lastMaterializedAt: null,
      ageSeconds: null,
      isStale: true,
      label: 'Sin snapshots materializados'
    },
    legacy: {
      receivable,
      payable,
      fxGainLossClp: bankOverview.kpis.fxGainLossClp,
      netPosition: netPositionClp
    }
  }
}
