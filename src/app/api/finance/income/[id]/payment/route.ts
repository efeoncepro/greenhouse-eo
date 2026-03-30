import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { parseIncomePaymentsReceived } from '@/lib/finance/income-payments'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  FinanceValidationError,
  assertDateString,
  assertPositiveAmount,
  getFinanceProjectId,
  normalizeString,
  roundCurrency,
  runFinanceQuery,
  toNumber
} from '@/lib/finance/shared'
import { createFinanceIncomePaymentInPostgres } from '@/lib/finance/postgres-store-slice2'
import { shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'

export const dynamic = 'force-dynamic'

interface IncomePaymentRow {
  income_id: string
  currency: string
  total_amount: unknown
  amount_paid: unknown
  payment_status: string
  payments_received: unknown
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: incomeId } = await params
    const body = await request.json()
    const amount = assertPositiveAmount(toNumber(body.amount), 'amount')

    if (amount <= 0) {
      throw new FinanceValidationError('amount must be greater than zero.')
    }

    const paymentDate = assertDateString(body.paymentDate, 'paymentDate')
    const paymentId = normalizeString(body.paymentId) || `pay_${randomUUID()}`

    // ── Postgres-first path ──
    try {
      const result = await createFinanceIncomePaymentInPostgres({
        incomeId,
        paymentId,
        paymentDate,
        amount,
        reference: body.reference ? normalizeString(body.reference) : null,
        paymentMethod: body.paymentMethod ? normalizeString(body.paymentMethod) : null,
        paymentAccountId: body.paymentAccountId ? normalizeString(body.paymentAccountId) : null,
        notes: body.notes ? normalizeString(body.notes) : null,
        actorUserId: tenant.userId || null
      })

      return NextResponse.json(result, { status: 201 })
    } catch (pgError) {
      if (!shouldFallbackFromFinancePostgres(pgError)) {
        throw pgError
      }

      if (!isFinanceBigQueryWriteEnabled()) {
        return NextResponse.json(
          {
            error: 'Finance BigQuery fallback write is disabled. Postgres write path failed.',
            code: 'FINANCE_BQ_WRITE_DISABLED'
          },
          { status: 503 }
        )
      }
    }

    // ── BigQuery fallback ──
    await ensureFinanceInfrastructure()
    const projectId = getFinanceProjectId()

    const rows = await runFinanceQuery<IncomePaymentRow>(`
      SELECT income_id, currency, total_amount, amount_paid, payment_status, payments_received
      FROM \`${projectId}.greenhouse.fin_income\`
      WHERE income_id = @incomeId
    `, { incomeId })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Income record not found' }, { status: 404 })
    }

    const row = rows[0]
    const totalAmount = toNumber(row.total_amount)
    const currentAmountPaid = toNumber(row.amount_paid)
    const nextAmountPaid = roundCurrency(currentAmountPaid + amount)

    if (nextAmountPaid - totalAmount > 0.01) {
      throw new FinanceValidationError('Payment amount exceeds pending balance.', 409)
    }

    const existingPayments = parseIncomePaymentsReceived(row.payments_received)

    const paymentRecord = {
      paymentId,
      paymentDate,
      amount,
      currency: normalizeString(row.currency),
      reference: body.reference ? normalizeString(body.reference) : null,
      paymentMethod: body.paymentMethod ? normalizeString(body.paymentMethod) : null,
      paymentAccountId: body.paymentAccountId ? normalizeString(body.paymentAccountId) : null,
      notes: body.notes ? normalizeString(body.notes) : null,
      recordedBy: tenant.userId || null,
      recordedAt: new Date().toISOString(),
      isReconciled: false,
      reconciliationRowId: null,
      reconciledAt: null,
      reconciledBy: null
    }

    const nextPayments = [...existingPayments, paymentRecord]

    const nextPaymentStatus = nextAmountPaid >= totalAmount - 0.01
      ? 'paid'
      : nextAmountPaid > 0
        ? 'partial'
        : normalizeString(row.payment_status) || 'pending'

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_income\`
      SET
        amount_paid = @amountPaid,
        payment_status = @paymentStatus,
        payments_received = PARSE_JSON(@paymentsReceived),
        updated_at = CURRENT_TIMESTAMP()
      WHERE income_id = @incomeId
    `, {
      incomeId,
      amountPaid: nextAmountPaid,
      paymentStatus: nextPaymentStatus,
      paymentsReceived: JSON.stringify(nextPayments)
    })

    return NextResponse.json({
      incomeId,
      paymentId: paymentRecord.paymentId,
      paymentStatus: nextPaymentStatus,
      amountPaid: nextAmountPaid,
      amountPending: roundCurrency(totalAmount - nextAmountPaid),
      recorded: true
    }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
