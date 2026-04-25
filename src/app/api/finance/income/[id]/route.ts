import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveFinanceClientContext } from '@/lib/finance/canonical'
import { assertFinanceBigQueryReadiness, ensureFinanceInfrastructure } from '@/lib/finance/schema'
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
  roundCurrency,
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
import {
  buildIncomeTaxWriteFields,
  parsePersistedIncomeTaxSnapshot,
  serializeIncomeTaxSnapshot
} from '@/lib/finance/income-tax-snapshot'

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
  tax_code?: string | null
  tax_rate_snapshot?: unknown
  tax_amount_snapshot?: unknown
  tax_snapshot_json?: unknown | null
  is_tax_exempt?: boolean
  tax_snapshot_frozen_at?: unknown
  total_amount: unknown
  exchange_rate_to_clp: unknown
  total_amount_clp: unknown
  payment_status: string
  collection_method: string | null
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
  taxCode: row.tax_code ? normalizeString(row.tax_code) : null,
  taxRateSnapshot: row.tax_rate_snapshot != null ? toNumber(row.tax_rate_snapshot) : null,
  taxAmountSnapshot: row.tax_amount_snapshot != null ? toNumber(row.tax_amount_snapshot) : null,
  taxSnapshot: parsePersistedIncomeTaxSnapshot(row.tax_snapshot_json),
  isTaxExempt: Boolean(row.is_tax_exempt),
  taxSnapshotFrozenAt: toTimestampString(row.tax_snapshot_frozen_at as string | { value?: string } | null),
  totalAmount: toNumber(row.total_amount),
  exchangeRateToClp: toNumber(row.exchange_rate_to_clp),
  totalAmountClp: toNumber(row.total_amount_clp),
  paymentStatus: normalizeString(row.payment_status),
  collectionMethod: row.collection_method ? normalizeString(row.collection_method) : null,
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
  await assertFinanceBigQueryReadiness({ tables: ['fin_income'] })
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
    let existingIncome: Awaited<ReturnType<typeof getFinanceIncomeFromPostgres>> | ReturnType<typeof normalizeIncomeDetail> | null =
      null
    let shouldSkipPostgresWrite = false

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
      ['exchangeRateToClp', 'exchangeRateToClp'],
      ['totalAmountClp', 'totalAmountClp'],
      ['amountPaid', 'amountPaid']
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

    const taxRelevantKeys = ['subtotal', 'taxCode', 'taxRate', 'taxAmount', 'totalAmount', 'invoiceDate']

    const shouldRecomputeTax = taxRelevantKeys.some(key => body[key] !== undefined)

    if (shouldRecomputeTax) {
      try {
        existingIncome = await getFinanceIncomeFromPostgres(incomeId)
      } catch (error) {
        if (!shouldFallbackFromFinancePostgres(error)) {
          throw error
        }

        shouldSkipPostgresWrite = true
      }

      if (!existingIncome) {
        await ensureFinanceInfrastructure()
        const projectId = getFinanceProjectId()

        const rows = await runFinanceQuery<IncomeDetailRow>(`
          SELECT *
          FROM \`${projectId}.greenhouse.fin_income\`
          WHERE income_id = @incomeId
        `, { incomeId })

        if (!Array.isArray(rows) || rows.length === 0) {
          return NextResponse.json({ error: 'Income record not found' }, { status: 404 })
        }

        existingIncome = normalizeIncomeDetail(rows[0])
      }

      const subtotal =
        body.subtotal !== undefined
          ? toNumber(body.subtotal)
          : existingIncome.subtotal

      const taxWriteFields = await buildIncomeTaxWriteFields({
        subtotal,
        taxCode: body.taxCode ?? existingIncome.taxCode,
        taxRate: body.taxRate !== undefined ? toNumber(body.taxRate) : existingIncome.taxRate,
        taxAmount: body.taxAmount !== undefined ? toNumber(body.taxAmount) : existingIncome.taxAmount,
        totalAmount: body.totalAmount !== undefined ? toNumber(body.totalAmount) : existingIncome.totalAmount,
        sourceSnapshot:
          body.taxCode === undefined
          && body.taxRate === undefined
          && body.taxAmount === undefined
          && body.totalAmount === undefined
            ? existingIncome.taxSnapshot
            : null,
        issuedAt: existingIncome.taxSnapshotFrozenAt ?? existingIncome.invoiceDate ?? undefined
      })

      pgUpdates.subtotal = subtotal
      pgUpdates.taxRate = taxWriteFields.taxRate
      pgUpdates.taxAmount = taxWriteFields.taxAmount
      pgUpdates.taxCode = taxWriteFields.taxCode
      pgUpdates.taxRateSnapshot = taxWriteFields.taxRateSnapshot
      pgUpdates.taxAmountSnapshot = taxWriteFields.taxAmountSnapshot
      pgUpdates.taxSnapshotJson = serializeIncomeTaxSnapshot(taxWriteFields.taxSnapshot)
      pgUpdates.isTaxExempt = taxWriteFields.isTaxExempt
      pgUpdates.taxSnapshotFrozenAt = taxWriteFields.taxSnapshotFrozenAt
      pgUpdates.totalAmount = taxWriteFields.totalAmount

      const exchangeRateToClp =
        pgUpdates.exchangeRateToClp !== undefined
          ? toNumber(pgUpdates.exchangeRateToClp)
          : existingIncome.exchangeRateToClp

      if (body.totalAmountClp === undefined && Number.isFinite(exchangeRateToClp)) {
        pgUpdates.totalAmountClp = roundCurrency(taxWriteFields.totalAmount * exchangeRateToClp)
      }
    }

    if (Object.keys(pgUpdates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // ── Postgres-first path ──
    if (!shouldSkipPostgresWrite) {
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
    } else if (!isFinanceBigQueryWriteEnabled()) {
      return NextResponse.json(
        {
          error: 'Finance BigQuery fallback write is disabled. Postgres write path failed.',
          code: 'FINANCE_BQ_WRITE_DISABLED'
        },
        { status: 503 }
      )
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
        taxAmount: 'tax_amount', taxCode: 'tax_code', taxRateSnapshot: 'tax_rate_snapshot',
        taxAmountSnapshot: 'tax_amount_snapshot', taxSnapshotJson: 'tax_snapshot_json', isTaxExempt: 'is_tax_exempt',
        taxSnapshotFrozenAt: 'tax_snapshot_frozen_at', totalAmount: 'total_amount', exchangeRateToClp: 'exchange_rate_to_clp',
        totalAmountClp: 'total_amount_clp', paymentStatus: 'payment_status', amountPaid: 'amount_paid',
        poNumber: 'po_number', hesNumber: 'hes_number', serviceLine: 'service_line', incomeType: 'income_type',
        notes: 'notes'
      }

      const col = colMap[key]

      if (col) {
        if (col === 'tax_snapshot_json') {
          bqUpdates.push(`${col} = PARSE_JSON(@${key})`)
        } else if (col === 'tax_snapshot_frozen_at') {
          bqUpdates.push(`${col} = TIMESTAMP(@${key})`)
        } else if (col === 'invoice_date' || col === 'due_date') {
          bqUpdates.push(`${col} = CAST(@${key} AS DATE)`)
        } else {
          bqUpdates.push(`${col} = @${key}`)
        }

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
