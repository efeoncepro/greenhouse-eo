import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  assertReconciliationPeriodIsMutableFromPostgres,
  importBankStatementsToPostgres
} from '@/lib/finance/postgres-reconciliation'
import {
  assertNonEmptyString,
  assertDateString,
  normalizeString,
  toNumber,
  FinanceValidationError
} from '@/lib/finance/shared'
import { parseBankStatement, SUPPORTED_BANK_FORMATS } from '@/lib/finance/csv-parser'
import type { BankStatementRow } from '@/lib/finance/csv-parser'

export const dynamic = 'force-dynamic'

interface StatementInput {
  transactionDate: string
  valueDate?: string
  description: string
  reference?: string
  amount: number
  balance?: number
}

/** Convert CSV-parsed rows into the standard StatementInput shape */
const csvRowsToStatementInput = (parsed: BankStatementRow[]): StatementInput[] =>
  parsed.map(r => ({
    transactionDate: r.transactionDate,
    description: r.description,
    amount: r.amount,
    ...(r.balance !== null && { balance: r.balance }),
    ...(r.reference !== null && { reference: r.reference })
  }))

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: periodId } = await params
    const body = await request.json()

    // Resolve rows: either from CSV content or from pre-parsed JSON
    let rows: StatementInput[]

    if (body.csvContent && body.bankFormat) {
      const parsed = parseBankStatement(body.csvContent, body.bankFormat)

      rows = csvRowsToStatementInput(parsed)
    } else if (Array.isArray(body.rows)) {
      rows = body.rows
    } else {
      throw new FinanceValidationError(
        `Provide either { csvContent, bankFormat } or { rows }. Supported bank formats: ${SUPPORTED_BANK_FORMATS.join(', ')}`
      )
    }

    if (rows.length === 0) {
      throw new FinanceValidationError('At least one statement row is required.')
    }

    if (rows.length > 500) {
      throw new FinanceValidationError('Maximum 500 rows per import.')
    }

    // Validate all rows before insert
    const validatedRows = rows.map(row => ({
      transactionDate: assertDateString(row.transactionDate, 'transactionDate'),
      valueDate: row.valueDate ? normalizeString(row.valueDate) : null,
      description: assertNonEmptyString(row.description, 'description'),
      reference: row.reference ? normalizeString(row.reference) : null,
      amount: toNumber(row.amount),
      balance: row.balance !== undefined ? toNumber(row.balance) : null
    }))

    await assertReconciliationPeriodIsMutableFromPostgres(periodId)

    const result = await importBankStatementsToPostgres(periodId, validatedRows)

    return NextResponse.json({
      periodId,
      imported: result.imported,
      skipped: result.skipped,
      totalRowCount: result.totalRowCount,
      importBatchId: result.importBatchId,
      ...(body.bankFormat && { bankFormat: body.bankFormat })
    }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
