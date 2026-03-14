import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveFinanceClientContext, resolveFinanceMemberContext } from '@/lib/finance/canonical'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  assertValidCurrency,
  normalizeString,
  toNumber,
  toDateString,
  toTimestampString,
  FinanceValidationError,
  EXPENSE_TYPES,
  EXPENSE_PAYMENT_STATUSES,
  PAYMENT_METHODS,
  SERVICE_LINES,
  type ExpenseType,
  type ExpensePaymentStatus,
  type PaymentMethod,
  type ServiceLine
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface ExpenseDetailRow {
  expense_id: string
  client_id: string | null
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
  payroll_period_id: string | null
  payroll_entry_id: string | null
  member_id: string | null
  member_name: string | null
  social_security_type: string | null
  social_security_institution: string | null
  social_security_period: string | null
  tax_type: string | null
  tax_period: string | null
  tax_form_number: string | null
  miscellaneous_category: string | null
  service_line: string | null
  is_recurring: boolean
  recurrence_frequency: string | null
  is_reconciled: boolean
  reconciliation_id: string | null
  notes: string | null
  created_by: string | null
  created_at: unknown
  updated_at: unknown
}

const normalizeExpenseDetail = (row: ExpenseDetailRow) => ({
  expenseId: normalizeString(row.expense_id),
  clientId: row.client_id ? normalizeString(row.client_id) : null,
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
  payrollPeriodId: row.payroll_period_id ? normalizeString(row.payroll_period_id) : null,
  payrollEntryId: row.payroll_entry_id ? normalizeString(row.payroll_entry_id) : null,
  memberId: row.member_id ? normalizeString(row.member_id) : null,
  memberName: row.member_name ? normalizeString(row.member_name) : null,
  socialSecurityType: row.social_security_type ? normalizeString(row.social_security_type) : null,
  socialSecurityInstitution: row.social_security_institution ? normalizeString(row.social_security_institution) : null,
  socialSecurityPeriod: row.social_security_period ? normalizeString(row.social_security_period) : null,
  taxType: row.tax_type ? normalizeString(row.tax_type) : null,
  taxPeriod: row.tax_period ? normalizeString(row.tax_period) : null,
  taxFormNumber: row.tax_form_number ? normalizeString(row.tax_form_number) : null,
  miscellaneousCategory: row.miscellaneous_category ? normalizeString(row.miscellaneous_category) : null,
  serviceLine: row.service_line ? normalizeString(row.service_line) : null,
  isRecurring: Boolean(row.is_recurring),
  recurrenceFrequency: row.recurrence_frequency ? normalizeString(row.recurrence_frequency) : null,
  isReconciled: Boolean(row.is_reconciled),
  reconciliationId: row.reconciliation_id ? normalizeString(row.reconciliation_id) : null,
  notes: row.notes ? normalizeString(row.notes) : null,
  createdBy: row.created_by ? normalizeString(row.created_by) : null,
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const { id: expenseId } = await params
  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<ExpenseDetailRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_expenses\`
    WHERE expense_id = @expenseId
  `, { expenseId })

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Expense record not found' }, { status: 404 })
  }

  return NextResponse.json(normalizeExpenseDetail(rows[0]))
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  try {
    const { id: expenseId } = await params
    const body = await request.json()
    const projectId = getFinanceProjectId()

    const existing = await runFinanceQuery<{
      expense_id: string
      client_id: string | null
      member_id: string | null
      member_name: string | null
      payroll_entry_id: string | null
      payroll_period_id: string | null
    }>(`
      SELECT expense_id, client_id, member_id, member_name, payroll_entry_id, payroll_period_id
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE expense_id = @expenseId
    `, { expenseId })

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 })
    }

    const updates: string[] = []
    const updateParams: Record<string, unknown> = { expenseId }
    const existingExpense = existing[0]

    if (body.clientId !== undefined || body.clientProfileId !== undefined || body.hubspotCompanyId !== undefined) {
      const resolvedClient = await resolveFinanceClientContext({
        clientId: body.clientId ?? existingExpense.client_id,
        clientProfileId: body.clientProfileId,
        hubspotCompanyId: body.hubspotCompanyId
      })

      updates.push('client_id = @clientId')
      updateParams.clientId = resolvedClient.clientId
    }

    if (body.memberId !== undefined || body.memberName !== undefined || body.payrollEntryId !== undefined || body.payrollPeriodId !== undefined) {
      const resolvedMember = await resolveFinanceMemberContext({
        memberId: body.memberId ?? existingExpense.member_id,
        payrollEntryId: body.payrollEntryId ?? existingExpense.payroll_entry_id
      })

      updates.push('member_id = @memberId')
      updateParams.memberId = resolvedMember.memberId

      updates.push('member_name = @memberName')
      updateParams.memberName = body.memberName
        ? normalizeString(body.memberName)
        : (resolvedMember.memberName || existingExpense.member_name)

      updates.push('payroll_entry_id = @payrollEntryId')
      updateParams.payrollEntryId = resolvedMember.payrollEntryId

      updates.push('payroll_period_id = @payrollPeriodId')
      updateParams.payrollPeriodId = normalizeString(body.payrollPeriodId)
        || resolvedMember.payrollPeriodId
        || existingExpense.payroll_period_id
    }

    if (body.description !== undefined) {
      updates.push('description = @description')
      updateParams.description = assertNonEmptyString(body.description, 'description')
    }

    if (body.expenseType !== undefined) {
      updates.push('expense_type = @expenseType')
      updateParams.expenseType = EXPENSE_TYPES.includes(body.expenseType)
        ? (body.expenseType as ExpenseType) : 'supplier'
    }

    if (body.currency !== undefined) {
      updates.push('currency = @currency')
      updateParams.currency = assertValidCurrency(body.currency)
    }

    const numericFields: [string, string][] = [
      ['subtotal', 'subtotal'], ['taxRate', 'tax_rate'], ['taxAmount', 'tax_amount'],
      ['totalAmount', 'total_amount'], ['exchangeRateToClp', 'exchange_rate_to_clp'],
      ['totalAmountClp', 'total_amount_clp']
    ]

    for (const [bodyKey, dbCol] of numericFields) {
      if (body[bodyKey] !== undefined) {
        updates.push(`${dbCol} = @${bodyKey}`)
        updateParams[bodyKey] = toNumber(body[bodyKey])
      }
    }

    if (body.paymentStatus !== undefined) {
      updates.push('payment_status = @paymentStatus')
      updateParams.paymentStatus = EXPENSE_PAYMENT_STATUSES.includes(body.paymentStatus)
        ? (body.paymentStatus as ExpensePaymentStatus) : 'pending'
    }

    if (body.paymentMethod !== undefined) {
      updates.push('payment_method = @paymentMethod')
      updateParams.paymentMethod = body.paymentMethod && PAYMENT_METHODS.includes(body.paymentMethod)
        ? (body.paymentMethod as PaymentMethod) : null
    }

    if (body.serviceLine !== undefined) {
      updates.push('service_line = @serviceLine')
      updateParams.serviceLine = body.serviceLine && SERVICE_LINES.includes(body.serviceLine)
        ? (body.serviceLine as ServiceLine) : null
    }

    const nullableStringFields: [string, string][] = [
      ['paymentDate', 'payment_date'], ['paymentAccountId', 'payment_account_id'],
      ['paymentReference', 'payment_reference'], ['documentNumber', 'document_number'],
      ['documentDate', 'document_date'], ['dueDate', 'due_date'],
      ['supplierId', 'supplier_id'], ['supplierName', 'supplier_name'],
      ['supplierInvoiceNumber', 'supplier_invoice_number'],
      ['socialSecurityType', 'social_security_type'],
      ['socialSecurityInstitution', 'social_security_institution'],
      ['socialSecurityPeriod', 'social_security_period'],
      ['taxType', 'tax_type'],
      ['taxPeriod', 'tax_period'],
      ['taxFormNumber', 'tax_form_number'],
      ['miscellaneousCategory', 'miscellaneous_category'],
      ['notes', 'notes']
    ]

    for (const [bodyKey, dbCol] of nullableStringFields) {
      if (body[bodyKey] !== undefined) {
        updates.push(`${dbCol} = @${bodyKey}`)
        updateParams[bodyKey] = body[bodyKey] ? normalizeString(body[bodyKey]) : null
      }
    }

    if (body.isRecurring !== undefined) {
      updates.push('is_recurring = @isRecurring')
      updateParams.isRecurring = Boolean(body.isRecurring)
    }

    if (body.recurrenceFrequency !== undefined) {
      updates.push('recurrence_frequency = @recurrenceFrequency')
      updateParams.recurrenceFrequency = body.recurrenceFrequency ? normalizeString(body.recurrenceFrequency) : null
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP()')

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_expenses\`
      SET ${updates.join(', ')}
      WHERE expense_id = @expenseId
    `, updateParams)

    return NextResponse.json({ expenseId, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
