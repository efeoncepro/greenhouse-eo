import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  assertValidCurrency,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toTimestampString,
  toDateString,
  FinanceValidationError,
  SUPPLIER_CATEGORIES,
  PAYMENT_METHODS,
  type SupplierCategory,
  type PaymentMethod
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface SupplierDetailRow {
  supplier_id: string
  legal_name: string
  trade_name: string | null
  tax_id: string | null
  tax_id_type: string | null
  country: string
  category: string
  service_type: string | null
  is_international: boolean
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  website: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_type: string | null
  bank_routing: string | null
  payment_currency: string
  default_payment_terms: unknown
  default_payment_method: string | null
  requires_po: boolean
  is_active: boolean
  notes: string | null
  created_by: string | null
  created_at: unknown
  updated_at: unknown
}

interface ExpenseHistoryRow {
  expense_id: string
  total_amount: unknown
  currency: string
  payment_date: unknown
  payment_method: string | null
  document_number: string | null
  description: string
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const { id: supplierId } = await params
  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<SupplierDetailRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_suppliers\`
    WHERE supplier_id = @supplierId
  `, { supplierId })

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  }

  const row = rows[0]

  const expenses = await runFinanceQuery<ExpenseHistoryRow>(`
    SELECT expense_id, total_amount, currency, payment_date, payment_method, document_number, description
    FROM \`${projectId}.greenhouse.fin_expenses\`
    WHERE supplier_id = @supplierId
    ORDER BY payment_date DESC
    LIMIT 20
  `, { supplierId })

  return NextResponse.json({
    supplierId: normalizeString(row.supplier_id),
    legalName: normalizeString(row.legal_name),
    tradeName: row.trade_name ? normalizeString(row.trade_name) : null,
    taxId: row.tax_id ? normalizeString(row.tax_id) : null,
    taxIdType: row.tax_id_type ? normalizeString(row.tax_id_type) : 'RUT',
    country: normalizeString(row.country),
    category: normalizeString(row.category),
    serviceType: row.service_type ? normalizeString(row.service_type) : null,
    isInternational: normalizeBoolean(row.is_international),
    primaryContactName: row.primary_contact_name ? normalizeString(row.primary_contact_name) : null,
    primaryContactEmail: row.primary_contact_email ? normalizeString(row.primary_contact_email) : null,
    primaryContactPhone: row.primary_contact_phone ? normalizeString(row.primary_contact_phone) : null,
    website: row.website ? normalizeString(row.website) : null,
    bankName: row.bank_name ? normalizeString(row.bank_name) : null,
    bankAccountNumber: row.bank_account_number ? normalizeString(row.bank_account_number) : null,
    bankAccountType: row.bank_account_type ? normalizeString(row.bank_account_type) : null,
    bankRouting: row.bank_routing ? normalizeString(row.bank_routing) : null,
    paymentCurrency: normalizeString(row.payment_currency),
    defaultPaymentTerms: toNumber(row.default_payment_terms),
    defaultPaymentMethod: row.default_payment_method ? normalizeString(row.default_payment_method) : 'transfer',
    requiresPo: normalizeBoolean(row.requires_po),
    isActive: normalizeBoolean(row.is_active),
    notes: row.notes ? normalizeString(row.notes) : null,
    createdBy: row.created_by ? normalizeString(row.created_by) : null,
    createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
    updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null),
    paymentHistory: expenses.map(e => ({
      expenseId: normalizeString(e.expense_id),
      amount: toNumber(e.total_amount),
      currency: normalizeString(e.currency),
      paymentDate: toDateString(e.payment_date as string | { value?: string } | null),
      paymentMethod: e.payment_method ? normalizeString(e.payment_method) : null,
      documentNumber: e.document_number ? normalizeString(e.document_number) : null,
      description: normalizeString(e.description)
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
    const { id: supplierId } = await params
    const body = await request.json()
    const projectId = getFinanceProjectId()

    const existing = await runFinanceQuery<{ supplier_id: string }>(`
      SELECT supplier_id
      FROM \`${projectId}.greenhouse.fin_suppliers\`
      WHERE supplier_id = @supplierId
    `, { supplierId })

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const updates: string[] = []
    const updateParams: Record<string, unknown> = { supplierId }

    const stringFields: [string, string][] = [
      ['legalName', 'legal_name'], ['tradeName', 'trade_name'], ['taxId', 'tax_id'],
      ['taxIdType', 'tax_id_type'], ['country', 'country'], ['serviceType', 'service_type'],
      ['primaryContactName', 'primary_contact_name'], ['primaryContactEmail', 'primary_contact_email'],
      ['primaryContactPhone', 'primary_contact_phone'], ['website', 'website'],
      ['bankName', 'bank_name'], ['bankAccountNumber', 'bank_account_number'],
      ['bankAccountType', 'bank_account_type'], ['bankRouting', 'bank_routing'],
      ['notes', 'notes']
    ]

    for (const [bodyKey, dbCol] of stringFields) {
      if (body[bodyKey] !== undefined) {
        if (bodyKey === 'legalName') {
          updateParams[bodyKey] = assertNonEmptyString(body[bodyKey], bodyKey)
        } else {
          updateParams[bodyKey] = body[bodyKey] ? normalizeString(body[bodyKey]) : null
        }

        updates.push(`${dbCol} = @${bodyKey}`)
      }
    }

    if (body.category !== undefined) {
      updates.push('category = @category')
      updateParams.category = SUPPLIER_CATEGORIES.includes(body.category)
        ? (body.category as SupplierCategory)
        : 'other'
    }

    if (body.paymentCurrency !== undefined) {
      updates.push('payment_currency = @paymentCurrency')
      updateParams.paymentCurrency = assertValidCurrency(body.paymentCurrency)
    }

    if (body.defaultPaymentTerms !== undefined) {
      updates.push('default_payment_terms = @defaultPaymentTerms')
      updateParams.defaultPaymentTerms = toNumber(body.defaultPaymentTerms) || 30
    }

    if (body.defaultPaymentMethod !== undefined) {
      updates.push('default_payment_method = @defaultPaymentMethod')
      updateParams.defaultPaymentMethod = PAYMENT_METHODS.includes(body.defaultPaymentMethod)
        ? (body.defaultPaymentMethod as PaymentMethod)
        : 'transfer'
    }

    if (body.isInternational !== undefined) {
      updates.push('is_international = @isInternational')
      updateParams.isInternational = Boolean(body.isInternational)
    }

    if (body.requiresPo !== undefined) {
      updates.push('requires_po = @requiresPo')
      updateParams.requiresPo = Boolean(body.requiresPo)
    }

    if (body.isActive !== undefined) {
      updates.push('is_active = @isActive')
      updateParams.isActive = Boolean(body.isActive)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP()')

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_suppliers\`
      SET ${updates.join(', ')}
      WHERE supplier_id = @supplierId
    `, updateParams)

    return NextResponse.json({ supplierId, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
