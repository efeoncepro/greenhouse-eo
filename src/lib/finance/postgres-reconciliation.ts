import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

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
import { publishOutboxEvent } from '@/lib/sync/publish-event'
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
  instrument_category_snapshot: string | null
  provider_slug_snapshot: string | null
  provider_name_snapshot: string | null
  period_currency_snapshot: string | null
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
  matched_settlement_leg_id: string | null
  match_confidence: unknown
  notes: string | null
  matched_by_user_id: string | null
  matched_at: string | Date | null
  created_at: string | Date | null
}

type SettlementLegCandidateRow = {
  settlement_leg_id: string
  settlement_group_id: string
  linked_payment_type: string
  linked_payment_id: string
  leg_type: string
  direction: string
  instrument_id: string | null
  instrument_name: string | null
  settlement_mode: string | null
  provider_reference: string | null
  provider_status: string | null
  transaction_date: string | Date | null
  amount: unknown
  currency: string | null
  reconciliation_row_id: string | null
  is_reconciled: boolean
  payment_id: string
  record_id: string
  transaction_reference: string | null
  document_reference: string | null
  description: string | null
  party_name: string | null
  status: string | null
  due_date: string | Date | null
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
  payment_id: string
  expense_id: string
  amount: unknown
  currency: string
  payment_date: string | Date | null
  reference: string | null
  description: string
  supplier_name: string | null
  member_name: string | null
  payment_status: string
  is_reconciled: boolean
  reconciliation_row_id: string | null
}

type ExpenseInvoiceFallbackRow = {
  expense_id: string
  total_amount: unknown
  amount_paid: unknown
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
  payment_count: unknown
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
  instrumentCategorySnapshot: str(row.instrument_category_snapshot),
  providerSlugSnapshot: str(row.provider_slug_snapshot),
  providerNameSnapshot: str(row.provider_name_snapshot),
  periodCurrencySnapshot: str(row.period_currency_snapshot),
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
  matchedSettlementLegId: str(row.matched_settlement_leg_id),
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

const buildStatementFingerprint = (
  periodId: string,
  row: {
    transactionDate: string
    valueDate?: string | null
    description: string
    reference?: string | null
    amount: number
    balance?: number | null
  }
) =>
  createHash('md5')
    .update([
      periodId,
      row.transactionDate,
      row.valueDate || '',
      normalizeString(row.description),
      normalizeString(row.reference),
      roundCurrency(row.amount).toFixed(2),
      row.balance == null ? '' : roundCurrency(row.balance).toFixed(2)
    ].join('||'))
    .digest('hex')

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

  const accountRows = await queryRows<{
    instrument_category: string | null
    provider_slug: string | null
    bank_name: string | null
    currency: string | null
  }>(
    `
      SELECT instrument_category, provider_slug, bank_name, currency
      FROM greenhouse_finance.accounts
      WHERE account_id = $1
      LIMIT 1
    `,
    [accountId]
  )

  if (accountRows.length === 0) {
    throw new FinanceValidationError(`Payment instrument "${accountId}" not found.`, 404)
  }

  const account = accountRows[0]

  await queryRows(
    `
      INSERT INTO greenhouse_finance.reconciliation_periods (
        period_id, account_id, year, month, opening_balance,
        status, statement_imported, statement_row_count,
        notes, instrument_category_snapshot, provider_slug_snapshot, provider_name_snapshot,
        period_currency_snapshot, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'open', FALSE, 0, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [
      periodId,
      accountId,
      year,
      month,
      openingBalance,
      notes,
      str(account.instrument_category),
      str(account.provider_slug),
      str(account.bank_name),
      str(account.currency)
    ]
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

  return withGreenhousePostgresTransaction(async client => {
    // Acquire an exclusive row lock before updating — NOWAIT fails fast with
    // an error if another transaction already holds the lock, preventing
    // concurrent status transitions from corrupting the period state.
    const lockResult = await client.query<{ period_id: string }>(
      `SELECT period_id FROM greenhouse_finance.reconciliation_periods
       WHERE period_id = $1 FOR UPDATE NOWAIT`,
      [periodId]
    )

    if (lockResult.rowCount === 0) return null

    const rows = await queryRows<PostgresPeriodRow>(
      `
        UPDATE greenhouse_finance.reconciliation_periods
        SET ${setClauses.join(', ')}
        WHERE period_id = $${paramIdx}
        RETURNING *
      `,
      values,
      client
    )

    return rows.length > 0 ? mapPeriod(rows[0]) : null
  })
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
    const importBatchId = `stmt-import-${randomUUID()}`
    let imported = 0
    let skipped = 0

    const preparedRows = rows.map(row => ({
      ...row,
      fingerprint: buildStatementFingerprint(periodId, row)
    }))

    const uniqueRows = new Map<string, typeof preparedRows[number]>()

    for (const row of preparedRows) {
      if (uniqueRows.has(row.fingerprint)) {
        skipped++
        continue
      }

      uniqueRows.set(row.fingerprint, row)
    }

    const fingerprints = [...uniqueRows.keys()]

    const existingRows = fingerprints.length > 0
      ? await queryRows<{ source_import_fingerprint: string | null }>(
          `
            SELECT source_import_fingerprint
            FROM greenhouse_finance.bank_statement_rows
            WHERE period_id = $1
              AND source_import_fingerprint = ANY($2::text[])
          `,
          [periodId, fingerprints],
          client
        )
      : []

    const existingFingerprints = new Set(
      existingRows
        .map(row => str(row.source_import_fingerprint))
        .filter((value): value is string => Boolean(value))
    )

    for (const row of uniqueRows.values()) {
      const fingerprint = row.fingerprint

      if (existingFingerprints.has(fingerprint)) {
        skipped++
        continue
      }

      const rowId = `${periodId}_${fingerprint.slice(0, 12)}`

      const inserted = await queryRows<{ row_id: string }>(
        `
          INSERT INTO greenhouse_finance.bank_statement_rows (
            row_id, period_id, transaction_date, value_date,
            description, reference, amount, balance,
            match_status, source_import_batch_id, source_import_fingerprint, source_imported_at,
            source_payload_json, created_at
          ) VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, $8, 'unmatched', $9, $10, CURRENT_TIMESTAMP, $11::jsonb, CURRENT_TIMESTAMP)
          ON CONFLICT (period_id, source_import_fingerprint)
            WHERE source_import_fingerprint IS NOT NULL
          DO NOTHING
          RETURNING row_id
        `,
        [
          rowId,
          periodId,
          row.transactionDate,
          row.valueDate || null,
          row.description,
          row.reference || null,
          row.amount,
          row.balance ?? null,
          importBatchId,
          fingerprint,
          JSON.stringify({
            transactionDate: row.transactionDate,
            valueDate: row.valueDate || null,
            description: row.description,
            reference: row.reference || null,
            amount: roundCurrency(row.amount),
            balance: row.balance ?? null
          })
        ],
        client
      )

      if (inserted.length > 0) {
        imported++
      }
    }

    const countResult = await queryRows<{ total: string }>(
      `SELECT COUNT(*) AS total FROM greenhouse_finance.bank_statement_rows WHERE period_id = $1`,
      [periodId],
      client
    )

    const totalRowCount = toNumber(countResult[0]?.total)

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
      [periodId, totalRowCount],
      client
    )

    return { imported, skipped, totalRowCount, importBatchId }
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
    matchedSettlementLegId?: string | null
    matchConfidence: number
    matchedByUserId: string | null
    notes?: string | null
  },
  opts?: { client?: QueryableClient }
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
        matched_settlement_leg_id = $7,
        match_confidence = $8,
        matched_by_user_id = $9,
        matched_at = CURRENT_TIMESTAMP,
        notes = $10
      WHERE row_id = $1 AND period_id = $2
    `,
    [
      rowId, periodId,
      match.matchStatus, match.matchedType, match.matchedId,
      match.matchedPaymentId, match.matchedSettlementLegId ?? null, match.matchConfidence,
      match.matchedByUserId, match.notes ?? null
    ],
    opts?.client
  )
}

