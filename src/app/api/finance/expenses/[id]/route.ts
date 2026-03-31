import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveFinanceClientContext, resolveFinanceMemberContext } from '@/lib/finance/canonical'
import { resolveExpenseSpaceScope } from '@/lib/finance/expense-scope'
import { EXPENSE_SOURCE_TYPES, PAYMENT_PROVIDERS, PAYMENT_RAILS } from '@/lib/finance/expense-taxonomy'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  getFinanceExpenseFromPostgres,
  updateFinanceExpenseInPostgres
} from '@/lib/finance/postgres-store-slice2'
import { shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
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
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'

export const dynamic = 'force-dynamic'

interface ExpenseDetailRow {
  expense_id: string
  client_id: string | null
  space_id: string | null
  expense_type: string
  source_type: string | null
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
  payment_provider: string | null
  payment_rail: string | null
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
  spaceId: row.space_id ? normalizeString(row.space_id) : null,
  expenseType: normalizeString(row.expense_type),
  sourceType: row.source_type ? normalizeString(row.source_type) : null,
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
  paymentProvider: row.payment_provider ? normalizeString(row.payment_provider) : null,
  paymentRail: row.payment_rail ? normalizeString(row.payment_rail) : null,
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

  const { id: expenseId } = await params

  // ── Postgres-first path ──
  try {
    const expense = await getFinanceExpenseFromPostgres(expenseId)

    if (!expense) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    if (!shouldFallbackFromFinancePostgres(error)) {
      throw error
    }
  }

  // ── BigQuery fallback ──
  await ensureFinanceInfrastructure()
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

  try {
    const { id: expenseId } = await params
    const body = await request.json()

    // ── Build validated update payload ──

    const pgUpdates: Record<string, unknown> = {}

    // Client context resolution
    if (
      body.clientId !== undefined
      || body.clientProfileId !== undefined
      || body.hubspotCompanyId !== undefined
      || body.spaceId !== undefined
      || body.allocatedClientId !== undefined
    ) {
      const resolvedClient = await resolveFinanceClientContext({
        clientId: body.clientId,
        clientProfileId: body.clientProfileId,
        hubspotCompanyId: body.hubspotCompanyId
      })

      const resolvedScope = await resolveExpenseSpaceScope({
        requestedSpaceId: body.spaceId ? normalizeString(body.spaceId) : resolvedClient.spaceId,
        requestedClientId: resolvedClient.clientId,
        allocatedClientId: body.allocatedClientId ? normalizeString(body.allocatedClientId) : null
      })

      pgUpdates.clientId = resolvedScope.clientId ?? resolvedClient.clientId
      pgUpdates.spaceId = resolvedScope.spaceId
    }

    // Member context resolution
    if (body.memberId !== undefined || body.payrollEntryId !== undefined) {
      const resolvedMember = await resolveFinanceMemberContext({
        memberId: body.memberId,
        payrollEntryId: body.payrollEntryId
      })

      pgUpdates.memberId = resolvedMember.memberId
      pgUpdates.memberName = body.memberName
        ? normalizeString(body.memberName)
        : resolvedMember.memberName
      pgUpdates.payrollEntryId = resolvedMember.payrollEntryId
      pgUpdates.payrollPeriodId = body.payrollPeriodId
        ? normalizeString(body.payrollPeriodId)
        : resolvedMember.payrollPeriodId
    } else {
      if (body.memberName !== undefined) pgUpdates.memberName = body.memberName ? normalizeString(body.memberName) : null
      if (body.payrollPeriodId !== undefined) pgUpdates.payrollPeriodId = body.payrollPeriodId ? normalizeString(body.payrollPeriodId) : null
    }

    if (body.description !== undefined) {
      pgUpdates.description = assertNonEmptyString(body.description, 'description')
    }

    if (body.expenseType !== undefined) {
      pgUpdates.expenseType = EXPENSE_TYPES.includes(body.expenseType)
        ? (body.expenseType as ExpenseType) : 'supplier'
    }

    if (body.sourceType !== undefined) {
      pgUpdates.sourceType = body.sourceType && EXPENSE_SOURCE_TYPES.includes(body.sourceType)
        ? normalizeString(body.sourceType)
        : null
    }

    if (body.currency !== undefined) {
      pgUpdates.currency = assertValidCurrency(body.currency)
    }

    const numericFields: [string, string][] = [
      ['subtotal', 'subtotal'], ['taxRate', 'taxRate'], ['taxAmount', 'taxAmount'],
      ['totalAmount', 'totalAmount'], ['exchangeRateToClp', 'exchangeRateToClp'],
      ['totalAmountClp', 'totalAmountClp']
    ]

    for (const [bodyKey, pgKey] of numericFields) {
      if (body[bodyKey] !== undefined) pgUpdates[pgKey] = toNumber(body[bodyKey])
    }

    if (body.paymentStatus !== undefined) {
      pgUpdates.paymentStatus = EXPENSE_PAYMENT_STATUSES.includes(body.paymentStatus)
        ? (body.paymentStatus as ExpensePaymentStatus) : 'pending'
    }

    if (body.paymentMethod !== undefined) {
      pgUpdates.paymentMethod = body.paymentMethod && PAYMENT_METHODS.includes(body.paymentMethod)
        ? (body.paymentMethod as PaymentMethod) : null
    }

    if (body.paymentProvider !== undefined) {
      pgUpdates.paymentProvider = body.paymentProvider && PAYMENT_PROVIDERS.includes(body.paymentProvider)
        ? normalizeString(body.paymentProvider)
        : null
    }

    if (body.paymentRail !== undefined) {
      pgUpdates.paymentRail = body.paymentRail && PAYMENT_RAILS.includes(body.paymentRail)
        ? normalizeString(body.paymentRail)
        : null
    }

    if (body.serviceLine !== undefined) {
      pgUpdates.serviceLine = body.serviceLine && SERVICE_LINES.includes(body.serviceLine)
        ? (body.serviceLine as ServiceLine) : null
    }

    const nullableStringFields = [
      'paymentDate', 'paymentAccountId', 'paymentReference', 'documentNumber',
      'documentDate', 'dueDate', 'supplierId', 'supplierName', 'supplierInvoiceNumber',
      'socialSecurityType', 'socialSecurityInstitution', 'socialSecurityPeriod',
      'taxType', 'taxPeriod', 'taxFormNumber', 'miscellaneousCategory', 'notes'
    ]

    for (const key of nullableStringFields) {
      if (body[key] !== undefined) {
        pgUpdates[key] = body[key] ? normalizeString(body[key]) : null
      }
    }

    if (body.isRecurring !== undefined) pgUpdates.isRecurring = Boolean(body.isRecurring)

    if (body.recurrenceFrequency !== undefined) {
      pgUpdates.recurrenceFrequency = body.recurrenceFrequency ? normalizeString(body.recurrenceFrequency) : null
    }

    if (body.costCategory !== undefined) {
      pgUpdates.costCategory = body.costCategory ? normalizeString(body.costCategory) : null
    }

    if (body.costIsDirect !== undefined) {
      pgUpdates.costIsDirect = Boolean(body.costIsDirect)
    }

    if (body.allocatedClientId !== undefined) {
      pgUpdates.allocatedClientId = body.allocatedClientId ? normalizeString(body.allocatedClientId) : null
    }

    if (body.directOverheadScope !== undefined) {
      pgUpdates.directOverheadScope = body.directOverheadScope ? normalizeString(body.directOverheadScope) : null
    }

    if (body.directOverheadKind !== undefined) {
      pgUpdates.directOverheadKind = body.directOverheadKind ? normalizeString(body.directOverheadKind) : null
    }

    if (body.directOverheadMemberId !== undefined) {
      pgUpdates.directOverheadMemberId = body.directOverheadMemberId ? normalizeString(body.directOverheadMemberId) : null
    }

    if (Object.keys(pgUpdates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // ── Postgres-first path ──
    try {
      const result = await updateFinanceExpenseInPostgres(expenseId, pgUpdates)

      if (!result) {
        return NextResponse.json({ error: 'Expense record not found' }, { status: 404 })
      }

      return NextResponse.json({ expenseId, updated: true })
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

    const existing = await runFinanceQuery<{ expense_id: string }>(`
      SELECT expense_id
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE expense_id = @expenseId
    `, { expenseId })

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 })
    }

    const bqUpdates: string[] = []
    const bqParams: Record<string, unknown> = { expenseId }

    const colMap: Record<string, string> = {
      clientId: 'client_id', expenseType: 'expense_type', description: 'description',
      currency: 'currency', subtotal: 'subtotal', taxRate: 'tax_rate', taxAmount: 'tax_amount',
      totalAmount: 'total_amount', exchangeRateToClp: 'exchange_rate_to_clp',
      totalAmountClp: 'total_amount_clp', paymentDate: 'payment_date',
      paymentStatus: 'payment_status', paymentMethod: 'payment_method',
      paymentAccountId: 'payment_account_id', paymentReference: 'payment_reference',
      documentNumber: 'document_number', documentDate: 'document_date', dueDate: 'due_date',
      supplierId: 'supplier_id', supplierName: 'supplier_name',
      supplierInvoiceNumber: 'supplier_invoice_number', payrollPeriodId: 'payroll_period_id',
      payrollEntryId: 'payroll_entry_id', memberId: 'member_id', memberName: 'member_name',
      socialSecurityType: 'social_security_type', socialSecurityInstitution: 'social_security_institution',
      socialSecurityPeriod: 'social_security_period', taxType: 'tax_type', taxPeriod: 'tax_period',
      taxFormNumber: 'tax_form_number', miscellaneousCategory: 'miscellaneous_category',
      serviceLine: 'service_line', isRecurring: 'is_recurring',
      recurrenceFrequency: 'recurrence_frequency', notes: 'notes'
    }

    for (const [key, value] of Object.entries(pgUpdates)) {
      const col = colMap[key]

      if (col) {
        bqUpdates.push(`${col} = @${key}`)
        bqParams[key] = value
      }
    }

    bqUpdates.push('updated_at = CURRENT_TIMESTAMP()')

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_expenses\`
      SET ${bqUpdates.join(', ')}
      WHERE expense_id = @expenseId
    `, bqParams)

    return NextResponse.json({ expenseId, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
