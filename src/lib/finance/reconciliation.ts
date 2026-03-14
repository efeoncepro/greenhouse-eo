import 'server-only'

import {
  FinanceValidationError,
  getFinanceProjectId,
  normalizeString,
  runFinanceQuery,
  toDateString,
  toNumber
} from '@/lib/finance/shared'

type ReconciliationPeriodRow = {
  period_id: string
  account_id: string
  year: unknown
  month: unknown
  status: string
}

type IncomeCandidateRow = {
  income_id: string
  total_amount: unknown
  currency: string
  invoice_date: unknown
  due_date: unknown
  invoice_number: string | null
  description: string | null
  client_name: string | null
  payment_status: string
  is_reconciled: boolean
  reconciliation_id: string | null
}

type ExpenseCandidateRow = {
  expense_id: string
  total_amount: unknown
  currency: string
  payment_date: unknown
  document_date: unknown
  payment_reference: string | null
  document_number: string | null
  description: string
  supplier_name: string | null
  member_name: string | null
  payment_status: string
  is_reconciled: boolean
  reconciliation_id: string | null
}

export type ReconciliationCandidateType = 'income' | 'expense'

export type ReconciliationPeriodContext = {
  periodId: string
  accountId: string
  year: number
  month: number
  status: string
}

export type ReconciliationCandidate = {
  id: string
  type: ReconciliationCandidateType
  amount: number
  currency: string
  transactionDate: string | null
  dueDate: string | null
  reference: string | null
  description: string
  partyName: string | null
  status: string
  isReconciled: boolean
  reconciliationId: string | null
}

const padMonth = (month: number) => String(month).padStart(2, '0')

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

