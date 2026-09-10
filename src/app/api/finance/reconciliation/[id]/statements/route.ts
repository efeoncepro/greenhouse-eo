import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
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
import { BANK_STATEMENT_SOURCE_FORMATS, parseBankStatementFile } from '@/lib/finance/bank-statements'
import type { ParsedStatementRow } from '@/lib/finance/bank-statements'

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

/** Convert adapter-parsed rows (XLS/XLSX/PDF text) into the standard StatementInput shape */
const parsedRowsToStatementInput = (parsed: ParsedStatementRow[]): StatementInput[] =>
  parsed.map(r => ({
    transactionDate: r.transactionDate,
    description: r.description,
    amount: r.amount,
    ...(r.valueDate && { valueDate: r.valueDate }),
    ...(r.balance !== null && { balance: r.balance }),
    ...(r.reference !== null && { reference: r.reference })
  }))

const MAX_STATEMENT_FILE_BYTES = 5 * 1024 * 1024

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TASK-722 — granular guard: importar extracto.
  if (!can(tenant, 'finance.reconciliation.import', 'create', 'space')) {
    return NextResponse.json({ error: 'No tienes permiso para importar extractos bancarios.' }, { status: 403 })
  }

  try {
    const { id: periodId } = await params
    const body = await request.json()

    // Resolve rows: bank file (XLS/XLSX base64), statement text (PDF extraído),
    // CSV content, or pre-parsed JSON rows.
    let rows: StatementInput[]
    let sourceFormat: string | null = null

    if (typeof body.fileBase64 === 'string' && body.fileBase64.length > 0) {
      const buffer = Buffer.from(body.fileBase64, 'base64')

      if (buffer.byteLength === 0 || buffer.byteLength > MAX_STATEMENT_FILE_BYTES) {
        throw new FinanceValidationError('El archivo del extracto está vacío o supera los 5 MB.')
      }

      const parsed = parseBankStatementFile({
        content: buffer,
        fileName: normalizeString(body.fileName) || null,
        format: normalizeString(body.sourceFormat) || null
      })

      sourceFormat = parsed.format
      rows = parsedRowsToStatementInput(parsed.rows)
    } else if (typeof body.statementText === 'string' && body.statementText.trim().length > 0) {
      const parsed = parseBankStatementFile({
        content: body.statementText,
        format: normalizeString(body.sourceFormat) || null
      })

      sourceFormat = parsed.format
      rows = parsedRowsToStatementInput(parsed.rows)
    } else if (body.csvContent && body.bankFormat) {
      const parsed = parseBankStatement(body.csvContent, body.bankFormat)

      sourceFormat = String(body.bankFormat)
      rows = csvRowsToStatementInput(parsed)
    } else if (Array.isArray(body.rows)) {
      rows = body.rows
    } else {
      throw new FinanceValidationError(
        `Provide { fileBase64, fileName, sourceFormat? }, { statementText, sourceFormat? }, { csvContent, bankFormat } or { rows }. ` +
          `Bank files: ${BANK_STATEMENT_SOURCE_FORMATS.join(', ')}. CSV formats: ${SUPPORTED_BANK_FORMATS.join(', ')}`
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
      ...(sourceFormat && { bankFormat: sourceFormat })
    }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
