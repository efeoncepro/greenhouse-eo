import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  FinanceValidationError,
  assertDateString,
  assertPositiveAmount,
  normalizeString,
  toNumber
} from '@/lib/finance/shared'
import {
  recordExpensePayment,
  getPaymentsForExpense,
  reconcileExpensePaymentTotals
} from '@/lib/finance/expense-payment-ledger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/finance/expenses/[id]/payments
 *
 * Retrieve all payment records for an expense.
 * Query params:
 *   ?reconcile=true — also reconcile amount_paid with SUM(payments)
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: expenseId } = await params
    const url = new URL(request.url)
    const shouldReconcile = url.searchParams.get('reconcile') === 'true'

    const result = await getPaymentsForExpense(expenseId)

    if (shouldReconcile) {
      const reconciliation = await reconcileExpensePaymentTotals(expenseId)

      return NextResponse.json({
        ...result,
        reconciliation
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

/**
 * POST /api/finance/expenses/[id]/payments
 *
 * Record a new payment against an expense.
 *
 * Body:
 * {
 *   amount: number (required, > 0)
 *   paymentDate: string (required, YYYY-MM-DD)
 *   paymentId?: string
 *   reference?: string
 *   paymentMethod?: string
 *   paymentAccountId?: string
 *   paymentSource?: 'manual' | 'payroll_system' | 'nubox_sync' | 'bank_statement'
 *   notes?: string
 * }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: expenseId } = await params
    const body = await request.json()

    const amount = assertPositiveAmount(toNumber(body.amount), 'amount')

    if (amount <= 0) {
      throw new FinanceValidationError('amount must be greater than zero.')
    }

    const paymentDate = assertDateString(body.paymentDate, 'paymentDate')

    const result = await recordExpensePayment({
      expenseId,
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
        expenseId: result.expenseId,
        paymentId: result.payment.paymentId,
        paymentStatus: result.paymentStatus,
        amountPaid: result.amountPaid,
        amountPending: result.amountPending,
        recorded: true
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
