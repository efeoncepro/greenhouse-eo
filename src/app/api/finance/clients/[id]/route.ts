import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toTimestampString,
  toDateString,
  FinanceValidationError
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface ClientProfileRow {
  client_profile_id: string
  hubspot_company_id: string
  tax_id: string | null
  tax_id_type: string | null
  legal_name: string | null
  billing_address: string | null
  billing_country: string | null
  payment_terms_days: unknown
  payment_currency: string
  requires_po: boolean
  requires_hes: boolean
  current_po_number: string | null
  current_hes_number: string | null
  finance_contacts: unknown
  special_conditions: string | null
  created_by: string | null
  created_at: unknown
  updated_at: unknown
}

interface InvoiceRow {
  income_id: string
  invoice_number: string | null
  invoice_date: unknown
  due_date: unknown
  total_amount: unknown
  currency: string
  payment_status: string
  amount_paid: unknown
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const { id: clientProfileId } = await params
  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<ClientProfileRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_client_profiles\`
    WHERE client_profile_id = @clientProfileId
  `, { clientProfileId })

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
  }

  const row = rows[0]

  // Parse finance_contacts JSON
  let financeContacts: unknown[] = []

  try {
    if (row.finance_contacts) {
      const parsed = typeof row.finance_contacts === 'string'
        ? JSON.parse(row.finance_contacts)
        : row.finance_contacts

      if (Array.isArray(parsed)) {
        financeContacts = parsed
      }
    }
  } catch {
    financeContacts = []
  }

  // Fetch invoices for this client
  const invoices = await runFinanceQuery<InvoiceRow>(`
    SELECT income_id, invoice_number, invoice_date, due_date, total_amount, currency, payment_status, amount_paid
    FROM \`${projectId}.greenhouse.fin_income\`
    WHERE client_profile_id = @clientProfileId OR hubspot_company_id = @hubspotCompanyId
    ORDER BY invoice_date DESC
    LIMIT 50
  `, { clientProfileId, hubspotCompanyId: normalizeString(row.hubspot_company_id) })

  return NextResponse.json({
    financialProfile: {
      clientProfileId: normalizeString(row.client_profile_id),
      hubspotCompanyId: normalizeString(row.hubspot_company_id),
      taxId: row.tax_id ? normalizeString(row.tax_id) : null,
      taxIdType: row.tax_id_type ? normalizeString(row.tax_id_type) : 'RUT',
      legalName: row.legal_name ? normalizeString(row.legal_name) : null,
      billingAddress: row.billing_address ? normalizeString(row.billing_address) : null,
      billingCountry: row.billing_country ? normalizeString(row.billing_country) : 'CL',
      paymentTermsDays: toNumber(row.payment_terms_days),
      paymentCurrency: normalizeString(row.payment_currency),
      requiresPo: normalizeBoolean(row.requires_po),
      requiresHes: normalizeBoolean(row.requires_hes),
      currentPoNumber: row.current_po_number ? normalizeString(row.current_po_number) : null,
      currentHesNumber: row.current_hes_number ? normalizeString(row.current_hes_number) : null,
      financeContacts,
      specialConditions: row.special_conditions ? normalizeString(row.special_conditions) : null,
      createdBy: row.created_by ? normalizeString(row.created_by) : null,
      createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
      updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
    },
    invoices: invoices.map(inv => ({
      incomeId: normalizeString(inv.income_id),
      invoiceNumber: inv.invoice_number ? normalizeString(inv.invoice_number) : null,
      invoiceDate: toDateString(inv.invoice_date as string | { value?: string } | null),
      dueDate: toDateString(inv.due_date as string | { value?: string } | null),
      totalAmount: toNumber(inv.total_amount),
      currency: normalizeString(inv.currency),
      paymentStatus: normalizeString(inv.payment_status),
      amountPaid: toNumber(inv.amount_paid),
      amountPending: toNumber(inv.total_amount) - toNumber(inv.amount_paid)
    }))
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  try {
    const { id: clientProfileId } = await params
    const body = await request.json()
    const projectId = getFinanceProjectId()

    const existing = await runFinanceQuery<{ client_profile_id: string }>(`
      SELECT client_profile_id
      FROM \`${projectId}.greenhouse.fin_client_profiles\`
      WHERE client_profile_id = @clientProfileId
    `, { clientProfileId })

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    const updates: string[] = []
    const updateParams: Record<string, unknown> = { clientProfileId }

    const stringFields: [string, string][] = [
      ['legalName', 'legal_name'], ['taxId', 'tax_id'], ['taxIdType', 'tax_id_type'],
      ['billingAddress', 'billing_address'], ['billingCountry', 'billing_country'],
      ['paymentCurrency', 'payment_currency'], ['currentPoNumber', 'current_po_number'],
      ['currentHesNumber', 'current_hes_number'], ['specialConditions', 'special_conditions']
    ]

    for (const [bodyKey, dbCol] of stringFields) {
      if (body[bodyKey] !== undefined) {
        updateParams[bodyKey] = body[bodyKey] ? normalizeString(body[bodyKey]) : null
        updates.push(`${dbCol} = @${bodyKey}`)
      }
    }

    if (body.paymentTermsDays !== undefined) {
      updates.push('payment_terms_days = @paymentTermsDays')
      updateParams.paymentTermsDays = toNumber(body.paymentTermsDays) || 30
    }

    if (body.requiresPo !== undefined) {
      updates.push('requires_po = @requiresPo')
      updateParams.requiresPo = Boolean(body.requiresPo)
    }

    if (body.requiresHes !== undefined) {
      updates.push('requires_hes = @requiresHes')
      updateParams.requiresHes = Boolean(body.requiresHes)
    }

    if (body.financeContacts !== undefined) {
      updates.push('finance_contacts = @financeContacts')
      updateParams.financeContacts = JSON.stringify(Array.isArray(body.financeContacts) ? body.financeContacts : [])
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP()')

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_client_profiles\`
      SET ${updates.join(', ')}
      WHERE client_profile_id = @clientProfileId
    `, updateParams)

    return NextResponse.json({ clientProfileId, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