// ─── Statement rows: clear match ────────────────────────────────────

export const clearStatementRowMatchInPostgres = async (
  rowId: string,
  periodId: string,
  opts?: { client?: QueryableClient }
) => {
  await assertFinanceSlice2PostgresReady()

  await queryRows(
    `
      UPDATE greenhouse_finance.bank_statement_rows
      SET
        match_status = 'unmatched',
        matched_type = NULL,
        matched_id = NULL,
        matched_payment_id = NULL,
        matched_settlement_leg_id = NULL,
        match_confidence = NULL,
        matched_by_user_id = NULL,
        matched_at = NULL
      WHERE row_id = $1 AND period_id = $2
    `,
    [rowId, periodId],
    opts?.client
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
        matched_settlement_leg_id = NULL,
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
    period_id: string
    transaction_date: string | Date
    description: string
    reference: string | null
    amount: unknown
  }>(
    `
      SELECT row_id, period_id, transaction_date, description, reference, amount
      FROM greenhouse_finance.bank_statement_rows
      WHERE period_id = $1 AND match_status = 'unmatched'
    `,
    [periodId]
  )
}

/**
 * Period-agnostic variant for continuous auto-match (TASK-401).
 * Loads unmatched bank statement rows across ALL open periods within a date range,
 * optionally filtered by account. Every row still carries its period_id FK so the
 * caller can forward it to updateStatementRowMatchInPostgres.
 */
