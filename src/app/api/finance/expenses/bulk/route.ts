import { NextResponse } from 'next/server'

import { resolveFinanceClientContext, resolveFinanceMemberContext } from '@/lib/finance/canonical'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
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

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  try {
    const body = await request.json()
    const items = Array.isArray(body.items) ? body.items : []

    if (items.length === 0) {
      throw new FinanceValidationError('items must contain at least one expense.')
    }

    if (items.length > 100) {
      throw new FinanceValidationError('Bulk expense creation supports up to 100 items per request.')
    }

    const projectId = getFinanceProjectId()
    const createdIds: string[] = []

    for (const item of items) {
      const description = assertNonEmptyString(item.description, 'description')
      const currency = assertValidCurrency(item.currency)
      const subtotal = assertPositiveAmount(toNumber(item.subtotal), 'subtotal')

      const resolvedClient = await resolveFinanceClientContext({
        clientId: item.clientId,
        clientProfileId: item.clientProfileId,
        hubspotCompanyId: item.hubspotCompanyId
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

      await runFinanceQuery(`
        INSERT INTO \`${projectId}.greenhouse.fin_expenses\` (
          expense_id, client_id, expense_type, description, currency,
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
          @expenseId, @clientId, @expenseType, @description, @currency,
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
        expenseId,
        clientId: resolvedClient.clientId,
        expenseType,
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
        notes: item.notes ? normalizeString(item.notes) : null,
        createdBy: tenant.userId || null
      })

      createdIds.push(expenseId)
    }

    return NextResponse.json({ created: true, count: createdIds.length, expenseIds: createdIds }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
