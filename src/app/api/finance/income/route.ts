import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveFinanceClientContext } from '@/lib/finance/canonical'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  assertValidCurrency,
  assertDateString,
  assertPositiveAmount,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toDateString,
  toTimestampString,
  FinanceValidationError,
  PAYMENT_STATUSES,
  SERVICE_LINES,
  buildMonthlySequenceId,
  resolveExchangeRateToClp,
  type PaymentStatus,
  type ServiceLine
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface IncomeRow {
  income_id: string
  client_id: string | null
  client_profile_id: string | null
  hubspot_company_id: string | null
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
  service_line: string | null
  income_type: string | null
  description: string | null
  po_number: string | null
  hes_number: string | null
  is_reconciled: boolean
  notes: string | null
  created_by: string | null
  created_at: unknown
  updated_at: unknown
}

const normalizeIncome = (row: IncomeRow) => ({
  incomeId: normalizeString(row.income_id),
  clientId: row.client_id ? normalizeString(row.client_id) : null,
  clientProfileId: row.client_profile_id ? normalizeString(row.client_profile_id) : null,
  hubspotCompanyId: row.hubspot_company_id ? normalizeString(row.hubspot_company_id) : null,
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
  serviceLine: row.service_line ? normalizeString(row.service_line) : null,
  incomeType: row.income_type ? normalizeString(row.income_type) : 'service_fee',
  description: row.description ? normalizeString(row.description) : null,
  poNumber: row.po_number ? normalizeString(row.po_number) : null,
  hesNumber: row.hes_number ? normalizeString(row.hes_number) : null,
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

  await ensureFinanceInfrastructure()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')
  const clientProfileId = searchParams.get('clientProfileId')
  const serviceLine = searchParams.get('serviceLine')
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')
  const page = Math.max(1, toNumber(searchParams.get('page') || '1'))
  const pageSize = Math.min(200, Math.max(1, toNumber(searchParams.get('pageSize') || '50')))
  const projectId = getFinanceProjectId()

  let filters = ''
  const params: Record<string, unknown> = {}

  if (status) {
    filters += ' AND payment_status = @status'
    params.status = status
  }

  if (clientId) {
    filters += ' AND client_id = @clientId'
    params.clientId = clientId
  }

  if (clientProfileId) {
    filters += ' AND (client_profile_id = @clientProfileId OR hubspot_company_id = @clientProfileId)'
    params.clientProfileId = clientProfileId
  }

  if (serviceLine) {
    filters += ' AND service_line = @serviceLine'
    params.serviceLine = serviceLine
  }

  if (fromDate) {
    filters += ' AND invoice_date >= @fromDate'
    params.fromDate = fromDate
  }

  if (toDate) {
    filters += ' AND invoice_date <= @toDate'
    params.toDate = toDate
  }

  const countRows = await runFinanceQuery<{ total: number }>(`
    SELECT COUNT(*) AS total
    FROM \`${projectId}.greenhouse.fin_income\`
    WHERE TRUE ${filters}
  `, params)

  const total = toNumber(countRows[0]?.total)

  const rows = await runFinanceQuery<IncomeRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_income\`
    WHERE TRUE ${filters}
    ORDER BY invoice_date DESC
    LIMIT @limit OFFSET @offset
  `, { ...params, limit: pageSize, offset: (page - 1) * pageSize })

  return NextResponse.json({
    items: rows.map(normalizeIncome),
    total,
    page,
    pageSize
  })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  try {
    const body = await request.json()

    const resolvedClient = await resolveFinanceClientContext({
      clientId: body.clientId,
      clientProfileId: body.clientProfileId,
      hubspotCompanyId: body.hubspotCompanyId
    })

    const clientName = assertNonEmptyString(
      body.clientName ?? resolvedClient.clientName ?? resolvedClient.legalName,
      'clientName'
    )

    const invoiceDate = assertDateString(body.invoiceDate, 'invoiceDate')
    const currency = assertValidCurrency(body.currency)
    const subtotal = assertPositiveAmount(toNumber(body.subtotal), 'subtotal')

    const taxRate = toNumber(body.taxRate ?? 0.19)
    const taxAmount = toNumber(body.taxAmount) || subtotal * taxRate
    const totalAmount = toNumber(body.totalAmount) || subtotal + taxAmount
    const exchangeRateToClp = await resolveExchangeRateToClp({ currency, requestedRate: body.exchangeRateToClp })
    const totalAmountClp = toNumber(body.totalAmountClp) || totalAmount * exchangeRateToClp

    const period = invoiceDate.slice(0, 7).replace('-', '')

    const incomeId = normalizeString(body.incomeId) ||
      await buildMonthlySequenceId({
        tableName: 'fin_income',
        idColumn: 'income_id',
        prefix: 'INC',
        period
      })

    const serviceLine = body.serviceLine && SERVICE_LINES.includes(body.serviceLine)
      ? (body.serviceLine as ServiceLine)
      : null

    const projectId = getFinanceProjectId()

    await runFinanceQuery(`
      INSERT INTO \`${projectId}.greenhouse.fin_income\` (
        income_id, client_id, client_profile_id, hubspot_company_id, hubspot_deal_id,
        client_name, invoice_number, invoice_date, due_date,
        currency, subtotal, tax_rate, tax_amount, total_amount,
        exchange_rate_to_clp, total_amount_clp,
        payment_status, amount_paid,
        po_number, hes_number, service_line, income_type, description,
        is_reconciled, notes, created_by,
        created_at, updated_at
      ) VALUES (
        @incomeId, NULLIF(@clientId, ''), NULLIF(@clientProfileId, ''), NULLIF(@hubspotCompanyId, ''), NULLIF(@hubspotDealId, ''),
        @clientName, NULLIF(@invoiceNumber, ''), @invoiceDate, IF(@dueDate = '', NULL, CAST(@dueDate AS DATE)),
        @currency, @subtotal, @taxRate, @taxAmount, @totalAmount,
        @exchangeRateToClp, @totalAmountClp,
        @paymentStatus, 0,
        NULLIF(@poNumber, ''), NULLIF(@hesNumber, ''), NULLIF(@serviceLine, ''), @incomeType, NULLIF(@description, ''),
        FALSE, NULLIF(@notes, ''), NULLIF(@createdBy, ''),
        CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
      )
    `, {
      incomeId,
      clientId: resolvedClient.clientId,
      clientProfileId: resolvedClient.clientProfileId,
      hubspotCompanyId: resolvedClient.hubspotCompanyId,
      hubspotDealId: body.hubspotDealId ? normalizeString(body.hubspotDealId) : null,
      clientName,
      invoiceNumber: body.invoiceNumber ? normalizeString(body.invoiceNumber) : null,
      invoiceDate,
      dueDate: body.dueDate ? normalizeString(body.dueDate) : null,
      currency,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      exchangeRateToClp,
      totalAmountClp,
      paymentStatus: body.paymentStatus && PAYMENT_STATUSES.includes(body.paymentStatus)
        ? (body.paymentStatus as PaymentStatus) : 'pending',
      poNumber: body.poNumber ? normalizeString(body.poNumber) : null,
      hesNumber: body.hesNumber ? normalizeString(body.hesNumber) : null,
      serviceLine,
      incomeType: normalizeString(body.incomeType) || 'service_fee',
      description: body.description ? normalizeString(body.description) : null,
      notes: body.notes ? normalizeString(body.notes) : null,
      createdBy: tenant.userId || null
    })

    return NextResponse.json({ incomeId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    const detail = error instanceof Error ? error.message : 'Unknown error'

    console.error('POST /api/finance/income failed:', detail, error)

    return NextResponse.json({ error: 'No pudimos registrar el ingreso. Intenta nuevamente o contacta soporte si el problema persiste.' }, { status: 500 })
  }
}
