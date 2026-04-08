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
    const previousMatchedSettlementLegId = normalizeString(row.matched_settlement_leg_id)

    if (previousMatchedType && previousMatchedId) {
      await clearReconciliationLinkInPostgres({
        matchedType: previousMatchedType,
        matchedId: previousMatchedId,
        matchedPaymentId: previousMatchedPaymentId || null,
        matchedSettlementLegId: previousMatchedSettlementLegId || null,
        rowId
      })
    }

    await excludeStatementRowInPostgres(rowId, periodId, {
      matchedByUserId: tenant.userId || null,
      notes
    })

    return NextResponse.json({
      excluded: true,
      rowId,
      previousMatchedType: previousMatchedType || null,
      previousMatchedId: previousMatchedPaymentId || previousMatchedId || null,
      previousMatchedRecordId: previousMatchedId || null,
      previousMatchedPaymentId: previousMatchedPaymentId || null,
      previousMatchedSettlementLegId: previousMatchedSettlementLegId || null
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
