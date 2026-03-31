import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveFinanceClientContext } from '@/lib/finance/canonical'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  getFinanceIncomeFromPostgres,
  updateFinanceIncomeInPostgres
} from '@/lib/finance/postgres-store-slice2'
import { shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
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
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'

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

  const { id: incomeId } = await params

  // ── Postgres-first path ──
  try {
    const income = await getFinanceIncomeFromPostgres(incomeId)

    if (!income) {
      return NextResponse.json({ error: 'Income record not found' }, { status: 404 })
    }

    return NextResponse.json(income)
  } catch (error) {
    if (!shouldFallbackFromFinancePostgres(error)) {
      throw error
    }
  }

  // ── BigQuery fallback ──
  await ensureFinanceInfrastructure()
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

  try {
    const { id: incomeId } = await params
    const body = await request.json()

    // ── Build validated update payload ──

    const pgUpdates: Record<string, unknown> = {}

    // Client context resolution
    if (
      body.clientId !== undefined
      || body.clientProfileId !== undefined
      || body.hubspotCompanyId !== undefined
      || body.clientName !== undefined
    ) {
      const resolvedClient = await resolveFinanceClientContext({
        clientId: body.clientId,
        clientProfileId: body.clientProfileId,
        hubspotCompanyId: body.hubspotCompanyId
      })

      pgUpdates.clientId = resolvedClient.clientId
      pgUpdates.clientProfileId = resolvedClient.clientProfileId
      pgUpdates.hubspotCompanyId = resolvedClient.hubspotCompanyId
      pgUpdates.clientName = assertNonEmptyString(
        body.clientName ?? resolvedClient.clientName ?? resolvedClient.legalName ?? '',
        'clientName'
      )

      if (resolvedClient.organizationId) {
        pgUpdates.organizationId = resolvedClient.organizationId
      }
    }

    if (body.clientName !== undefined && pgUpdates.clientName === undefined) {
      pgUpdates.clientName = assertNonEmptyString(body.clientName, 'clientName')
    }

    if (body.invoiceNumber !== undefined) pgUpdates.invoiceNumber = body.invoiceNumber ? normalizeString(body.invoiceNumber) : null
    if (body.invoiceDate !== undefined) pgUpdates.invoiceDate = body.invoiceDate ? normalizeString(body.invoiceDate) : null
    if (body.dueDate !== undefined) pgUpdates.dueDate = body.dueDate ? normalizeString(body.dueDate) : null

    if (body.currency !== undefined) pgUpdates.currency = assertValidCurrency(body.currency)

    const numericFields: [string, string][] = [
      ['subtotal', 'subtotal'], ['taxRate', 'taxRate'], ['taxAmount', 'taxAmount'],
      ['totalAmount', 'totalAmount'], ['exchangeRateToClp', 'exchangeRateToClp'],
      ['totalAmountClp', 'totalAmountClp'], ['amountPaid', 'amountPaid']
    ]

    for (const [bodyKey, pgKey] of numericFields) {
      if (body[bodyKey] !== undefined) pgUpdates[pgKey] = toNumber(body[bodyKey])
    }

    if (body.paymentStatus !== undefined) {
      pgUpdates.paymentStatus = PAYMENT_STATUSES.includes(body.paymentStatus)
        ? (body.paymentStatus as PaymentStatus) : 'pending'
    }

    if (body.poNumber !== undefined) pgUpdates.poNumber = body.poNumber ? normalizeString(body.poNumber) : null
    if (body.hesNumber !== undefined) pgUpdates.hesNumber = body.hesNumber ? normalizeString(body.hesNumber) : null

    if (body.serviceLine !== undefined) {
      pgUpdates.serviceLine = body.serviceLine && SERVICE_LINES.includes(body.serviceLine)
        ? (body.serviceLine as ServiceLine) : null
    }

    if (body.description !== undefined) pgUpdates.description = body.description ? normalizeString(body.description) : null
    if (body.notes !== undefined) pgUpdates.notes = body.notes ? normalizeString(body.notes) : null
    if (body.hubspotDealId !== undefined) pgUpdates.hubspotDealId = body.hubspotDealId ? normalizeString(body.hubspotDealId) : null
    if (body.incomeType !== undefined) pgUpdates.incomeType = body.incomeType ? normalizeString(body.incomeType) : null

    if (Object.keys(pgUpdates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // ── Postgres-first path ──
    try {
      const result = await updateFinanceIncomeInPostgres(incomeId, pgUpdates)

      if (!result) {
        return NextResponse.json({ error: 'Income record not found' }, { status: 404 })
      }

      return NextResponse.json({ incomeId, updated: true })
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

    const existing = await runFinanceQuery<{ income_id: string }>(`
      SELECT income_id
      FROM \`${projectId}.greenhouse.fin_income\`
      WHERE income_id = @incomeId
    `, { incomeId })

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Income record not found' }, { status: 404 })
    }

    const bqUpdates: string[] = []
    const bqParams: Record<string, unknown> = { incomeId }

    for (const [key, value] of Object.entries(pgUpdates)) {
      const colMap: Record<string, string> = {
        clientId: 'client_id', organizationId: 'organization_id', clientProfileId: 'client_profile_id',
        hubspotCompanyId: 'hubspot_company_id', hubspotDealId: 'hubspot_deal_id', clientName: 'client_name',
        invoiceNumber: 'invoice_number', invoiceDate: 'invoice_date', dueDate: 'due_date',
        description: 'description', currency: 'currency', subtotal: 'subtotal', taxRate: 'tax_rate',
        taxAmount: 'tax_amount', totalAmount: 'total_amount', exchangeRateToClp: 'exchange_rate_to_clp',
        totalAmountClp: 'total_amount_clp', paymentStatus: 'payment_status', amountPaid: 'amount_paid',
        poNumber: 'po_number', hesNumber: 'hes_number', serviceLine: 'service_line', incomeType: 'income_type',
        notes: 'notes'
      }

      const col = colMap[key]

      if (col) {
        bqUpdates.push(`${col} = @${key}`)
        bqParams[key] = value
      }
    }

    bqUpdates.push('updated_at = CURRENT_TIMESTAMP()')

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_income\`
      SET ${bqUpdates.join(', ')}
      WHERE income_id = @incomeId
    `, bqParams)

    return NextResponse.json({ incomeId, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
