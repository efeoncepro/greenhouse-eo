import { NextResponse } from 'next/server'

import { sumExpensePaymentsClpForPeriod } from '@/lib/finance/expense-payments-reader'
import {
  toNumber,
  toDateString,
  toTimestampString,
  normalizeString
} from '@/lib/finance/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// ── Row shapes ──────────────────────────────────────────────────────

interface PaymentRow {
  [key: string]: unknown
  payment_id: string
  expense_id: string
  payment_date: unknown
  amount: unknown
  currency: string
  reference: string | null
  payment_method: string | null
  payment_source: string | null
  is_reconciled: boolean
  created_at: unknown
  expense_description: string
  expense_type: string
  expense_total: unknown
  supplier_id: string | null
  supplier_name: string | null
  cost_category: string | null
  document_number: string | null
  member_name: string | null
  exchange_rate_to_clp: unknown
  payment_account_id: string | null
  payment_account_name: string | null
  payment_provider_slug: string | null
  payment_instrument_category: string | null
}

// ── Normalizer ──────────────────────────────────────────────────────

const normalizePayment = (row: PaymentRow) => ({
  paymentId: normalizeString(row.payment_id),
  expenseId: normalizeString(row.expense_id),
  paymentDate: toDateString(row.payment_date as string | { value?: string } | null),
  amount: toNumber(row.amount),
  currency: normalizeString(row.currency),
  reference: row.reference ? normalizeString(row.reference) : null,
  paymentMethod: row.payment_method ? normalizeString(row.payment_method) : null,
  paymentSource: row.payment_source ? normalizeString(row.payment_source) : null,
  isReconciled: Boolean(row.is_reconciled),
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  expenseDescription: normalizeString(row.expense_description),
  expenseType: normalizeString(row.expense_type),
  expenseTotal: toNumber(row.expense_total),
  supplierId: row.supplier_id ? normalizeString(row.supplier_id) : null,
  supplierName: row.supplier_name ? normalizeString(row.supplier_name) : null,
  costCategory: row.cost_category ? normalizeString(row.cost_category) : null,
  documentNumber: row.document_number ? normalizeString(row.document_number) : null,
  memberName: row.member_name ? normalizeString(row.member_name) : null,
  exchangeRateToClp: toNumber(row.exchange_rate_to_clp),
  paymentAccountId: row.payment_account_id ? normalizeString(row.payment_account_id) : null,
  paymentAccountName: row.payment_account_name ? normalizeString(row.payment_account_name) : null,
  paymentProviderSlug: row.payment_provider_slug ? normalizeString(row.payment_provider_slug) : null,
  paymentInstrumentCategory: row.payment_instrument_category ? normalizeString(row.payment_instrument_category) : null
})

// ── GET handler ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')
  const expenseType = searchParams.get('expenseType')
  const supplierId = searchParams.get('supplierId')
  const isReconciledParam = searchParams.get('isReconciled')
  const page = Math.max(1, toNumber(searchParams.get('page') || '1'))
  const pageSize = Math.min(200, Math.max(1, toNumber(searchParams.get('pageSize') || '50')))

  // ── Build dynamic WHERE clauses ───────────────────────────────────
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 0

  const addParam = (value: unknown): string => {
    paramIndex++
    params.push(value)

    return `$${paramIndex}`
  }

  if (fromDate) {
    conditions.push(`ep.payment_date >= ${addParam(fromDate)}`)
  }

  if (toDate) {
    conditions.push(`ep.payment_date <= ${addParam(toDate)}`)
  }

  if (expenseType) {
    conditions.push(`e.expense_type = ${addParam(expenseType)}`)
  }

  if (supplierId) {
    conditions.push(`e.supplier_id = ${addParam(supplierId)}`)
  }

  if (isReconciledParam !== null) {
    conditions.push(`ep.is_reconciled = ${addParam(isReconciledParam === 'true')}`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    // ── Count query ─────────────────────────────────────────────────
    const countResult = await runGreenhousePostgresQuery<{ total: string }>(
      `
      SELECT COUNT(*) AS total
      FROM greenhouse_finance.expense_payments ep
      INNER JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
      ${whereClause}
      `,
      params
    )

    const total = toNumber(countResult[0]?.total)

    // ── Data query ──────────────────────────────────────────────────
    const limitParam = addParam(pageSize)
    const offsetParam = addParam((page - 1) * pageSize)

    const rows = await runGreenhousePostgresQuery<PaymentRow>(
      `
      SELECT
        ep.payment_id,
        ep.expense_id,
        ep.payment_date,
        ep.amount,
        ep.currency,
        ep.reference,
        ep.payment_method,
        ep.payment_source,
        ep.is_reconciled,
        ep.created_at,
        ep.payment_account_id,
        e.description AS expense_description,
        e.expense_type,
        e.total_amount AS expense_total,
        e.supplier_id,
        e.supplier_name,
        e.cost_category,
        e.document_number,
        e.member_name,
        e.exchange_rate_to_clp,
        a.account_name AS payment_account_name,
        a.provider_slug AS payment_provider_slug,
        a.instrument_category AS payment_instrument_category
      FROM greenhouse_finance.expense_payments ep
      INNER JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
      LEFT JOIN greenhouse_finance.accounts a ON a.account_id = ep.payment_account_id
      ${whereClause}
      ORDER BY ep.payment_date DESC, ep.created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
      `,
      params
    )

    // ── Summary KPIs (TASK-766 — canonical CLP reader) ──────────────
    // Reemplaza el anti-patrón `SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1))`
    // por el helper canónico que lee de la VIEW expense_payments_normalized
    // con `payment_amount_clp` correctamente resuelto. Ver
    // src/lib/finance/expense-payments-reader.ts para reglas duras + rationale.
    const summary = await sumExpensePaymentsClpForPeriod({
      fromDate: fromDate ?? '0001-01-01',
      toDate: toDate ?? '9999-12-31',
      expenseType: expenseType ?? undefined,
      supplierId: supplierId ?? undefined,
      isReconciled:
        isReconciledParam === null ? undefined : isReconciledParam === 'true'
    })

    return NextResponse.json({
      items: rows.map(normalizePayment),
      total,
      page,
      pageSize,
      summary: {
        totalPaidClp: summary.totalClp,
        totalPayments: summary.totalPayments,
        unreconciledCount: summary.unreconciledCount,
        supplierTotalClp: summary.supplierClp,
        payrollTotalClp: summary.payrollClp,
        fiscalTotalClp: summary.fiscalClp,
        // TASK-766 — drift count expuesto al UI para que un valor > 0 sea
        // visible (preludio del banner reliability + reparable via
        // POST /api/admin/finance/payments-clp-repair).
        driftCount: summary.driftCount
      }
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'

    console.error('GET /api/finance/cash-out failed:', detail, error)

    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
