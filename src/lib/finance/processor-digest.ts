import 'server-only'

import {
  runGreenhousePostgresQuery
} from '@/lib/postgres/client'
import { normalizeString, roundCurrency, toNumber } from '@/lib/finance/shared'

/**
 * TASK-706 — Processor Digest Reader.
 * ===========================================
 *
 * `payroll_processor` accounts (Previred today, Caja de Compensación / SII /
 * future processors tomorrow) are NOT bank ledgers. The cash always lives in
 * the real payer account (`santander-clp` for Previred). The processor surface
 * narrates the operational reality: which payments were processed in the
 * period, how much, from where, and whether the social-security breakdown is
 * already componentized.
 *
 * This module decouples the processor digest from the bank balance reader so
 * that:
 *   - the same data can be reused by future consumers (expense detail page,
 *     reports, AI observers) without re-running the bank overview.
 *   - the matching rule (which expenses count as "this processor") is a single
 *     pure function (`inferProcessorScope`) instead of leaking SQL conditions
 *     across consumers.
 *   - V2 — when TASK-707 lands a structural anchor (`expense.payroll_processor_id`
 *     or `expense_payments.processed_by`), this module switches to that anchor
 *     without touching consumers.
 *
 * V1 matching (Previred only) — heuristic anchored on:
 *   1. `expenses.expense_type = 'social_security'`
 *   2. `expenses.social_security_institution ILIKE '%<processor_keyword>%'`
 *      OR `expenses.supplier_name ILIKE '%<processor_keyword>%'`
 *   3. canonical supersede chain (income/expense_payment + settlement_leg
 *      three-axis filter).
 *
 * The processor scope is derived from `accounts.account_id`. Hardcoding the
 * keyword is intentional V1: the processor catalog has 1 active row today
 * (`previred-clp`). When TASK-712 (Tool Catalog Consolidation) ships, the
 * keyword/scope moves to a per-processor config column.
 */

export type ProcessorComponentizationStatus =
  /** at least one payment in the period exists and all linked expenses are reconciled */
  | 'componentized'
  /** at least one payment exists but linked expenses still have payroll/period gaps */
  | 'pending_componentization'
  /** zero processor-attributable payments in the period */
  | 'none'

export interface TreasuryProcessorPayment {
  paymentId: string
  expenseId: string
  paymentDate: string | null
  amount: number
  amountClp: number | null
  currency: string
  payerAccountId: string | null
  payerAccountName: string | null
  reference: string | null
  /** Resolved expense type (always 'social_security' in V1, kept for future processors). */
  expenseType: string | null
  /** Free-text institution from `expenses.social_security_institution`. */
  institution: string | null
  /** payroll_period_id when the expense was anchored to a closed period; null otherwise. */
  payrollPeriodId: string | null
  /** Year/month declared on the expense (independent from payment_date). */
  periodYear: number | null
  periodMonth: number | null
  isReconciled: boolean
}

export interface TreasuryProcessorDigest {
  /** Identifies the processor account (e.g. 'previred-clp'). */
  accountId: string
  /** Display name (account.account_name) — for UI titles. */
  accountName: string
  /** ISO range for which the digest was computed. */
  periodStart: string
  periodEnd: string
  paymentCount: number
  /** Total processed in account.currency. */
  processedAmount: number
  /** Total processed in CLP for cross-currency aggregation. */
  processedAmountClp: number
  /** Distinct payer accounts surfaced to the UI as "el cash salió de aquí". */
  payerAccounts: Array<{ accountId: string; accountName: string; amount: number }>
  componentizationStatus: ProcessorComponentizationStatus
  payments: TreasuryProcessorPayment[]
}

/**
 * Returns the matching scope for a processor account. V1 heuristic. Kept pure
 * so that future processors plug in without runtime overhead.
 */
export const inferProcessorScope = (account: {
  accountId: string
  instrumentCategory: string | null
  providerSlug?: string | null
}): { keywords: string[]; expenseType: string } | null => {
  if (account.instrumentCategory !== 'payroll_processor') return null

  // V1: keyword-based match. When TASK-712 ships, this becomes a registry
  // lookup keyed by account_id (or by accounts.metadata_json.processorScope).
  const aid = account.accountId.toLowerCase()

  if (aid.includes('previred')) {
    return { keywords: ['previred'], expenseType: 'social_security' }
  }

  // Future: caja_compensacion, sii_iva_processor, etc. would land here.
  return null
}

type ProcessorPaymentRow = {
  payment_id: string
  expense_id: string
  payment_date: string | Date | null
  amount: string
  amount_clp: string | null
  currency: string
  payment_account_id: string | null
  payer_account_name: string | null
  reference: string | null
  expense_type: string | null
  social_security_institution: string | null
  payroll_period_id: string | null
  period_year: number | null
  period_month: number | null
  is_reconciled: boolean
} & Record<string, unknown>

