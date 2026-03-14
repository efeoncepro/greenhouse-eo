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
  PAYMENT_STATUSES,
  SERVICE_LINES,
  type PaymentStatus,
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
    const { id: incomeId } = await params
    const body = await request.json()
    const projectId = getFinanceProjectId()

    const existing = await runFinanceQuery<{ income_id: string }>(`
      SELECT income_id
      FROM \`${projectId}.greenhouse.fin_income\`
      WHERE income_id = @incomeId
    `, { incomeId })

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Income record not found' }, { status: 404 })
    }

    const updates: string[] = []
    const updateParams: Record<string, unknown> = { incomeId }

    if (body.clientName !== undefined) {
      updates.push('client_name = @clientName')
      updateParams.clientName = assertNonEmptyString(body.clientName, 'clientName')
    }

    if (body.invoiceNumber !== undefined) {
      updates.push('invoice_number = @invoiceNumber')
      updateParams.invoiceNumber = body.invoiceNumber ? normalizeString(body.invoiceNumber) : null
    }

    if (body.invoiceDate !== undefined) {
      updates.push('invoice_date = @invoiceDate')
      updateParams.invoiceDate = normalizeString(body.invoiceDate)
    }

    if (body.dueDate !== undefined) {
      updates.push('due_date = @dueDate')
      updateParams.dueDate = body.dueDate ? normalizeString(body.dueDate) : null
    }

    if (body.currency !== undefined) {
      updates.push('currency = @currency')
      updateParams.currency = assertValidCurrency(body.currency)
    }

    if (body.subtotal !== undefined) {
      updates.push('subtotal = @subtotal')
      updateParams.subtotal = toNumber(body.subtotal)
    }

    if (body.taxRate !== undefined) {
      updates.push('tax_rate = @taxRate')
      updateParams.taxRate = toNumber(body.taxRate)
    }

    if (body.taxAmount !== undefined) {
      updates.push('tax_amount = @taxAmount')
      updateParams.taxAmount = toNumber(body.taxAmount)
    }

    if (body.totalAmount !== undefined) {
      updates.push('total_amount = @totalAmount')
      updateParams.totalAmount = toNumber(body.totalAmount)
    }

    if (body.exchangeRateToClp !== undefined) {
      updates.push('exchange_rate_to_clp = @exchangeRateToClp')
      updateParams.exchangeRateToClp = toNumber(body.exchangeRateToClp)
    }

    if (body.totalAmountClp !== undefined) {
      updates.push('total_amount_clp = @totalAmountClp')
      updateParams.totalAmountClp = toNumber(body.totalAmountClp)
    }

    if (body.paymentStatus !== undefined) {
      updates.push('payment_status = @paymentStatus')
      updateParams.paymentStatus = PAYMENT_STATUSES.includes(body.paymentStatus)
        ? (body.paymentStatus as PaymentStatus) : 'pending'
    }

    if (body.amountPaid !== undefined) {
      updates.push('amount_paid = @amountPaid')
      updateParams.amountPaid = toNumber(body.amountPaid)
    }

    if (body.poNumber !== undefined) {
      updates.push('po_number = @poNumber')
      updateParams.poNumber = body.poNumber ? normalizeString(body.poNumber) : null
    }

    if (body.hesNumber !== undefined) {
      updates.push('hes_number = @hesNumber')
      updateParams.hesNumber = body.hesNumber ? normalizeString(body.hesNumber) : null
    }

    if (body.serviceLine !== undefined) {
      updates.push('service_line = @serviceLine')
      updateParams.serviceLine = body.serviceLine && SERVICE_LINES.includes(body.serviceLine)
        ? (body.serviceLine as ServiceLine) : null
    }

    if (body.description !== undefined) {
      updates.push('description = @description')
      updateParams.description = body.description ? normalizeString(body.description) : null
    }

    if (body.notes !== undefined) {
      updates.push('notes = @notes')
      updateParams.notes = body.notes ? normalizeString(body.notes) : null
    }

    const stringFields: [string, string][] = [
      ['clientProfileId', 'client_profile_id'],
      ['hubspotCompanyId', 'hubspot_company_id'],
      ['hubspotDealId', 'hubspot_deal_id'],
      ['incomeType', 'income_type']
    ]

    for (const [bodyKey, dbCol] of stringFields) {
      if (body[bodyKey] !== undefined) {
        updates.push(`${dbCol} = @${bodyKey}`)
        updateParams[bodyKey] = body[bodyKey] ? normalizeString(body[bodyKey]) : null
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP()')

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_income\`
      SET ${updates.join(', ')}
      WHERE income_id = @incomeId
    `, updateParams)

    return NextResponse.json({ incomeId, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
