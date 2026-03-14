import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  assertValidCurrency,
  normalizeString,
  toNumber,
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

    const existing = await runFinanceQuery<{ expense_id: string }>(`
      SELECT expense_id
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE expense_id = @expenseId
    `, { expenseId })

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 })
    }

    const updates: string[] = []
    const updateParams: Record<string, unknown> = { expenseId }

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