export const normalizeMatchStatus = (value: string | null | undefined) => {
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

export const getReconciliationPeriodContext = async (periodId: string): Promise<ReconciliationPeriodContext> => {
  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<ReconciliationPeriodRow>(`
    SELECT period_id, account_id, year, month, status
    FROM \`${projectId}.greenhouse.fin_reconciliation_periods\`
    WHERE period_id = @periodId
    LIMIT 1
  `, { periodId })

  const row = rows[0]

  if (!row) {
    throw new FinanceValidationError('Reconciliation period not found.', 404)
  }

  return {
    periodId: normalizeString(row.period_id),
    accountId: normalizeString(row.account_id),
    year: toNumber(row.year),
    month: toNumber(row.month),
    status: normalizeString(row.status)
  }
}

export const listReconciliationCandidates = async ({
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
  const period = await getReconciliationPeriodContext(periodId)
  const projectId = getFinanceProjectId()
  const boundedLimit = Math.min(200, Math.max(1, limit))
  const normalizedSearch = normalizeString(search).toLowerCase()
  const searchLike = normalizedSearch ? `%${normalizedSearch}%` : ''

  const { startDate, endDate } = getPeriodBounds({
    year: period.year,
    month: period.month,
    windowDays
  })

  const shouldLoadIncome = type === 'all' || type === 'income'
  const shouldLoadExpense = type === 'all' || type === 'expense'

  const incomeRows = shouldLoadIncome
    ? await runFinanceQuery<IncomeCandidateRow>(`
      SELECT
        income_id,
        total_amount,
        currency,
        invoice_date,
        due_date,
        invoice_number,
        description,
        client_name,
        payment_status,
        is_reconciled,
        reconciliation_id
      FROM \`${projectId}.greenhouse.fin_income\`
      WHERE is_reconciled = FALSE
        AND invoice_date BETWEEN @startDate AND @endDate
        AND (
          @search = ''
          OR LOWER(income_id) LIKE @search
          OR LOWER(COALESCE(invoice_number, '')) LIKE @search
          OR LOWER(COALESCE(description, '')) LIKE @search
          OR LOWER(COALESCE(client_name, '')) LIKE @search
        )
      ORDER BY invoice_date DESC, total_amount DESC
      LIMIT @limit
    `, {
      startDate,
      endDate,
      search: searchLike,
      limit: boundedLimit
    })
    : []

  const expenseRows = shouldLoadExpense
    ? await runFinanceQuery<ExpenseCandidateRow>(`
      SELECT
        expense_id,
        total_amount,
        currency,
        payment_date,
        document_date,
        payment_reference,
        document_number,
        description,
        supplier_name,
        member_name,
        payment_status,
        is_reconciled,
        reconciliation_id
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE is_reconciled = FALSE
        AND COALESCE(payment_date, document_date) BETWEEN @startDate AND @endDate
        AND (
          @search = ''
          OR LOWER(expense_id) LIKE @search
          OR LOWER(COALESCE(payment_reference, '')) LIKE @search
          OR LOWER(COALESCE(document_number, '')) LIKE @search
          OR LOWER(description) LIKE @search
          OR LOWER(COALESCE(supplier_name, '')) LIKE @search
          OR LOWER(COALESCE(member_name, '')) LIKE @search
        )
      ORDER BY COALESCE(payment_date, document_date) DESC, total_amount DESC
      LIMIT @limit
    `, {
      startDate,
      endDate,
      search: searchLike,
      limit: boundedLimit
    })
    : []

  const candidates: ReconciliationCandidate[] = [
    ...incomeRows.map(row => ({
      id: normalizeString(row.income_id),
      type: 'income' as const,
      amount: toNumber(row.total_amount),
      currency: normalizeString(row.currency),
      transactionDate: toDateString(row.invoice_date as string | { value?: string } | null),
      dueDate: toDateString(row.due_date as string | { value?: string } | null),
      reference: row.invoice_number ? normalizeString(row.invoice_number) : null,
      description: row.description ? normalizeString(row.description) : '',
      partyName: row.client_name ? normalizeString(row.client_name) : null,
      status: normalizeString(row.payment_status),
      isReconciled: false,
      reconciliationId: row.reconciliation_id ? normalizeString(row.reconciliation_id) : null
    })),
    ...expenseRows.map(row => ({
      id: normalizeString(row.expense_id),
      type: 'expense' as const,
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
      reconciliationId: row.reconciliation_id ? normalizeString(row.reconciliation_id) : null
    }))
  ]

  candidates.sort((left, right) => {
    const leftDate = left.transactionDate || ''
    const rightDate = right.transactionDate || ''

    if (leftDate !== rightDate) {
      return rightDate.localeCompare(leftDate)
    }

    return Math.abs(right.amount) - Math.abs(left.amount)
  })

  return {
    period: {
      ...period,
      monthLabel: `${period.year}-${padMonth(period.month)}`
    },
    items: candidates.slice(0, boundedLimit),
    total: candidates.length
  }
}

export const setReconciliationLink = async ({
  matchedType,
  matchedId,
  rowId
}: {
  matchedType: ReconciliationCandidateType
  matchedId: string
  rowId: string
}) => {
  const projectId = getFinanceProjectId()
  const targetTable = matchedType === 'income' ? 'fin_income' : 'fin_expenses'
  const targetIdCol = matchedType === 'income' ? 'income_id' : 'expense_id'

  await runFinanceQuery(`
    UPDATE \`${projectId}.greenhouse.${targetTable}\`
    SET
      is_reconciled = TRUE,
      reconciliation_id = @rowId,
      updated_at = CURRENT_TIMESTAMP()
    WHERE ${targetIdCol} = @matchedId
  `, { matchedId, rowId })
}

export const clearReconciliationLink = async ({
  matchedType,
  matchedId,
  rowId
}: {
  matchedType: string
  matchedId: string
  rowId: string
}) => {
  const normalizedType = normalizeString(matchedType)

  if (normalizedType !== 'income' && normalizedType !== 'expense') {
    return
  }

  const projectId = getFinanceProjectId()
  const targetTable = normalizedType === 'income' ? 'fin_income' : 'fin_expenses'
  const targetIdCol = normalizedType === 'income' ? 'income_id' : 'expense_id'

  await runFinanceQuery(`
    UPDATE \`${projectId}.greenhouse.${targetTable}\`
    SET
      is_reconciled = FALSE,
      reconciliation_id = NULL,
      updated_at = CURRENT_TIMESTAMP()
    WHERE ${targetIdCol} = @matchedId
      AND reconciliation_id = @rowId
  `, { matchedId, rowId })
}
