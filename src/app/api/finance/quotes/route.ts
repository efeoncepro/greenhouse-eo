import { NextResponse } from 'next/server'

import {
  resolveQuoteDeliveryModel,
  type CommercialModel,
  type StaffingModel
} from '@/lib/commercial/delivery-model'
import { query, withTransaction } from '@/lib/db'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { recordAudit } from '@/lib/commercial/governance/audit-log'
import { seedQuotationDefaultTerms } from '@/lib/commercial/governance/terms-store'
import { recordTemplateUsage } from '@/lib/commercial/governance/templates-store'
import { publishTemplateUsed } from '@/lib/commercial/quotation-events'
import {
  listFinanceQuotesFromCanonical,
  mapCanonicalQuoteListRow
} from '@/lib/finance/quotation-canonical-store'
import {
  financeSchemaDriftResponse,
  isFinanceSchemaDriftError,
  logFinanceSchemaDrift
} from '@/lib/finance/schema-drift'
import {
  persistQuotationPricing,
  type QuotationPricingCurrency,
  type QuotationBillingFrequency,
  type QuotationDiscountType,
  type QuotationLineInput
} from '@/lib/finance/pricing'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { roundCurrency, toNumber, toDateString } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface QuoteRow extends Record<string, unknown> {
  quote_id: string
  client_id: string | null
  client_name: string | null
  quote_number: string | null
  quote_date: string | null
  due_date: string | null
  total_amount: string | number
  total_amount_clp: string | number
  currency: string
  status: string
  converted_to_income_id: string | null
  nubox_document_id: string | null
  source_system: string | null
  hubspot_quote_id: string | null
  hubspot_deal_id: string | null
  created_at: string
}

