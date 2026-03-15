import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { syncProviderFromFinanceSupplier } from '@/lib/providers/canonical'
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
  FinanceValidationError,
  SUPPLIER_CATEGORIES,
  PAYMENT_METHODS,
  assertValidTaxIdType,
  type SupplierCategory,
  type PaymentMethod
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface SupplierRow {
  supplier_id: string
  provider_id: string | null
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

const normalizeSupplier = (row: SupplierRow) => ({
  supplierId: normalizeString(row.supplier_id),
  providerId: row.provider_id ? normalizeString(row.provider_id) : null,
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
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const country = searchParams.get('country')
  const international = searchParams.get('international')
  const active = searchParams.get('active')
  const page = Math.max(1, toNumber(searchParams.get('page') || '1'))
  const pageSize = Math.min(200, Math.max(1, toNumber(searchParams.get('pageSize') || '50')))
  const projectId = getFinanceProjectId()

  let filters = ''
  const params: Record<string, unknown> = {}

  if (category) {
    filters += ' AND category = @category'
    params.category = category
  }

  if (country) {
    filters += ' AND country = @country'
    params.country = country
  }

  if (international === 'true') {
    filters += ' AND is_international = TRUE'
  } else if (international === 'false') {
    filters += ' AND is_international = FALSE'
  }

  if (active === 'false') {
    filters += ' AND is_active = FALSE'
  } else {
    filters += ' AND is_active = TRUE'
  }

  const countRows = await runFinanceQuery<{ total: number }>(`
    SELECT COUNT(*) AS total
    FROM \`${projectId}.greenhouse.fin_suppliers\`
    WHERE TRUE ${filters}
  `, params)

  const total = toNumber(countRows[0]?.total)

  const rows = await runFinanceQuery<SupplierRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_suppliers\`
    WHERE TRUE ${filters}
    ORDER BY legal_name ASC
    LIMIT @limit OFFSET @offset
  `, { ...params, limit: pageSize, offset: (page - 1) * pageSize })

  return NextResponse.json({
    items: rows.map(normalizeSupplier),
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
    const legalName = assertNonEmptyString(body.legalName, 'legalName')

    const supplierId = normalizeString(body.supplierId) ||
      legalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const providerId = normalizeString(body.providerId) ||
      normalizeString(body.tradeName) ||
      legalName

    const normalizedProviderId = providerId
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    if (!SUPPLIER_CATEGORIES.includes(body.category)) {
      throw new FinanceValidationError(`Invalid category: ${normalizeString(body.category)}.`)
    }

    const category = body.category as SupplierCategory

    const paymentCurrency = body.paymentCurrency
      ? assertValidCurrency(body.paymentCurrency)
      : 'CLP'

    const defaultPaymentMethod = body.defaultPaymentMethod && PAYMENT_METHODS.includes(body.defaultPaymentMethod)
      ? (body.defaultPaymentMethod as PaymentMethod)
      : 'transfer'

    const projectId = getFinanceProjectId()

    await runFinanceQuery(`
      INSERT INTO \`${projectId}.greenhouse.fin_suppliers\` (
        supplier_id, provider_id, legal_name, trade_name, tax_id, tax_id_type,
        country, category, service_type, is_international,
        primary_contact_name, primary_contact_email, primary_contact_phone, website,
        bank_name, bank_account_number, bank_account_type, bank_routing,
        payment_currency, default_payment_terms, default_payment_method, requires_po,
        is_active, notes, created_by,
        created_at, updated_at
      ) VALUES (
        @supplierId, @providerId, @legalName, @tradeName, @taxId, @taxIdType,
        @country, @category, @serviceType, @isInternational,
        @contactName, @contactEmail, @contactPhone, @website,
        @bankName, @bankAccountNumber, @bankAccountType, @bankRouting,
        @paymentCurrency, @defaultPaymentTerms, @defaultPaymentMethod, @requiresPo,
        TRUE, @notes, @createdBy,
        CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
      )
    `, {
      supplierId,
      providerId: normalizedProviderId || null,
      legalName,
      tradeName: body.tradeName ? normalizeString(body.tradeName) : null,
      taxId: body.taxId ? normalizeString(body.taxId) : null,
      taxIdType: body.taxIdType ? assertValidTaxIdType(body.taxIdType) : 'RUT',
      country: normalizeString(body.country) || 'CL',
      category,
      serviceType: body.serviceType ? normalizeString(body.serviceType) : null,
      isInternational: Boolean(body.isInternational),
      contactName: body.primaryContactName ? normalizeString(body.primaryContactName) : null,
      contactEmail: body.primaryContactEmail ? normalizeString(body.primaryContactEmail) : null,
      contactPhone: body.primaryContactPhone ? normalizeString(body.primaryContactPhone) : null,
      website: body.website ? normalizeString(body.website) : null,
      bankName: body.bankName ? normalizeString(body.bankName) : null,
      bankAccountNumber: body.bankAccountNumber ? normalizeString(body.bankAccountNumber) : null,
      bankAccountType: body.bankAccountType ? normalizeString(body.bankAccountType) : null,
      bankRouting: body.bankRouting ? normalizeString(body.bankRouting) : null,
      paymentCurrency,
      defaultPaymentTerms: toNumber(body.defaultPaymentTerms) || 30,
      defaultPaymentMethod,
      requiresPo: Boolean(body.requiresPo),
      notes: body.notes ? normalizeString(body.notes) : null,
      createdBy: tenant.userId || null
    })

    const syncResult = await syncProviderFromFinanceSupplier({
      supplierId,
      providerId: normalizedProviderId || null,
      legalName,
      tradeName: body.tradeName ? normalizeString(body.tradeName) : null,
      website: body.website ? normalizeString(body.website) : null,
      isActive: true
    })

    return NextResponse.json({
      supplierId,
      providerId: syncResult?.providerId ?? normalizedProviderId ?? null,
      created: true
    }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
