import { NextResponse } from 'next/server'

import { query } from '@/lib/db'

import { recordAudit } from '@/lib/commercial/governance/audit-log'
import {
  listQuotationTerms,
  seedQuotationDefaultTerms,
  upsertQuotationTerms,
  type QuotationTermUpsertInput
} from '@/lib/commercial/governance/terms-store'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface QuotationVariablesRow extends Record<string, unknown> {
  pricing_model: string
  business_line_code: string | null
  payment_terms_days: number | null
  contract_duration_months: number | null
  billing_frequency: string | null
  valid_until: string | Date | null
  escalation_pct: string | number | null
  organization_id: string | null
  client_name_cache: string | null
}

const readQuotationVariables = async (quotationId: string) => {
  const rows = await query<QuotationVariablesRow>(
    `SELECT pricing_model, business_line_code, payment_terms_days,
            contract_duration_months, billing_frequency, valid_until,
            escalation_pct, organization_id, client_name_cache
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1`,
    [quotationId]
  )

  const row = rows[0]

  if (!row) return null

  const validUntil =
    row.valid_until instanceof Date
      ? row.valid_until.toISOString().slice(0, 10)
      : row.valid_until?.slice(0, 10) ?? null

  const escalation = row.escalation_pct === null ? null : Number(row.escalation_pct)

  return {
    pricingModel: row.pricing_model as 'staff_aug' | 'retainer' | 'project',
    businessLineCode: row.business_line_code,
    variables: {
      paymentTermsDays: row.payment_terms_days,
      contractDurationMonths: row.contract_duration_months,
      billingFrequency: row.billing_frequency,
      validUntil,
      organizationName: row.client_name_cache,
      escalationPct: escalation
    }
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

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const existing = await listQuotationTerms(identity.quotationId)

  if (existing.length === 0) {
    const ctx = await readQuotationVariables(identity.quotationId)

    if (ctx) {
      await seedQuotationDefaultTerms({
        quotationId: identity.quotationId,
        pricingModel: ctx.pricingModel,
        businessLineCode: ctx.businessLineCode,
        variables: ctx.variables
      })

      const seeded = await listQuotationTerms(identity.quotationId)

      return NextResponse.json({
        quotationId: identity.quotationId,
        items: seeded,
        total: seeded.length,
        seeded: true
      })
    }
  }

  return NextResponse.json({
    quotationId: identity.quotationId,
    items: existing,
    total: existing.length,
    seeded: false
  })
}

interface UpsertBody {
  terms?: QuotationTermUpsertInput[]
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  let body: UpsertBody

  try {
    body = (await request.json()) as UpsertBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!Array.isArray(body.terms)) {
    return NextResponse.json({ error: 'terms debe ser un arreglo.' }, { status: 400 })
  }

  const ctx = await readQuotationVariables(identity.quotationId)

  if (!ctx) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const terms = await upsertQuotationTerms({
    quotationId: identity.quotationId,
    variables: ctx.variables,
    terms: body.terms
  })

  await recordAudit({
    quotationId: identity.quotationId,
    action: 'terms_changed',
    actorUserId: tenant.userId,
    actorName: tenant.clientName || tenant.userId,
    details: {
      termCount: terms.length,
      includedCount: terms.filter(term => term.included).length
    }
  })

  return NextResponse.json({
    quotationId: identity.quotationId,
    items: terms,
    total: terms.length
  })
}
