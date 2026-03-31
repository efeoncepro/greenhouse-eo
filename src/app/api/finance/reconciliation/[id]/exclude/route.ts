import { NextResponse } from 'next/server'

import { assertReconciliationPeriodIsMutable, clearReconciliationLink } from '@/lib/finance/reconciliation'
import { shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
import {
  assertReconciliationPeriodIsMutableFromPostgres,
  getStatementRowFromPostgres,
  clearReconciliationLinkInPostgres,
  excludeStatementRowInPostgres
} from '@/lib/finance/postgres-reconciliation'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  FinanceValidationError,
  assertNonEmptyString,
  getFinanceProjectId,
  normalizeString,
  runFinanceQuery
} from '@/lib/finance/shared'
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'

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

    // ── Postgres-first path ──
    try {
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

      return NextResponse.json({
        excluded: true,
        rowId,
        previousMatchedType: previousMatchedType || null,
        previousMatchedId: previousMatchedPaymentId || previousMatchedId || null,
        previousMatchedRecordId: previousMatchedId || null,
        previousMatchedPaymentId: previousMatchedPaymentId || null
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
    }>(`
      SELECT row_id, matched_type, matched_id, matched_payment_id
      FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
      WHERE row_id = @rowId AND period_id = @periodId
      LIMIT 1
    `, { rowId, periodId })

    const row = rows[0]

    if (!row) {
      return NextResponse.json({ error: 'Statement row not found in this period' }, { status: 404 })
    }

    const previousMatchedType = normalizeString(row.matched_type)
    const previousMatchedId = normalizeString(row.matched_id)
    const previousMatchedPaymentId = normalizeString(row.matched_payment_id)

    if (previousMatchedType && previousMatchedId) {
      await clearReconciliationLink({
        matchedType: previousMatchedType,
        matchedId: previousMatchedId,
        matchedPaymentId: previousMatchedPaymentId || null,
        rowId
      })
    }

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_bank_statement_rows\`
      SET
        match_status = 'excluded',
        matched_type = NULL,
        matched_id = NULL,
        matched_payment_id = NULL,
        match_confidence = NULL,
        matched_by = @matchedBy,
        matched_at = CURRENT_TIMESTAMP(),
        notes = @notes
      WHERE row_id = @rowId AND period_id = @periodId
    `, {
      rowId,
      periodId,
      matchedBy: tenant.userId || null,
      notes
    })

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
