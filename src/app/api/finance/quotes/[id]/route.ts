import { NextResponse } from 'next/server'

import {
  resolveQuoteDeliveryModel,
  type CommercialModel,
  type StaffingModel
} from '@/lib/commercial/delivery-model'
import { query } from '@/lib/db'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  getFinanceQuoteDetailFromCanonical,
  mapCanonicalQuoteDetailRow
} from '@/lib/finance/quotation-canonical-store'
import {
  isFinanceSchemaDriftError,
  logFinanceSchemaDrift
} from '@/lib/finance/schema-drift'
import {
  recalculateQuotationPricing,
  resolveQuotationIdentity
} from '@/lib/finance/pricing'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { roundCurrency, toNumber, toDateString } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface QuoteDetailRow extends Record<string, unknown> {
  quote_id: string
  client_id: string | null
  organization_id: string | null
  client_name: string | null
  quote_number: string | null
  quote_date: string | null
  due_date: string | null
  expiry_date: string | null
  description: string | null
  currency: string
  subtotal: string | number | null
  tax_rate: string | number | null
  tax_amount: string | number | null
  total_amount: string | number
  total_amount_clp: string | number
  exchange_rate_to_clp: string | number | null
  status: string
  converted_to_income_id: string | null
  nubox_document_id: string | null
  nubox_sii_track_id: string | null
  nubox_emission_status: string | null
  dte_type_code: string | null
  dte_folio: string | null
  source_system: string | null
  hubspot_quote_id: string | null
  hubspot_deal_id: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

const getLegacyQuoteDetail = async (quoteId: string) => {
  const rows = await runGreenhousePostgresQuery<QuoteDetailRow>(
    `SELECT quote_id, client_id, organization_id, client_name,
            quote_number, quote_date, due_date, expiry_date, description,
            currency, subtotal, tax_rate, tax_amount, total_amount,
            total_amount_clp, exchange_rate_to_clp, status,
            converted_to_income_id,
            nubox_document_id, nubox_sii_track_id, nubox_emission_status,
            dte_type_code, dte_folio,
            source_system, hubspot_quote_id, hubspot_deal_id,
            notes, created_at, updated_at
     FROM greenhouse_finance.quotes
     WHERE quote_id = $1`,
    [quoteId]
  )

  if (rows.length === 0) {
    return null
  }

  const r = rows[0]

  return {
    quoteId: String(r.quote_id),
    clientId: r.client_id ? String(r.client_id) : null,
    organizationId: r.organization_id ? String(r.organization_id) : null,
    clientName: r.client_name ? String(r.client_name) : null,
    quoteNumber: r.quote_number ? String(r.quote_number) : null,
    quoteDate: toDateString(r.quote_date as string | null),
    dueDate: toDateString(r.due_date as string | null),
    expiryDate: toDateString(r.expiry_date as string | null),
    description: r.description ? String(r.description) : null,
    currency: String(r.currency || 'CLP'),
    subtotal: r.subtotal !== null ? roundCurrency(toNumber(r.subtotal)) : null,
    taxRate: r.tax_rate !== null ? toNumber(r.tax_rate) : null,
    taxAmount: r.tax_amount !== null ? roundCurrency(toNumber(r.tax_amount)) : null,
    totalAmount: roundCurrency(toNumber(r.total_amount)),
    totalAmountClp: roundCurrency(toNumber(r.total_amount_clp)),
    exchangeRateToClp: r.exchange_rate_to_clp !== null ? toNumber(r.exchange_rate_to_clp) : null,
    status: String(r.status || 'sent'),
    convertedToIncomeId: r.converted_to_income_id ? String(r.converted_to_income_id) : null,
    nuboxDocumentId: r.nubox_document_id ? String(r.nubox_document_id) : null,
    nuboxSiiTrackId: r.nubox_sii_track_id ? String(r.nubox_sii_track_id) : null,
    nuboxEmissionStatus: r.nubox_emission_status ? String(r.nubox_emission_status) : null,
    dteTypeCode: r.dte_type_code ? String(r.dte_type_code) : null,
    dteFolio: r.dte_folio ? String(r.dte_folio) : null,
    source: String(r.source_system || 'manual'),
    hubspotQuoteId: r.hubspot_quote_id ? String(r.hubspot_quote_id) : null,
    hubspotDealId: r.hubspot_deal_id ? String(r.hubspot_deal_id) : null,
    pricingModel: null,
    commercialModel: null,
    staffingModel: null,
    salesContextAtSent: null,
    notes: r.notes ? String(r.notes) : null,
    createdAt: r.created_at ? String(r.created_at) : null,
    updatedAt: r.updated_at ? String(r.updated_at) : null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: quoteId } = await params

  try {
    const row = await getFinanceQuoteDetailFromCanonical({ tenant, quoteId })

    if (!row) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const mapped = mapCanonicalQuoteDetailRow(row as unknown as Parameters<typeof mapCanonicalQuoteDetailRow>[0])

    return NextResponse.json({
      ...mapped,
      quoteDate: toDateString(mapped.quoteDate),
      dueDate: toDateString(mapped.dueDate),
      expiryDate: toDateString(mapped.expiryDate),
      subtotal: mapped.subtotal !== null ? roundCurrency(mapped.subtotal) : null,
      taxAmount: mapped.taxAmount !== null ? roundCurrency(mapped.taxAmount) : null,
      totalAmount: roundCurrency(mapped.totalAmount),
      totalAmountClp: roundCurrency(mapped.totalAmountClp)
    })
  } catch (error) {
    if (isFinanceSchemaDriftError(error)) {
      logFinanceSchemaDrift('quotes_detail', error)

      const legacyItem = await getLegacyQuoteDetail(quoteId).catch(() => null)

      if (legacyItem) {
        return NextResponse.json(legacyItem)
      }

      return NextResponse.json(
        {
          error: 'Quote not found',
          degraded: true,
          errorCode: 'FINANCE_SCHEMA_DRIFT',
          message: 'Finance data for quotes_detail is temporarily unavailable because the database schema is not ready.'
        },
        { status: 404 }
      )
    }

    throw error
  }
}

// TASK-486: mirror del set en POST route.ts. Mantener sincronizado.
const QUOTE_CONTACT_MEMBERSHIP_TYPES = [
  'client_contact',
  'client_user',
  'contact',
  'billing',
  'partner',
  'advisor'
] as const

interface UpdateQuotationPayload {
  quotationNumber?: string | null
  status?: string | null
  contactIdentityProfileId?: string | null
  businessLineCode?: string | null
  currency?: string | null
  billingFrequency?: string | null
  contractDurationMonths?: number | null
  globalDiscountType?: 'percentage' | 'fixed_amount' | null
  globalDiscountValue?: number | null
  targetMarginPct?: number | null
  marginFloorPct?: number | null
  exchangeRates?: Record<string, number>
  exchangeSnapshotDate?: string | null
  description?: string | null
  internalNotes?: string | null
  notes?: string | null
  dueDate?: string | null
  validUntil?: string | null
  expiryDate?: string | null
  pricingModel?: 'staff_aug' | 'retainer' | 'project' | null
  commercialModel?: CommercialModel | null
  staffingModel?: StaffingModel | null
  recalculatePricing?: boolean
  createVersion?: boolean
}

const ALLOWED_STATUS_TRANSITIONS = new Set([
  'draft',
  'pending_approval',
  'approval_rejected',
  'issued',
  'expired',
  'converted'
])

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: quoteId } = await params
  const identity = await resolveQuotationIdentity(quoteId)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  let body: UpdateQuotationPayload

  try {
    body = (await request.json()) as UpdateQuotationPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const updates: string[] = []
  const values: unknown[] = [identity.quotationId]
  let idx = 1

  const push = (column: string, value: unknown, cast?: string) => {
    idx += 1
    const ref = cast ? `$${idx}${cast}` : `$${idx}`

    updates.push(`${column} = ${ref}`)
    values.push(value)
  }

  if (body.quotationNumber !== undefined) push('quotation_number', body.quotationNumber)

  if (body.status !== undefined && body.status) {
    if (!ALLOWED_STATUS_TRANSITIONS.has(body.status)) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 })
    }

    push('status', body.status)
  }

  if (body.businessLineCode !== undefined) push('business_line_code', body.businessLineCode)
  if (body.currency !== undefined && body.currency) push('currency', body.currency)
  if (body.billingFrequency !== undefined && body.billingFrequency) push('billing_frequency', body.billingFrequency)

  if (body.contractDurationMonths !== undefined) {
    push('contract_duration_months', body.contractDurationMonths)
  }

  if (body.globalDiscountType !== undefined) push('global_discount_type', body.globalDiscountType)
  if (body.globalDiscountValue !== undefined) push('global_discount_value', body.globalDiscountValue)
  if (body.targetMarginPct !== undefined) push('target_margin_pct', body.targetMarginPct)
  if (body.marginFloorPct !== undefined) push('margin_floor_pct', body.marginFloorPct)

  if (body.exchangeRates !== undefined) {
    push('exchange_rates', JSON.stringify(body.exchangeRates), '::jsonb')
  }

  if (body.exchangeSnapshotDate !== undefined) push('exchange_snapshot_date', body.exchangeSnapshotDate, '::date')

  // TASK-486: contacto canónico asociable en update. null = clear contact; string = set con validación.
  if (body.contactIdentityProfileId !== undefined) {
    const contactId =
      typeof body.contactIdentityProfileId === 'string' && body.contactIdentityProfileId.trim()
        ? body.contactIdentityProfileId.trim()
        : null

    if (contactId !== null) {
      const quoteOrgRows = await query<{ organization_id: string | null }>(
        `SELECT organization_id
           FROM greenhouse_commercial.quotations
           WHERE quotation_id = $1
           LIMIT 1`,
        [identity.quotationId]
      )

      const quoteOrgId = quoteOrgRows[0]?.organization_id ?? null

      if (!quoteOrgId) {
        return NextResponse.json(
          { error: 'Esta cotización no tiene organización; asigna una antes de setear contacto.' },
          { status: 400 }
        )
      }

      const membershipRows = await query<{ membership_type: string }>(
        `SELECT pm.membership_type
           FROM greenhouse_core.person_memberships pm
           WHERE pm.profile_id = $1
             AND pm.organization_id = $2
             AND pm.active = TRUE
           LIMIT 1`,
        [contactId, quoteOrgId]
      )

      if (membershipRows.length === 0) {
        return NextResponse.json(
          { error: 'contactIdentityProfileId no tiene membership activa en la organización de esta cotización.' },
          { status: 400 }
        )
      }

      const membershipType = membershipRows[0].membership_type

      if (!QUOTE_CONTACT_MEMBERSHIP_TYPES.includes(membershipType as typeof QUOTE_CONTACT_MEMBERSHIP_TYPES[number])) {
        return NextResponse.json(
          { error: `membership_type='${membershipType}' no aplica como contacto comercial (admitidos: ${QUOTE_CONTACT_MEMBERSHIP_TYPES.join(', ')}).` },
          { status: 400 }
        )
      }
    }

    push('contact_identity_profile_id', contactId)
  }

  if (body.description !== undefined) push('description', body.description)
  if (body.internalNotes !== undefined) push('internal_notes', body.internalNotes)
  if (body.notes !== undefined) push('notes', body.notes)
  if (body.dueDate !== undefined) push('due_date', body.dueDate, '::date')

  if (body.validUntil !== undefined || body.expiryDate !== undefined) {
    const resolvedExpiryDate = body.expiryDate ?? body.validUntil ?? null

    push('valid_until', resolvedExpiryDate, '::date')
    push('expiry_date', resolvedExpiryDate, '::date')
  }

  if (
    body.pricingModel !== undefined ||
    body.commercialModel !== undefined ||
    body.staffingModel !== undefined
  ) {
    const currentRows = await query<{
      pricing_model: string | null
      commercial_model: string | null
      staffing_model: string | null
    }>(
      `SELECT pricing_model, commercial_model, staffing_model
         FROM greenhouse_commercial.quotations
         WHERE quotation_id = $1
         LIMIT 1`,
      [identity.quotationId]
    )

    const current = currentRows[0]

    const fallback = resolveQuoteDeliveryModel({
      pricingModel: current?.pricing_model,
      commercialModel: current?.commercial_model,
      staffingModel: current?.staffing_model
    })

    const resolvedDeliveryModel = resolveQuoteDeliveryModel({
      pricingModel: body.pricingModel ?? undefined,
      commercialModel: body.commercialModel ?? fallback.commercialModel,
      staffingModel: body.staffingModel ?? fallback.staffingModel,
      fallback
    })

    push('pricing_model', resolvedDeliveryModel.pricingModel)
    push('commercial_model', resolvedDeliveryModel.commercialModel)
    push('staffing_model', resolvedDeliveryModel.staffingModel)
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP')

    await query(
      `UPDATE greenhouse_commercial.quotations
         SET ${updates.join(', ')}
         WHERE quotation_id = $1`,
      values
    )
  }

  if (body.recalculatePricing !== false) {
    const snapshot = await recalculateQuotationPricing({
      quotationId: identity.quotationId,
      createdBy: tenant.userId,
      createVersion: body.createVersion ?? false
    })

    return NextResponse.json({
      quotationId: identity.quotationId,
      updated: true,
      totals: snapshot.totals,
      revenue: snapshot.revenue,
      marginResolution: snapshot.marginResolution,
      health: snapshot.health
    })
  }

  return NextResponse.json({ quotationId: identity.quotationId, updated: true })
}
