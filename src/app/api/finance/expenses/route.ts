import { NextResponse } from 'next/server'

import { resolveFinanceDownstreamScope, resolveFinanceMemberContext } from '@/lib/finance/canonical'
import { EXPENSE_SOURCE_TYPES, PAYMENT_PROVIDERS, PAYMENT_RAILS } from '@/lib/finance/expense-taxonomy'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { assertFinanceBigQueryReadiness, ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  assertValidCurrency,
  assertPositiveAmount,
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
  SOCIAL_SECURITY_TYPES,
  TAX_TYPES,
  DIRECT_OVERHEAD_SCOPES,
  DIRECT_OVERHEAD_KINDS,
  buildMonthlySequenceId,
  resolveExchangeRateToClp,
  type ExpenseType,
  type ExpensePaymentStatus,
  type PaymentMethod,
  type ServiceLine
} from '@/lib/finance/shared'
import {
  listFinanceExpensesFromPostgres,
  createFinanceExpenseInPostgres,
  buildMonthlySequenceIdFromPostgres
} from '@/lib/finance/postgres-store-slice2'
import {
  buildExpenseTaxWriteFields,
  parsePersistedExpenseTaxSnapshot,
  serializeExpenseTaxSnapshot
} from '@/lib/finance/expense-tax-snapshot'
import { getFinanceSupplierFromPostgres, shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'
import { withIdempotency } from '@/lib/finance/idempotency'

export const dynamic = 'force-dynamic'

interface ExpenseRow {
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
  notes: string | null
  created_by: string | null
  created_at: unknown
  updated_at: unknown
}

const normalizeExpense = (row: ExpenseRow) => ({
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

  const { searchParams } = new URL(request.url)
  const expenseType = searchParams.get('expenseType')
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')
  const organizationId = searchParams.get('organizationId')
  const spaceId = searchParams.get('spaceId')
  const clientProfileId = searchParams.get('clientProfileId')
  const hubspotCompanyId = searchParams.get('hubspotCompanyId')
  const memberId = searchParams.get('memberId')
  const supplierId = searchParams.get('supplierId')
  const serviceLine = searchParams.get('serviceLine')
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')
  const page = Math.max(1, toNumber(searchParams.get('page') || '1'))
  const pageSize = Math.min(200, Math.max(1, toNumber(searchParams.get('pageSize') || '50')))

  const resolvedScope =
    clientId || organizationId || clientProfileId || hubspotCompanyId || spaceId
      ? await resolveFinanceDownstreamScope({
          clientId,
          organizationId,
          clientProfileId,
          hubspotCompanyId,
          requestedSpaceId: spaceId
        })
      : null

  // ── Postgres-first path ──
  try {
    const result = await listFinanceExpensesFromPostgres({
      expenseType,
      status,
      clientId: resolvedScope?.clientId ?? clientId,
      spaceId: resolvedScope?.spaceId ?? spaceId ?? null,
      memberId,
      supplierId,
      serviceLine,
      fromDate,
      toDate,
      page,
      pageSize
    })

    return NextResponse.json(result)
  } catch (error) {
    if (!shouldFallbackFromFinancePostgres(error)) {
      throw error
    }
  }

  // ── BigQuery fallback ──
  await assertFinanceBigQueryReadiness({ tables: ['fin_expenses'] })

  try {
    const projectId = getFinanceProjectId()

    let filters = ''
    const params: Record<string, unknown> = {}

    if (expenseType) {
      filters += ' AND expense_type = @expenseType'
      params.expenseType = expenseType
    }

    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean)

      if (statuses.length === 1) {
        filters += ' AND payment_status = @status'
        params.status = statuses[0]
      } else if (statuses.length > 1) {
        filters += ` AND payment_status IN (${statuses.map((_, i) => `@status${i}`).join(', ')})`
        statuses.forEach((s, i) => { params[`status${i}`] = s })
      }
    }

    if (resolvedScope?.clientId ?? clientId) {
      filters += ' AND client_id = @clientId'
      params.clientId = resolvedScope?.clientId ?? clientId
    }

    if (spaceId || resolvedScope?.spaceId) {
      filters += ' AND space_id = @spaceId'
      params.spaceId = resolvedScope?.spaceId ?? spaceId
    }

    if (memberId) {
      filters += ' AND member_id = @memberId'
      params.memberId = memberId
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

    const countRows = await runFinanceQuery<{ total: number }>(
      `
      SELECT COUNT(*) AS total
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE TRUE ${filters}
    `,
      params
    )

    const total = toNumber(countRows[0]?.total)

    const rows = await runFinanceQuery<ExpenseRow>(
      `
      SELECT *
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE TRUE ${filters}
      ORDER BY COALESCE(document_date, payment_date, DATE(created_at)) DESC
      LIMIT @limit OFFSET @offset
    `,
      { ...params, limit: pageSize, offset: (page - 1) * pageSize }
    )

    return NextResponse.json({
      items: rows.map(normalizeExpense),
      total,
      page,
      pageSize
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'

    console.error('GET /api/finance/expenses failed:', detail, error)

    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return withIdempotency(request, tenant.clientId, '/api/finance/expenses', async () => {
  try {
    const body = await request.json()
    const description = assertNonEmptyString(body.description, 'description')
    const currency = assertValidCurrency(body.currency)
    const subtotal = assertPositiveAmount(toNumber(body.subtotal), 'subtotal')

    const resolvedScope = await resolveFinanceDownstreamScope({
      organizationId: body.organizationId,
      clientId: body.clientId,
      clientProfileId: body.clientProfileId,
      hubspotCompanyId: body.hubspotCompanyId,
      requestedSpaceId: body.spaceId,
      allocatedClientId: body.allocatedClientId
    })

    const resolvedMember = await resolveFinanceMemberContext({
      memberId: body.memberId,
      payrollEntryId: body.payrollEntryId
    })

    const expenseType =
      body.expenseType && EXPENSE_TYPES.includes(body.expenseType) ? (body.expenseType as ExpenseType) : 'supplier'

    const sourceType =
      body.sourceType && EXPENSE_SOURCE_TYPES.includes(body.sourceType) ? normalizeString(body.sourceType) : 'manual'

    const exchangeRateToClp = await resolveExchangeRateToClp({ currency, requestedRate: body.exchangeRateToClp })

    const taxWriteFields = await buildExpenseTaxWriteFields({
      subtotal,
      exchangeRateToClp,
      taxCode: body.taxCode,
      taxRate: body.taxRate,
      taxAmount: body.taxAmount,
      totalAmount: body.totalAmount,
      dteTypeCode: body.dteTypeCode,
      exemptAmount: body.exemptAmount,
      vatUnrecoverableAmount: body.vatUnrecoverableAmount,
      vatCommonUseAmount: body.vatCommonUseAmount,
      vatFixedAssetsAmount: body.vatFixedAssetsAmount,
      spaceId: resolvedScope.spaceId,
      issuedAt: body.documentDate || body.paymentDate || undefined
    })

    const totalAmountClp = toNumber(body.totalAmountClp) || taxWriteFields.totalAmount * exchangeRateToClp

    const periodSource = normalizeString(body.documentDate || body.paymentDate) || new Date().toISOString().slice(0, 10)
    const period = periodSource.slice(0, 7).replace('-', '')

    const paymentStatus =
      body.paymentStatus && EXPENSE_PAYMENT_STATUSES.includes(body.paymentStatus)
        ? (body.paymentStatus as ExpensePaymentStatus)
        : 'pending'

    const paymentMethod =
      body.paymentMethod && PAYMENT_METHODS.includes(body.paymentMethod) ? (body.paymentMethod as PaymentMethod) : null

    const paymentProvider =
      body.paymentProvider && PAYMENT_PROVIDERS.includes(body.paymentProvider)
        ? normalizeString(body.paymentProvider)
        : null

    const paymentRail =
      body.paymentRail && PAYMENT_RAILS.includes(body.paymentRail) ? normalizeString(body.paymentRail) : null

    const serviceLine =
      body.serviceLine && SERVICE_LINES.includes(body.serviceLine) ? (body.serviceLine as ServiceLine) : null

    // Shared field resolution
    const socialSecurityType =
      body.socialSecurityType && SOCIAL_SECURITY_TYPES.includes(body.socialSecurityType)
        ? normalizeString(body.socialSecurityType)
        : null

    const taxType = body.taxType && TAX_TYPES.includes(body.taxType) ? normalizeString(body.taxType) : null

    let generatedExpenseId = normalizeString(body.expenseId)

    // ── TASK-772 Slice 4 — Supplier snapshot hydration ─────────────────
    // Cuando el cliente envía `supplierId` sin `supplierName`, resolvemos el
    // display canónico desde la tabla `suppliers` y lo persistimos como
    // snapshot. Esto evita que registros nuevos nazcan con `supplier_name=null`
    // (root cause del incidente Figma EXP-202604-008).
    //
    // Defense-in-depth con Slice 1: el reader hidrata el display via LEFT JOIN
    // para datos legacy. Este snapshot evita el JOIN para datos nuevos y
    // protege auditoría/exports cuando el supplier cambie de nombre downstream.
    //
    // Si supplierId no existe en la tabla → 400 con error claro (nunca crear
    // expense con FK rota).
    const supplierIdInput = body.supplierId ? normalizeString(body.supplierId) : null
    const supplierNameProvided = body.supplierName ? normalizeString(body.supplierName) : null
    let supplierNameResolved = supplierNameProvided

    if (supplierIdInput && !supplierNameResolved) {
      const supplier = await getFinanceSupplierFromPostgres(supplierIdInput)

      if (!supplier) {
        throw new FinanceValidationError(
          `Proveedor con id "${supplierIdInput}" no existe en el directorio.`,
          400
        )
      }

      supplierNameResolved = supplier.tradeName ?? supplier.legalName ?? null
    }

    // ── Postgres-first path ──
    try {
      if (!generatedExpenseId) {
        generatedExpenseId = await buildMonthlySequenceIdFromPostgres({
          tableName: 'expenses',
          idColumn: 'expense_id',
          prefix: 'EXP',
          period
        })
      }

      await createFinanceExpenseInPostgres({
        expenseId: generatedExpenseId,
        clientId: resolvedScope.clientId,
        spaceId: resolvedScope.spaceId,
        expenseType,
        sourceType,
        description,
        currency,
        subtotal,
        taxRate: taxWriteFields.taxRate,
        taxAmount: taxWriteFields.taxAmount,
        taxCode: taxWriteFields.taxCode,
        taxRecoverability: taxWriteFields.taxRecoverability,
        taxRateSnapshot: taxWriteFields.taxRateSnapshot,
        taxAmountSnapshot: taxWriteFields.taxAmountSnapshot,
        taxSnapshotJson: serializeExpenseTaxSnapshot(taxWriteFields.taxSnapshot),
        isTaxExempt: taxWriteFields.isTaxExempt,
        taxSnapshotFrozenAt: taxWriteFields.taxSnapshotFrozenAt,
        recoverableTaxAmount: taxWriteFields.recoverableTaxAmount,
        recoverableTaxAmountClp: taxWriteFields.recoverableTaxAmountClp,
        nonRecoverableTaxAmount: taxWriteFields.nonRecoverableTaxAmount,
        nonRecoverableTaxAmountClp: taxWriteFields.nonRecoverableTaxAmountClp,
        effectiveCostAmount: taxWriteFields.effectiveCostAmount,
        effectiveCostAmountClp: taxWriteFields.effectiveCostAmountClp,
        totalAmount: taxWriteFields.totalAmount,
        exchangeRateToClp,
        totalAmountClp,
        paymentDate: body.paymentDate ? normalizeString(body.paymentDate) : null,
        paymentStatus,
        paymentMethod,
        paymentProvider,
        paymentRail,
        paymentAccountId: body.paymentAccountId ? normalizeString(body.paymentAccountId) : null,
        paymentReference: body.paymentReference ? normalizeString(body.paymentReference) : null,
        documentNumber: body.documentNumber ? normalizeString(body.documentNumber) : null,
        documentDate: body.documentDate ? normalizeString(body.documentDate) : null,
        dueDate: body.dueDate ? normalizeString(body.dueDate) : null,
        supplierId: supplierIdInput,
        supplierName: supplierNameResolved, // TASK-772 — snapshot hidratado
        supplierInvoiceNumber: body.supplierInvoiceNumber ? normalizeString(body.supplierInvoiceNumber) : null,
        payrollPeriodId: normalizeString(body.payrollPeriodId) || resolvedMember.payrollPeriodId,
        payrollEntryId: resolvedMember.payrollEntryId,
        memberId: resolvedMember.memberId,
        memberName: normalizeString(body.memberName) || resolvedMember.memberName,
        socialSecurityType,
        socialSecurityInstitution: body.socialSecurityInstitution
          ? normalizeString(body.socialSecurityInstitution)
          : null,
        socialSecurityPeriod: body.socialSecurityPeriod ? normalizeString(body.socialSecurityPeriod) : null,
        taxType,
        taxPeriod: body.taxPeriod ? normalizeString(body.taxPeriod) : null,
        taxFormNumber: body.taxFormNumber ? normalizeString(body.taxFormNumber) : null,
        miscellaneousCategory: body.miscellaneousCategory ? normalizeString(body.miscellaneousCategory) : null,
        serviceLine,
        isRecurring: Boolean(body.isRecurring),
        recurrenceFrequency: body.recurrenceFrequency ? normalizeString(body.recurrenceFrequency) : null,
        costCategory: body.costCategory ? normalizeString(body.costCategory) : null,
        costIsDirect: Boolean(body.costIsDirect),
        allocatedClientId: body.allocatedClientId ? normalizeString(body.allocatedClientId) : null,
        directOverheadScope:
          body.directOverheadScope && DIRECT_OVERHEAD_SCOPES.includes(body.directOverheadScope)
            ? normalizeString(body.directOverheadScope)
            : 'none',
        directOverheadKind:
          body.directOverheadKind && DIRECT_OVERHEAD_KINDS.includes(body.directOverheadKind)
            ? normalizeString(body.directOverheadKind)
            : null,
        directOverheadMemberId: body.directOverheadMemberId ? normalizeString(body.directOverheadMemberId) : null,
        receiptDate: body.receiptDate ? normalizeString(body.receiptDate) : null,
        purchaseType: body.purchaseType ? normalizeString(body.purchaseType) : null,
        vatUnrecoverableAmount: body.vatUnrecoverableAmount != null ? toNumber(body.vatUnrecoverableAmount) : null,
        vatFixedAssetsAmount: body.vatFixedAssetsAmount != null ? toNumber(body.vatFixedAssetsAmount) : null,
        vatCommonUseAmount: body.vatCommonUseAmount != null ? toNumber(body.vatCommonUseAmount) : null,
        dteTypeCode: body.dteTypeCode ? normalizeString(body.dteTypeCode) : null,
        dteFolio: body.dteFolio ? normalizeString(body.dteFolio) : null,
        exemptAmount: body.exemptAmount != null ? toNumber(body.exemptAmount) : null,
        otherTaxesAmount: body.otherTaxesAmount != null ? toNumber(body.otherTaxesAmount) : null,
        withholdingAmount: body.withholdingAmount != null ? toNumber(body.withholdingAmount) : null,
        notes: body.notes ? normalizeString(body.notes) : null,
        actorUserId: tenant.userId || null
      })

      return NextResponse.json({ expenseId: generatedExpenseId, created: true }, { status: 201 })
    } catch (pgError) {
      if (!shouldFallbackFromFinancePostgres(pgError)) {
        throw pgError
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

    const expenseId =
      generatedExpenseId ||
      (await buildMonthlySequenceId({
        tableName: 'fin_expenses',
        idColumn: 'expense_id',
        prefix: 'EXP',
        period
      }))

    const projectId = getFinanceProjectId()

    await runFinanceQuery(
      `
      INSERT INTO \`${projectId}.greenhouse.fin_expenses\` (
        expense_id, client_id, space_id, expense_type, source_type, description, currency,
        subtotal, tax_rate, tax_amount,
        tax_code, tax_recoverability, tax_rate_snapshot, tax_amount_snapshot, tax_snapshot_json, is_tax_exempt, tax_snapshot_frozen_at,
        recoverable_tax_amount, recoverable_tax_amount_clp, non_recoverable_tax_amount, non_recoverable_tax_amount_clp,
        effective_cost_amount, effective_cost_amount_clp, total_amount,
        exchange_rate_to_clp, total_amount_clp,
        payment_date, payment_status, payment_method, payment_provider, payment_rail,
        payment_account_id, payment_reference,
        document_number, document_date, due_date,
        supplier_id, supplier_name, supplier_invoice_number,
        payroll_period_id, payroll_entry_id, member_id, member_name,
        receipt_date, purchase_type, vat_unrecoverable_amount, vat_fixed_assets_amount, vat_common_use_amount,
        dte_type_code, dte_folio, exempt_amount, other_taxes_amount, withholding_amount,
        social_security_type, social_security_institution, social_security_period,
        tax_type, tax_period, tax_form_number,
        miscellaneous_category, service_line, is_recurring, recurrence_frequency,
        is_reconciled, notes, created_by,
        created_at, updated_at
      ) VALUES (
        @expenseId, @clientId, @spaceId, @expenseType, @sourceType, @description, @currency,
        CAST(@subtotal AS NUMERIC), CAST(@taxRate AS NUMERIC), CAST(@taxAmount AS NUMERIC),
        @taxCode, @taxRecoverability, CAST(@taxRateSnapshot AS NUMERIC), CAST(@taxAmountSnapshot AS NUMERIC), PARSE_JSON(@taxSnapshotJson), @isTaxExempt, TIMESTAMP(@taxSnapshotFrozenAt),
        CAST(@recoverableTaxAmount AS NUMERIC), CAST(@recoverableTaxAmountClp AS NUMERIC), CAST(@nonRecoverableTaxAmount AS NUMERIC), CAST(@nonRecoverableTaxAmountClp AS NUMERIC),
        CAST(@effectiveCostAmount AS NUMERIC), CAST(@effectiveCostAmountClp AS NUMERIC), CAST(@totalAmount AS NUMERIC),
        CAST(@exchangeRateToClp AS NUMERIC), CAST(@totalAmountClp AS NUMERIC),
        IF(@paymentDate = '', NULL, CAST(@paymentDate AS DATE)), @paymentStatus, @paymentMethod, @paymentProvider, @paymentRail,
        @paymentAccountId, @paymentReference,
        @documentNumber, IF(@documentDate = '', NULL, CAST(@documentDate AS DATE)), IF(@dueDate = '', NULL, CAST(@dueDate AS DATE)),
        @supplierId, @supplierName, @supplierInvoiceNumber,
        @payrollPeriodId, @payrollEntryId, @memberId, @memberName,
        IF(@receiptDate = '', NULL, CAST(@receiptDate AS DATE)), @purchaseType,
        CAST(@vatUnrecoverableAmount AS NUMERIC), CAST(@vatFixedAssetsAmount AS NUMERIC), CAST(@vatCommonUseAmount AS NUMERIC),
        @dteTypeCode, @dteFolio,
        CAST(@exemptAmount AS NUMERIC), CAST(@otherTaxesAmount AS NUMERIC), CAST(@withholdingAmount AS NUMERIC),
        @socialSecurityType, @socialSecurityInstitution, @socialSecurityPeriod,
        @taxType, @taxPeriod, @taxFormNumber,
        @miscellaneousCategory, @serviceLine, @isRecurring, @recurrenceFrequency,
        FALSE, @notes, @createdBy,
        CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
      )
    `,
      {
        expenseId,
        clientId: resolvedScope.clientId,
        spaceId: resolvedScope.spaceId,
        expenseType,
        sourceType,
        description,
        currency,
        subtotal,
        taxRate: taxWriteFields.taxRate,
        taxAmount: taxWriteFields.taxAmount,
        taxCode: taxWriteFields.taxCode,
        taxRecoverability: taxWriteFields.taxRecoverability,
        taxRateSnapshot: taxWriteFields.taxRateSnapshot,
        taxAmountSnapshot: taxWriteFields.taxAmountSnapshot,
        taxSnapshotJson: serializeExpenseTaxSnapshot(taxWriteFields.taxSnapshot),
        isTaxExempt: taxWriteFields.isTaxExempt,
        taxSnapshotFrozenAt: taxWriteFields.taxSnapshotFrozenAt,
        recoverableTaxAmount: taxWriteFields.recoverableTaxAmount,
        recoverableTaxAmountClp: taxWriteFields.recoverableTaxAmountClp,
        nonRecoverableTaxAmount: taxWriteFields.nonRecoverableTaxAmount,
        nonRecoverableTaxAmountClp: taxWriteFields.nonRecoverableTaxAmountClp,
        effectiveCostAmount: taxWriteFields.effectiveCostAmount,
        effectiveCostAmountClp: taxWriteFields.effectiveCostAmountClp,
        totalAmount: taxWriteFields.totalAmount,
        exchangeRateToClp,
        totalAmountClp,
        paymentDate: body.paymentDate ? normalizeString(body.paymentDate) : null,
        paymentStatus,
        paymentMethod,
        paymentProvider,
        paymentRail,
        paymentAccountId: body.paymentAccountId ? normalizeString(body.paymentAccountId) : null,
        paymentReference: body.paymentReference ? normalizeString(body.paymentReference) : null,
        documentNumber: body.documentNumber ? normalizeString(body.documentNumber) : null,
        documentDate: body.documentDate ? normalizeString(body.documentDate) : null,
        dueDate: body.dueDate ? normalizeString(body.dueDate) : null,
        supplierId: supplierIdInput,
        supplierName: supplierNameResolved, // TASK-772 — snapshot hidratado
        supplierInvoiceNumber: body.supplierInvoiceNumber ? normalizeString(body.supplierInvoiceNumber) : null,
        payrollPeriodId: normalizeString(body.payrollPeriodId) || resolvedMember.payrollPeriodId,
        payrollEntryId: resolvedMember.payrollEntryId,
        memberId: resolvedMember.memberId,
        memberName: normalizeString(body.memberName) || resolvedMember.memberName,
        receiptDate: body.receiptDate ? normalizeString(body.receiptDate) : null,
        purchaseType: body.purchaseType ? normalizeString(body.purchaseType) : null,
        vatUnrecoverableAmount: body.vatUnrecoverableAmount != null ? toNumber(body.vatUnrecoverableAmount) : null,
        vatFixedAssetsAmount: body.vatFixedAssetsAmount != null ? toNumber(body.vatFixedAssetsAmount) : null,
        vatCommonUseAmount: body.vatCommonUseAmount != null ? toNumber(body.vatCommonUseAmount) : null,
        dteTypeCode: body.dteTypeCode ? normalizeString(body.dteTypeCode) : null,
        dteFolio: body.dteFolio ? normalizeString(body.dteFolio) : null,
        exemptAmount: body.exemptAmount != null ? toNumber(body.exemptAmount) : null,
        otherTaxesAmount: body.otherTaxesAmount != null ? toNumber(body.otherTaxesAmount) : null,
        withholdingAmount: body.withholdingAmount != null ? toNumber(body.withholdingAmount) : null,
        socialSecurityType,
        socialSecurityInstitution: body.socialSecurityInstitution
          ? normalizeString(body.socialSecurityInstitution)
          : null,
        socialSecurityPeriod: body.socialSecurityPeriod ? normalizeString(body.socialSecurityPeriod) : null,
        taxType,
        taxPeriod: body.taxPeriod ? normalizeString(body.taxPeriod) : null,
        taxFormNumber: body.taxFormNumber ? normalizeString(body.taxFormNumber) : null,
        miscellaneousCategory: body.miscellaneousCategory ? normalizeString(body.miscellaneousCategory) : null,
        serviceLine,
        isRecurring: Boolean(body.isRecurring),
        recurrenceFrequency: body.recurrenceFrequency ? normalizeString(body.recurrenceFrequency) : null,
        notes: body.notes ? normalizeString(body.notes) : null,
        createdBy: tenant.userId || null
      }
    )

    return NextResponse.json({ expenseId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
  }) // end withIdempotency
}
