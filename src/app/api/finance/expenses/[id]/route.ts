import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveFinanceDownstreamScope, resolveFinanceMemberContext } from '@/lib/finance/canonical'
import { EXPENSE_SOURCE_TYPES, PAYMENT_PROVIDERS, PAYMENT_RAILS } from '@/lib/finance/expense-taxonomy'
import { assertFinanceBigQueryReadiness, ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  getFinanceExpenseFromPostgres,
  updateFinanceExpenseInPostgres
} from '@/lib/finance/postgres-store-slice2'
import {
  buildExpenseTaxWriteFields,
  parsePersistedExpenseTaxSnapshot,
  serializeExpenseTaxSnapshot
} from '@/lib/finance/expense-tax-snapshot'
import { shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  assertValidCurrency,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toNullableNumber,
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
  tax_code: string | null
  tax_recoverability: string | null
  tax_rate_snapshot: unknown
  tax_amount_snapshot: unknown
  tax_snapshot_json: unknown | null
  is_tax_exempt: boolean | null
  tax_snapshot_frozen_at: unknown
  recoverable_tax_amount: unknown
  recoverable_tax_amount_clp: unknown
  non_recoverable_tax_amount: unknown
  non_recoverable_tax_amount_clp: unknown
  effective_cost_amount: unknown
  effective_cost_amount_clp: unknown
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
  receipt_date: unknown
  purchase_type: string | null
  vat_unrecoverable_amount: unknown
  vat_fixed_assets_amount: unknown
  vat_common_use_amount: unknown
  dte_type_code: string | null
  dte_folio: string | null
  exempt_amount: unknown
  other_taxes_amount: unknown
  withholding_amount: unknown
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
  taxCode: row.tax_code ? normalizeString(row.tax_code) : null,
  taxRecoverability: row.tax_recoverability ? normalizeString(row.tax_recoverability) : null,
  taxRateSnapshot: toNullableNumber(row.tax_rate_snapshot),
  taxAmountSnapshot: toNullableNumber(row.tax_amount_snapshot),
  taxSnapshot: parsePersistedExpenseTaxSnapshot(row.tax_snapshot_json),
  isTaxExempt: normalizeBoolean(row.is_tax_exempt),
  taxSnapshotFrozenAt: toTimestampString(row.tax_snapshot_frozen_at as string | { value?: string } | null),
  recoverableTaxAmount: toNullableNumber(row.recoverable_tax_amount),
  recoverableTaxAmountClp: toNullableNumber(row.recoverable_tax_amount_clp),
  nonRecoverableTaxAmount: toNullableNumber(row.non_recoverable_tax_amount),
  nonRecoverableTaxAmountClp: toNullableNumber(row.non_recoverable_tax_amount_clp),
  effectiveCostAmount: toNullableNumber(row.effective_cost_amount),
  effectiveCostAmountClp: toNullableNumber(row.effective_cost_amount_clp),
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
  receiptDate: toDateString(row.receipt_date as string | { value?: string } | null),
  purchaseType: row.purchase_type ? normalizeString(row.purchase_type) : null,
  vatUnrecoverableAmount: toNullableNumber(row.vat_unrecoverable_amount),
  vatFixedAssetsAmount: toNullableNumber(row.vat_fixed_assets_amount),
  vatCommonUseAmount: toNullableNumber(row.vat_common_use_amount),
  dteTypeCode: row.dte_type_code ? normalizeString(row.dte_type_code) : null,
  dteFolio: row.dte_folio ? normalizeString(row.dte_folio) : null,
  exemptAmount: toNullableNumber(row.exempt_amount),
  otherTaxesAmount: toNullableNumber(row.other_taxes_amount),
  withholdingAmount: toNullableNumber(row.withholding_amount),
  socialSecurityType: row.social_security_type ? normalizeString(row.social_security_type) : null,
  socialSecurityInstitution: row.social_security_institution ? normalizeString(row.social_security_institution) : null,
  socialSecurityPeriod: row.social_security_period ? normalizeString(row.social_security_period) : null,
  taxType: row.tax_type ? normalizeString(row.tax_type) : null,
  taxPeriod: row.tax_period ? normalizeString(row.tax_period) : null,
  taxFormNumber: row.tax_form_number ? normalizeString(row.tax_form_number) : null,
  miscellaneousCategory: row.miscellaneous_category ? normalizeString(row.miscellaneous_category) : null,
  serviceLine: row.service_line ? normalizeString(row.service_line) : null,
  isRecurring: normalizeBoolean(row.is_recurring),
  recurrenceFrequency: row.recurrence_frequency ? normalizeString(row.recurrence_frequency) : null,
  isReconciled: normalizeBoolean(row.is_reconciled),
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
  await assertFinanceBigQueryReadiness({ tables: ['fin_expenses'] })
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
      || body.organizationId !== undefined
      || body.clientProfileId !== undefined
      || body.hubspotCompanyId !== undefined
      || body.spaceId !== undefined
      || body.allocatedClientId !== undefined
    ) {
      const resolvedScope = await resolveFinanceDownstreamScope({
        organizationId: body.organizationId,
        clientId: body.clientId,
        clientProfileId: body.clientProfileId,
        hubspotCompanyId: body.hubspotCompanyId,
        requestedSpaceId: body.spaceId,
        allocatedClientId: body.allocatedClientId
      })

      pgUpdates.clientId = resolvedScope.clientId
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
      'taxType', 'taxPeriod', 'taxFormNumber', 'miscellaneousCategory', 'notes',
      'receiptDate', 'purchaseType', 'dteTypeCode', 'dteFolio'
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

    const nullableNumericFields: Array<[string, string]> = [
      ['vatUnrecoverableAmount', 'vatUnrecoverableAmount'],
      ['vatFixedAssetsAmount', 'vatFixedAssetsAmount'],
      ['vatCommonUseAmount', 'vatCommonUseAmount'],
      ['exemptAmount', 'exemptAmount'],
      ['otherTaxesAmount', 'otherTaxesAmount'],
      ['withholdingAmount', 'withholdingAmount']
    ]

    for (const [bodyKey, pgKey] of nullableNumericFields) {
      if (body[bodyKey] !== undefined) {
        pgUpdates[pgKey] = body[bodyKey] === null || body[bodyKey] === ''
          ? null
          : toNumber(body[bodyKey])
      }
    }

    const taxRelevantFields = [
      'taxCode',
      'taxRate',
      'taxAmount',
      'totalAmount',
      'subtotal',
      'exchangeRateToClp',
      'documentDate',
      'paymentDate',
      'dteTypeCode',
      'exemptAmount',
      'vatUnrecoverableAmount',
      'vatFixedAssetsAmount',
      'vatCommonUseAmount'
    ]

    const shouldRecomputeTax = taxRelevantFields.some(field => body[field] !== undefined)

    if (shouldRecomputeTax) {
      const existingExpense = await getFinanceExpenseFromPostgres(expenseId)

      if (!existingExpense) {
        return NextResponse.json({ error: 'Expense record not found' }, { status: 404 })
      }

      const subtotal = pgUpdates.subtotal !== undefined ? toNumber(pgUpdates.subtotal) : existingExpense.subtotal

      const exchangeRateToClp =
        pgUpdates.exchangeRateToClp !== undefined
          ? toNumber(pgUpdates.exchangeRateToClp)
          : existingExpense.exchangeRateToClp || 1

      const taxWriteFields = await buildExpenseTaxWriteFields({
        subtotal,
        exchangeRateToClp,
        taxCode: body.taxCode !== undefined ? body.taxCode : existingExpense.taxCode,
        taxRate: pgUpdates.taxRate !== undefined ? toNumber(pgUpdates.taxRate) : existingExpense.taxRate,
        taxAmount: pgUpdates.taxAmount !== undefined ? toNumber(pgUpdates.taxAmount) : existingExpense.taxAmount,
        totalAmount: pgUpdates.totalAmount !== undefined ? toNumber(pgUpdates.totalAmount) : existingExpense.totalAmount,
        dteTypeCode: pgUpdates.dteTypeCode !== undefined ? pgUpdates.dteTypeCode as string | null : existingExpense.dteTypeCode,
        exemptAmount: pgUpdates.exemptAmount !== undefined ? toNumber(pgUpdates.exemptAmount) : existingExpense.exemptAmount,
        vatUnrecoverableAmount:
          pgUpdates.vatUnrecoverableAmount !== undefined
            ? toNumber(pgUpdates.vatUnrecoverableAmount)
            : existingExpense.vatUnrecoverableAmount,
        vatFixedAssetsAmount:
          pgUpdates.vatFixedAssetsAmount !== undefined
            ? toNumber(pgUpdates.vatFixedAssetsAmount)
            : existingExpense.vatFixedAssetsAmount,
        vatCommonUseAmount:
          pgUpdates.vatCommonUseAmount !== undefined
            ? toNumber(pgUpdates.vatCommonUseAmount)
            : existingExpense.vatCommonUseAmount,
        spaceId: pgUpdates.spaceId !== undefined ? pgUpdates.spaceId as string | null : existingExpense.spaceId,
        issuedAt:
          (pgUpdates.documentDate as string | null | undefined)
          || (pgUpdates.paymentDate as string | null | undefined)
          || existingExpense.documentDate
          || existingExpense.paymentDate
          || existingExpense.taxSnapshotFrozenAt
          || undefined
      })

      pgUpdates.taxRate = taxWriteFields.taxRate
      pgUpdates.taxAmount = taxWriteFields.taxAmount
      pgUpdates.taxCode = taxWriteFields.taxCode
      pgUpdates.taxRecoverability = taxWriteFields.taxRecoverability
      pgUpdates.taxRateSnapshot = taxWriteFields.taxRateSnapshot
      pgUpdates.taxAmountSnapshot = taxWriteFields.taxAmountSnapshot
      pgUpdates.taxSnapshotJson = serializeExpenseTaxSnapshot(taxWriteFields.taxSnapshot)
      pgUpdates.isTaxExempt = taxWriteFields.isTaxExempt
      pgUpdates.taxSnapshotFrozenAt = taxWriteFields.taxSnapshotFrozenAt
      pgUpdates.recoverableTaxAmount = taxWriteFields.recoverableTaxAmount
      pgUpdates.recoverableTaxAmountClp = taxWriteFields.recoverableTaxAmountClp
      pgUpdates.nonRecoverableTaxAmount = taxWriteFields.nonRecoverableTaxAmount
      pgUpdates.nonRecoverableTaxAmountClp = taxWriteFields.nonRecoverableTaxAmountClp
      pgUpdates.effectiveCostAmount = taxWriteFields.effectiveCostAmount
      pgUpdates.effectiveCostAmountClp = taxWriteFields.effectiveCostAmountClp

      if (body.totalAmount === undefined) {
        pgUpdates.totalAmount = taxWriteFields.totalAmount
      }

      if (body.totalAmountClp === undefined && Number.isFinite(exchangeRateToClp)) {
        pgUpdates.totalAmountClp = taxWriteFields.totalAmount * exchangeRateToClp
      }
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
      clientId: 'client_id', spaceId: 'space_id', expenseType: 'expense_type', sourceType: 'source_type',
      description: 'description',
      currency: 'currency', subtotal: 'subtotal', taxRate: 'tax_rate', taxAmount: 'tax_amount',
      taxCode: 'tax_code', taxRecoverability: 'tax_recoverability', taxRateSnapshot: 'tax_rate_snapshot',
      taxAmountSnapshot: 'tax_amount_snapshot', taxSnapshotJson: 'tax_snapshot_json', isTaxExempt: 'is_tax_exempt',
      taxSnapshotFrozenAt: 'tax_snapshot_frozen_at', recoverableTaxAmount: 'recoverable_tax_amount',
      recoverableTaxAmountClp: 'recoverable_tax_amount_clp', nonRecoverableTaxAmount: 'non_recoverable_tax_amount',
      nonRecoverableTaxAmountClp: 'non_recoverable_tax_amount_clp', effectiveCostAmount: 'effective_cost_amount',
      effectiveCostAmountClp: 'effective_cost_amount_clp',
      totalAmount: 'total_amount', exchangeRateToClp: 'exchange_rate_to_clp',
      totalAmountClp: 'total_amount_clp', paymentDate: 'payment_date',
      paymentStatus: 'payment_status', paymentMethod: 'payment_method', paymentProvider: 'payment_provider',
      paymentRail: 'payment_rail',
      paymentAccountId: 'payment_account_id', paymentReference: 'payment_reference',
      documentNumber: 'document_number', documentDate: 'document_date', dueDate: 'due_date',
      supplierId: 'supplier_id', supplierName: 'supplier_name',
      supplierInvoiceNumber: 'supplier_invoice_number', payrollPeriodId: 'payroll_period_id',
      payrollEntryId: 'payroll_entry_id', memberId: 'member_id', memberName: 'member_name',
      socialSecurityType: 'social_security_type', socialSecurityInstitution: 'social_security_institution',
      socialSecurityPeriod: 'social_security_period', taxType: 'tax_type', taxPeriod: 'tax_period',
      taxFormNumber: 'tax_form_number', miscellaneousCategory: 'miscellaneous_category',
      serviceLine: 'service_line', isRecurring: 'is_recurring',
      recurrenceFrequency: 'recurrence_frequency', receiptDate: 'receipt_date', purchaseType: 'purchase_type',
      vatUnrecoverableAmount: 'vat_unrecoverable_amount', vatFixedAssetsAmount: 'vat_fixed_assets_amount',
      vatCommonUseAmount: 'vat_common_use_amount', dteTypeCode: 'dte_type_code', dteFolio: 'dte_folio',
      exemptAmount: 'exempt_amount', otherTaxesAmount: 'other_taxes_amount', withholdingAmount: 'withholding_amount',
      notes: 'notes'
    }

    for (const [key, value] of Object.entries(pgUpdates)) {
      const col = colMap[key]

      if (col) {
        if (key === 'taxSnapshotJson') {
          bqUpdates.push(`${col} = PARSE_JSON(@${key})`)
        } else if (key === 'taxSnapshotFrozenAt') {
          bqUpdates.push(`${col} = TIMESTAMP(@${key})`)
        } else {
          bqUpdates.push(`${col} = @${key}`)
        }

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
