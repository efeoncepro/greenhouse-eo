import { NextResponse } from 'next/server'

import {
  assertReconciliationPeriodIsMutableFromPostgres,
  getStatementRowFromPostgres,
  clearReconciliationLinkInPostgres,
  excludeStatementRowInPostgres
} from '@/lib/finance/postgres-reconciliation'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
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
    const notes = body.notes ? normalizeString(body.notes) : null

    await assertReconciliationPeriodIsMutableFromPostgres(periodId)

    const row = await getStatementRowFromPostgres(rowId, periodId)

    if (!row) {
      return NextResponse.json({ error: 'Statement row not found in this period' }, { status: 404 })
    }

    const previousMatchedType = normalizeString(row.matched_type)
    const previousMatchedId = normalizeString(row.matched_id)
    const previousMatchedPaymentId = normalizeString(row.matched_payment_id)

    if (previousMatchedType && previousMatchedId) {
      await clearReconciliationLinkInPostgres({
        matchedType: previousMatchedType,
        matchedId: previousMatchedId,
        matchedPaymentId: previousMatchedPaymentId || null,
        rowId
      })
    }

    await excludeStatementRowInPostgres(rowId, periodId, {
      matchedByUserId: tenant.userId || null,
      notes
    })

    if (previousMatchedPaymentId && previousMatchedType) {
      await publishOutboxEvent({
        aggregateType: previousMatchedType === 'income' ? 'finance_income_payment' : 'finance_expense_payment',
        aggregateId: previousMatchedPaymentId,
        eventType: previousMatchedType === 'income'
          ? 'finance.income_payment.unreconciled'
          : 'finance.expense_payment.unreconciled',
        payload: {
          paymentId: previousMatchedPaymentId,
          recordId: previousMatchedId || null,
          rowId,
          periodId,
          actorUserId: tenant.userId || null,
          reason: 'statement_excluded'
        }
      })
    }

    return NextResponse.json({
      excluded: true,
      rowId,
      previousMatchedType: previousMatchedType || null,
      previousMatchedId: previousMatchedPaymentId || previousMatchedId || null,
      previousMatchedRecordId: previousMatchedId || null,
      previousMatchedPaymentId: previousMatchedPaymentId || null
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
