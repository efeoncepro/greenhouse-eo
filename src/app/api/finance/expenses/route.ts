import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  assertValidCurrency,
  assertPositiveAmount,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toDateString,
  toTimestampString,
  FinanceValidationError,
  EXPENSE_TYPES,
  EXPENSE_PAYMENT_STATUSES,
  PAYMENT_METHODS,
  SERVICE_LINES,
  buildMonthlySequenceId,
  resolveExchangeRateToClp,
  type ExpenseType,
  type ExpensePaymentStatus,
  type PaymentMethod,
  type ServiceLine
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface ExpenseRow {
  expense_id: string
  expense_type: string
  description: string
  currency: string
  subtotal: unknown
  tax_rate: unknown
  tax_amount: unknown
  total_amount: unknown
  exchange_rate_to_clp: unknown
  total_amount_clp: unknown
  payment_date: unknown
  payment_status: string
  payment_method: string | null
  payment_account_id: string | null
  payment_reference: string | null
  document_number: string | null
  document_date: unknown
  due_date: unknown
  supplier_id: string | null
  supplier_name: string | null
  supplier_invoice_number: string | null
  service_line: string | null
  is_recurring: boolean
  recurrence_frequency: string | null
  is_reconciled: boolean
  notes: string | null
  created_by: string | null
  created_at: unknown
  updated_at: unknown
}

