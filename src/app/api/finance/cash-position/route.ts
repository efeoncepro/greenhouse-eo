import { NextResponse } from 'next/server'

import { roundCurrency, toNumber, normalizeString } from '@/lib/finance/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// ── Postgres row types ────────────────────────────────────────────

interface AccountRow extends Record<string, unknown> {
  account_id: string
  account_name: string
  bank_name: string | null
  currency: string
  opening_balance: string | number
  is_active: boolean
}

interface ReceivableRow extends Record<string, unknown> {
  receivable_clp: string | number
  pending_invoices: string | number
}

interface PayableRow extends Record<string, unknown> {
  payable_clp: string | number
  pending_expenses: string | number
}

interface CashFlowRow extends Record<string, unknown> {
  month_start: string | Date
  year: string | number
  month: string | number
  cash_in_clp: string | number
  cash_out_clp: string | number
  net_flow_clp: string | number
}

// ── Route ─────────────────────────────────────────────────────────

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [accounts, receivable, payable, monthlySeries] = await Promise.all([
    // Query 1 — Active accounts
    runGreenhousePostgresQuery<AccountRow>(
      `SELECT account_id, account_name, bank_name, currency, opening_balance, is_active
       FROM greenhouse_finance.accounts
       WHERE is_active = TRUE
       ORDER BY account_name`
    ),

    // Query 2 — Accounts receivable (pending invoices)
    runGreenhousePostgresQuery<ReceivableRow>(
      `SELECT
         COALESCE(SUM(total_amount_clp - COALESCE(amount_paid * COALESCE(exchange_rate_to_clp, 1), 0)), 0) AS receivable_clp,
         COUNT(*) AS pending_invoices
       FROM greenhouse_finance.income
       WHERE payment_status IN ('pending', 'partial')
         AND total_amount_clp > 0`
    ),

    // Query 3 — Accounts payable (pending expenses)
    runGreenhousePostgresQuery<PayableRow>(
      `SELECT
         COALESCE(SUM(total_amount_clp - COALESCE(amount_paid * COALESCE(exchange_rate_to_clp, 1), 0)), 0) AS payable_clp,
         COUNT(*) AS pending_expenses
       FROM greenhouse_finance.expenses
       WHERE payment_status IN ('pending', 'partial')
         AND total_amount_clp > 0`
    ),

    // Query 4 — 12-month cash flow series (real cash, not accrual)
    runGreenhousePostgresQuery<CashFlowRow>(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
           date_trunc('month', CURRENT_DATE),
           '1 month'::interval
         )::date AS month_start
       ),
       cash_in AS (
         SELECT
           date_trunc('month', ip.payment_date)::date AS month_start,
           COALESCE(SUM(ip.amount * COALESCE(i.exchange_rate_to_clp, 1)), 0) AS total_clp
         FROM greenhouse_finance.income_payments ip
         INNER JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
         WHERE ip.payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '11 months')
         GROUP BY 1
       ),
       cash_out AS (
         SELECT
           date_trunc('month', ep.payment_date)::date AS month_start,
           COALESCE(SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1)), 0) AS total_clp
         FROM greenhouse_finance.expense_payments ep
         INNER JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
         WHERE ep.payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '11 months')
         GROUP BY 1
       )
       SELECT
         m.month_start,
         EXTRACT(YEAR FROM m.month_start)::int AS year,
         EXTRACT(MONTH FROM m.month_start)::int AS month,
         COALESCE(ci.total_clp, 0) AS cash_in_clp,
         COALESCE(co.total_clp, 0) AS cash_out_clp,
         COALESCE(ci.total_clp, 0) - COALESCE(co.total_clp, 0) AS net_flow_clp
       FROM months m
       LEFT JOIN cash_in ci ON ci.month_start = m.month_start
       LEFT JOIN cash_out co ON co.month_start = m.month_start
       ORDER BY m.month_start`
    )
  ])

  const receivableClp = roundCurrency(toNumber(receivable[0]?.receivable_clp))
  const pendingInvoices = toNumber(receivable[0]?.pending_invoices)
  const payableClp = roundCurrency(toNumber(payable[0]?.payable_clp))
  const pendingExpenses = toNumber(payable[0]?.pending_expenses)

  return NextResponse.json({
    accounts: accounts.map(a => ({
      accountId: a.account_id,
      accountName: normalizeString(a.account_name),
      bankName: a.bank_name ? normalizeString(a.bank_name) : null,
      currency: a.currency,
      openingBalance: roundCurrency(toNumber(a.opening_balance)),
      isActive: a.is_active
    })),
    receivable: {
      totalClp: receivableClp,
      pendingInvoices
    },
    payable: {
      totalClp: payableClp,
      pendingExpenses
    },
    netPosition: roundCurrency(receivableClp - payableClp),
    monthlySeries: monthlySeries.map(row => ({
      year: toNumber(row.year),
      month: toNumber(row.month),
      cashInClp: roundCurrency(toNumber(row.cash_in_clp)),
      cashOutClp: roundCurrency(toNumber(row.cash_out_clp)),
      netFlowClp: roundCurrency(toNumber(row.net_flow_clp))
    }))
  })
}