export const listUnmatchedStatementRowsByDateRangeFromPostgres = async ({
  fromDate,
  toDate,
  accountId
}: {
  fromDate: string
  toDate: string
  accountId?: string | null
}) => {
  await assertFinanceSlice2PostgresReady()

  const params: unknown[] = [fromDate, toDate]
  let accountFilter = ''

  if (accountId) {
    params.push(accountId)
    accountFilter = `AND rp.account_id = $${params.length}`
  }

  return queryRows<{
    row_id: string
    period_id: string
    transaction_date: string | Date
    description: string
    reference: string | null
    amount: unknown
  }>(
    `
      SELECT bsr.row_id, bsr.period_id, bsr.transaction_date, bsr.description, bsr.reference, bsr.amount
      FROM greenhouse_finance.bank_statement_rows bsr
      JOIN greenhouse_finance.reconciliation_periods rp ON rp.period_id = bsr.period_id
      WHERE bsr.match_status = 'unmatched'
        AND bsr.transaction_date BETWEEN $1::date AND $2::date
        AND rp.status <> 'closed'
        ${accountFilter}
      ORDER BY bsr.transaction_date DESC, bsr.row_id
      LIMIT 2000
    `,
    params
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
  const period = await getReconciliationPeriodContextFromPostgres(periodId)

  const { startDate, endDate } = getPeriodBounds({
    year: period.year,
    month: period.month,
    windowDays
  })

  const result = await listReconciliationCandidatesByDateRangeFromPostgres({
    startDate,
    endDate,
    type,
    search,
    limit
  })

  const padMonth = (m: number) => String(m).padStart(2, '0')

  return {
    period: { ...period, monthLabel: `${period.year}-${padMonth(period.month)}` },
    items: result.items,
    total: result.total
  }
}

/**
 * Period-agnostic candidate loader for continuous auto-match (TASK-401).
 * Accepts an explicit { startDate, endDate } date window and runs the same 3-query
 * cascade (settlement legs → payment rows → invoice fallback) for both income and expense.
 */
export const listReconciliationCandidatesByDateRangeFromPostgres = async ({
  startDate,
  endDate,
  type = 'all',
  search,
  limit = 100
}: {
  startDate: string
  endDate: string
  type?: ReconciliationCandidateType | 'all'
  search?: string
  limit?: number
}) => {
  await assertFinanceSlice2PostgresReady()

  const boundedLimit = Math.min(200, Math.max(1, limit))
  const candidateRowLimit = Math.min(800, Math.max(200, boundedLimit * 4))
  const normalizedSearch = normalizeString(search).toLowerCase()
  const searchPattern = normalizedSearch ? `%${normalizedSearch}%` : ''

  const shouldLoadIncome = type === 'all' || type === 'income'
  const shouldLoadExpense = type === 'all' || type === 'expense'

  const candidates: ReconciliationCandidate[] = []

  // ── Income candidates via income_payments table ──
  if (shouldLoadIncome) {
    // 1. Canonical settlement legs linked to income payments
    const incomeSettlementRows = await queryRows<SettlementLegCandidateRow>(
      `
        SELECT
          sl.settlement_leg_id,
          sl.settlement_group_id,
          sl.linked_payment_type,
          sl.linked_payment_id,
          sl.leg_type,
          sl.direction,
          sl.instrument_id,
          a.account_name AS instrument_name,
          sg.settlement_mode,
          sl.provider_reference,
          sl.provider_status,
          sl.transaction_date,
          sl.amount,
          sl.currency,
          sl.reconciliation_row_id,
          sl.is_reconciled,
          ip.payment_id,
          i.income_id AS record_id,
          ip.reference AS transaction_reference,
          i.invoice_number AS document_reference,
          i.description,
          i.client_name AS party_name,
          i.payment_status AS status,
          i.due_date
        FROM greenhouse_finance.settlement_legs sl
        JOIN greenhouse_finance.settlement_groups sg ON sg.settlement_group_id = sl.settlement_group_id
        JOIN greenhouse_finance.income_payments ip ON ip.payment_id = sl.linked_payment_id
        JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
        LEFT JOIN greenhouse_finance.accounts a ON a.account_id = sl.instrument_id
        WHERE sl.linked_payment_type = 'income_payment'
          AND sl.is_reconciled = FALSE
          AND sl.transaction_date BETWEEN $1::date AND $2::date
          AND (
            $3 = ''
            OR LOWER(sl.settlement_leg_id) LIKE $3
            OR LOWER(COALESCE(sl.provider_reference, '')) LIKE $3
            OR LOWER(COALESCE(ip.reference, '')) LIKE $3
            OR LOWER(COALESCE(i.invoice_number, '')) LIKE $3
            OR LOWER(COALESCE(i.description, '')) LIKE $3
            OR LOWER(COALESCE(i.client_name, '')) LIKE $3
            OR LOWER(COALESCE(a.account_name, '')) LIKE $3
          )
        ORDER BY sl.transaction_date DESC NULLS LAST, sl.amount DESC
        LIMIT $4
      `,
      [startDate, endDate, searchPattern, candidateRowLimit]
    )

    for (const row of incomeSettlementRows) {
      candidates.push({
        id: normalizeString(row.settlement_leg_id),
        type: 'income',
        amount: roundCurrency(toNumber(row.amount)),
        currency: normalizeString(row.currency || ''),
        transactionDate: toDateString(row.transaction_date as string | { value?: string } | null),
        dueDate: toDateString(row.due_date as string | { value?: string } | null),
        reference: str(row.provider_reference) ?? str(row.transaction_reference) ?? str(row.document_reference),
        description: [
          row.description ? normalizeString(row.description) : '',
          row.leg_type ? `· ${normalizeString(row.leg_type)}` : ''
        ].join(' ').trim(),
        partyName: row.party_name ? normalizeString(row.party_name) : null,
        status: normalizeString(row.status),
        isReconciled: false,
        reconciliationId: str(row.reconciliation_row_id),
        matchedRecordId: normalizeString(row.record_id),
        matchedPaymentId: normalizeString(row.payment_id),
        matchedSettlementLegId: normalizeString(row.settlement_leg_id),
        legType: normalizeString(row.leg_type),
        instrumentId: str(row.instrument_id),
        instrumentName: str(row.instrument_name),
        settlementMode: str(row.settlement_mode)
      })
    }

    // 2. Legacy payment-level fallback when a payment has no settlement legs
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
          AND NOT EXISTS (
            SELECT 1
            FROM greenhouse_finance.settlement_legs sl
            WHERE sl.linked_payment_type = 'income_payment'
              AND sl.linked_payment_id = ip.payment_id
          )
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

    // 3. Invoice-level fallback: income fully paid with no payments table entries
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
    const expenseSettlementRows = await queryRows<SettlementLegCandidateRow>(
      `
        SELECT
          sl.settlement_leg_id,
          sl.settlement_group_id,
          sl.linked_payment_type,
          sl.linked_payment_id,
          sl.leg_type,
          sl.direction,
          sl.instrument_id,
          a.account_name AS instrument_name,
          sg.settlement_mode,
          sl.provider_reference,
          sl.provider_status,
          sl.transaction_date,
          sl.amount,
          sl.currency,
          sl.reconciliation_row_id,
          sl.is_reconciled,
          ep.payment_id,
          e.expense_id AS record_id,
          ep.reference AS transaction_reference,
          COALESCE(e.payment_reference, e.document_number) AS document_reference,
          e.description,
          COALESCE(e.supplier_name, e.member_name) AS party_name,
          e.payment_status AS status,
          NULL::date AS due_date
        FROM greenhouse_finance.settlement_legs sl
        JOIN greenhouse_finance.settlement_groups sg ON sg.settlement_group_id = sl.settlement_group_id
        JOIN greenhouse_finance.expense_payments ep ON ep.payment_id = sl.linked_payment_id
        JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
        LEFT JOIN greenhouse_finance.accounts a ON a.account_id = sl.instrument_id
        WHERE sl.linked_payment_type = 'expense_payment'
          AND sl.is_reconciled = FALSE
          AND sl.transaction_date BETWEEN $1::date AND $2::date
          AND (
            $3 = ''
            OR LOWER(sl.settlement_leg_id) LIKE $3
            OR LOWER(COALESCE(sl.provider_reference, '')) LIKE $3
            OR LOWER(COALESCE(ep.reference, '')) LIKE $3
            OR LOWER(COALESCE(e.payment_reference, '')) LIKE $3
            OR LOWER(COALESCE(e.document_number, '')) LIKE $3
            OR LOWER(e.description) LIKE $3
            OR LOWER(COALESCE(e.supplier_name, '')) LIKE $3
            OR LOWER(COALESCE(e.member_name, '')) LIKE $3
            OR LOWER(COALESCE(a.account_name, '')) LIKE $3
          )
        ORDER BY sl.transaction_date DESC NULLS LAST, sl.amount DESC
        LIMIT $4
      `,
      [startDate, endDate, searchPattern, candidateRowLimit]
    )

    for (const row of expenseSettlementRows) {
      candidates.push({
        id: normalizeString(row.settlement_leg_id),
        type: 'expense',
        amount: -roundCurrency(toNumber(row.amount)),
        currency: normalizeString(row.currency),
        transactionDate: toDateString(row.transaction_date as string | { value?: string } | null),
        dueDate: null,
        reference: str(row.provider_reference) ?? str(row.transaction_reference) ?? str(row.document_reference),
        description: [
          normalizeString(row.description || ''),
          row.leg_type ? `· ${normalizeString(row.leg_type)}` : ''
        ].join(' ').trim(),
        partyName: row.party_name ? normalizeString(row.party_name) : null,
        status: normalizeString(row.status),
        isReconciled: false,
        reconciliationId: str(row.reconciliation_row_id),
        matchedRecordId: normalizeString(row.record_id),
        matchedPaymentId: normalizeString(row.payment_id),
        matchedSettlementLegId: normalizeString(row.settlement_leg_id),
        legType: normalizeString(row.leg_type),
        instrumentId: str(row.instrument_id),
        instrumentName: str(row.instrument_name),
        settlementMode: str(row.settlement_mode)
      })
    }

    const expensePaymentRows = await queryRows<ExpenseCandidateRow>(
      `
        SELECT
          ep.payment_id, ep.expense_id, ep.amount, ep.currency, ep.payment_date,
          ep.reference,
          e.description, e.supplier_name, e.member_name, e.payment_status,
          ep.is_reconciled, ep.reconciliation_row_id
        FROM greenhouse_finance.expense_payments ep
        JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
        WHERE ep.is_reconciled = FALSE
          AND ep.payment_date BETWEEN $1::date AND $2::date
          AND NOT EXISTS (
            SELECT 1
            FROM greenhouse_finance.settlement_legs sl
            WHERE sl.linked_payment_type = 'expense_payment'
              AND sl.linked_payment_id = ep.payment_id
          )
          AND (
            $3 = ''
            OR LOWER(ep.payment_id) LIKE $3
            OR LOWER(ep.expense_id) LIKE $3
            OR LOWER(COALESCE(ep.reference, '')) LIKE $3
            OR LOWER(e.description) LIKE $3
            OR LOWER(COALESCE(e.supplier_name, '')) LIKE $3
            OR LOWER(COALESCE(e.member_name, '')) LIKE $3
          )
        ORDER BY ep.payment_date DESC NULLS LAST, ep.amount DESC
        LIMIT $4
      `,
      [startDate, endDate, searchPattern, candidateRowLimit]
    )

    for (const row of expensePaymentRows) {
      const expenseId = normalizeString(row.expense_id)
      const paymentId = normalizeString(row.payment_id)

      candidates.push({
        id: paymentId,
        type: 'expense',
        amount: -roundCurrency(toNumber(row.amount)),
        currency: normalizeString(row.currency),
        transactionDate: toDateString(row.payment_date as string | { value?: string } | null),
        dueDate: null,
        reference: str(row.reference),
        description: normalizeString(row.description),
        partyName: row.supplier_name
          ? normalizeString(row.supplier_name)
          : row.member_name
            ? normalizeString(row.member_name)
            : null,
        status: normalizeString(row.payment_status),
        isReconciled: false,
        reconciliationId: str(row.reconciliation_row_id),
        matchedRecordId: expenseId,
        matchedPaymentId: paymentId
      })
    }

    const expenseFallbackRows = await queryRows<ExpenseInvoiceFallbackRow>(
      `
        SELECT
          e.expense_id, e.total_amount, e.amount_paid, e.currency,
          e.payment_date, e.document_date, e.payment_reference, e.document_number,
          e.description, e.supplier_name, e.member_name, e.payment_status,
          e.is_reconciled, e.reconciliation_id,
          (SELECT COUNT(*) FROM greenhouse_finance.expense_payments ep WHERE ep.expense_id = e.expense_id) AS payment_count
        FROM greenhouse_finance.expenses e
        WHERE e.is_reconciled = FALSE
          AND COALESCE(e.amount_paid, 0) > 0
          AND COALESCE(e.amount_paid, 0) >= e.total_amount - 0.01
          AND COALESCE(e.payment_date, e.document_date) BETWEEN $1::date AND $2::date
          AND (
            $3 = ''
            OR LOWER(e.expense_id) LIKE $3
            OR LOWER(COALESCE(e.payment_reference, '')) LIKE $3
            OR LOWER(COALESCE(e.document_number, '')) LIKE $3
            OR LOWER(e.description) LIKE $3
            OR LOWER(COALESCE(e.supplier_name, '')) LIKE $3
            OR LOWER(COALESCE(e.member_name, '')) LIKE $3
          )
        ORDER BY COALESCE(e.payment_date, e.document_date) DESC NULLS LAST, e.total_amount DESC
        LIMIT $4
      `,
      [startDate, endDate, searchPattern, candidateRowLimit]
    )

    for (const row of expenseFallbackRows) {
      if (toNumber(row.payment_count) > 0) continue

      const expenseId = normalizeString(row.expense_id)

      candidates.push({
        id: expenseId,
        type: 'expense',
        amount: -roundCurrency(toNumber(row.total_amount)),
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

  return {
    items: filtered.slice(0, boundedLimit),
    total: filtered.length
  }
}

// ─── Resolve reconciliation target ──────────────────────────────────

export const resolveReconciliationTargetFromPostgres = async ({
  matchedType,
  matchedId,
  matchedPaymentId,
  matchedSettlementLegId
}: {
  matchedType: ReconciliationCandidateType
  matchedId: string
  matchedPaymentId?: string | null
  matchedSettlementLegId?: string | null
}): Promise<ResolvedReconciliationTarget> => {
  await assertFinanceSlice2PostgresReady()

  if (matchedSettlementLegId) {
    const legRows = await queryRows<{
      settlement_leg_id: string
      linked_payment_type: string
      linked_payment_id: string
      is_reconciled: boolean
      reconciliation_row_id: string | null
      expense_id: string | null
      income_id: string | null
    }>(
      `
        SELECT
          sl.settlement_leg_id,
          sl.linked_payment_type,
          sl.linked_payment_id,
          sl.is_reconciled,
          sl.reconciliation_row_id,
          ep.expense_id,
          ip.income_id
        FROM greenhouse_finance.settlement_legs sl
        LEFT JOIN greenhouse_finance.expense_payments ep
          ON sl.linked_payment_type = 'expense_payment'
         AND ep.payment_id = sl.linked_payment_id
        LEFT JOIN greenhouse_finance.income_payments ip
          ON sl.linked_payment_type = 'income_payment'
         AND ip.payment_id = sl.linked_payment_id
        WHERE sl.settlement_leg_id = $1
        LIMIT 1
      `,
      [matchedSettlementLegId]
    )

    if (legRows.length === 0) {
      throw new FinanceValidationError(`settlement leg "${matchedSettlementLegId}" not found.`, 404)
    }

    const leg = legRows[0]
    const resolvedType = normalizeString(leg.linked_payment_type) === 'expense_payment' ? 'expense' : 'income'

    return {
      matchedType: resolvedType,
      candidateId: normalizeString(leg.settlement_leg_id),
      matchedRecordId: resolvedType === 'expense'
        ? normalizeString(leg.expense_id)
        : normalizeString(leg.income_id),
      matchedPaymentId: normalizeString(leg.linked_payment_id),
      matchedSettlementLegId: normalizeString(leg.settlement_leg_id),
      isReconciled: Boolean(leg.is_reconciled),
      reconciliationId: str(leg.reconciliation_row_id)
    }
  }

  if (matchedType === 'expense') {
    if (matchedPaymentId) {
      const paymentRows = await queryRows<{
        payment_id: string
        expense_id: string
        is_reconciled: boolean
        reconciliation_row_id: string | null
      }>(
        `SELECT payment_id, expense_id, is_reconciled, reconciliation_row_id
         FROM greenhouse_finance.expense_payments
         WHERE payment_id = $1
         LIMIT 1`,
        [matchedPaymentId]
      )

      if (paymentRows.length === 0) {
        throw new FinanceValidationError(`expense payment "${matchedPaymentId}" not found.`, 404)
      }

      const payment = paymentRows[0]

      return {
        matchedType: 'expense',
        candidateId: normalizeString(payment.payment_id),
        matchedRecordId: normalizeString(payment.expense_id),
        matchedPaymentId: normalizeString(payment.payment_id),
        matchedSettlementLegId: null,
        isReconciled: Boolean(payment.is_reconciled),
        reconciliationId: str(payment.reconciliation_row_id)
      }
    }

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
      matchedSettlementLegId: null,
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
      matchedSettlementLegId: null,
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
    matchedSettlementLegId: null,
    isReconciled: Boolean(income.is_reconciled),
    reconciliationId: str(income.reconciliation_id)
  }
}

const recomputePaymentReconciliationFromSettlement = async ({
  paymentType,
  paymentId
}: {
  paymentType: 'income' | 'expense'
  paymentId: string
}) => {
  const linkedPaymentType = paymentType === 'income' ? 'income_payment' : 'expense_payment'

  const paymentTable = paymentType === 'income'
    ? 'greenhouse_finance.income_payments'
    : 'greenhouse_finance.expense_payments'

  const rows = await queryRows<{
    total_legs: string
    reconciled_legs: string
    primary_reconciliation_row_id: string | null
  }>(
    `
      SELECT
        COUNT(*) AS total_legs,
        COUNT(*) FILTER (WHERE is_reconciled) AS reconciled_legs,
        (
          SELECT reconciliation_row_id
          FROM greenhouse_finance.settlement_legs
          WHERE linked_payment_type = $1
            AND linked_payment_id = $2
            AND leg_type IN ('receipt', 'payout')
            AND is_reconciled = TRUE
          ORDER BY updated_at DESC
          LIMIT 1
        ) AS primary_reconciliation_row_id
      FROM greenhouse_finance.settlement_legs
      WHERE linked_payment_type = $1
        AND linked_payment_id = $2
    `,
    [linkedPaymentType, paymentId]
  )

  const totalLegs = toNumber(rows[0]?.total_legs)

  if (totalLegs <= 0) {
    return null
  }

  const reconciledLegs = toNumber(rows[0]?.reconciled_legs)
  const fullyReconciled = totalLegs > 0 && reconciledLegs === totalLegs
  const primaryReconciliationRowId = str(rows[0]?.primary_reconciliation_row_id)

  await queryRows(
    `
      UPDATE ${paymentTable}
      SET
        is_reconciled = $2,
        reconciliation_row_id = $3,
        reconciled_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE payment_id = $1
    `,
    [
      paymentId,
      fullyReconciled,
      fullyReconciled ? primaryReconciliationRowId : null
    ]
  )

  return {
    fullyReconciled,
    primaryReconciliationRowId
  }
}

const getPaymentReconciledState = async ({
  paymentType,
  paymentId
}: {
  paymentType: 'income' | 'expense'
  paymentId: string
}) => {
  const paymentTable = paymentType === 'income'
    ? 'greenhouse_finance.income_payments'
    : 'greenhouse_finance.expense_payments'

  const rows = await queryRows<{ is_reconciled: boolean }>(
    `SELECT is_reconciled FROM ${paymentTable} WHERE payment_id = $1 LIMIT 1`,
    [paymentId]
  )

  return rows.length > 0 ? Boolean(rows[0].is_reconciled) : false
}

// ─── Set reconciliation link ────────────────────────────────────────

export const setReconciliationLinkInPostgres = async ({
  matchedType,
  matchedId,
  matchedPaymentId,
  matchedSettlementLegId,
  rowId,
  matchedBy
}: {
  matchedType: ReconciliationCandidateType
  matchedId: string
  matchedPaymentId?: string | null
  matchedSettlementLegId?: string | null
  rowId: string
  matchedBy?: string | null
}) => {
  await assertFinanceSlice2PostgresReady()

  if (matchedType === 'expense') {
    if (matchedPaymentId) {
      const previousPaymentReconciled = await getPaymentReconciledState({
        paymentType: 'expense',
        paymentId: matchedPaymentId
      })

      await syncSettlementLegReconciliation({
        paymentType: 'expense',
        paymentId: matchedPaymentId,
        settlementLegId: matchedSettlementLegId || null,
        rowId,
        matchedBy
      })

      const settlementSummary = await recomputePaymentReconciliationFromSettlement({
        paymentType: 'expense',
        paymentId: matchedPaymentId
      })

      if (!settlementSummary && !matchedSettlementLegId) {
        await queryRows(
          `
            UPDATE greenhouse_finance.expense_payments
            SET
              is_reconciled = TRUE,
              reconciliation_row_id = $2,
              reconciled_at = CURRENT_TIMESTAMP,
              reconciled_by_user_id = $3
            WHERE payment_id = $1
          `,
          [matchedPaymentId, rowId, matchedBy || null]
        )
      }

      const currentPaymentReconciled = settlementSummary?.fullyReconciled
        ?? await getPaymentReconciledState({
          paymentType: 'expense',
          paymentId: matchedPaymentId
        })

      await summarizeAndUpdateExpenseReconciliation(matchedId)

      if (currentPaymentReconciled && !previousPaymentReconciled) {
        await publishOutboxEvent({
          aggregateType: 'finance_expense_payment',
          aggregateId: matchedPaymentId,
          eventType: 'finance.expense_payment.reconciled',
          payload: {
            paymentId: matchedPaymentId,
            expenseId: matchedId,
            reconciliationRowId: rowId,
            reconciledByUserId: matchedBy || null
          }
        })
      }

      return
    }

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
    const previousPaymentReconciled = await getPaymentReconciledState({
      paymentType: 'income',
      paymentId: matchedPaymentId
    })

    await syncSettlementLegReconciliation({
      paymentType: 'income',
      paymentId: matchedPaymentId,
      settlementLegId: matchedSettlementLegId || null,
      rowId,
      matchedBy
    })

    const settlementSummary = await recomputePaymentReconciliationFromSettlement({
      paymentType: 'income',
      paymentId: matchedPaymentId
    })

    if (!settlementSummary && !matchedSettlementLegId) {
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
    }

    const currentPaymentReconciled = settlementSummary?.fullyReconciled
      ?? await getPaymentReconciledState({
        paymentType: 'income',
        paymentId: matchedPaymentId
      })

    // Summarize income reconciliation status
    await summarizeAndUpdateIncomeReconciliation(matchedId)

    if (currentPaymentReconciled && !previousPaymentReconciled) {
      await publishOutboxEvent({
        aggregateType: 'finance_income_payment',
        aggregateId: matchedPaymentId,
        eventType: 'finance.income_payment.reconciled',
        payload: {
          paymentId: matchedPaymentId,
          incomeId: matchedId,
          reconciliationRowId: rowId,
          reconciledByUserId: matchedBy || null
        }
      })
    }

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
  matchedSettlementLegId,
  rowId
}: {
  matchedType: string
  matchedId: string
  matchedPaymentId?: string | null
  matchedSettlementLegId?: string | null
  rowId: string
}) => {
  await assertFinanceSlice2PostgresReady()

  const normalizedType = normalizeString(matchedType)

  if (normalizedType !== 'income' && normalizedType !== 'expense') return

  if (normalizedType === 'expense') {
    if (matchedPaymentId) {
      const previousPaymentReconciled = await getPaymentReconciledState({
        paymentType: 'expense',
        paymentId: matchedPaymentId
      })

      await syncSettlementLegReconciliation({
        paymentType: 'expense',
        paymentId: matchedPaymentId,
        settlementLegId: matchedSettlementLegId || null,
        rowId: null
      })

      const settlementSummary = await recomputePaymentReconciliationFromSettlement({
        paymentType: 'expense',
        paymentId: matchedPaymentId
      })

      if (!settlementSummary && !matchedSettlementLegId) {
        await queryRows(
          `
            UPDATE greenhouse_finance.expense_payments
            SET
              is_reconciled = FALSE,
              reconciliation_row_id = NULL,
              reconciled_at = NULL,
              reconciled_by_user_id = NULL
            WHERE payment_id = $1
          `,
          [matchedPaymentId]
        )
      }

      const currentPaymentReconciled = settlementSummary?.fullyReconciled
        ?? await getPaymentReconciledState({
          paymentType: 'expense',
          paymentId: matchedPaymentId
        })

      await summarizeAndUpdateExpenseReconciliation(matchedId)

      if (previousPaymentReconciled && !currentPaymentReconciled) {
        await publishOutboxEvent({
          aggregateType: 'finance_expense_payment',
          aggregateId: matchedPaymentId,
          eventType: 'finance.expense_payment.unreconciled',
          payload: {
            paymentId: matchedPaymentId,
            expenseId: matchedId,
            reconciliationRowId: rowId
          }
        })
      }

      return
    }

    await queryRows(
      `
        UPDATE greenhouse_finance.expenses
        SET is_reconciled = FALSE, reconciliation_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE expense_id = $1 AND reconciliation_id = $2
      `,
      [matchedId, rowId]
    )

    await summarizeAndUpdateExpenseReconciliation(matchedId)

    return
  }

  // ── Income reconciliation clear ──
  if (matchedPaymentId) {
    const previousPaymentReconciled = await getPaymentReconciledState({
      paymentType: 'income',
      paymentId: matchedPaymentId
    })

    await syncSettlementLegReconciliation({
      paymentType: 'income',
      paymentId: matchedPaymentId,
      settlementLegId: matchedSettlementLegId || null,
      rowId: null
    })

    const settlementSummary = await recomputePaymentReconciliationFromSettlement({
      paymentType: 'income',
      paymentId: matchedPaymentId
    })

    if (!settlementSummary && !matchedSettlementLegId) {
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
    }

    const currentPaymentReconciled = settlementSummary?.fullyReconciled
      ?? await getPaymentReconciledState({
        paymentType: 'income',
        paymentId: matchedPaymentId
      })

    await summarizeAndUpdateIncomeReconciliation(matchedId)

    if (previousPaymentReconciled && !currentPaymentReconciled) {
      await publishOutboxEvent({
        aggregateType: 'finance_income_payment',
        aggregateId: matchedPaymentId,
        eventType: 'finance.income_payment.unreconciled',
        payload: {
          paymentId: matchedPaymentId,
          incomeId: matchedId,
          reconciliationRowId: rowId
        }
      })
    }

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

const syncSettlementLegReconciliation = async ({
  paymentType,
  paymentId,
  settlementLegId,
  rowId,
  matchedBy
}: {
  paymentType: 'income' | 'expense'
  paymentId: string
  settlementLegId?: string | null
  rowId: string | null
  matchedBy?: string | null
}) => {
  const linkedPaymentType = paymentType === 'income' ? 'income_payment' : 'expense_payment'
  const targetLegId = settlementLegId ? normalizeString(settlementLegId) : null

  if (rowId) {
    await queryRows(
      `
        UPDATE greenhouse_finance.settlement_legs
        SET
          is_reconciled = TRUE,
          reconciliation_row_id = $4,
          reconciled_at = CURRENT_TIMESTAMP,
          provider_status = 'reconciled',
          updated_at = CURRENT_TIMESTAMP
        WHERE linked_payment_type = $1
          AND linked_payment_id = $2
          AND ($3::text IS NULL OR settlement_leg_id = $3)
      `,
      [linkedPaymentType, paymentId, targetLegId, rowId]
    )

    await publishOutboxEvent({
      aggregateType: 'finance_settlement_leg',
      aggregateId: targetLegId || `stlleg-${paymentId}`,
      eventType: 'finance.settlement_leg.reconciled',
      payload: {
        paymentId,
        paymentType: linkedPaymentType,
        settlementLegId: targetLegId,
        reconciliationRowId: rowId,
        reconciledByUserId: matchedBy || null
      }
    })

    return
  }

  await queryRows(
    `
      UPDATE greenhouse_finance.settlement_legs
      SET
        is_reconciled = FALSE,
        reconciliation_row_id = NULL,
        reconciled_at = NULL,
        provider_status = 'settled',
        updated_at = CURRENT_TIMESTAMP
      WHERE linked_payment_type = $1
        AND linked_payment_id = $2
        AND ($3::text IS NULL OR settlement_leg_id = $3)
    `,
    [linkedPaymentType, paymentId, targetLegId]
  )

  await publishOutboxEvent({
    aggregateType: 'finance_settlement_leg',
    aggregateId: targetLegId || `stlleg-${paymentId}`,
    eventType: 'finance.settlement_leg.unreconciled',
    payload: {
      paymentId,
      paymentType: linkedPaymentType,
      settlementLegId: targetLegId
    }
  })
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

const summarizeAndUpdateExpenseReconciliation = async (expenseId: string) => {
  const expenseRows = await queryRows<{
    expense_id: string
    total_amount: unknown
    amount_paid: unknown
  }>(
    `SELECT expense_id, total_amount, amount_paid FROM greenhouse_finance.expenses WHERE expense_id = $1`,
    [expenseId]
  )

  if (expenseRows.length === 0) return

  const expense = expenseRows[0]
  const totalAmount = toNumber(expense.total_amount)
  const amountPaid = toNumber(expense.amount_paid)
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
          FROM greenhouse_finance.expense_payments
          WHERE expense_id = $1 AND is_reconciled AND reconciliation_row_id IS NOT NULL
          ORDER BY COALESCE(reconciled_at, payment_date, created_at) DESC
          LIMIT 1
        ) AS latest_reconciliation_row_id
      FROM greenhouse_finance.expense_payments
      WHERE expense_id = $1
    `,
    [expenseId]
  )

  const totalPayments = toNumber(paymentSummary[0]?.total_payments)
  const reconciledPayments = toNumber(paymentSummary[0]?.reconciled_payments)
  const latestRowId = str(paymentSummary[0]?.latest_reconciliation_row_id)

  const allReconciled = totalPayments > 0 && reconciledPayments === totalPayments
  const isReconciled = fullyPaid && allReconciled
  const reconciliationId = fullyPaid ? latestRowId : null

  await queryRows(
    `
      UPDATE greenhouse_finance.expenses
      SET is_reconciled = $2, reconciliation_id = $3, updated_at = CURRENT_TIMESTAMP
      WHERE expense_id = $1
    `,
    [expenseId, isReconciled, reconciliationId]
  )
}
