import 'server-only'

import { getLatestIncomePaymentContext, listUnreconciledIncomePayments, parseIncomePaymentsReceived, summarizeIncomeReconciliation } from '@/lib/finance/income-payments'
import {
  FinanceValidationError,
  getFinanceProjectId,
  normalizeString,
  roundCurrency,
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
  amount_paid: unknown
  currency: string
  invoice_date: unknown
  due_date: unknown
  invoice_number: string | null
  description: string | null
  client_name: string | null
  payment_status: string
  payments_received: unknown
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

type IncomeTargetRow = IncomeCandidateRow

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
  matchedRecordId?: string | null
  matchedPaymentId?: string | null
}

export type ResolvedReconciliationTarget = {
  matchedType: ReconciliationCandidateType
  candidateId: string
  matchedRecordId: string
  matchedPaymentId: string | null
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

const isDateWithinBounds = (value: string | null, startDate: string, endDate: string) =>
  Boolean(value && value >= startDate && value <= endDate)

const buildIncomeReconciliationCandidates = (row: IncomeCandidateRow): ReconciliationCandidate[] => {
  const incomeId = normalizeString(row.income_id)
  const invoiceDate = toDateString(row.invoice_date as string | { value?: string } | null)
  const dueDate = toDateString(row.due_date as string | { value?: string } | null)
  const paymentStatus = normalizeString(row.payment_status)
  const totalAmount = roundCurrency(toNumber(row.total_amount))
  const amountPaid = roundCurrency(toNumber(row.amount_paid))
  const payments = parseIncomePaymentsReceived(row.payments_received)
  const unreconciledPayments = listUnreconciledIncomePayments(row.payments_received)
  const latestPayment = getLatestIncomePaymentContext(row.payments_received)

  if (unreconciledPayments.length > 0) {
    return unreconciledPayments
      .filter(payment => payment.amount > 0)
      .map(payment => ({
        id: payment.paymentId,
        type: 'income' as const,
        amount: payment.amount,
        currency: normalizeString(row.currency),
        transactionDate: payment.paymentDate ?? invoiceDate,
        dueDate,
        reference: payment.reference ?? (row.invoice_number ? normalizeString(row.invoice_number) : null),
        description: row.description ? normalizeString(row.description) : '',
        partyName: row.client_name ? normalizeString(row.client_name) : null,
        status: paymentStatus,
        isReconciled: false,
        reconciliationId: null,
        matchedRecordId: incomeId,
        matchedPaymentId: payment.paymentId
      }))
  }

  const canUseInvoiceFallback = payments.length === 0
    && !row.is_reconciled
    && amountPaid > 0
    && amountPaid >= totalAmount - 0.01

  if (!canUseInvoiceFallback) {
    return []
  }

  return [
    {
      id: incomeId,
      type: 'income',
      amount: totalAmount,
      currency: normalizeString(row.currency),
      transactionDate: latestPayment?.paymentDate ?? invoiceDate,
      dueDate,
      reference: latestPayment?.reference ?? (row.invoice_number ? normalizeString(row.invoice_number) : null),
      description: row.description ? normalizeString(row.description) : '',
      partyName: row.client_name ? normalizeString(row.client_name) : null,
      status: paymentStatus,
      isReconciled: false,
      reconciliationId: row.reconciliation_id ? normalizeString(row.reconciliation_id) : null,
      matchedRecordId: incomeId,
      matchedPaymentId: null
    }
  ]
}

const queryIncomeTargets = async ({
  matchedId,
  matchedPaymentId
}: {
  matchedId: string
  matchedPaymentId?: string | null
}) => {
  const projectId = getFinanceProjectId()
  const paymentLookupId = normalizeString(matchedPaymentId || matchedId)

  return runFinanceQuery<IncomeTargetRow>(`
    SELECT
      income_id,
      total_amount,
      amount_paid,
      currency,
      invoice_date,
      due_date,
      invoice_number,
      description,
      client_name,
      payment_status,
      payments_received,
      is_reconciled,
      reconciliation_id
    FROM \`${projectId}.greenhouse.fin_income\`
    WHERE income_id = @matchedId
      OR (
        @paymentLookup <> ''
        AND TO_JSON_STRING(payments_received) LIKE @paymentLookupPattern
      )
    LIMIT 50
  `, {
    matchedId,
    paymentLookup: paymentLookupId,
    paymentLookupPattern: paymentLookupId ? `%\"paymentId\":\"${paymentLookupId}\"%` : ''
  })
}

const resolveIncomeReconciliationTarget = async ({
  matchedId,
  matchedPaymentId
}: {
  matchedId: string
  matchedPaymentId?: string | null
}) => {
  const rows = await queryIncomeTargets({ matchedId, matchedPaymentId })
  const requestedCandidateId = normalizeString(matchedPaymentId || matchedId)

  for (const row of rows) {
    const candidates = buildIncomeReconciliationCandidates(row)
    const candidate = candidates.find(item => item.id === requestedCandidateId)

    if (candidate) {
      return {
        matchedType: 'income' as const,
        candidateId: candidate.id,
        matchedRecordId: normalizeString(row.income_id),
        matchedPaymentId: candidate.matchedPaymentId ?? null,
        isReconciled: candidate.matchedPaymentId
          ? Boolean(
              parseIncomePaymentsReceived(row.payments_received).find(payment =>
                payment.paymentId === candidate.matchedPaymentId && payment.isReconciled
              )
            )
          : Boolean(row.is_reconciled),
        reconciliationId: candidate.matchedPaymentId
          ? parseIncomePaymentsReceived(row.payments_received).find(payment =>
              payment.paymentId === candidate.matchedPaymentId
            )?.reconciliationRowId ?? null
          : row.reconciliation_id ? normalizeString(row.reconciliation_id) : null
      }
    }
  }

  throw new FinanceValidationError(`income candidate "${requestedCandidateId}" not available for reconciliation.`, 404)
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

export const assertReconciliationPeriodIsMutable = async (periodId: string) => {
  const period = await getReconciliationPeriodContext(periodId)

  if (period.status === 'reconciled' || period.status === 'closed') {
    throw new FinanceValidationError('Cannot modify a reconciled or closed period.', 409)
  }

  return period
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
  const candidateRowLimit = Math.min(800, Math.max(200, boundedLimit * 4))
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
        amount_paid,
        currency,
        invoice_date,
        due_date,
        invoice_number,
        description,
        client_name,
        payment_status,
        payments_received,
        is_reconciled,
        reconciliation_id
      FROM \`${projectId}.greenhouse.fin_income\`
      WHERE (
          COALESCE(amount_paid, 0) > 0
          OR payment_status IN ('paid', 'partial')
        )
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
      search: searchLike,
      limit: candidateRowLimit
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
    ...incomeRows.flatMap(buildIncomeReconciliationCandidates),
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
      reconciliationId: row.reconciliation_id ? normalizeString(row.reconciliation_id) : null,
      matchedRecordId: normalizeString(row.expense_id),
      matchedPaymentId: null
    }))
  ]

  const filteredCandidates = candidates.filter(candidate =>
    isDateWithinBounds(candidate.transactionDate, startDate, endDate)
  )

  filteredCandidates.sort((left, right) => {
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
    items: filteredCandidates.slice(0, boundedLimit),
    total: filteredCandidates.length
  }
}

export const resolveReconciliationTarget = async ({
  matchedType,
  matchedId,
  matchedPaymentId
}: {
  matchedType: ReconciliationCandidateType
  matchedId: string
  matchedPaymentId?: string | null
}): Promise<ResolvedReconciliationTarget> => {
  if (matchedType === 'income') {
    return resolveIncomeReconciliationTarget({ matchedId, matchedPaymentId })
  }

  const projectId = getFinanceProjectId()

  const targets = await runFinanceQuery<{
    expense_id: string
    is_reconciled: boolean
    reconciliation_id: string | null
  }>(`
    SELECT expense_id, is_reconciled, reconciliation_id
    FROM \`${projectId}.greenhouse.fin_expenses\`
    WHERE expense_id = @matchedId
    LIMIT 1
  `, { matchedId })

  const target = targets[0]

  if (!target) {
    throw new FinanceValidationError(`expense record "${matchedId}" not found.`, 404)
  }

  return {
    matchedType: 'expense',
    candidateId: normalizeString(target.expense_id),
    matchedRecordId: normalizeString(target.expense_id),
    matchedPaymentId: null,
    isReconciled: Boolean(target.is_reconciled),
    reconciliationId: target.reconciliation_id ? normalizeString(target.reconciliation_id) : null
  }
}

export const setReconciliationLink = async ({
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
  const projectId = getFinanceProjectId()

  if (matchedType === 'expense') {
    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_expenses\`
      SET
        is_reconciled = TRUE,
        reconciliation_id = @rowId,
        updated_at = CURRENT_TIMESTAMP()
      WHERE expense_id = @matchedId
    `, { matchedId, rowId })

    return
  }

  const incomeRows = await queryIncomeTargets({
    matchedId,
    matchedPaymentId
  })

  const incomeRow = incomeRows.find(row => normalizeString(row.income_id) === normalizeString(matchedId))

  if (!incomeRow) {
    throw new FinanceValidationError(`income record "${matchedId}" not found.`, 404)
  }

  if (!matchedPaymentId) {
    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_income\`
      SET
        is_reconciled = TRUE,
        reconciliation_id = @rowId,
        updated_at = CURRENT_TIMESTAMP()
      WHERE income_id = @matchedId
    `, { matchedId, rowId })

    return
  }

  const payments = parseIncomePaymentsReceived(incomeRow.payments_received)

  if (!payments.some(payment => payment.paymentId === matchedPaymentId)) {
    throw new FinanceValidationError(`income payment "${matchedPaymentId}" not found.`, 404)
  }

  const nextPayments = payments.map(payment =>
    payment.paymentId === matchedPaymentId
      ? {
          ...payment,
          isReconciled: true,
          reconciliationRowId: rowId,
          reconciledAt: new Date().toISOString(),
          reconciledBy: matchedBy || null
        }
      : payment
  )

  const summary = summarizeIncomeReconciliation({
    totalAmount: toNumber(incomeRow.total_amount),
    amountPaid: toNumber(incomeRow.amount_paid),
    payments: nextPayments
  })

  await runFinanceQuery(`
    UPDATE \`${projectId}.greenhouse.fin_income\`
    SET
      payments_received = PARSE_JSON(@paymentsReceived),
      is_reconciled = @isReconciled,
      reconciliation_id = @reconciliationId,
      updated_at = CURRENT_TIMESTAMP()
    WHERE income_id = @matchedId
  `, {
    matchedId,
    paymentsReceived: JSON.stringify(nextPayments),
    isReconciled: summary.isReconciled,
    reconciliationId: summary.reconciliationId
  })
}

