import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import { FinanceValidationError, normalizeString, toNumber } from '@/lib/finance/shared'

import type {
  ReconciliationIntelligencePeriodScope,
  ReconciliationIntelligenceStatementRow
} from './types'

type PeriodScopeRow = {
  period_id: string
  account_id: string
  space_id: string | null
  year: number
  month: number
  status: string
  archived_at: string | null
  statement_imported: boolean
  statement_row_count: number | null
  difference: string | number | null
  account_name: string
  currency: string
}

export const getReconciliationIntelligenceScope = async (
  periodId: string
): Promise<ReconciliationIntelligencePeriodScope> => {
  const db = await getDb()

  const result = await sql<PeriodScopeRow>`
    SELECT
      rp.period_id,
      rp.account_id,
      COALESCE(rp.space_id, a.space_id) AS space_id,
      rp.year,
      rp.month,
      rp.status,
      rp.archived_at::text AS archived_at,
      rp.statement_imported,
      rp.statement_row_count,
      rp.difference::text,
      a.account_name,
      a.currency
    FROM greenhouse_finance.reconciliation_periods rp
    JOIN greenhouse_finance.accounts a ON a.account_id = rp.account_id
    WHERE rp.period_id = ${periodId}
    LIMIT 1
  `.execute(db)

  const row = result.rows[0]

  if (!row) {
    throw new FinanceValidationError('Periodo de conciliación no encontrado.', 404)
  }

  const spaceId = normalizeString(row.space_id)

  if (!spaceId) {
    throw new FinanceValidationError('El periodo de conciliación no tiene space_id operativo.', 409)
  }

  return {
    periodId: normalizeString(row.period_id),
    accountId: normalizeString(row.account_id),
    spaceId,
    year: toNumber(row.year),
    month: toNumber(row.month),
    status: normalizeString(row.status),
    archivedAt: row.archived_at ? normalizeString(row.archived_at) : null,
    statementImported: Boolean(row.statement_imported),
    statementRowCount: toNumber(row.statement_row_count),
    difference: row.difference == null ? null : toNumber(row.difference),
    accountName: normalizeString(row.account_name),
    currency: normalizeString(row.currency)
  }
}

type StatementRow = {
  row_id: string
  period_id: string
  transaction_date: string
  description: string
  reference: string | null
  amount: string | number
  balance: string | number | null
  match_status: string
}

export const listScopedUnmatchedStatementRows = async (
  scope: ReconciliationIntelligencePeriodScope,
  limit = 40
): Promise<ReconciliationIntelligenceStatementRow[]> => {
  const db = await getDb()

  const result = await sql<StatementRow>`
    SELECT
      bsr.row_id,
      bsr.period_id,
      bsr.transaction_date::text AS transaction_date,
      bsr.description,
      bsr.reference,
      bsr.amount::text,
      bsr.balance::text,
      bsr.match_status
    FROM greenhouse_finance.bank_statement_rows bsr
    JOIN greenhouse_finance.reconciliation_periods rp ON rp.period_id = bsr.period_id
    WHERE bsr.period_id = ${scope.periodId}
      AND rp.space_id = ${scope.spaceId}
      AND rp.account_id = ${scope.accountId}
      AND bsr.match_status IN ('unmatched', 'suggested')
    ORDER BY bsr.transaction_date ASC, bsr.created_at ASC
    LIMIT ${Math.max(1, Math.min(100, limit))}
  `.execute(db)

  return result.rows.map(row => ({
    rowId: normalizeString(row.row_id),
    periodId: normalizeString(row.period_id),
    transactionDate: normalizeString(row.transaction_date),
    description: normalizeString(row.description),
    reference: row.reference ? normalizeString(row.reference) : null,
    amount: toNumber(row.amount),
    balance: row.balance == null ? null : toNumber(row.balance),
    matchStatus: normalizeString(row.match_status)
  }))
}
