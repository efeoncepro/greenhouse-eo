import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  assertReconciliationPeriodIsMutableFromPostgres,
  getStatementRowFromPostgres,
  resolveReconciliationTargetFromPostgres,
  clearReconciliationLinkInPostgres,
  updateStatementRowMatchInPostgres,
  setReconciliationLinkInPostgres
} from '@/lib/finance/postgres-reconciliation'
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
    const matchedType = assertNonEmptyString(body.matchedType, 'matchedType')
    const matchedId = assertNonEmptyString(body.matchedId, 'matchedId')
    const matchedPaymentId = body.matchedPaymentId ? assertNonEmptyString(body.matchedPaymentId, 'matchedPaymentId') : null

    const matchedSettlementLegId = body.matchedSettlementLegId
      ? assertNonEmptyString(body.matchedSettlementLegId, 'matchedSettlementLegId')
      : null

    if (!['income', 'expense'].includes(matchedType)) {
      throw new FinanceValidationError('matchedType must be "income" or "expense".')
    }

    await assertReconciliationPeriodIsMutableFromPostgres(periodId)

    const currentRow = await getStatementRowFromPostgres(rowId, periodId)

    if (!currentRow) {
      return NextResponse.json({ error: 'Statement row not found in this period' }, { status: 404 })
    }

    const target = await resolveReconciliationTargetFromPostgres({
      matchedType: matchedType as 'income' | 'expense',
      matchedId,
      matchedPaymentId,
      matchedSettlementLegId
    })

    if (target.isReconciled && normalizeString(target.reconciliationId) !== rowId) {
      throw new FinanceValidationError(
        `${matchedType} target "${target.candidateId}" is already reconciled to another statement row.`,
        409
      )
    }

    const previousMatchedType = normalizeString(currentRow.matched_type)
    const previousMatchedId = normalizeString(currentRow.matched_id)
    const previousMatchedPaymentId = normalizeString(currentRow.matched_payment_id)
    const previousMatchedSettlementLegId = normalizeString(currentRow.matched_settlement_leg_id)

    const targetChanged = (
      previousMatchedType !== matchedType
      || previousMatchedId !== target.matchedRecordId
      || previousMatchedPaymentId !== (target.matchedPaymentId || '')
      || previousMatchedSettlementLegId !== (target.matchedSettlementLegId || '')
    )

    if (previousMatchedType && previousMatchedId && targetChanged) {
      await clearReconciliationLinkInPostgres({
        matchedType: previousMatchedType,
        matchedId: previousMatchedId,
        matchedPaymentId: previousMatchedPaymentId || null,
        matchedSettlementLegId: previousMatchedSettlementLegId || null,
        rowId
      })
    }

    await updateStatementRowMatchInPostgres(rowId, periodId, {
      matchStatus: 'manual_matched',
      matchedType,
      matchedId: target.matchedRecordId,
      matchedPaymentId: target.matchedPaymentId,
      matchedSettlementLegId: target.matchedSettlementLegId,
      matchConfidence: 1.0,
      matchedByUserId: tenant.userId || null,
      notes: body.notes ? normalizeString(body.notes) : null
    })

    await setReconciliationLinkInPostgres({
      matchedType: matchedType as 'income' | 'expense',
      matchedId: target.matchedRecordId,
      matchedPaymentId: target.matchedPaymentId,
      matchedSettlementLegId: target.matchedSettlementLegId,
      rowId,
      matchedBy: tenant.userId || null
    })

    return NextResponse.json({
      matched: true,
      rowId,
      matchedType,
      matchedId: target.candidateId,
      matchedRecordId: target.matchedRecordId,
      matchedPaymentId: target.matchedPaymentId,
      matchedSettlementLegId: target.matchedSettlementLegId,
      matchStatus: 'manual_matched'
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
