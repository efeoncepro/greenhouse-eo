import 'server-only'

import type { PoolClient } from 'pg'

import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import { assertFinanceSlice2PostgresReady } from '@/lib/finance/postgres-store-slice2'
import {
  FinanceValidationError,
  normalizeString,
  normalizeBoolean,
  roundCurrency,
  toDateString,
  toNumber,
  toTimestampString
} from '@/lib/finance/shared'
import type {
  ReconciliationCandidateType,
  ReconciliationPeriodContext,
  ReconciliationCandidate,
  ResolvedReconciliationTarget
} from '@/lib/finance/reconciliation'

type QueryableClient = Pick<PoolClient, 'query'>

// ─── Row types ──────────────────────────────────────────────────────

type PostgresPeriodRow = {
  period_id: string
  account_id: string
  year: number
  month: number
  opening_balance: unknown
  closing_balance_bank: unknown
  closing_balance_system: unknown
  difference: unknown
  status: string
  statement_imported: boolean
  statement_imported_at: string | Date | null
  statement_row_count: unknown
  reconciled_by_user_id: string | null
  reconciled_at: string | Date | null
  notes: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

type PostgresStatementRow = {
  row_id: string
  period_id: string
  transaction_date: string | Date
  value_date: string | Date | null
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
  matched_by_user_id: string | null
  matched_at: string | Date | null
  created_at: string | Date | null
}

type IncomeCandidateRow = {
  payment_id: string
  income_id: string
  amount: unknown
  currency: string | null
  payment_date: string | Date | null
  reference: string | null
  invoice_number: string | null
  invoice_date: string | Date | null
  due_date: string | Date | null
  description: string | null
  client_name: string | null
  payment_status: string
  is_reconciled: boolean
  reconciliation_row_id: string | null
}

type IncomeInvoiceFallbackRow = {
  income_id: string
  total_amount: unknown
  amount_paid: unknown
  currency: string
  invoice_number: string | null
  invoice_date: string | Date | null
  due_date: string | Date | null
  description: string | null
  client_name: string | null
  payment_status: string
  is_reconciled: boolean
  reconciliation_id: string | null
  payment_count: unknown
}

type ExpenseCandidateRow = {
  expense_id: string
  total_amount: unknown
  currency: string
  payment_date: string | Date | null
  document_date: string | Date | null
  payment_reference: string | null
  document_number: string | null
  description: string
  supplier_name: string | null
  member_name: string | null
  payment_status: string
  is_reconciled: boolean
  reconciliation_id: string | null
}

// ─── Helpers ────────────────────────────────────────────────────────

const queryRows = async <T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
  client?: QueryableClient
) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const str = (v: unknown) => {
  const s = normalizeString(v)

  return s || null
}

// ─── Period mappers ─────────────────────────────────────────────────

