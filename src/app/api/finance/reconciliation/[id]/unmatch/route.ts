import { NextResponse } from 'next/server'

import { withTransaction } from '@/lib/db'
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
    const previousSettlementLegId = normalizeString(row.matched_settlement_leg_id)

    // Lock the statement row before clearing to prevent concurrent match/unmatch
    // on the same row. NOWAIT: fails fast (→ 409) if lock is held by another request.
    await withTransaction(async txClient => {
      await txClient.query(
        `SELECT 1 FROM greenhouse_finance.bank_statement_rows
         WHERE row_id = $1 AND period_id = $2 FOR UPDATE NOWAIT`,
        [rowId, periodId]
      )

      await clearStatementRowMatchInPostgres(rowId, periodId, { client: txClient })
    })

    if (previousType && previousId) {
      await clearReconciliationLinkInPostgres({
        matchedType: previousType,
        matchedId: previousId,
        matchedPaymentId: previousPaymentId || null,
        matchedSettlementLegId: previousSettlementLegId || null,
        rowId
      })
    }

    return NextResponse.json({
      unmatched: true,
      rowId,
      previousMatchedType: previousType || null,
      previousMatchedId: previousPaymentId || previousId || null,
      previousMatchedRecordId: previousId || null,
      previousMatchedPaymentId: previousPaymentId || null,
      previousMatchedSettlementLegId: previousSettlementLegId || null
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