const SQL = `
  SELECT
    ep.payment_id,
    ep.expense_id,
    ep.payment_date::date::text AS payment_date,
    ep.amount::text AS amount,
    ep.amount_clp::text AS amount_clp,
    ep.currency,
    ep.payment_account_id,
    payer.account_name AS payer_account_name,
    ep.reference,
    e.expense_type,
    e.social_security_institution,
    e.payroll_period_id,
    e.period_year,
    e.period_month,
    ep.is_reconciled
  FROM greenhouse_finance.expense_payments ep
  JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
  LEFT JOIN greenhouse_finance.accounts payer ON payer.account_id = ep.payment_account_id
  WHERE ep.payment_date >= $1::date
    AND ep.payment_date <= $2::date
    AND ep.superseded_by_payment_id IS NULL
    AND ep.superseded_at IS NULL
    AND ep.superseded_by_otb_id IS NULL
    AND e.expense_type = $3
    AND (
      ($4::text[] = ARRAY[]::text[])
      OR EXISTS (
        SELECT 1 FROM unnest($4::text[]) AS kw
        WHERE COALESCE(LOWER(e.social_security_institution), '') LIKE '%' || kw || '%'
           OR COALESCE(LOWER(e.supplier_name), '') LIKE '%' || kw || '%'
      )
    )
  ORDER BY ep.payment_date DESC, ep.payment_id DESC
`

const mapRow = (row: ProcessorPaymentRow): TreasuryProcessorPayment => ({
  paymentId: normalizeString(row.payment_id),
  expenseId: normalizeString(row.expense_id),
  paymentDate: row.payment_date
    ? typeof row.payment_date === 'string' ? row.payment_date : row.payment_date.toISOString().slice(0, 10)
    : null,
  amount: roundCurrency(toNumber(row.amount)),
  amountClp: row.amount_clp !== null ? roundCurrency(toNumber(row.amount_clp)) : null,
  currency: normalizeString(row.currency || 'CLP') || 'CLP',
  payerAccountId: row.payment_account_id ? normalizeString(row.payment_account_id) : null,
  payerAccountName: row.payer_account_name ? normalizeString(row.payer_account_name) : null,
  reference: row.reference ? normalizeString(row.reference) : null,
  expenseType: row.expense_type ? normalizeString(row.expense_type) : null,
  institution: row.social_security_institution ? normalizeString(row.social_security_institution) : null,
  payrollPeriodId: row.payroll_period_id ? normalizeString(row.payroll_period_id) : null,
  periodYear: row.period_year ?? null,
  periodMonth: row.period_month ?? null,
  isReconciled: Boolean(row.is_reconciled)
})

/**
 * Computes the componentization status from the payments returned by the
 * scope query.
 *
 *   - none: zero rows (no payment in the period)
 *   - componentized: every row has a payroll_period_id (formal anchor) AND
 *     is_reconciled=true. The expense lifecycle is closed.
 *   - pending_componentization: at least one row exists but the cohort still
 *     has unreconciled or non-anchored items.
 *
 * When TASK-707 introduces explicit `expense.componentization_status`, this
 * derivation collapses to a SELECT of that column.
 */
const deriveComponentizationStatus = (
  payments: TreasuryProcessorPayment[]
): ProcessorComponentizationStatus => {
  if (payments.length === 0) return 'none'

  const allComponentized = payments.every(p => p.payrollPeriodId !== null && p.isReconciled)

  return allComponentized ? 'componentized' : 'pending_componentization'
}

const aggregatePayerAccounts = (payments: TreasuryProcessorPayment[]) => {
  const buckets = new Map<string, { accountId: string; accountName: string; amount: number }>()

  for (const p of payments) {
    if (!p.payerAccountId) continue
    const existing = buckets.get(p.payerAccountId)
    const accountName = p.payerAccountName || p.payerAccountId

    if (existing) {
      existing.amount = roundCurrency(existing.amount + p.amount)
    } else {
      buckets.set(p.payerAccountId, {
        accountId: p.payerAccountId,
        accountName,
        amount: p.amount
      })
    }
  }

  return Array.from(buckets.values()).sort((a, b) => b.amount - a.amount)
}

interface GetProcessorDigestInput {
  accountId: string
  accountName: string
  instrumentCategory: string | null
  providerSlug?: string | null
  periodStart: string
  periodEnd: string
}

/**
 * Returns the digest for a payroll_processor account, or `null` when the
 * account is not a processor (so callers can call unconditionally).
 *
 * Quiet contract: when matching keywords are unknown for this processor
 * (V1 has only Previred), returns `componentizationStatus='none'` with empty
 * payments — so the UI can render "no procesador match yet" instead of an
 * incorrect zero. The accountName + accountId travel back so the UI can
 * narrate the empty state honestly.
 */
export const getProcessorDigest = async (
  input: GetProcessorDigestInput
): Promise<TreasuryProcessorDigest | null> => {
  const scope = inferProcessorScope({
    accountId: input.accountId,
    instrumentCategory: input.instrumentCategory,
    providerSlug: input.providerSlug ?? null
  })

  if (!scope) return null

  const rows = await runGreenhousePostgresQuery<ProcessorPaymentRow>(
    SQL,
    [input.periodStart, input.periodEnd, scope.expenseType, scope.keywords]
  )

  const payments = rows.map(mapRow)
  const processedAmount = roundCurrency(payments.reduce((sum, p) => sum + p.amount, 0))

  const processedAmountClp = roundCurrency(
    payments.reduce((sum, p) => sum + (p.amountClp ?? p.amount), 0)
  )

  return {
    accountId: input.accountId,
    accountName: input.accountName,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    paymentCount: payments.length,
    processedAmount,
    processedAmountClp,
    payerAccounts: aggregatePayerAccounts(payments),
    componentizationStatus: deriveComponentizationStatus(payments),
    payments
  }
}