const mapPeriod = (row: PostgresPeriodRow) => ({
  periodId: normalizeString(row.period_id),
  accountId: normalizeString(row.account_id),
  year: toNumber(row.year),
  month: toNumber(row.month),
  openingBalance: toNumber(row.opening_balance),
  closingBalanceBank: toNumber(row.closing_balance_bank),
  closingBalanceSystem: toNumber(row.closing_balance_system),
  difference: toNumber(row.difference),
  status: normalizeString(row.status),
  statementImported: normalizeBoolean(row.statement_imported),
  statementImportedAt: toTimestampString(row.statement_imported_at as string | { value?: string } | null),
  statementRowCount: toNumber(row.statement_row_count),
  reconciledBy: str(row.reconciled_by_user_id),
  reconciledAt: toTimestampString(row.reconciled_at as string | { value?: string } | null),
  notes: str(row.notes),
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

const mapStatementRow = (row: PostgresStatementRow) => ({
  rowId: normalizeString(row.row_id),
  transactionDate: toDateString(row.transaction_date as string | { value?: string } | null),
  valueDate: toDateString(row.value_date as string | { value?: string } | null),
  description: normalizeString(row.description),
  reference: str(row.reference),
  amount: toNumber(row.amount),
  balance: toNumber(row.balance),
  matchStatus: normalizeMatchStatusPg(row.match_status),
  rawMatchStatus: normalizeString(row.match_status),
  matchedType: str(row.matched_type),
  matchedId: row.matched_payment_id ? normalizeString(row.matched_payment_id) : str(row.matched_id),
  matchedRecordId: str(row.matched_id),
  matchedPaymentId: str(row.matched_payment_id),
  matchConfidence: toNumber(row.match_confidence),
  notes: str(row.notes),
  matchedBy: str(row.matched_by_user_id),
  matchedAt: toTimestampString(row.matched_at as string | { value?: string } | null)
})

const normalizeMatchStatusPg = (value: string | null | undefined) => {
  const raw = normalizeString(value)

  switch (raw) {
    case 'auto_matched':
    case 'manual_matched':
    case 'matched':
      return 'matched'
    case 'excluded':
      return 'excluded'
    case 'suggested':
      return 'suggested'
    default:
      return 'unmatched'
  }
}

// ─── Periods: list ──────────────────────────────────────────────────

export const listReconciliationPeriodsFromPostgres = async ({
  accountId,
  status
}: {
  accountId?: string | null
  status?: string | null
} = {}) => {
  await assertFinanceSlice2PostgresReady()

  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  if (accountId) {
    idx++
    conditions.push(`account_id = $${idx}`)
    values.push(accountId)
  }

  if (status) {
    idx++
    conditions.push(`status = $${idx}`)
    values.push(status)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await queryRows<PostgresPeriodRow>(`
    SELECT *
    FROM greenhouse_finance.reconciliation_periods
    ${where}
    ORDER BY year DESC, month DESC
    LIMIT 100
  `, values)

  return {
    items: rows.map(mapPeriod),
    total: rows.length
  }
}

// ─── Periods: create ────────────────────────────────────────────────

export const createReconciliationPeriodInPostgres = async ({
  periodId,
  accountId,
  year,
  month,
  openingBalance,
  notes
}: {
  periodId: string
  accountId: string
  year: number
  month: number
  openingBalance: number
  notes: string | null
}) => {
  await assertFinanceSlice2PostgresReady()

  const existing = await queryRows<{ period_id: string }>(
    `SELECT period_id FROM greenhouse_finance.reconciliation_periods WHERE period_id = $1`,
    [periodId]
  )

  if (existing.length > 0) {
    throw new FinanceValidationError(
      `Reconciliation period already exists for ${year}-${String(month).padStart(2, '0')} on account ${accountId}.`,
      409
    )
  }

  await queryRows(
    `
      INSERT INTO greenhouse_finance.reconciliation_periods (
        period_id, account_id, year, month, opening_balance,
        status, statement_imported, statement_row_count,
        notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'open', FALSE, 0, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [periodId, accountId, year, month, openingBalance, notes]
  )

  return { periodId, created: true }
}

// ─── Periods: get detail (period + statement rows) ──────────────────

export const getReconciliationPeriodDetailFromPostgres = async (periodId: string) => {
  await assertFinanceSlice2PostgresReady()

  const periods = await queryRows<PostgresPeriodRow>(
    `SELECT * FROM greenhouse_finance.reconciliation_periods WHERE period_id = $1`,
    [periodId]
  )

  if (periods.length === 0) return null

  const statements = await queryRows<PostgresStatementRow>(
    `SELECT * FROM greenhouse_finance.bank_statement_rows WHERE period_id = $1 ORDER BY transaction_date ASC`,
    [periodId]
  )

  return {
    period: mapPeriod(periods[0]),
    statements: statements.map(mapStatementRow)
  }
}

// ─── Periods: update ────────────────────────────────────────────────

export const updateReconciliationPeriodInPostgres = async (
  periodId: string,
  updates: Record<string, unknown>,
  opts?: { reconciledByUserId?: string | null }
) => {
  await assertFinanceSlice2PostgresReady()

  const fieldMap: Record<string, string> = {
    closingBalanceBank: 'closing_balance_bank',
    closingBalanceSystem: 'closing_balance_system',
    difference: 'difference',
    status: 'status',
    notes: 'notes'
  }

  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIdx = 1

  for (const [key, value] of Object.entries(updates)) {
    const col = fieldMap[key]

    if (!col) continue

    setClauses.push(`${col} = $${paramIdx}`)
    values.push(value)
    paramIdx++
  }

  if (updates.status === 'reconciled' && opts?.reconciledByUserId) {
    setClauses.push(`reconciled_by_user_id = $${paramIdx}`)
    values.push(opts.reconciledByUserId)
    paramIdx++

    setClauses.push('reconciled_at = CURRENT_TIMESTAMP')
  }

  if (setClauses.length === 0) return null

  setClauses.push('updated_at = CURRENT_TIMESTAMP')
  values.push(periodId)

  const rows = await queryRows<PostgresPeriodRow>(
    `
      UPDATE greenhouse_finance.reconciliation_periods
      SET ${setClauses.join(', ')}
      WHERE period_id = $${paramIdx}
      RETURNING *
    `,
    values
  )

  return rows.length > 0 ? mapPeriod(rows[0]) : null
}

// ─── Periods: context (lightweight) ────────────────────────────────

export const getReconciliationPeriodContextFromPostgres = async (
  periodId: string
): Promise<ReconciliationPeriodContext> => {
  await assertFinanceSlice2PostgresReady()

  const rows = await queryRows<{ period_id: string; account_id: string; year: number; month: number; status: string }>(
    `SELECT period_id, account_id, year, month, status
     FROM greenhouse_finance.reconciliation_periods WHERE period_id = $1 LIMIT 1`,
    [periodId]
  )

  if (rows.length === 0) {
    throw new FinanceValidationError('Reconciliation period not found.', 404)
  }

  const row = rows[0]

  return {
    periodId: normalizeString(row.period_id),
    accountId: normalizeString(row.account_id),
    year: toNumber(row.year),
    month: toNumber(row.month),
    status: normalizeString(row.status)
  }
}

// ─── Periods: assert mutable ────────────────────────────────────────

export const assertReconciliationPeriodIsMutableFromPostgres = async (periodId: string) => {
  const period = await getReconciliationPeriodContextFromPostgres(periodId)

  if (period.status === 'reconciled' || period.status === 'closed') {
    throw new FinanceValidationError('Cannot modify a reconciled or closed period.', 409)
  }

  return period
}

// ─── Periods: validate reconciled transition ────────────────────────

export const validateReconciledTransitionFromPostgres = async (periodId: string, statementImported: boolean) => {
  const counts = await queryRows<{ total: string; pending: string }>(
    `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE match_status IN ('unmatched', 'suggested')) AS pending
      FROM greenhouse_finance.bank_statement_rows
      WHERE period_id = $1
    `,
    [periodId]
  )

  return {
    totalRows: toNumber(counts[0]?.total),
    remainingRows: toNumber(counts[0]?.pending),
    statementImported
  }
}

// ─── Statements: import ─────────────────────────────────────────────

export const importBankStatementsToPostgres = async (
  periodId: string,
  rows: Array<{
    transactionDate: string
    valueDate?: string | null
    description: string
    reference?: string | null
    amount: number
    balance?: number | null
  }>
) => {
  await assertFinanceSlice2PostgresReady()

  return withGreenhousePostgresTransaction(async client => {
    // Get existing row count for ID generation
    const countResult = await queryRows<{ total: string }>(
      `SELECT COUNT(*) AS total FROM greenhouse_finance.bank_statement_rows WHERE period_id = $1`,
      [periodId],
      client
    )

    const existingRowCount = toNumber(countResult[0]?.total)
    let imported = 0

    for (const row of rows) {
      const rowId = `${periodId}_${String(existingRowCount + imported + 1).padStart(4, '0')}`

      await queryRows(
        `
          INSERT INTO greenhouse_finance.bank_statement_rows (
            row_id, period_id, transaction_date, value_date,
            description, reference, amount, balance,
            match_status, created_at
          ) VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, $8, 'unmatched', CURRENT_TIMESTAMP)
        `,
        [
          rowId, periodId, row.transactionDate,
          row.valueDate || null,
          row.description, row.reference || null,
          row.amount, row.balance ?? null
        ],
        client
      )

      imported++
    }

    // Update period metadata
    await queryRows(
      `
        UPDATE greenhouse_finance.reconciliation_periods
        SET
          statement_imported = TRUE,
          statement_imported_at = CURRENT_TIMESTAMP,
          statement_row_count = $2,
          status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
        WHERE period_id = $1
      `,
      [periodId, existingRowCount + imported],
      client
    )

    return { imported, totalRowCount: existingRowCount + imported }
  })
}

// ─── Statement rows: get ────────────────────────────────────────────

export const getStatementRowFromPostgres = async (rowId: string, periodId: string) => {
  await assertFinanceSlice2PostgresReady()

  const rows = await queryRows<PostgresStatementRow>(
    `SELECT * FROM greenhouse_finance.bank_statement_rows WHERE row_id = $1 AND period_id = $2`,
    [rowId, periodId]
  )

  return rows.length > 0 ? rows[0] : null
}

// ─── Statement rows: update match ───────────────────────────────────

export const updateStatementRowMatchInPostgres = async (
  rowId: string,
  periodId: string,
  match: {
    matchStatus: string
    matchedType: string
    matchedId: string
    matchedPaymentId: string | null
    matchConfidence: number
    matchedByUserId: string | null
    notes?: string | null
  }
) => {
  await assertFinanceSlice2PostgresReady()

  await queryRows(
    `
      UPDATE greenhouse_finance.bank_statement_rows
      SET
        match_status = $3,
        matched_type = $4,
        matched_id = $5,
        matched_payment_id = $6,
        match_confidence = $7,
        matched_by_user_id = $8,
        matched_at = CURRENT_TIMESTAMP,
        notes = $9
      WHERE row_id = $1 AND period_id = $2
    `,
    [
      rowId, periodId,
      match.matchStatus, match.matchedType, match.matchedId,
      match.matchedPaymentId, match.matchConfidence,
      match.matchedByUserId, match.notes ?? null
    ]
  )
}

// ─── Statement rows: clear match ────────────────────────────────────

export const clearStatementRowMatchInPostgres = async (rowId: string, periodId: string) => {
  await assertFinanceSlice2PostgresReady()

  await queryRows(
    `
      UPDATE greenhouse_finance.bank_statement_rows
      SET
        match_status = 'unmatched',
        matched_type = NULL,
        matched_id = NULL,
        matched_payment_id = NULL,
        match_confidence = NULL,
        matched_by_user_id = NULL,
        matched_at = NULL
      WHERE row_id = $1 AND period_id = $2
    `,
    [rowId, periodId]
  )
}

// ─── Statement rows: exclude ────────────────────────────────────────

export const excludeStatementRowInPostgres = async (
  rowId: string,
  periodId: string,
  opts: { matchedByUserId: string | null; notes: string | null }
) => {
  await assertFinanceSlice2PostgresReady()

  await queryRows(
    `
      UPDATE greenhouse_finance.bank_statement_rows
      SET
        match_status = 'excluded',
        matched_type = NULL,
        matched_id = NULL,
        matched_payment_id = NULL,
        match_confidence = NULL,
        matched_by_user_id = $3,
        matched_at = CURRENT_TIMESTAMP,
        notes = $4
      WHERE row_id = $1 AND period_id = $2
    `,
    [rowId, periodId, opts.matchedByUserId, opts.notes]
  )
}

// ─── Statement rows: list unmatched ─────────────────────────────────

export const listUnmatchedStatementRowsFromPostgres = async (periodId: string) => {
  await assertFinanceSlice2PostgresReady()

  return queryRows<{
    row_id: string
    transaction_date: string | Date
    description: string
    reference: string | null
    amount: unknown
  }>(
    `
      SELECT row_id, transaction_date, description, reference, amount
      FROM greenhouse_finance.bank_statement_rows
      WHERE period_id = $1 AND match_status = 'unmatched'
    `,
    [periodId]
  )
}

// ─── Candidates: list ───────────────────────────────────────────────

const shiftDate = (date: Date, days: number) => {
  const shifted = new Date(`${date.toISOString().slice(0, 10)}T00:00:00Z`)

  shifted.setUTCDate(shifted.getUTCDate() + days)

  return shifted.toISOString().slice(0, 10)
}

const getPeriodBounds = ({ year, month, windowDays }: { year: number; month: number; windowDays: number }) => {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0))

  return {
    startDate: shiftDate(start, -windowDays),
    endDate: shiftDate(end, windowDays)
  }
}

const isDateWithinBounds = (value: string | null, startDate: string, endDate: string) =>
  Boolean(value && value >= startDate && value <= endDate)

export const listReconciliationCandidatesFromPostgres = async ({
  periodId,
  type = 'all',
  search,
  limit = 100,
  windowDays = 45
}: {
  periodId: string
  type?: ReconciliationCandidateType | 'all'
  search?: string
  limit?: number
  windowDays?: number
}) => {
  await assertFinanceSlice2PostgresReady()

  const period = await getReconciliationPeriodContextFromPostgres(periodId)
  const boundedLimit = Math.min(200, Math.max(1, limit))
  const candidateRowLimit = Math.min(800, Math.max(200, boundedLimit * 4))
  const normalizedSearch = normalizeString(search).toLowerCase()
  const searchPattern = normalizedSearch ? `%${normalizedSearch}%` : ''

  const { startDate, endDate } = getPeriodBounds({
    year: period.year,
    month: period.month,
    windowDays
  })

  const shouldLoadIncome = type === 'all' || type === 'income'
  const shouldLoadExpense = type === 'all' || type === 'expense'

  const candidates: ReconciliationCandidate[] = []

  // ── Income candidates via income_payments table ──
  if (shouldLoadIncome) {
    // 1. Unreconciled individual payments
    const paymentRows = await queryRows<IncomeCandidateRow>(
      `
        SELECT
          ip.payment_id, ip.income_id, ip.amount, ip.currency, ip.payment_date, ip.reference,
          ip.is_reconciled, ip.reconciliation_row_id,
          i.invoice_number, i.invoice_date, i.due_date, i.description, i.client_name, i.payment_status
        FROM greenhouse_finance.income_payments ip
        JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
        WHERE ip.is_reconciled = FALSE
          AND ip.amount > 0
          AND (
            $1 = ''
            OR LOWER(ip.payment_id) LIKE $1
            OR LOWER(COALESCE(ip.reference, '')) LIKE $1
            OR LOWER(COALESCE(i.invoice_number, '')) LIKE $1
            OR LOWER(COALESCE(i.description, '')) LIKE $1
            OR LOWER(COALESCE(i.client_name, '')) LIKE $1
          )
        ORDER BY ip.payment_date DESC NULLS LAST, ip.amount DESC
        LIMIT $2
      `,
      [searchPattern, candidateRowLimit]
    )

    for (const row of paymentRows) {
      const txDate = toDateString(row.payment_date as string | { value?: string } | null)
        ?? toDateString(row.invoice_date as string | { value?: string } | null)

      candidates.push({
        id: normalizeString(row.payment_id),
        type: 'income',
        amount: roundCurrency(toNumber(row.amount)),
        currency: normalizeString(row.currency || ''),
        transactionDate: txDate,
        dueDate: toDateString(row.due_date as string | { value?: string } | null),
        reference: str(row.reference) ?? str(row.invoice_number),
        description: row.description ? normalizeString(row.description) : '',
        partyName: row.client_name ? normalizeString(row.client_name) : null,
        status: normalizeString(row.payment_status),
        isReconciled: false,
        reconciliationId: null,
        matchedRecordId: normalizeString(row.income_id),
        matchedPaymentId: normalizeString(row.payment_id)
      })
    }

    // 2. Invoice-level fallback: income fully paid with no payments table entries
    const invoiceFallbackRows = await queryRows<IncomeInvoiceFallbackRow>(
      `
        SELECT
          i.income_id, i.total_amount, i.amount_paid, i.currency,
          i.invoice_number, i.invoice_date, i.due_date, i.description, i.client_name,
          i.payment_status, i.is_reconciled, i.reconciliation_id,
          (SELECT COUNT(*) FROM greenhouse_finance.income_payments ip WHERE ip.income_id = i.income_id) AS payment_count
        FROM greenhouse_finance.income i
        WHERE i.is_reconciled = FALSE
          AND COALESCE(i.amount_paid, 0) > 0
          AND COALESCE(i.amount_paid, 0) >= i.total_amount - 0.01
          AND (
            $1 = ''
            OR LOWER(i.income_id) LIKE $1
            OR LOWER(COALESCE(i.invoice_number, '')) LIKE $1
            OR LOWER(COALESCE(i.description, '')) LIKE $1
            OR LOWER(COALESCE(i.client_name, '')) LIKE $1
          )
        ORDER BY i.invoice_date DESC NULLS LAST, i.total_amount DESC
        LIMIT $2
      `,
      [searchPattern, candidateRowLimit]
    )

    for (const row of invoiceFallbackRows) {
      if (toNumber(row.payment_count) > 0) continue

      const incomeId = normalizeString(row.income_id)

      candidates.push({
        id: incomeId,
        type: 'income',
        amount: roundCurrency(toNumber(row.total_amount)),
        currency: normalizeString(row.currency),
        transactionDate: toDateString(row.invoice_date as string | { value?: string } | null),
        dueDate: toDateString(row.due_date as string | { value?: string } | null),
        reference: row.invoice_number ? normalizeString(row.invoice_number) : null,
        description: row.description ? normalizeString(row.description) : '',
        partyName: row.client_name ? normalizeString(row.client_name) : null,
        status: normalizeString(row.payment_status),
        isReconciled: false,
        reconciliationId: str(row.reconciliation_id),
        matchedRecordId: incomeId,
        matchedPaymentId: null
      })
    }
  }

  // ── Expense candidates ──
  if (shouldLoadExpense) {
    const expenseRows = await queryRows<ExpenseCandidateRow>(
      `
        SELECT
          expense_id, total_amount, currency, payment_date, document_date,
          payment_reference, document_number, description,
          supplier_name, member_name, payment_status,
          is_reconciled, reconciliation_id
        FROM greenhouse_finance.expenses
        WHERE is_reconciled = FALSE
          AND COALESCE(payment_date, document_date) BETWEEN $1::date AND $2::date
          AND (
            $3 = ''
            OR LOWER(expense_id) LIKE $3
            OR LOWER(COALESCE(payment_reference, '')) LIKE $3
            OR LOWER(COALESCE(document_number, '')) LIKE $3
            OR LOWER(description) LIKE $3
            OR LOWER(COALESCE(supplier_name, '')) LIKE $3
            OR LOWER(COALESCE(member_name, '')) LIKE $3
          )
        ORDER BY COALESCE(payment_date, document_date) DESC, total_amount DESC
        LIMIT $4
      `,
      [startDate, endDate, searchPattern, boundedLimit]
    )

    for (const row of expenseRows) {
      const expenseId = normalizeString(row.expense_id)

      candidates.push({
        id: expenseId,
        type: 'expense',
        amount: -toNumber(row.total_amount),
        currency: normalizeString(row.currency),
        transactionDate: toDateString((row.payment_date || row.document_date) as string | { value?: string } | null),
        dueDate: null,
        reference: row.payment_reference
          ? normalizeString(row.payment_reference)
          : row.document_number
            ? normalizeString(row.document_number)
            : null,
        description: normalizeString(row.description),
        partyName: row.supplier_name
          ? normalizeString(row.supplier_name)
          : row.member_name
            ? normalizeString(row.member_name)
            : null,
        status: normalizeString(row.payment_status),
        isReconciled: false,
        reconciliationId: str(row.reconciliation_id),
        matchedRecordId: expenseId,
        matchedPaymentId: null
      })
    }
  }

  // ── Filter by date window & sort ──
  const filtered = candidates.filter(c => isDateWithinBounds(c.transactionDate, startDate, endDate))

  filtered.sort((left, right) => {
    const ld = left.transactionDate || ''
    const rd = right.transactionDate || ''

    if (ld !== rd) return rd.localeCompare(ld)

    return Math.abs(right.amount) - Math.abs(left.amount)
  })

  const padMonth = (m: number) => String(m).padStart(2, '0')

  return {
    period: { ...period, monthLabel: `${period.year}-${padMonth(period.month)}` },
    items: filtered.slice(0, boundedLimit),
    total: filtered.length
  }
}

// ─── Resolve reconciliation target ──────────────────────────────────

export const resolveReconciliationTargetFromPostgres = async ({
  matchedType,
  matchedId,
  matchedPaymentId
}: {
  matchedType: ReconciliationCandidateType
  matchedId: string
  matchedPaymentId?: string | null
}): Promise<ResolvedReconciliationTarget> => {
  await assertFinanceSlice2PostgresReady()

  if (matchedType === 'expense') {
    const rows = await queryRows<{
      expense_id: string
      is_reconciled: boolean
      reconciliation_id: string | null
    }>(
      `SELECT expense_id, is_reconciled, reconciliation_id
       FROM greenhouse_finance.expenses WHERE expense_id = $1 LIMIT 1`,
      [matchedId]
    )

    if (rows.length === 0) {
      throw new FinanceValidationError(`expense record "${matchedId}" not found.`, 404)
    }

    const target = rows[0]

    return {
      matchedType: 'expense',
      candidateId: normalizeString(target.expense_id),
      matchedRecordId: normalizeString(target.expense_id),
      matchedPaymentId: null,
      isReconciled: Boolean(target.is_reconciled),
      reconciliationId: str(target.reconciliation_id)
    }
  }

  // ── Income target resolution ──
  if (matchedPaymentId) {
    // Payment-level match
    const paymentRows = await queryRows<{
      payment_id: string
      income_id: string
      is_reconciled: boolean
      reconciliation_row_id: string | null
    }>(
      `SELECT payment_id, income_id, is_reconciled, reconciliation_row_id
       FROM greenhouse_finance.income_payments WHERE payment_id = $1 LIMIT 1`,
      [matchedPaymentId]
    )

    if (paymentRows.length === 0) {
      throw new FinanceValidationError(`income payment "${matchedPaymentId}" not found.`, 404)
    }

    const payment = paymentRows[0]

    return {
      matchedType: 'income',
      candidateId: normalizeString(payment.payment_id),
      matchedRecordId: normalizeString(payment.income_id),
      matchedPaymentId: normalizeString(payment.payment_id),
      isReconciled: Boolean(payment.is_reconciled),
      reconciliationId: str(payment.reconciliation_row_id)
    }
  }

  // Invoice-level fallback (no payment_id)
  const incomeRows = await queryRows<{
    income_id: string
    is_reconciled: boolean
    reconciliation_id: string | null
  }>(
    `SELECT income_id, is_reconciled, reconciliation_id
     FROM greenhouse_finance.income WHERE income_id = $1 LIMIT 1`,
    [matchedId]
  )

  if (incomeRows.length === 0) {
    throw new FinanceValidationError(`income record "${matchedId}" not found.`, 404)
  }

  const income = incomeRows[0]

  return {
    matchedType: 'income',
    candidateId: normalizeString(income.income_id),
    matchedRecordId: normalizeString(income.income_id),
    matchedPaymentId: null,
    isReconciled: Boolean(income.is_reconciled),
    reconciliationId: str(income.reconciliation_id)
  }
}

// ─── Set reconciliation link ────────────────────────────────────────

export const setReconciliationLinkInPostgres = async ({
  matchedType,
  matchedId,
  matchedPaymentId,
  rowId,
  matchedBy
}: {
  matchedType: ReconciliationCandidateType
  matchedId: string
  matchedPaymentId?: string | null
  rowId: string
  matchedBy?: string | null
}) => {
  await assertFinanceSlice2PostgresReady()

  if (matchedType === 'expense') {
    await queryRows(
      `
        UPDATE greenhouse_finance.expenses
        SET is_reconciled = TRUE, reconciliation_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE expense_id = $1
      `,
      [matchedId, rowId]
    )

    return
  }

  // ── Income reconciliation ──
  if (matchedPaymentId) {
    // Update specific payment
    await queryRows(
      `
        UPDATE greenhouse_finance.income_payments
        SET
          is_reconciled = TRUE,
          reconciliation_row_id = $2,
          reconciled_at = CURRENT_TIMESTAMP,
          reconciled_by_user_id = $3
        WHERE payment_id = $1
      `,
      [matchedPaymentId, rowId, matchedBy || null]
    )

    // Summarize income reconciliation status
    await summarizeAndUpdateIncomeReconciliation(matchedId)

    return
  }

  // Invoice-level fallback
  await queryRows(
    `
      UPDATE greenhouse_finance.income
      SET is_reconciled = TRUE, reconciliation_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE income_id = $1
    `,
    [matchedId, rowId]
  )
}

// ─── Clear reconciliation link ──────────────────────────────────────

export const clearReconciliationLinkInPostgres = async ({
  matchedType,
  matchedId,
  matchedPaymentId,
  rowId
}: {
  matchedType: string
  matchedId: string
  matchedPaymentId?: string | null
  rowId: string
}) => {
  await assertFinanceSlice2PostgresReady()

  const normalizedType = normalizeString(matchedType)

  if (normalizedType !== 'income' && normalizedType !== 'expense') return

  if (normalizedType === 'expense') {
    await queryRows(
      `
        UPDATE greenhouse_finance.expenses
        SET is_reconciled = FALSE, reconciliation_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE expense_id = $1 AND reconciliation_id = $2
      `,
      [matchedId, rowId]
    )

    return
  }

  // ── Income reconciliation clear ──
  if (matchedPaymentId) {
    await queryRows(
      `
        UPDATE greenhouse_finance.income_payments
        SET
          is_reconciled = FALSE,
          reconciliation_row_id = NULL,
          reconciled_at = NULL,
          reconciled_by_user_id = NULL
        WHERE payment_id = $1
      `,
      [matchedPaymentId]
    )

    await summarizeAndUpdateIncomeReconciliation(matchedId)

    return
  }

  // Also clear by rowId match in payments
  await queryRows(
    `
      UPDATE greenhouse_finance.income_payments
      SET
        is_reconciled = FALSE,
        reconciliation_row_id = NULL,
        reconciled_at = NULL,
        reconciled_by_user_id = NULL
      WHERE income_id = $1 AND reconciliation_row_id = $2
    `,
    [matchedId, rowId]
  )

  // Invoice-level fallback clear
  await queryRows(
    `
      UPDATE greenhouse_finance.income
      SET is_reconciled = FALSE, reconciliation_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE income_id = $1 AND reconciliation_id = $2
    `,
    [matchedId, rowId]
  )

  await summarizeAndUpdateIncomeReconciliation(matchedId)
}

// ─── Income reconciliation summary ──────────────────────────────────

const summarizeAndUpdateIncomeReconciliation = async (incomeId: string) => {
  const incomeRows = await queryRows<{
    income_id: string
    total_amount: unknown
    amount_paid: unknown
  }>(
    `SELECT income_id, total_amount, amount_paid FROM greenhouse_finance.income WHERE income_id = $1`,
    [incomeId]
  )

  if (incomeRows.length === 0) return

  const income = incomeRows[0]
  const totalAmount = toNumber(income.total_amount)
  const amountPaid = toNumber(income.amount_paid)
  const fullyPaid = totalAmount > 0 && amountPaid >= totalAmount - 0.01

  const paymentSummary = await queryRows<{
    total_payments: string
    reconciled_payments: string
    latest_reconciliation_row_id: string | null
  }>(
    `
      SELECT
        COUNT(*) AS total_payments,
        COUNT(*) FILTER (WHERE is_reconciled AND reconciliation_row_id IS NOT NULL) AS reconciled_payments,
        (
          SELECT reconciliation_row_id
          FROM greenhouse_finance.income_payments
          WHERE income_id = $1 AND is_reconciled AND reconciliation_row_id IS NOT NULL
          ORDER BY COALESCE(reconciled_at, payment_date, created_at) DESC
          LIMIT 1
        ) AS latest_reconciliation_row_id
      FROM greenhouse_finance.income_payments
      WHERE income_id = $1
    `,
    [incomeId]
  )

  const totalPayments = toNumber(paymentSummary[0]?.total_payments)
  const reconciledPayments = toNumber(paymentSummary[0]?.reconciled_payments)
  const latestRowId = str(paymentSummary[0]?.latest_reconciliation_row_id)

  const allReconciled = totalPayments > 0 && reconciledPayments === totalPayments
  const isReconciled = fullyPaid && allReconciled
  const reconciliationId = fullyPaid ? latestRowId : null

  await queryRows(
    `
      UPDATE greenhouse_finance.income
      SET is_reconciled = $2, reconciliation_id = $3, updated_at = CURRENT_TIMESTAMP
      WHERE income_id = $1
    `,
    [incomeId, isReconciled, reconciliationId]
  )
}
