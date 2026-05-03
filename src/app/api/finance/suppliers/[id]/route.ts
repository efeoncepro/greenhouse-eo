import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { syncProviderFromFinanceSupplier } from '@/lib/providers/canonical'
import { captureWithDomain } from '@/lib/observability/capture'
import { resolveCanonicalProviderId } from '@/lib/providers/postgres'
import { getLatestProviderToolingSnapshot } from '@/lib/providers/provider-tooling-snapshots'
import { listPreferredToolProviderCostBasisByProvider } from '@/lib/commercial-cost-basis/tool-provider-cost-basis-reader'
import { assertFinanceBigQueryReadiness, ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { ensureOrganizationForSupplier } from '@/lib/account-360/organization-identity'
import { ensureOrganizationContactMembership, getOrganizationMemberships } from '@/lib/account-360/organization-store'
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
import {
  getFinanceSupplierFromPostgres,
  seedFinanceSupplierInPostgres,
  shouldFallbackFromFinancePostgres
} from '@/lib/finance/postgres-store'
import { listFinanceExpensesFromPostgres } from '@/lib/finance/postgres-store-slice2'
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'

export const dynamic = 'force-dynamic'

interface SupplierDetailRow {
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

interface ExpenseHistoryRow {
  expense_id: string
  total_amount: unknown
  currency: string
  payment_date: unknown
  document_date: unknown
  due_date: unknown
  payment_method: string | null
  document_number: string | null
  description: string
}

type SupplierOrganizationContact = {
  fullName: string | null
  canonicalEmail: string | null
  membershipType: string
  roleLabel: string | null
  isPrimary: boolean
}

const SUPPLIER_CONTACT_MEMBERSHIP_TYPES = new Set(['contact', 'billing', 'client_contact'])

const toSupplierOrganizationContacts = async (organizationId: string | null | undefined): Promise<SupplierOrganizationContact[]> => {
  if (!organizationId) {
    return []
  }

  const memberships = await getOrganizationMemberships(organizationId)

  return memberships
    .filter(membership => SUPPLIER_CONTACT_MEMBERSHIP_TYPES.has(membership.membershipType))
    .map(membership => ({
      fullName: membership.fullName,
      canonicalEmail: membership.canonicalEmail,
      membershipType: membership.membershipType,
      roleLabel: membership.roleLabel,
      isPrimary: membership.isPrimary
    }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: supplierId } = await params

  const tenantScope = {
    organizationId: tenant.organizationId ?? null,
    clientId: tenant.clientId ?? null,
    spaceId: tenant.spaceId ?? null
  }

  // ── Postgres-first path ──
  try {
    const supplier = await getFinanceSupplierFromPostgres(supplierId)

    if (supplier) {
      const [expenses, providerTooling, providerToolCostBasis, organizationContacts] = await Promise.all([
        listFinanceExpensesFromPostgres({
          supplierId,
          page: 1,
          pageSize: 20
        }),
        supplier.providerId
          ? getLatestProviderToolingSnapshot(supplier.providerId).catch(() => null)
          : Promise.resolve(null),
        supplier.providerId
          ? listPreferredToolProviderCostBasisByProvider(supplier.providerId, { tenantScope }).catch(() => [])
          : Promise.resolve([]),
        toSupplierOrganizationContacts(supplier.organizationId).catch(() => [])
      ])

      return NextResponse.json({
        ...supplier,
        organizationContacts,
        providerTooling,
        providerToolCostBasis,
        paymentHistory: expenses.items.map(expense => ({
          expenseId: expense.expenseId,
          amount: expense.totalAmount,
          currency: expense.currency,
          paymentDate: expense.paymentDate || expense.documentDate || expense.dueDate,
          paymentMethod: expense.paymentMethod,
          documentNumber: expense.documentNumber,
          description: expense.description
        }))
      })
    }

    // Not found in Postgres — fall through to BigQuery
  } catch (error) {
    if (!shouldFallbackFromFinancePostgres(error)) {
      throw error
    }
  }

  // ── BigQuery fallback ──
  await assertFinanceBigQueryReadiness({ tables: ['fin_suppliers', 'fin_expenses'] })

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

  const [expenses, providerTooling, providerToolCostBasis] = await Promise.all([
    runFinanceQuery<ExpenseHistoryRow>(`
      SELECT expense_id, total_amount, currency, payment_date, document_date, due_date, payment_method, document_number, description
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE supplier_id = @supplierId
      ORDER BY COALESCE(payment_date, document_date, due_date) DESC
      LIMIT 20
    `, { supplierId }),
    row.provider_id
      ? getLatestProviderToolingSnapshot(normalizeString(row.provider_id)).catch(() => null)
      : Promise.resolve(null),
    row.provider_id
      ? listPreferredToolProviderCostBasisByProvider(normalizeString(row.provider_id), { tenantScope }).catch(() => [])
      : Promise.resolve([])
  ])

  return NextResponse.json({
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
    updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null),
    organizationContacts: [],
    providerTooling,
    providerToolCostBasis,
    paymentHistory: expenses.map(e => ({
      expenseId: normalizeString(e.expense_id),
      amount: toNumber(e.total_amount),
      currency: normalizeString(e.currency),
      paymentDate:
        toDateString(e.payment_date as string | { value?: string } | null) ||
        toDateString(e.document_date as string | { value?: string } | null) ||
        toDateString(e.due_date as string | { value?: string } | null),
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

  try {
    const { id: supplierId } = await params
    const body = await request.json()

    try {
      const existing = await getFinanceSupplierFromPostgres(supplierId)

      if (!existing) {
        return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
      }

      const autoLinkedProviderId = body.autoLinkProvider
        ? resolveCanonicalProviderId({
            supplierId,
            providerId: body.providerId !== undefined ? (body.providerId ? normalizeString(body.providerId) : null) : existing.providerId,
            legalName: body.legalName !== undefined ? assertNonEmptyString(body.legalName, 'legalName') : existing.legalName,
            tradeName: body.tradeName !== undefined ? (body.tradeName ? normalizeString(body.tradeName) : null) : existing.tradeName,
            website: body.website !== undefined ? (body.website ? normalizeString(body.website) : null) : existing.website,
            isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive
          })
        : null

      const legalName = body.legalName !== undefined ? assertNonEmptyString(body.legalName, 'legalName') : existing.legalName
      const tradeName = body.tradeName !== undefined ? (body.tradeName ? normalizeString(body.tradeName) : null) : existing.tradeName
      const taxId = body.taxId !== undefined ? (body.taxId ? normalizeString(body.taxId) : null) : existing.taxId
      const taxIdType = body.taxIdType !== undefined ? (body.taxIdType ? normalizeString(body.taxIdType) : null) : existing.taxIdType
      const country = body.country !== undefined ? (normalizeString(body.country) || 'CL') : existing.country
      const primaryContactName = body.primaryContactName !== undefined ? (body.primaryContactName ? normalizeString(body.primaryContactName) : null) : existing.primaryContactName
      const primaryContactEmail = body.primaryContactEmail !== undefined ? (body.primaryContactEmail ? normalizeString(body.primaryContactEmail) : null) : existing.primaryContactEmail
      const primaryContactPhone = body.primaryContactPhone !== undefined ? (body.primaryContactPhone ? normalizeString(body.primaryContactPhone) : null) : existing.primaryContactPhone

      const organizationId = existing.organizationId || (
        taxId
          ? await ensureOrganizationForSupplier({
              taxId,
              taxIdType: taxIdType ?? undefined,
              legalName,
              tradeName,
              country
            })
          : null
      )

      const updatedSupplier = await seedFinanceSupplierInPostgres({
        supplierId,
        providerId:
          autoLinkedProviderId ||
          (body.providerId !== undefined ? (body.providerId ? normalizeString(body.providerId) : null) : existing.providerId),
        organizationId,
        legalName,
        tradeName,
        taxId,
        taxIdType,
        country,
        category: body.category !== undefined
          ? (SUPPLIER_CATEGORIES.includes(body.category) ? body.category as SupplierCategory : 'other')
          : existing.category,
        serviceType: body.serviceType !== undefined ? (body.serviceType ? normalizeString(body.serviceType) : null) : existing.serviceType,
        isInternational: body.isInternational !== undefined ? Boolean(body.isInternational) : existing.isInternational,
        primaryContactName,
        primaryContactEmail,
        primaryContactPhone,
        website: body.website !== undefined ? (body.website ? normalizeString(body.website) : null) : existing.website,
        bankName: body.bankName !== undefined ? (body.bankName ? normalizeString(body.bankName) : null) : existing.bankName,
        bankAccountNumber: body.bankAccountNumber !== undefined ? (body.bankAccountNumber ? normalizeString(body.bankAccountNumber) : null) : existing.bankAccountNumber,
        bankAccountType: body.bankAccountType !== undefined ? (body.bankAccountType ? normalizeString(body.bankAccountType) : null) : existing.bankAccountType,
        bankRouting: body.bankRouting !== undefined ? (body.bankRouting ? normalizeString(body.bankRouting) : null) : existing.bankRouting,
        paymentCurrency: body.paymentCurrency !== undefined ? assertValidCurrency(body.paymentCurrency) : existing.paymentCurrency,
        defaultPaymentTerms: body.defaultPaymentTerms !== undefined ? (toNumber(body.defaultPaymentTerms) || 30) : existing.defaultPaymentTerms,
        defaultPaymentMethod: body.defaultPaymentMethod !== undefined
          ? (PAYMENT_METHODS.includes(body.defaultPaymentMethod) ? body.defaultPaymentMethod as PaymentMethod : 'transfer')
          : existing.defaultPaymentMethod,
        requiresPo: body.requiresPo !== undefined ? Boolean(body.requiresPo) : existing.requiresPo,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
        notes: body.notes !== undefined ? (body.notes ? normalizeString(body.notes) : null) : existing.notes,
        createdBy: existing.createdBy
      })

      if (organizationId) {
        await ensureOrganizationContactMembership({
          organizationId,
          sourceSystem: 'finance_supplier',
          sourceObjectType: 'primary_contact',
          sourceObjectId: supplierId,
          fullName: primaryContactName ?? '',
          canonicalEmail: primaryContactEmail,
          membershipType: 'contact',
          roleLabel: 'Supplier primary contact',
          isPrimary: true
        })
      }


      // TASK-771 Slice 3 — Sync a BigQuery se proyecta vía consumer reactivo
      // `provider_bq_sync` desde el outbox event `provider.upserted` emitido en
      // la tx PG. Ver src/lib/sync/projections/provider-bq-sync.ts.
      return NextResponse.json({
        supplierId,
        providerId: updatedSupplier.providerId,
        updated: true
      })
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

      await ensureFinanceInfrastructure()
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

      if (body.providerId !== undefined && !body.autoLinkProvider) {
        const providerId = body.providerId ? normalizeString(body.providerId) : null

        updates.push('provider_id = @providerId')
        updateParams.providerId = providerId
      }

      if (body.autoLinkProvider) {
        const [currentRow] = await runFinanceQuery<SupplierDetailRow>(`
          SELECT *
          FROM \`${projectId}.greenhouse.fin_suppliers\`
          WHERE supplier_id = @supplierId
          LIMIT 1
        `, { supplierId })

        if (!currentRow) {
          return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
        }

        const providerId = resolveCanonicalProviderId({
          supplierId,
          providerId: body.providerId !== undefined ? (body.providerId ? normalizeString(body.providerId) : null) : normalizeString(currentRow.provider_id || ''),
          legalName:
            body.legalName !== undefined
              ? assertNonEmptyString(body.legalName, 'legalName')
              : normalizeString(currentRow.legal_name),
          tradeName:
            body.tradeName !== undefined
              ? (body.tradeName ? normalizeString(body.tradeName) : null)
              : (currentRow.trade_name ? normalizeString(currentRow.trade_name) : null),
          website:
            body.website !== undefined ? (body.website ? normalizeString(body.website) : null) : (currentRow.website ? normalizeString(currentRow.website) : null),
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : normalizeBoolean(currentRow.is_active)
        })

        updates.push('provider_id = @providerId')
        updateParams.providerId = providerId || null
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

      const [updatedSupplier] = await runFinanceQuery<SupplierDetailRow>(`
        SELECT *
        FROM \`${projectId}.greenhouse.fin_suppliers\`
        WHERE supplier_id = @supplierId
        LIMIT 1
      `, { supplierId })

      if (updatedSupplier) {
        // TASK-771 Slice 1 — sync BQ no debe bloquear el response (BQ-fallback path).
        try {
          await syncProviderFromFinanceSupplier({
            supplierId,
            providerId: updatedSupplier.provider_id ? normalizeString(updatedSupplier.provider_id) : null,
            legalName: normalizeString(updatedSupplier.legal_name),
            tradeName: updatedSupplier.trade_name ? normalizeString(updatedSupplier.trade_name) : null,
            website: updatedSupplier.website ? normalizeString(updatedSupplier.website) : null,
            isActive: normalizeBoolean(updatedSupplier.is_active)
          })
        } catch (syncError) {
          captureWithDomain(syncError, 'finance', {
            tags: { source: 'sync_provider_bq_legacy', stage: 'post_supplier_update_bq_fallback' },
            extra: { supplierId }
          })
        }
      }

      return NextResponse.json({
        supplierId,
        providerId: updatedSupplier?.provider_id ? normalizeString(updatedSupplier.provider_id) : null,
        updated: true
      })
    }
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
