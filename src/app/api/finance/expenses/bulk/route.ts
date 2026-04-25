import { NextResponse } from 'next/server'

import { withTransaction } from '@/lib/db'
import { resolveFinanceDownstreamScope, resolveFinanceMemberContext } from '@/lib/finance/canonical'
import {
  buildExpenseTaxWriteFields,
  serializeExpenseTaxSnapshot
} from '@/lib/finance/expense-tax-snapshot'
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
  normalizeString,
  resolveExchangeRateToClp,
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

      const exchangeRateToClp = await resolveExchangeRateToClp({ currency, requestedRate: item.exchangeRateToClp })

      const taxWriteFields = await buildExpenseTaxWriteFields({
        subtotal,
        exchangeRateToClp,
        taxCode: item.taxCode,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount,
        dteTypeCode: item.dteTypeCode,
        exemptAmount: item.exemptAmount,
        vatUnrecoverableAmount: item.vatUnrecoverableAmount,
        vatCommonUseAmount: item.vatCommonUseAmount,
        vatFixedAssetsAmount: item.vatFixedAssetsAmount,
        spaceId: resolvedScope.spaceId,
        issuedAt: item.documentDate || item.paymentDate || undefined
      })

      const totalAmountClp = toNumber(item.totalAmountClp) || taxWriteFields.totalAmount * exchangeRateToClp

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
          receiptDate: item.receiptDate ? normalizeString(item.receiptDate) : null,
          purchaseType: item.purchaseType ? normalizeString(item.purchaseType) : null,
          vatUnrecoverableAmount: item.vatUnrecoverableAmount != null ? toNumber(item.vatUnrecoverableAmount) : null,
          vatFixedAssetsAmount: item.vatFixedAssetsAmount != null ? toNumber(item.vatFixedAssetsAmount) : null,
          vatCommonUseAmount: item.vatCommonUseAmount != null ? toNumber(item.vatCommonUseAmount) : null,
          dteTypeCode: item.dteTypeCode ? normalizeString(item.dteTypeCode) : null,
          dteFolio: item.dteFolio ? normalizeString(item.dteFolio) : null,
          exemptAmount: item.exemptAmount != null ? toNumber(item.exemptAmount) : null,
          otherTaxesAmount: item.otherTaxesAmount != null ? toNumber(item.otherTaxesAmount) : null,
          withholdingAmount: item.withholdingAmount != null ? toNumber(item.withholdingAmount) : null,
          notes: item.notes ? normalizeString(item.notes) : null,
          actorUserId: tenant.userId || null
        }
      })
    }

    // ── Phase 2: all inserts inside a single transaction (atomic) ──
    // If any item fails, ALL are rolled back — no partial bulk.
    await withTransaction(async (txClient) => {
      for (const { params } of resolvedItems) {
        await createFinanceExpenseInPostgres(params, { client: txClient })
      }
    })

    const createdIds = resolvedItems.map(r => r.expenseId)

    return NextResponse.json({ created: true, count: createdIds.length, expenseIds: createdIds }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
