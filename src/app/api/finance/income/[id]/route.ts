import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveFinanceClientContext } from '@/lib/finance/canonical'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  assertValidCurrency,
  normalizeString,
  toDateString,
  toNumber,
  toTimestampString,
  FinanceValidationError,
  PAYMENT_STATUSES,
  SERVICE_LINES,
  type PaymentStatus,
  type ServiceLine
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface IncomeDetailRow {
  income_id: string
  client_id: string | null
  client_profile_id: string | null
  hubspot_company_id: string | null
  hubspot_deal_id: string | null
  client_name: string
  invoice_number: string | null
  invoice_date: unknown
  due_date: unknown
  currency: string
  subtotal: unknown
  tax_rate: unknown
  tax_amount: unknown
  total_amount: unknown
  exchange_rate_to_clp: unknown
  total_amount_clp: unknown
  payment_status: string
  amount_paid: unknown
  payments_received: unknown
  po_number: string | null
  hes_number: string | null
  service_line: string | null
  income_type: string | null
  description: string | null
  is_reconciled: boolean
  reconciliation_id: string | null
  notes: string | null
  created_by: string | null
  created_at: unknown
  updated_at: unknown
}

const parsePaymentsReceived = (value: unknown) => {
  try {
    if (!value) {
      return []
    }

    const parsed = typeof value === 'string' ? JSON.parse(value) : value

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const normalizeIncomeDetail = (row: IncomeDetailRow) => ({
  incomeId: normalizeString(row.income_id),
  clientId: row.client_id ? normalizeString(row.client_id) : null,
  clientProfileId: row.client_profile_id ? normalizeString(row.client_profile_id) : null,
  hubspotCompanyId: row.hubspot_company_id ? normalizeString(row.hubspot_company_id) : null,
  hubspotDealId: row.hubspot_deal_id ? normalizeString(row.hubspot_deal_id) : null,
  clientName: normalizeString(row.client_name),
  invoiceNumber: row.invoice_number ? normalizeString(row.invoice_number) : null,
  invoiceDate: toDateString(row.invoice_date as string | { value?: string } | null),
  dueDate: toDateString(row.due_date as string | { value?: string } | null),
  currency: normalizeString(row.currency),
  subtotal: toNumber(row.subtotal),
  taxRate: toNumber(row.tax_rate),
  taxAmount: toNumber(row.tax_amount),
  totalAmount: toNumber(row.total_amount),
  exchangeRateToClp: toNumber(row.exchange_rate_to_clp),
  totalAmountClp: toNumber(row.total_amount_clp),
  paymentStatus: normalizeString(row.payment_status),
  amountPaid: toNumber(row.amount_paid),
  amountPending: toNumber(row.total_amount) - toNumber(row.amount_paid),
  paymentsReceived: parsePaymentsReceived(row.payments_received),
  poNumber: row.po_number ? normalizeString(row.po_number) : null,
  hesNumber: row.hes_number ? normalizeString(row.hes_number) : null,
  serviceLine: row.service_line ? normalizeString(row.service_line) : null,
  incomeType: row.income_type ? normalizeString(row.income_type) : null,
  description: row.description ? normalizeString(row.description) : null,
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

  const { id: incomeId } = await params
  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<IncomeDetailRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_income\`
    WHERE income_id = @incomeId
  `, { incomeId })

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Income record not found' }, { status: 404 })
  }

  return NextResponse.json(normalizeIncomeDetail(rows[0]))
}

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

    const existing = await runFinanceQuery<{
      income_id: string
      client_id: string | null
      client_profile_id: string | null
      hubspot_company_id: string | null
      client_name: string
    }>(`
      SELECT income_id, client_id, client_profile_id, hubspot_company_id, client_name
      FROM \`${projectId}.greenhouse.fin_income\`
      WHERE income_id = @incomeId
    `, { incomeId })

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Income record not found' }, { status: 404 })
    }

    const updates: string[] = []
    const updateParams: Record<string, unknown> = { incomeId }
    const existingIncome = existing[0]

    if (
      body.clientId !== undefined
      || body.clientProfileId !== undefined
      || body.hubspotCompanyId !== undefined
      || body.clientName !== undefined
    ) {
      const resolvedClient = await resolveFinanceClientContext({
        clientId: body.clientId ?? existingIncome.client_id,
        clientProfileId: body.clientProfileId ?? existingIncome.client_profile_id,
        hubspotCompanyId: body.hubspotCompanyId ?? existingIncome.hubspot_company_id
      })

      updates.push('client_id = @clientId')
      updateParams.clientId = resolvedClient.clientId

      updates.push('client_profile_id = @clientProfileId')
      updateParams.clientProfileId = resolvedClient.clientProfileId

      updates.push('hubspot_company_id = @hubspotCompanyId')
      updateParams.hubspotCompanyId = resolvedClient.hubspotCompanyId

      updates.push('client_name = @clientName')
      updateParams.clientName = assertNonEmptyString(
        body.clientName ?? resolvedClient.clientName ?? resolvedClient.legalName ?? existingIncome.client_name,
        'clientName'
      )
    }

    if (body.clientName !== undefined && !updates.includes('client_name = @clientName')) {
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
