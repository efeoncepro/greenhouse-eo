import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'
import {
  assertReconciliationPeriodIsMutableFromPostgres,
  getStatementRowFromPostgres,
  clearStatementRowMatchInPostgres,
  clearReconciliationLinkInPostgres
} from '@/lib/finance/postgres-reconciliation'
import {
  FinanceValidationError,
  assertNonEmptyString,
  getFinanceProjectId,
  normalizeString,
  runFinanceQuery
} from '@/lib/finance/shared'
import { assertReconciliationPeriodIsMutable, clearReconciliationLink } from '@/lib/finance/reconciliation'

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

    // ── Postgres-first path ──
    try {
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

      return NextResponse.json({
        unmatched: true,
        rowId,
        previousMatchedType: previousType || null,
        previousMatchedId: previousPaymentId || previousId || null,
        previousMatchedRecordId: previousId || null,
        previousMatchedPaymentId: previousPaymentId || null
      })
    } catch (error) {
      if (!shouldFallbackFromFinancePostgres(error)) {
        throw error
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

    await assertReconciliationPeriodIsMutable(periodId)

    const projectId = getFinanceProjectId()

    const rows = await runFinanceQuery<{
      row_id: string
      matched_type: string | null
      matched_id: string | null
      matched_payment_id: string | null
      match_status: string
    }>(`
      SELECT row_id, matched_type, matched_id, matched_payment_id, match_status
      FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
      WHERE row_id = @rowId AND period_id = @periodId
    `, { rowId, periodId })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Statement row not found in this period' }, { status: 404 })
    }

    const bqRow = rows[0]

    if (bqRow.match_status === 'unmatched') {
      return NextResponse.json({ error: 'Row is already unmatched' }, { status: 400 })
    }

    const previousType = normalizeString(bqRow.matched_type)
    const previousId = normalizeString(bqRow.matched_id)
    const previousPaymentId = normalizeString(bqRow.matched_payment_id)

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_bank_statement_rows\`
      SET
        match_status = 'unmatched',
        matched_type = NULL,
        matched_id = NULL,
        matched_payment_id = NULL,
        match_confidence = NULL,
        matched_by = NULL,
        matched_at = NULL
      WHERE row_id = @rowId AND period_id = @periodId
    `, { rowId, periodId })

    if (previousType && previousId) {
      await clearReconciliationLink({
        matchedType: previousType,
        matchedId: previousId,
        matchedPaymentId: previousPaymentId || null,
        rowId
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
