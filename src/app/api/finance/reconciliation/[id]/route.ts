import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'
import {
  getReconciliationPeriodDetailFromPostgres,
  updateReconciliationPeriodInPostgres,
  validateReconciledTransitionFromPostgres
} from '@/lib/finance/postgres-reconciliation'
import {
  runFinanceQuery,
  getFinanceProjectId,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toDateString,
  toTimestampString,
  FinanceValidationError
} from '@/lib/finance/shared'
import { normalizeMatchStatus } from '@/lib/finance/reconciliation'

export const dynamic = 'force-dynamic'

interface PeriodDetailRow {
  period_id: string
  account_id: string
  year: unknown
  month: unknown
  opening_balance: unknown
  closing_balance_bank: unknown
  closing_balance_system: unknown
  difference: unknown
  status: string
  statement_imported: boolean
  statement_imported_at: unknown
  statement_row_count: unknown
  reconciled_by: string | null
  reconciled_at: unknown
  notes: string | null
  created_at: unknown
  updated_at: unknown
}

interface StatementRow {
  row_id: string
  transaction_date: unknown
  value_date: unknown
  description: string
  reference: string | null
  amount: unknown
  balance: unknown
  match_status: string
  matched_type: string | null
  matched_id: string | null
  matched_payment_id: string | null
  match_confidence: unknown
  notes: string | null
  matched_by: string | null
  matched_at: unknown
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: periodId } = await params

  // ── Postgres-first path ──
  try {
    const detail = await getReconciliationPeriodDetailFromPostgres(periodId)

    if (!detail) {
      return NextResponse.json({ error: 'Reconciliation period not found' }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (error) {
    if (!shouldFallbackFromFinancePostgres(error)) {
      throw error
    }
  }

  // ── BigQuery fallback ──
  await ensureFinanceInfrastructure()
  const projectId = getFinanceProjectId()

  const periods = await runFinanceQuery<PeriodDetailRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_reconciliation_periods\`
    WHERE period_id = @periodId
  `, { periodId })

  if (periods.length === 0) {
    return NextResponse.json({ error: 'Reconciliation period not found' }, { status: 404 })
  }

  const period = periods[0]

  const statements = await runFinanceQuery<StatementRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
    WHERE period_id = @periodId
    ORDER BY transaction_date ASC
  `, { periodId })

  return NextResponse.json({
    period: {
      periodId: normalizeString(period.period_id),
      accountId: normalizeString(period.account_id),
      year: toNumber(period.year),
      month: toNumber(period.month),
      openingBalance: toNumber(period.opening_balance),
      closingBalanceBank: toNumber(period.closing_balance_bank),
      closingBalanceSystem: toNumber(period.closing_balance_system),
      difference: toNumber(period.difference),
      status: normalizeString(period.status),
      statementImported: normalizeBoolean(period.statement_imported),
      statementImportedAt: toTimestampString(period.statement_imported_at as string | { value?: string } | null),
      statementRowCount: toNumber(period.statement_row_count),
      reconciledBy: period.reconciled_by ? normalizeString(period.reconciled_by) : null,
      reconciledAt: toTimestampString(period.reconciled_at as string | { value?: string } | null),
      notes: period.notes ? normalizeString(period.notes) : null,
      createdAt: toTimestampString(period.created_at as string | { value?: string } | null),
      updatedAt: toTimestampString(period.updated_at as string | { value?: string } | null)
    },
    statements: statements.map(s => ({
      rowId: normalizeString(s.row_id),
      transactionDate: toDateString(s.transaction_date as string | { value?: string } | null),
      valueDate: toDateString(s.value_date as string | { value?: string } | null),
      description: normalizeString(s.description),
      reference: s.reference ? normalizeString(s.reference) : null,
      amount: toNumber(s.amount),
      balance: toNumber(s.balance),
      matchStatus: normalizeMatchStatus(s.match_status),
      rawMatchStatus: normalizeString(s.match_status),
      matchedType: s.matched_type ? normalizeString(s.matched_type) : null,
      matchedId: s.matched_payment_id ? normalizeString(s.matched_payment_id) : s.matched_id ? normalizeString(s.matched_id) : null,
      matchedRecordId: s.matched_id ? normalizeString(s.matched_id) : null,
      matchedPaymentId: s.matched_payment_id ? normalizeString(s.matched_payment_id) : null,
      matchConfidence: toNumber(s.match_confidence),
      notes: s.notes ? normalizeString(s.notes) : null,
      matchedBy: s.matched_by ? normalizeString(s.matched_by) : null,
      matchedAt: toTimestampString(s.matched_at as string | { value?: string } | null)
    }))
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: periodId } = await params
    const body = await request.json()

    // ── Shared validation logic ──

    const touchingFinancialFields = (
      body.closingBalanceBank !== undefined
      || body.closingBalanceSystem !== undefined
      || body.difference !== undefined
    )

    const pgUpdates: Record<string, unknown> = {}

    if (body.closingBalanceBank !== undefined) pgUpdates.closingBalanceBank = toNumber(body.closingBalanceBank)
    if (body.closingBalanceSystem !== undefined) pgUpdates.closingBalanceSystem = toNumber(body.closingBalanceSystem)
    if (body.difference !== undefined) pgUpdates.difference = toNumber(body.difference)
    if (body.notes !== undefined) pgUpdates.notes = body.notes ? normalizeString(body.notes) : null

    if (body.status !== undefined) {
      const validStatuses = ['open', 'in_progress', 'reconciled', 'closed']
      const nextStatus = normalizeString(body.status)

      if (!validStatuses.includes(nextStatus)) {
        throw new FinanceValidationError(`Invalid reconciliation status: ${nextStatus || '(empty)'}.`)
      }

      pgUpdates.status = nextStatus
    }

    if (Object.keys(pgUpdates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // ── Postgres-first path ──
    try {
      // Fetch existing period for state validation
      const existing = await (await import('@/lib/finance/postgres-reconciliation'))
        .getReconciliationPeriodContextFromPostgres(periodId)

      // Note: getReconciliationPeriodContextFromPostgres throws 404 if not found

      const existingStatus = existing.status

      if (existingStatus === 'closed') {
        throw new FinanceValidationError('Cannot update a closed reconciliation period.', 409)
      }

      if (existingStatus === 'reconciled') {
        const onlyClosingTransition = (
          pgUpdates.status === 'closed'
          && !touchingFinancialFields
          && body.notes === undefined
        )

        if (!onlyClosingTransition) {
          throw new FinanceValidationError('Cannot modify a reconciled period. Only a status change to "closed" is allowed.', 409)
        }
      }

      if (pgUpdates.status === 'closed' && existingStatus !== 'reconciled') {
        throw new FinanceValidationError('A reconciliation period can only be closed after it is reconciled.', 409)
      }

      if (pgUpdates.status === 'reconciled') {
        const { totalRows, remainingRows, statementImported } =
          await validateReconciledTransitionFromPostgres(periodId, true)

        const nextDifference = pgUpdates.difference !== undefined
          ? toNumber(pgUpdates.difference)
          : 0

        if (!statementImported || totalRows <= 0) {
          throw new FinanceValidationError('Cannot reconcile a period without an imported statement.', 409)
        }

        if (remainingRows > 0) {
          throw new FinanceValidationError('Cannot reconcile a period with unmatched or suggested statement rows.', 409)
        }

        if (Math.abs(nextDifference) > 0.01) {
          throw new FinanceValidationError('Cannot reconcile a period while difference is not zero.', 409)
        }
      }

      const result = await updateReconciliationPeriodInPostgres(periodId, pgUpdates, {
        reconciledByUserId: tenant.userId || null
      })

      if (!result) {
        return NextResponse.json({ error: 'Reconciliation period not found' }, { status: 404 })
      }

      return NextResponse.json({ periodId, updated: true })
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
    const projectId = getFinanceProjectId()

    const existingBq = await runFinanceQuery<{
      period_id: string
      status: string
      statement_imported: boolean
      statement_row_count: unknown
      difference: unknown
    }>(`
      SELECT period_id, status, statement_imported, statement_row_count, difference
      FROM \`${projectId}.greenhouse.fin_reconciliation_periods\`
      WHERE period_id = @periodId
    `, { periodId })

    if (existingBq.length === 0) {
      return NextResponse.json({ error: 'Reconciliation period not found' }, { status: 404 })
    }

    const existingPeriod = existingBq[0]
    const existingStatus = normalizeString(existingPeriod.status)

    if (existingStatus === 'closed') {
      throw new FinanceValidationError('Cannot update a closed reconciliation period.', 409)
    }

    if (existingStatus === 'reconciled') {
      const onlyClosingTransition = (
        pgUpdates.status === 'closed'
        && !touchingFinancialFields
        && body.notes === undefined
      )

      if (!onlyClosingTransition) {
        throw new FinanceValidationError('Cannot modify a reconciled period. Only a status change to "closed" is allowed.', 409)
      }
    }

    if (pgUpdates.status === 'closed' && existingStatus !== 'reconciled') {
      throw new FinanceValidationError('A reconciliation period can only be closed after it is reconciled.', 409)
    }

    const bqUpdates: string[] = []
    const bqParams: Record<string, unknown> = { periodId }

    if (pgUpdates.closingBalanceBank !== undefined) {
      bqUpdates.push('closing_balance_bank = @closingBalanceBank')
      bqParams.closingBalanceBank = pgUpdates.closingBalanceBank
    }

    if (pgUpdates.closingBalanceSystem !== undefined) {
      bqUpdates.push('closing_balance_system = @closingBalanceSystem')
      bqParams.closingBalanceSystem = pgUpdates.closingBalanceSystem
    }

    if (pgUpdates.difference !== undefined) {
      bqUpdates.push('difference = @difference')
      bqParams.difference = pgUpdates.difference
    }

    if (pgUpdates.notes !== undefined) {
      bqUpdates.push('notes = @notes')
      bqParams.notes = pgUpdates.notes
    }

    if (pgUpdates.status !== undefined) {
      const nextStatus = pgUpdates.status as string

      if (nextStatus === 'reconciled') {
        const statementCounts = await runFinanceQuery<{ total: unknown }>(`
          SELECT COUNT(*) AS total
          FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
          WHERE period_id = @periodId
        `, { periodId })

        const pendingRows = await runFinanceQuery<{ total: unknown }>(`
          SELECT COUNT(*) AS total
          FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
          WHERE period_id = @periodId
            AND match_status IN ('unmatched', 'suggested')
        `, { periodId })

        const statementImported = normalizeBoolean(existingPeriod.statement_imported)
        const totalRows = toNumber(statementCounts[0]?.total)
        const remainingRows = toNumber(pendingRows[0]?.total)

        const nextDifference = pgUpdates.difference !== undefined
          ? toNumber(pgUpdates.difference)
          : toNumber(existingPeriod.difference)

        if (!statementImported || totalRows <= 0) {
          throw new FinanceValidationError('Cannot reconcile a period without an imported statement.', 409)
        }

        if (remainingRows > 0) {
          throw new FinanceValidationError('Cannot reconcile a period with unmatched or suggested statement rows.', 409)
        }

        if (Math.abs(nextDifference) > 0.01) {
          throw new FinanceValidationError('Cannot reconcile a period while difference is not zero.', 409)
        }
      }

      bqUpdates.push('status = @status')
      bqParams.status = nextStatus

      if (nextStatus === 'reconciled') {
        bqUpdates.push('reconciled_by = @reconciledBy')
        bqUpdates.push('reconciled_at = CURRENT_TIMESTAMP()')
        bqParams.reconciledBy = tenant.userId || null
      }
    }

    if (bqUpdates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    bqUpdates.push('updated_at = CURRENT_TIMESTAMP()')

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_reconciliation_periods\`
      SET ${bqUpdates.join(', ')}
      WHERE period_id = @periodId
    `, bqParams)

    return NextResponse.json({ periodId, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