export const clearReconciliationLink = async ({
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
  const normalizedType = normalizeString(matchedType)

  if (normalizedType !== 'income' && normalizedType !== 'expense') {
    return
  }

  const projectId = getFinanceProjectId()

  if (normalizedType === 'expense') {
    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_expenses\`
      SET
        is_reconciled = FALSE,
        reconciliation_id = NULL,
        updated_at = CURRENT_TIMESTAMP()
      WHERE expense_id = @matchedId
        AND reconciliation_id = @rowId
    `, { matchedId, rowId })

    return
  }

  const incomeRows = await queryIncomeTargets({
    matchedId,
    matchedPaymentId
  })

  const incomeRow = incomeRows.find(row => normalizeString(row.income_id) === normalizeString(matchedId))

  if (!incomeRow) {
    return
  }

  const payments = parseIncomePaymentsReceived(incomeRow.payments_received)

  const nextPayments = payments.map(payment => {
    const shouldClearSpecificPayment = matchedPaymentId && payment.paymentId === matchedPaymentId
    const shouldClearByRow = payment.reconciliationRowId === rowId

    if (!shouldClearSpecificPayment && !shouldClearByRow) {
      return payment
    }

    return {
      ...payment,
      isReconciled: false,
      reconciliationRowId: null,
      reconciledAt: null,
      reconciledBy: null
    }
  })

  const summary = summarizeIncomeReconciliation({
    totalAmount: toNumber(incomeRow.total_amount),
    amountPaid: toNumber(incomeRow.amount_paid),
    payments: nextPayments
  })

  const shouldClearInvoiceFallback = !matchedPaymentId
    && normalizeString(incomeRow.reconciliation_id) === normalizeString(rowId)

  await runFinanceQuery(`
    UPDATE \`${projectId}.greenhouse.fin_income\`
    SET
      payments_received = PARSE_JSON(@paymentsReceived),
      is_reconciled = @isReconciled,
      reconciliation_id = @reconciliationId,
      updated_at = CURRENT_TIMESTAMP()
    WHERE income_id = @matchedId
  `, {
    matchedId,
    paymentsReceived: JSON.stringify(nextPayments),
    isReconciled: shouldClearInvoiceFallback ? false : summary.isReconciled,
    reconciliationId: shouldClearInvoiceFallback ? null : summary.reconciliationId
  })
}
