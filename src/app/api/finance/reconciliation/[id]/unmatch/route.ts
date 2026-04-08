import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  assertReconciliationPeriodIsMutableFromPostgres,
  getStatementRowFromPostgres,
  clearStatementRowMatchInPostgres,
  clearReconciliationLinkInPostgres
} from '@/lib/finance/postgres-reconciliation'
import {
  FinanceValidationError,
  assertNonEmptyString,
  normalizeString
} from '@/lib/finance/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: periodId } = await params
    const body = await request.json()
    const rowId = assertNonEmptyString(body.rowId, 'rowId')

    await assertReconciliationPeriodIsMutableFromPostgres(periodId)

    const row = await getStatementRowFromPostgres(rowId, periodId)

    if (!row) {
      return NextResponse.json({ error: 'Statement row not found in this period' }, { status: 404 })
    }

    if (row.match_status === 'unmatched') {
      return NextResponse.json({ error: 'Row is already unmatched' }, { status: 400 })
    }

    const previousType = normalizeString(row.matched_type)
    const previousId = normalizeString(row.matched_id)
    const previousPaymentId = normalizeString(row.matched_payment_id)

    await clearStatementRowMatchInPostgres(rowId, periodId)

    if (previousType && previousId) {
      await clearReconciliationLinkInPostgres({
        matchedType: previousType,
        matchedId: previousId,
        matchedPaymentId: previousPaymentId || null,
        rowId
      })
    }

    if (previousPaymentId && previousType) {
      await publishOutboxEvent({
        aggregateType: previousType === 'income' ? 'finance_income_payment' : 'finance_expense_payment',
        aggregateId: previousPaymentId,
        eventType: previousType === 'income'
          ? 'finance.income_payment.unreconciled'
          : 'finance.expense_payment.unreconciled',
        payload: {
          paymentId: previousPaymentId,
          recordId: previousId || null,
          rowId,
          periodId,
          previousMatchedType: previousType,
          actorUserId: tenant.userId || null
        }
      })
    }

    return NextResponse.json({
      unmatched: true,
      rowId,
      previousMatchedType: previousType || null,
      previousMatchedId: previousPaymentId || previousId || null,
      previousMatchedRecordId: previousId || null,
      previousMatchedPaymentId: previousPaymentId || null
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
