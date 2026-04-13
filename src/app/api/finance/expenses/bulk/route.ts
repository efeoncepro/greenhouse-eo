import { NextResponse } from 'next/server'

import { withTransaction } from '@/lib/db'
import { resolveFinanceDownstreamScope, resolveFinanceMemberContext } from '@/lib/finance/canonical'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
import { createFinanceExpenseInPostgres } from '@/lib/finance/postgres-store-slice2'
import {
  EXPENSE_PAYMENT_STATUSES,
  EXPENSE_TYPES,
  FinanceValidationError,
  PAYMENT_METHODS,
  SERVICE_LINES,
  assertNonEmptyString,
  assertPositiveAmount,
  assertValidCurrency,
  buildMonthlySequenceId,
  getFinanceProjectId,
  normalizeString,
  resolveExchangeRateToClp,
  runFinanceQuery,
  toNumber,
  type ExpensePaymentStatus,
  type ExpenseType,
  type PaymentMethod,
  type ServiceLine
} from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const items = Array.isArray(body.items) ? body.items : []

    if (items.length === 0) {
      throw new FinanceValidationError('items must contain at least one expense.')
    }

    if (items.length > 100) {
      throw new FinanceValidationError('Bulk expense creation supports up to 100 items per request.')
    }

    // Pre-validation pass: validate all rows before creating any
    const validationErrors: Array<{ index: number; field: string; message: string }> = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      if (!item.description || !normalizeString(item.description)) {
        validationErrors.push({ index: i, field: 'description', message: 'Descripción requerida' })
      }

      if (!item.currency) {
        validationErrors.push({ index: i, field: 'currency', message: 'Moneda requerida' })
      } else if (!['CLP', 'USD'].includes(String(item.currency).toUpperCase())) {
        validationErrors.push({ index: i, field: 'currency', message: `Moneda no válida: ${item.currency}` })
      }

      if (toNumber(item.subtotal) <= 0) {
        validationErrors.push({ index: i, field: 'subtotal', message: 'Subtotal debe ser mayor a 0' })
      }

      const dateFields = ['paymentDate', 'documentDate', 'dueDate'] as const

      for (const field of dateFields) {
        const value = normalizeString(item[field])

        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          validationErrors.push({ index: i, field, message: `Formato de fecha inválido: ${value}. Usa YYYY-MM-DD` })
        }
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: `${validationErrors.length} error(es) de validación en ${new Set(validationErrors.map(e => e.index)).size} fila(s)`,
        validationErrors,
        imported: 0,
        skipped: items.length
      }, { status: 400 })
    }

    // ── Phase 1: resolve all items before opening the transaction ──
    // (async lookups like scope resolution, FX rates, sequence IDs run outside tx)
    const resolvedItems: Array<{
      expenseId: string
      params: Parameters<typeof createFinanceExpenseInPostgres>[0]
    }> = []

    for (const item of items) {
      const description = assertNonEmptyString(item.description, 'description')
      const currency = assertValidCurrency(item.currency)
      const subtotal = assertPositiveAmount(toNumber(item.subtotal), 'subtotal')

      const resolvedScope = await resolveFinanceDownstreamScope({
        organizationId: item.organizationId,
        clientId: item.clientId,
        clientProfileId: item.clientProfileId,
        hubspotCompanyId: item.hubspotCompanyId,
        requestedSpaceId: item.spaceId,
        allocatedClientId: item.allocatedClientId
      })

      const resolvedMember = await resolveFinanceMemberContext({
        memberId: item.memberId,
        payrollEntryId: item.payrollEntryId
      })

      const taxRate = toNumber(item.taxRate ?? 0)
      const taxAmount = toNumber(item.taxAmount) || subtotal * taxRate
      const totalAmount = toNumber(item.totalAmount) || subtotal + taxAmount
      const exchangeRateToClp = await resolveExchangeRateToClp({ currency, requestedRate: item.exchangeRateToClp })
      const totalAmountClp = toNumber(item.totalAmountClp) || totalAmount * exchangeRateToClp

      const expenseType = item.expenseType && EXPENSE_TYPES.includes(item.expenseType)
        ? (item.expenseType as ExpenseType)
        : 'supplier'

      const paymentStatus = item.paymentStatus && EXPENSE_PAYMENT_STATUSES.includes(item.paymentStatus)
        ? (item.paymentStatus as ExpensePaymentStatus)
        : 'pending'

      const paymentMethod = item.paymentMethod && PAYMENT_METHODS.includes(item.paymentMethod)
        ? (item.paymentMethod as PaymentMethod)
        : null

      const serviceLine = item.serviceLine && SERVICE_LINES.includes(item.serviceLine)
        ? (item.serviceLine as ServiceLine)
        : null

      const periodSource = normalizeString(item.documentDate || item.paymentDate) || new Date().toISOString().slice(0, 10)
      const period = periodSource.slice(0, 7).replace('-', '')

      const expenseId = normalizeString(item.expenseId) || await buildMonthlySequenceId({
        tableName: 'fin_expenses',
        idColumn: 'expense_id',
        prefix: 'EXP',
        period
      })

      resolvedItems.push({
        expenseId,
        params: {
          expenseId,
          clientId: resolvedScope.clientId,
          spaceId: resolvedScope.spaceId,
          expenseType,
          sourceType: 'manual',
          description,
          currency,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          exchangeRateToClp,
          totalAmountClp,
          paymentDate: item.paymentDate ? normalizeString(item.paymentDate) : null,
          paymentStatus,
          paymentMethod,
          paymentProvider: null,
          paymentRail: null,
          paymentAccountId: item.paymentAccountId ? normalizeString(item.paymentAccountId) : null,
          paymentReference: item.paymentReference ? normalizeString(item.paymentReference) : null,
          documentNumber: item.documentNumber ? normalizeString(item.documentNumber) : null,
          documentDate: item.documentDate ? normalizeString(item.documentDate) : null,
          dueDate: item.dueDate ? normalizeString(item.dueDate) : null,
          supplierId: item.supplierId ? normalizeString(item.supplierId) : null,
          supplierName: item.supplierName ? normalizeString(item.supplierName) : null,
          supplierInvoiceNumber: item.supplierInvoiceNumber ? normalizeString(item.supplierInvoiceNumber) : null,
          payrollPeriodId: normalizeString(item.payrollPeriodId) || resolvedMember.payrollPeriodId,
          payrollEntryId: resolvedMember.payrollEntryId,
          memberId: resolvedMember.memberId,
          memberName: normalizeString(item.memberName) || resolvedMember.memberName,
          socialSecurityType: item.socialSecurityType ? normalizeString(item.socialSecurityType) : null,
          socialSecurityInstitution: item.socialSecurityInstitution ? normalizeString(item.socialSecurityInstitution) : null,
          socialSecurityPeriod: item.socialSecurityPeriod ? normalizeString(item.socialSecurityPeriod) : null,
          taxType: item.taxType ? normalizeString(item.taxType) : null,
          taxPeriod: item.taxPeriod ? normalizeString(item.taxPeriod) : null,
          taxFormNumber: item.taxFormNumber ? normalizeString(item.taxFormNumber) : null,
          miscellaneousCategory: item.miscellaneousCategory ? normalizeString(item.miscellaneousCategory) : null,
          serviceLine,
          isRecurring: Boolean(item.isRecurring),
          recurrenceFrequency: item.recurrenceFrequency ? normalizeString(item.recurrenceFrequency) : null,
          costCategory: null,
          costIsDirect: true,
          allocatedClientId: null,
          directOverheadScope: null,
          directOverheadKind: null,
          directOverheadMemberId: null,
          notes: item.notes ? normalizeString(item.notes) : null,
          actorUserId: tenant.userId || null
        }
      })
    }

    // ── Phase 2: all inserts inside a single transaction (atomic) ──
    // If any item fails, ALL are rolled back — no partial bulk.
    try {
      await withTransaction(async (txClient) => {
        for (const { params } of resolvedItems) {
          await createFinanceExpenseInPostgres(params, { client: txClient })
        }
      })
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

      // BigQuery fallback: write all items individually (BQ has no transactions)
      await ensureFinanceInfrastructure()
      const projectId = getFinanceProjectId()

      for (const { params: p } of resolvedItems) {
        await runFinanceQuery(`
          INSERT INTO \`${projectId}.greenhouse.fin_expenses\` (
            expense_id, client_id, space_id, expense_type, description, currency,
            subtotal, tax_rate, tax_amount, total_amount,
            exchange_rate_to_clp, total_amount_clp,
            payment_date, payment_status, payment_method,
            payment_account_id, payment_reference,
            document_number, document_date, due_date,
            supplier_id, supplier_name, supplier_invoice_number,
            payroll_period_id, payroll_entry_id, member_id, member_name,
            social_security_type, social_security_institution, social_security_period,
            tax_type, tax_period, tax_form_number,
            miscellaneous_category, service_line, is_recurring, recurrence_frequency,
            is_reconciled, notes, created_by,
            created_at, updated_at
          ) VALUES (
            @expenseId, @clientId, @spaceId, @expenseType, @description, @currency,
            CAST(@subtotal AS NUMERIC), CAST(@taxRate AS NUMERIC), CAST(@taxAmount AS NUMERIC), CAST(@totalAmount AS NUMERIC),
            CAST(@exchangeRateToClp AS NUMERIC), CAST(@totalAmountClp AS NUMERIC),
            IF(@paymentDate = '', NULL, CAST(@paymentDate AS DATE)), @paymentStatus, @paymentMethod,
            @paymentAccountId, @paymentReference,
            @documentNumber, IF(@documentDate = '', NULL, CAST(@documentDate AS DATE)), IF(@dueDate = '', NULL, CAST(@dueDate AS DATE)),
            @supplierId, @supplierName, @supplierInvoiceNumber,
            @payrollPeriodId, @payrollEntryId, @memberId, @memberName,
            @socialSecurityType, @socialSecurityInstitution, @socialSecurityPeriod,
            @taxType, @taxPeriod, @taxFormNumber,
            @miscellaneousCategory, @serviceLine, @isRecurring, @recurrenceFrequency,
            FALSE, @notes, @createdBy,
            CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
          )
        `, {
          expenseId: p.expenseId,
          clientId: p.clientId,
          spaceId: p.spaceId,
          expenseType: p.expenseType,
          description: p.description,
          currency: p.currency,
          subtotal: p.subtotal,
          taxRate: p.taxRate,
          taxAmount: p.taxAmount,
          totalAmount: p.totalAmount,
          exchangeRateToClp: p.exchangeRateToClp,
          totalAmountClp: p.totalAmountClp,
          paymentDate: p.paymentDate,
          paymentStatus: p.paymentStatus,
          paymentMethod: p.paymentMethod,
          paymentAccountId: p.paymentAccountId,
          paymentReference: p.paymentReference,
          documentNumber: p.documentNumber,
          documentDate: p.documentDate,
          dueDate: p.dueDate,
          supplierId: p.supplierId,
          supplierName: p.supplierName,
          supplierInvoiceNumber: p.supplierInvoiceNumber,
          payrollPeriodId: p.payrollPeriodId,
          payrollEntryId: p.payrollEntryId,
          memberId: p.memberId,
          memberName: p.memberName,
          socialSecurityType: p.socialSecurityType,
          socialSecurityInstitution: p.socialSecurityInstitution,
          socialSecurityPeriod: p.socialSecurityPeriod,
          taxType: p.taxType,
          taxPeriod: p.taxPeriod,
          taxFormNumber: p.taxFormNumber,
          miscellaneousCategory: p.miscellaneousCategory,
          serviceLine: p.serviceLine,
          isRecurring: p.isRecurring,
          recurrenceFrequency: p.recurrenceFrequency,
          notes: p.notes,
          createdBy: p.actorUserId
        })
      }
    }

    const createdIds = resolvedItems.map(r => r.expenseId)

    return NextResponse.json({ created: true, count: createdIds.length, expenseIds: createdIds }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
