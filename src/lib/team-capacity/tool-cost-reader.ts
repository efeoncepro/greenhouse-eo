import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { FinanceCurrency } from '@/lib/finance/shared'

import type { SubscriptionLicenseCostInput } from './tool-cost-attribution'

type Period = {
  year: number
  month: number
}

type LicenseCostRow = {
  tool_id: string
  cost_model: string | null
  subscription_amount: number | string | null
  subscription_currency: string | null
  subscription_billing_cycle: string | null
  subscription_seats: number | string | null
}

type ToolingCostRow = {
  total_tooling_cost_target: number | string | null
}

type ExchangeRateRow = {
  from_currency: string
  rate: number | string | null
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const toNum = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const getPeriodStartDate = ({ year, month }: Period) => `${year}-${pad2(month)}-01`

const getPeriodEndDate = ({ year, month }: Period) => {
  const end = new Date(Date.UTC(year, month, 0))

  return end.toISOString().slice(0, 10)
}

const getLastBusinessDay = (period: Period) => {
  const end = new Date(`${getPeriodEndDate(period)}T00:00:00Z`)

  while (end.getUTCDay() === 0 || end.getUTCDay() === 6) {
    end.setUTCDate(end.getUTCDate() - 1)
  }

  return end.toISOString().slice(0, 10)
}

type MemberDirectExpenseRow = {
  total_direct_expense_clp: number | string | null
}

export type MemberDirectToolCostSources = {
  licenses: SubscriptionLicenseCostInput[]
  toolingCostTarget: number
  memberDirectExpensesTarget: number
  targetCurrency: FinanceCurrency
  fxByCurrency: Partial<Record<FinanceCurrency, number>>
}

export const readMemberDirectToolCosts = async (
  memberId: string,
  period: Period,
  { targetCurrency = 'CLP' as FinanceCurrency }: { targetCurrency?: FinanceCurrency } = {}
): Promise<MemberDirectToolCostSources> => {
  const periodStart = getPeriodStartDate(period)
  const periodEnd = getPeriodEndDate(period)
  const lastBusinessDay = getLastBusinessDay(period)

  // Each source degrades independently — missing tables should not block the others
  const safeQuery = <T>(promise: Promise<T[]>): Promise<T[]> =>
    promise.catch(() => [] as T[])

  const [licenseRows, toolingRows, directExpenseRows] = await Promise.all([
    safeQuery(runGreenhousePostgresQuery<LicenseCostRow>(
      `
        SELECT
          t.tool_id,
          t.cost_model,
          t.subscription_amount,
          t.subscription_currency,
          t.subscription_billing_cycle,
          t.subscription_seats
        FROM greenhouse_ai.member_tool_licenses AS l
        INNER JOIN greenhouse_ai.tool_catalog AS t
          ON t.tool_id = l.tool_id
        WHERE l.member_id = $1
          AND l.license_status = 'active'
          AND COALESCE(l.activated_at, $2::date) <= $3::date
          AND (l.expires_at IS NULL OR l.expires_at >= $2::date)
          AND t.is_active = TRUE
          AND t.cost_model IN ('subscription', 'hybrid')
        ORDER BY t.tool_id ASC
      `,
      [memberId, periodStart, periodEnd]
    )),
    safeQuery(runGreenhousePostgresQuery<ToolingCostRow>(
      `
        SELECT
          COALESCE(SUM(COALESCE(total_cost_clp, 0)), 0) AS total_tooling_cost_target
        FROM greenhouse_ai.credit_ledger
        WHERE consumed_by_member_id = $1
          AND entry_type = 'debit'
          AND created_at::date >= $2::date
          AND created_at::date <= $3::date
      `,
      [memberId, periodStart, periodEnd]
    )),

    // Member-direct expenses from finance (equipment, reimbursements, other).
    // tool_license and tool_usage are EXCLUDED to avoid double-counting with AI tooling sources above.
    safeQuery(runGreenhousePostgresQuery<MemberDirectExpenseRow>(
      `
        SELECT
          COALESCE(SUM(COALESCE(effective_cost_amount_clp, total_amount_clp, 0)), 0) AS total_direct_expense_clp
        FROM greenhouse_finance.expenses
        WHERE direct_overhead_member_id = $1
          AND direct_overhead_scope = 'member_direct'
          AND direct_overhead_kind NOT IN ('tool_license', 'tool_usage')
          AND COALESCE(document_date, payment_date) >= $2::date
          AND COALESCE(document_date, payment_date) <= $3::date
      `,
      [memberId, periodStart, periodEnd]
    ))
  ])

  const neededCurrencies = Array.from(
    new Set(
      licenseRows
        .map(row => String(row.subscription_currency || targetCurrency).trim().toUpperCase())
        .filter(currency => currency !== targetCurrency)
    )
  ) as FinanceCurrency[]

  const exchangeRates = neededCurrencies.length > 0
    ? await runGreenhousePostgresQuery<ExchangeRateRow>(
        `
          SELECT DISTINCT ON (from_currency)
            from_currency,
            rate
          FROM greenhouse_finance.exchange_rates
          WHERE from_currency = ANY($1::text[])
            AND to_currency = $2
            AND rate_date <= $3::date
          ORDER BY from_currency, rate_date DESC
        `,
        [neededCurrencies, targetCurrency, lastBusinessDay]
      )
    : []

  const fxByCurrency = Object.fromEntries(
    exchangeRates.map(row => [String(row.from_currency).trim().toUpperCase(), toNum(row.rate)])
  ) as Partial<Record<FinanceCurrency, number>>

  return {
    licenses: licenseRows.map(row => ({
      toolId: row.tool_id,
      costModel: (String(row.cost_model || 'subscription').trim().toLowerCase() === 'hybrid' ? 'hybrid' : 'subscription'),
      subscriptionAmount: row.subscription_amount == null ? null : toNum(row.subscription_amount),
      subscriptionCurrency: (String(row.subscription_currency || targetCurrency).trim().toUpperCase() || targetCurrency) as FinanceCurrency,
      subscriptionBillingCycle: row.subscription_billing_cycle,
      subscriptionSeats: row.subscription_seats == null ? null : toNum(row.subscription_seats)
    })),
    toolingCostTarget: toNum(toolingRows[0]?.total_tooling_cost_target),
    memberDirectExpensesTarget: toNum(directExpenseRows[0]?.total_direct_expense_clp),
    targetCurrency,
    fxByCurrency
  }
}
