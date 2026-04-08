import { NextResponse } from 'next/server'

import { recordPayment } from '@/lib/finance/payment-ledger'
import {
  FinanceValidationError,
  assertDateString,
  assertPositiveAmount,
  normalizeString,
  toNumber
} from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * POST /api/finance/income/[id]/payment
 *
 * Legacy compatibility wrapper. The canonical write path is
 * /api/finance/income/[id]/payments and always writes to income_payments.
 *
 * This endpoint intentionally does not fall back to BigQuery. Failing closed
 * preserves the payment ledger, outbox contract, and downstream projections.
 */
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

    const result = await recordPayment({
      incomeId,
      paymentId: body.paymentId ? normalizeString(body.paymentId) : undefined,
      paymentDate,
      amount,
      reference: body.reference ? normalizeString(body.reference) : null,
      paymentMethod: body.paymentMethod ? normalizeString(body.paymentMethod) : null,
      paymentAccountId: body.paymentAccountId ? normalizeString(body.paymentAccountId) : null,
      paymentSource: body.paymentSource || undefined,
      notes: body.notes ? normalizeString(body.notes) : null,
      actorUserId: tenant.userId || null
    })

    return NextResponse.json(
      {
        incomeId: result.incomeId,
        paymentId: result.payment.paymentId,
        paymentStatus: result.paymentStatus,
        amountPaid: result.amountPaid,
        amountPending: result.amountPending,
        recorded: true,
        canonicalPath: `/api/finance/income/${incomeId}/payments`
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    const detail = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: `Finance payment ledger write failed. Legacy endpoint cannot fall back to BigQuery: ${detail}`,
        code: 'FINANCE_BQ_WRITE_DISABLED'
      },
      { status: 503 }
    )
  }
}