const getLegacyQuotes = async ({
  status,
  clientId,
  source
}: {
  status?: string | null
  clientId?: string | null
  source?: string | null
}) => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (condition: string, value: unknown) => {
    idx += 1
    conditions.push(condition.replace('$?', `$${idx}`))
    values.push(value)
  }

  if (status) push('status = $?', status)
  if (clientId) push('client_id = $?', clientId)
  if (source) push('source_system = $?', source)

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await runGreenhousePostgresQuery<QuoteRow>(
    `SELECT quote_id, client_id, client_name, quote_number, quote_date, due_date,
            total_amount, total_amount_clp, currency, status,
            converted_to_income_id, nubox_document_id,
            source_system, hubspot_quote_id, hubspot_deal_id, created_at
     FROM greenhouse_finance.quotes
     ${whereClause}
     ORDER BY quote_date DESC NULLS LAST, created_at DESC
     LIMIT 200`,
    values
  )

  return rows.map(r => ({
    quoteId: String(r.quote_id),
    clientId: r.client_id ? String(r.client_id) : null,
    clientName: r.client_name ? String(r.client_name) : null,
    quoteNumber: r.quote_number ? String(r.quote_number) : null,
    quoteDate: toDateString(r.quote_date as string | null),
    dueDate: toDateString(r.due_date as string | null),
    totalAmount: roundCurrency(toNumber(r.total_amount)),
    totalAmountClp: roundCurrency(toNumber(r.total_amount_clp)),
    currency: String(r.currency || 'CLP'),
    status: String(r.status || 'sent'),
    convertedToIncomeId: r.converted_to_income_id ? String(r.converted_to_income_id) : null,
    nuboxDocumentId: r.nubox_document_id ? String(r.nubox_document_id) : null,
    source: String(r.source_system || 'manual'),
    hubspotQuoteId: r.hubspot_quote_id ? String(r.hubspot_quote_id) : null,
    hubspotDealId: r.hubspot_deal_id ? String(r.hubspot_deal_id) : null,
    pricingModel: null,
    commercialModel: null,
    staffingModel: null,
    isFromNubox: Boolean(r.nubox_document_id)
  }))
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')
  const source = searchParams.get('source')

  try {
    const rows = await listFinanceQuotesFromCanonical({ tenant, status, clientId, source })

    const items = rows.map(row => {
      const mapped = mapCanonicalQuoteListRow(row)

      return {
        ...mapped,
        quoteDate: toDateString(mapped.quoteDate),
        dueDate: toDateString(mapped.dueDate),
        totalAmount: roundCurrency(mapped.totalAmount),
        totalAmountClp: roundCurrency(mapped.totalAmountClp)
      }
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    if (isFinanceSchemaDriftError(error)) {
      logFinanceSchemaDrift('quotes', error)

      const legacyItems = await getLegacyQuotes({ status, clientId, source }).catch(() => null)

      if (legacyItems) {
        return NextResponse.json({ items: legacyItems, total: legacyItems.length })
      }

      return financeSchemaDriftResponse('quotes', { items: [], total: 0 })
    }

    throw error
  }
}

// TASK-486: Contact membership_type values admitidas para asociar un contacto a una quote.
// Excluye `team_member` y `contractor` porque no aplican como contacto comercial de cotización
// (team_member es interno Efeonce; contractor es vendor/proveedor, no cliente).
const QUOTE_CONTACT_MEMBERSHIP_TYPES = [
  'client_contact',
  'client_user',
  'contact',
  'billing',
  'partner',
  'advisor'
] as const

interface CreateQuotationPayload {
  quotationNumber?: string
  clientId?: string | null
  organizationId?: string | null
  contactIdentityProfileId?: string | null
  spaceId?: string | null // TASK-486: aceptado por backwards compat; ignorado al inserta (queda NULL).
  businessLineCode?: string | null
  currency?: QuotationPricingCurrency
  quoteDate?: string | null
  dueDate?: string | null
  validUntil?: string | null
  billingFrequency?: QuotationBillingFrequency
  contractDurationMonths?: number | null
  exchangeRates?: Record<string, number>
  exchangeSnapshotDate?: string | null
  globalDiscountType?: QuotationDiscountType | null
  globalDiscountValue?: number | null
  targetMarginPct?: number | null
  marginFloorPct?: number | null
  description?: string | null
  internalNotes?: string | null
  lineItems?: QuotationLineInput[]
  pricingModel?: 'staff_aug' | 'retainer' | 'project'
  commercialModel?: CommercialModel
  staffingModel?: StaffingModel
  templateId?: string | null
}

const generateQuotationNumber = () => {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()

  return `EO-QUO-${y}${m}-${suffix}`
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CreateQuotationPayload

  try {
    body = (await request.json()) as CreateQuotationPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  // TASK-486: validación canónica del anchor. organizationId es requerido; contactIdentityProfileId
  // es opcional pero, si viene, debe resolver a una membership comercial activa en esa org.
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId.trim() : ''

  if (!organizationId) {
    return NextResponse.json(
      { error: 'organizationId es obligatorio. Cada cotización se ancla a una organización (cliente o prospecto).' },
      { status: 400 }
    )
  }

  const orgExists = await query<{ organization_id: string }>(
    `SELECT organization_id
     FROM greenhouse_core.organizations
     WHERE organization_id = $1
       AND active = TRUE
     LIMIT 1`,
    [organizationId]
  )

  if (orgExists.length === 0) {
    return NextResponse.json(
      { error: `Organization ${organizationId} no existe o está inactiva.` },
      { status: 404 }
    )
  }

  const contactIdentityProfileId =
    typeof body.contactIdentityProfileId === 'string' && body.contactIdentityProfileId.trim()
      ? body.contactIdentityProfileId.trim()
      : null

  if (contactIdentityProfileId) {
    const membershipRows = await query<{ membership_id: string; membership_type: string }>(
      `SELECT pm.membership_id, pm.membership_type
       FROM greenhouse_core.person_memberships pm
       WHERE pm.profile_id = $1
         AND pm.organization_id = $2
         AND pm.active = TRUE
       LIMIT 1`,
      [contactIdentityProfileId, organizationId]
    )

    if (membershipRows.length === 0) {
      return NextResponse.json(
        {
          error:
            'contactIdentityProfileId no tiene una membership activa en esa organización. Un contacto debe estar asociado a la organización antes de cotizarle.'
        },
        { status: 400 }
      )
    }

    const membershipType = membershipRows[0].membership_type

    if (!QUOTE_CONTACT_MEMBERSHIP_TYPES.includes(membershipType as typeof QUOTE_CONTACT_MEMBERSHIP_TYPES[number])) {
      return NextResponse.json(
        {
          error: `membership_type='${membershipType}' no aplica como contacto comercial (admitidos: ${QUOTE_CONTACT_MEMBERSHIP_TYPES.join(', ')}).`
        },
        { status: 400 }
      )
    }
  }

  // TASK-486: spaceId legacy se ignora. Nuevos writes lo dejan NULL; Space vuelve a ser
  // proyección operativa post-conversion.
  if (body.spaceId) {
    // eslint-disable-next-line no-console
    console.warn('[POST /api/finance/quotes] spaceId in body ignored (TASK-486: quotations anchor on organization_id, not space_id). Received:', body.spaceId)
  }

  // Optional template resolution — when `templateId` is passed, pull defaults
  // (currency, billing, contract duration, pricing model, business line) and
  // seed lineItems + default terms from the template snapshot. Explicit body
  // fields always win over template defaults. Usage counter is bumped here.
  let templateSnapshot: Awaited<ReturnType<typeof recordTemplateUsage>> = null
  let templateBusinessLineCode: string | null = null

  if (body.templateId && typeof body.templateId === 'string') {
    templateSnapshot = await recordTemplateUsage(body.templateId)

    if (!templateSnapshot) {
      return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
    }

    templateBusinessLineCode = templateSnapshot.defaults.businessLineCode
  }

  const resolvedBusinessLineCode =
    body.businessLineCode !== undefined ? body.businessLineCode : templateBusinessLineCode

  const currency: QuotationPricingCurrency = (body.currency ||
    (templateSnapshot?.defaults.currency as QuotationPricingCurrency | undefined) ||
    'CLP') as QuotationPricingCurrency

  const billingFrequency: QuotationBillingFrequency = (body.billingFrequency ||
    (templateSnapshot?.defaults.billingFrequency as QuotationBillingFrequency | undefined) ||
    'one_time') as QuotationBillingFrequency

  const quoteDate = (body.quoteDate || new Date().toISOString().slice(0, 10)).slice(0, 10)
  const quotationNumber = body.quotationNumber?.trim() || generateQuotationNumber()
  const createdBy = tenant.userId

  const templatePricingModel =
    templateSnapshot?.defaults.pricingModel as 'staff_aug' | 'retainer' | 'project' | undefined

  const resolvedDeliveryModel = resolveQuoteDeliveryModel({
    pricingModel: body.pricingModel ?? templatePricingModel ?? 'project',
    commercialModel: body.commercialModel,
    staffingModel: body.staffingModel
  })

  const contractDurationMonths =
    body.contractDurationMonths !== undefined
      ? body.contractDurationMonths
      : templateSnapshot?.defaults.contractDurationMonths ?? null

  let quotationId: string

  try {
    quotationId = await withTransaction(async client => {
      const insert = await client.query<{ quotation_id: string }>(
        `INSERT INTO greenhouse_commercial.quotations (
           quotation_number,
           client_id,
           organization_id,
           contact_identity_profile_id,
           business_line_code,
           pricing_model,
           commercial_model,
           staffing_model,
           status,
           current_version,
           currency,
           exchange_rate_to_clp,
           exchange_rates,
           exchange_snapshot_date,
           target_margin_pct,
           margin_floor_pct,
           global_discount_type,
           global_discount_value,
           revenue_type,
           billing_frequency,
           payment_terms_days,
           contract_duration_months,
           quote_date,
           due_date,
           valid_until,
           description,
           internal_notes,
           source_system,
           source_quote_id,
           created_by
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, 'draft', 1,
           $9, NULL, $10::jsonb, $11::date,
           $12, $13, $14, $15,
           'one_time', $16, 30, $17,
           $18::date, $19::date, $20::date,
           $21, $22,
           'manual', $1,
           $23
         )
         RETURNING quotation_id`,
        [
          quotationNumber,
          body.clientId ?? null,
          organizationId,
          contactIdentityProfileId,
          resolvedBusinessLineCode,
          resolvedDeliveryModel.pricingModel,
          resolvedDeliveryModel.commercialModel,
          resolvedDeliveryModel.staffingModel,
          currency,
          JSON.stringify(body.exchangeRates ?? {}),
          body.exchangeSnapshotDate ?? null,
          body.targetMarginPct ?? null,
          body.marginFloorPct ?? null,
          body.globalDiscountType ?? null,
          body.globalDiscountValue ?? null,
          billingFrequency,
          contractDurationMonths,
          quoteDate,
          body.dueDate ?? null,
          body.validUntil ?? null,
          body.description ?? null,
          body.internalNotes ?? null,
          createdBy
        ]
      )

      return insert.rows[0].quotation_id
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[POST /api/finance/quotes] quotations INSERT failed', {
      businessLineCode: resolvedBusinessLineCode,
      organizationId,
      contactIdentityProfileId,
      clientId: body.clientId ?? null,
      pricingModel: resolvedDeliveryModel.pricingModel,
      currency,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error
    })

    if (isFinanceSchemaDriftError(error)) {
      return financeSchemaDriftResponse('quotes_create', { error: 'Canonical quotation schema unavailable.' })
    }

    const message = error instanceof Error ? error.message : 'Failed to create quotation.'

    return NextResponse.json({ error: message }, { status: 500 })
  }

  const bodyLineItems = Array.isArray(body.lineItems) ? body.lineItems : []

  const lineItems: QuotationLineInput[] =
    bodyLineItems.length === 0 && templateSnapshot && templateSnapshot.items.length > 0
      ? templateSnapshot.items.map(item => ({
          productId: item.productId ?? null,
          lineType: item.lineType,
          sortOrder: item.sortOrder,
          label: item.label,
          description: item.description ?? null,
          roleCode: item.roleCode ?? null,
          hoursEstimated: item.suggestedHours ?? null,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.defaultUnitPrice ?? 0
        }))
      : bodyLineItems

  let snapshot: Awaited<ReturnType<typeof persistQuotationPricing>>

  try {
    snapshot = await persistQuotationPricing(
      {
        quotationId,
        versionNumber: 1,
        businessLineCode: resolvedBusinessLineCode,
        quoteCurrency: currency,
        quoteDate,
        billingFrequency,
        contractDurationMonths,
        exchangeRates: body.exchangeRates ?? {},
        exchangeSnapshotDate: body.exchangeSnapshotDate ?? null,
        globalDiscountType: body.globalDiscountType ?? null,
        globalDiscountValue: body.globalDiscountValue ?? null,
        marginTargetPct: body.targetMarginPct ?? null,
        marginFloorPct: body.marginFloorPct ?? null,
        lineItems,
        createdBy
      },
      { createVersion: true, versionNotes: 'Draft created via API.' }
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[POST /api/finance/quotes] persistQuotationPricing failed', {
      quotationId,
      lineItemsCount: lineItems.length,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error
    })

    if (isFinanceSchemaDriftError(error)) {
      return financeSchemaDriftResponse('quotes_create_pricing', {
        error: 'Pricing persistence schema unavailable.'
      })
    }

    const message = error instanceof Error ? error.message : 'Failed to persist quotation pricing.'

    return NextResponse.json(
      { error: message, quotationId },
      { status: 500 }
    )
  }

  // When a template is used, seed its default terms (templates carry a list
  // of term_ids; the terms store picks them up and resolves variables).
  if (templateSnapshot && templateSnapshot.defaults.termIds.length > 0) {
    await seedQuotationDefaultTerms({
      quotationId,
      pricingModel: resolvedDeliveryModel.pricingModel,
      businessLineCode: resolvedBusinessLineCode,
      variables: {
        paymentTermsDays: templateSnapshot.defaults.paymentTermsDays,
        contractDurationMonths,
        billingFrequency,
        validUntil: body.validUntil ?? null,
        organizationName: null,
        escalationPct: null
      }
    })
  }

  if (templateSnapshot) {
    await publishTemplateUsed({
      templateId: templateSnapshot.templateId,
      templateCode: templateSnapshot.templateCode,
      quotationId,
      usedBy: createdBy
    })

    await recordAudit({
      quotationId,
      versionNumber: 1,
      action: 'template_used',
      actorUserId: createdBy,
      actorName: tenant.clientName || createdBy,
      details: {
        templateId: templateSnapshot.templateId,
        templateCode: templateSnapshot.templateCode,
        itemsSeeded: lineItems.length,
        termsSeeded: templateSnapshot.defaults.termIds.length
      }
    })
  }

  return NextResponse.json(
    {
      quotationId,
      quotationNumber,
      pricingModel: resolvedDeliveryModel.pricingModel,
      commercialModel: resolvedDeliveryModel.commercialModel,
      staffingModel: resolvedDeliveryModel.staffingModel,
      currentVersion: snapshot.versionNumber,
      totals: snapshot.totals,
      revenue: snapshot.revenue,
      marginResolution: snapshot.marginResolution,
      health: snapshot.health,
      lineItems: snapshot.lineItems.map(line => ({
        lineItemId: line.lineItemId ?? null,
        label: line.label,
        lineType: line.lineType,
        quantity: line.quantity,
        unit: line.unit ?? 'unit',
        unitCost: line.unitCost,
        unitPrice: line.unitPrice,
        subtotalCost: line.subtotalCost,
        subtotalPrice: line.subtotalPrice,
        discountAmount: line.discountAmount,
        subtotalAfterDiscount: line.subtotalAfterDiscount,
        effectiveMarginPct: line.effectiveMarginPct,
        recurrenceType: line.recurrenceType,
        resolutionNotes: line.resolutionNotes
      }))
    },
    { status: 201 }
  )
}