const normalizeExpense = (row: ExpenseRow) => ({
  expenseId: normalizeString(row.expense_id),
  expenseType: normalizeString(row.expense_type),
  description: normalizeString(row.description),
  currency: normalizeString(row.currency),
  subtotal: toNumber(row.subtotal),
  taxRate: toNumber(row.tax_rate),
  taxAmount: toNumber(row.tax_amount),
  totalAmount: toNumber(row.total_amount),
  exchangeRateToClp: toNumber(row.exchange_rate_to_clp),
  totalAmountClp: toNumber(row.total_amount_clp),
  paymentDate: toDateString(row.payment_date as string | { value?: string } | null),
  paymentStatus: normalizeString(row.payment_status),
  paymentMethod: row.payment_method ? normalizeString(row.payment_method) : null,
  paymentAccountId: row.payment_account_id ? normalizeString(row.payment_account_id) : null,
  paymentReference: row.payment_reference ? normalizeString(row.payment_reference) : null,
  documentNumber: row.document_number ? normalizeString(row.document_number) : null,
  documentDate: toDateString(row.document_date as string | { value?: string } | null),
  dueDate: toDateString(row.due_date as string | { value?: string } | null),
  supplierId: row.supplier_id ? normalizeString(row.supplier_id) : null,
  supplierName: row.supplier_name ? normalizeString(row.supplier_name) : null,
  supplierInvoiceNumber: row.supplier_invoice_number ? normalizeString(row.supplier_invoice_number) : null,
  serviceLine: row.service_line ? normalizeString(row.service_line) : null,
  isRecurring: normalizeBoolean(row.is_recurring),
  recurrenceFrequency: row.recurrence_frequency ? normalizeString(row.recurrence_frequency) : null,
  isReconciled: normalizeBoolean(row.is_reconciled),
  notes: row.notes ? normalizeString(row.notes) : null,
  createdBy: row.created_by ? normalizeString(row.created_by) : null,
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const { searchParams } = new URL(request.url)
  const expenseType = searchParams.get('expenseType')
  const status = searchParams.get('status')
  const supplierId = searchParams.get('supplierId')
  const serviceLine = searchParams.get('serviceLine')
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')
  const page = Math.max(1, toNumber(searchParams.get('page') || '1'))
  const pageSize = Math.min(200, Math.max(1, toNumber(searchParams.get('pageSize') || '50')))
  const projectId = getFinanceProjectId()

  let filters = ''
  const params: Record<string, unknown> = {}

  if (expenseType) {
    filters += ' AND expense_type = @expenseType'
    params.expenseType = expenseType
  }

  if (status) {
    filters += ' AND payment_status = @status'
    params.status = status
  }

  if (supplierId) {
    filters += ' AND supplier_id = @supplierId'
    params.supplierId = supplierId
  }

  if (serviceLine) {
    filters += ' AND service_line = @serviceLine'
    params.serviceLine = serviceLine
  }

  if (fromDate) {
    filters += ' AND COALESCE(document_date, payment_date) >= @fromDate'
    params.fromDate = fromDate
  }

  if (toDate) {
    filters += ' AND COALESCE(document_date, payment_date) <= @toDate'
    params.toDate = toDate
  }

  const countRows = await runFinanceQuery<{ total: number }>(`
    SELECT COUNT(*) AS total
    FROM \`${projectId}.greenhouse.fin_expenses\`
    WHERE TRUE ${filters}
  `, params)

  const total = toNumber(countRows[0]?.total)

  const rows = await runFinanceQuery<ExpenseRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_expenses\`
    WHERE TRUE ${filters}
    ORDER BY COALESCE(document_date, payment_date, created_at) DESC
    LIMIT @limit OFFSET @offset
  `, { ...params, limit: pageSize, offset: (page - 1) * pageSize })

  return NextResponse.json({
    items: rows.map(normalizeExpense),
    total,
    page,
    pageSize
  })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  try {
    const body = await request.json()
    const description = assertNonEmptyString(body.description, 'description')
    const currency = assertValidCurrency(body.currency)
    const subtotal = assertPositiveAmount(toNumber(body.subtotal), 'subtotal')

    const expenseType = body.expenseType && EXPENSE_TYPES.includes(body.expenseType)
      ? (body.expenseType as ExpenseType) : 'supplier'

    const taxRate = toNumber(body.taxRate ?? 0)
    const taxAmount = toNumber(body.taxAmount) || subtotal * taxRate
    const totalAmount = toNumber(body.totalAmount) || subtotal + taxAmount
    const exchangeRateToClp = await resolveExchangeRateToClp({ currency, requestedRate: body.exchangeRateToClp })
    const totalAmountClp = toNumber(body.totalAmountClp) || totalAmount * exchangeRateToClp

    const periodSource = normalizeString(body.documentDate || body.paymentDate) || new Date().toISOString().slice(0, 10)
    const period = periodSource.slice(0, 7).replace('-', '')

    const expenseId = normalizeString(body.expenseId) ||
      await buildMonthlySequenceId({
        tableName: 'fin_expenses',
        idColumn: 'expense_id',
        prefix: 'EXP',
        period
      })

    const paymentStatus = body.paymentStatus && EXPENSE_PAYMENT_STATUSES.includes(body.paymentStatus)
      ? (body.paymentStatus as ExpensePaymentStatus) : 'pending'

    const paymentMethod = body.paymentMethod && PAYMENT_METHODS.includes(body.paymentMethod)
      ? (body.paymentMethod as PaymentMethod) : null

    const serviceLine = body.serviceLine && SERVICE_LINES.includes(body.serviceLine)
      ? (body.serviceLine as ServiceLine) : null

    const projectId = getFinanceProjectId()

    await runFinanceQuery(`
      INSERT INTO \`${projectId}.greenhouse.fin_expenses\` (
        expense_id, expense_type, description, currency,
        subtotal, tax_rate, tax_amount, total_amount,
        exchange_rate_to_clp, total_amount_clp,
        payment_date, payment_status, payment_method,
        payment_account_id, payment_reference,
        document_number, document_date, due_date,
        supplier_id, supplier_name, supplier_invoice_number,
        service_line, is_recurring, recurrence_frequency,
        is_reconciled, notes, created_by,
        created_at, updated_at
      ) VALUES (
        @expenseId, @expenseType, @description, @currency,
        @subtotal, @taxRate, @taxAmount, @totalAmount,
        @exchangeRateToClp, @totalAmountClp,
        @paymentDate, @paymentStatus, @paymentMethod,
        @paymentAccountId, @paymentReference,
        @documentNumber, @documentDate, @dueDate,
        @supplierId, @supplierName, @supplierInvoiceNumber,
        @serviceLine, @isRecurring, @recurrenceFrequency,
        FALSE, @notes, @createdBy,
        CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
      )
    `, {
      expenseId,
      expenseType,
      description,
      currency,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      exchangeRateToClp,
      totalAmountClp,
      paymentDate: body.paymentDate ? normalizeString(body.paymentDate) : null,
      paymentStatus,
      paymentMethod,
      paymentAccountId: body.paymentAccountId ? normalizeString(body.paymentAccountId) : null,
      paymentReference: body.paymentReference ? normalizeString(body.paymentReference) : null,
      documentNumber: body.documentNumber ? normalizeString(body.documentNumber) : null,
      documentDate: body.documentDate ? normalizeString(body.documentDate) : null,
      dueDate: body.dueDate ? normalizeString(body.dueDate) : null,
      supplierId: body.supplierId ? normalizeString(body.supplierId) : null,
      supplierName: body.supplierName ? normalizeString(body.supplierName) : null,
      supplierInvoiceNumber: body.supplierInvoiceNumber ? normalizeString(body.supplierInvoiceNumber) : null,
      serviceLine,
      isRecurring: Boolean(body.isRecurring),
      recurrenceFrequency: body.recurrenceFrequency ? normalizeString(body.recurrenceFrequency) : null,
      notes: body.notes ? normalizeString(body.notes) : null,
      createdBy: tenant.userId || null
    })

    return NextResponse.json({ expenseId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
