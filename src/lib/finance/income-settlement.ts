import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'

/**
 * # Income Settlement Reconciliation — canonical read API
 *
 * In Greenhouse a customer-facing receivable (`greenhouse_finance.income`)
 * can be settled through THREE different mechanisms — and `amount_paid` is
 * the *total* settled portion regardless of which mechanism closed it:
 *
 *   1. **Cash payments** — `income_payments.amount` (default path)
 *   2. **Factoring fees** — `factoring_operations.fee_amount` while `status = 'active'`.
 *      The receivable IS settled for this portion because we sold the AR
 *      risk to the factoring provider, even though the fee never lands as
 *      cash. (Composed of `interest_amount` + `advisory_fee_amount`.)
 *   3. **Tax withholdings** — `income.withholding_amount`. The customer
 *      retained part of the invoice and pays it to SII directly. The
 *      receivable IS settled for that portion even though it never reaches us.
 *
 * The canonical equation:
 *
 * ```
 *   amount_paid == SUM(income_payments.amount)
 *                + SUM(factoring_operations.fee_amount WHERE status='active')
 *                + COALESCE(withholding_amount, 0)
 * ```
 *
 * Anything else is a `drift` — a real ledger inconsistency that needs a
 * human to investigate.
 *
 * ⚠️ FOR AGENTS / FUTURE DEVS:
 *
 * - **Never** compute drift by `income.amount_paid - SUM(income_payments)`
 *   alone. That model is incomplete: every factored invoice and every
 *   withheld invoice will look like drift.
 * - **Never** re-derive the equation in a new SQL query in another module.
 *   Use this helper or the underlying view
 *   `greenhouse_finance.income_settlement_reconciliation`.
 * - When a NEW settlement mechanism appears (credit notes, partial
 *   write-offs, foreign withholdings, etc.), extend BOTH:
 *   - the view (migration), and
 *   - this helper (so consumer code keeps working with one type).
 * - The Reliability Control Plane "drift de ledger" warning queries this
 *   view. If you bypass it you will produce inconsistent dashboards.
 *
 * The view also exposes `is_factored` so consumer UIs can render a
 * "Factorada" chip on the invoice without re-querying `factoring_operations`.
 */

export interface IncomeSettlementBreakdown {
  incomeId: string
  invoiceNumber: string | null
  clientId: string | null
  totalAmount: number
  amountPaid: number
  paymentStatus: string

  /** Sum of `income_payments.amount` (cash actually received). */
  paymentsTotal: number

  /** Sum of `factoring_operations.fee_amount` for active operations. */
  factoringFeeTotal: number

  /** How many active factoring operations are linked to this income. */
  factoringOperationCount: number

  /** Tax retained by the customer and paid to SII directly. */
  withholdingAmount: number

  /**
   * Expected `amount_paid` given the composition of payments + factoring
   * fees + withholdings. The canonical settlement total.
   */
  expectedSettlement: number

  /** `amount_paid - expectedSettlement`. Zero when consistent. */
  drift: number

  /** True when `|drift| > 0.01` — a real ledger inconsistency. */
  hasDrift: boolean

  /** True when the invoice has at least one active factoring operation. */
  isFactored: boolean
}

interface SettlementRow {
  income_id: string
  invoice_number: string | null
  client_id: string | null
  total_amount: string | number
  amount_paid: string | number
  payment_status: string
  payments_total: string | number
  factoring_fee_total: string | number
  factoring_operation_count: number
  withholding_amount: string | number
  expected_settlement: string | number
  drift: string | number
  has_drift: boolean
  is_factored: boolean
}

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0

  const n = typeof value === 'string' ? Number(value) : value

  return Number.isFinite(n) ? n : 0
}

const mapRow = (row: SettlementRow): IncomeSettlementBreakdown => ({
  incomeId: row.income_id,
  invoiceNumber: row.invoice_number,
  clientId: row.client_id,
  totalAmount: toNumber(row.total_amount),
  amountPaid: toNumber(row.amount_paid),
  paymentStatus: row.payment_status,
  paymentsTotal: toNumber(row.payments_total),
  factoringFeeTotal: toNumber(row.factoring_fee_total),
  factoringOperationCount: row.factoring_operation_count,
  withholdingAmount: toNumber(row.withholding_amount),
  expectedSettlement: toNumber(row.expected_settlement),
  drift: toNumber(row.drift),
  hasDrift: row.has_drift,
  isFactored: row.is_factored
})

/**
 * Read the settlement breakdown for a single income. Returns `null` when
 * the income doesn't exist or is annulled (the view excludes annulled rows).
 */
export const getIncomeSettlementBreakdown = async (
  incomeId: string
): Promise<IncomeSettlementBreakdown | null> => {
  const db = await getDb()

  const result = await sql<SettlementRow>`
    SELECT *
      FROM greenhouse_finance.income_settlement_reconciliation
      WHERE income_id = ${incomeId}
      LIMIT 1
  `.execute(db)

  return result.rows[0] ? mapRow(result.rows[0]) : null
}

/**
 * Read the latest invoices that show ledger drift. Used by the Reliability
 * Control Plane to surface real platform integrity issues, AND by the
 * Finance reconciliation view to give finance ops a queue to work through.
 *
 * @param limit  Max rows to return (default 50, capped at 500).
 */
export const listIncomesWithSettlementDrift = async (
  options: { limit?: number } = {}
): Promise<IncomeSettlementBreakdown[]> => {
  const db = await getDb()
  const limit = Math.max(1, Math.min(options.limit ?? 50, 500))

  const result = await sql<SettlementRow>`
    SELECT *
      FROM greenhouse_finance.income_settlement_reconciliation
      WHERE has_drift = TRUE
      ORDER BY ABS(drift) DESC, income_id ASC
      LIMIT ${limit}
  `.execute(db)

  return result.rows.map(mapRow)
}

/**
 * Count of incomes with active drift. Used by the Reliability Control Plane
 * dashboard query for the `payment_ledger_integrity` metric. Cheap (single
 * COUNT against the view).
 */
export const countIncomesWithSettlementDrift = async (): Promise<number> => {
  const db = await getDb()

  const result = await sql<{ cnt: string | number }>`
    SELECT COUNT(*) AS cnt
      FROM greenhouse_finance.income_settlement_reconciliation
      WHERE has_drift = TRUE
  `.execute(db)

  return toNumber(result.rows[0]?.cnt ?? 0)
}
