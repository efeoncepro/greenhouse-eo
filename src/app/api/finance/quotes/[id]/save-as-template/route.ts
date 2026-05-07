import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { recordAudit } from '@/lib/commercial/governance/audit-log'
import {
  createTemplate,
  TemplateValidationError
} from '@/lib/commercial/governance/templates-store'
import { publishTemplateSaved } from '@/lib/commercial/quotation-events'
import { QUOTATION_PRICING_MODELS } from '@/lib/commercial/governance/contracts'
import type { QuotationPricingModel } from '@/lib/commercial/governance/contracts'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLE_CODES = new Set([
  'efeonce_admin',
  'finance_admin',
  'finance_manager',
  'efeonce_operations',
  'efeonce_account'
])

interface SaveAsTemplateBody {
  templateName?: string
  templateCode?: string
  description?: string | null
  active?: boolean
}

interface QuotationTemplateSourceRow extends Record<string, unknown> {
  quotation_id: string
  business_line_code: string | null
  pricing_model: string
  currency: string
  billing_frequency: string | null
  payment_terms_days: number | null
  contract_duration_months: number | null
  conditions_text: string | null
  current_version: number
}

interface QuotationSourceLineRow extends Record<string, unknown> {
  line_item_id: string
  product_id: string | null
  line_type: string
  label: string
  description: string | null
  role_code: string | null
  hours_estimated: string | number | null
  unit: string | null
  quantity: string | number | null
  unit_price: string | number | null
  effective_margin_pct: string | number | null
  sort_order: number | null
}

interface IncludedTermRow extends Record<string, unknown> {
  term_id: string
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const isAllowedLineType = (
  value: string
): value is 'person' | 'role' | 'deliverable' | 'direct_cost' =>
  value === 'person' || value === 'role' || value === 'deliverable' || value === 'direct_cost'

const isAllowedUnit = (
  value: string | null
): value is 'hour' | 'month' | 'unit' | 'project' =>
  value === 'hour' || value === 'month' || value === 'unit' || value === 'project'

const toPricingModel = (value: string): QuotationPricingModel => {
  if (!QUOTATION_PRICING_MODELS.includes(value as QuotationPricingModel)) {
    return 'project'
  }

  return value as QuotationPricingModel
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hasAllowedRole = tenant.roleCodes.some(code => ALLOWED_ROLE_CODES.has(code))

  if (!hasAllowedRole) {
    return NextResponse.json(
      { error: 'No tienes permisos para guardar cotizaciones como plantilla.' },
      { status: 403 }
    )
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  let body: SaveAsTemplateBody

  try {
    body = (await request.json()) as SaveAsTemplateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const templateName = body.templateName?.trim()
  const templateCode = body.templateCode?.trim()

  if (!templateName) {
    return NextResponse.json({ error: 'templateName es requerido.' }, { status: 400 })
  }

  if (!templateCode) {
    return NextResponse.json({ error: 'templateCode es requerido.' }, { status: 400 })
  }

  const headerRows = await query<QuotationTemplateSourceRow>(
    `SELECT quotation_id, business_line_code, pricing_model, currency,
            billing_frequency, payment_terms_days, contract_duration_months,
            conditions_text, current_version
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1`,
    [identity.quotationId]
  )

  const header = headerRows[0]

  if (!header) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const lineRows = await query<QuotationSourceLineRow>(
    `SELECT line_item_id, product_id, line_type, label, description,
            role_code, hours_estimated, unit, quantity,
            unit_price, effective_margin_pct, sort_order
       FROM greenhouse_commercial.quotation_line_items
       WHERE quotation_id = $1 AND version_number = $2
       ORDER BY sort_order ASC NULLS LAST, created_at ASC`,
    [identity.quotationId, header.current_version]
  )

  const termRows = await query<IncludedTermRow>(
    `SELECT term_id
       FROM greenhouse_commercial.quotation_terms
       WHERE quotation_id = $1 AND included = TRUE
       ORDER BY sort_order ASC`,
    [identity.quotationId]
  )

  const items = lineRows.map((row, index) => {
    const lineType = isAllowedLineType(row.line_type) ? row.line_type : 'deliverable'
    const unit = isAllowedUnit(row.unit) ? row.unit : 'hour'

    return {
      productId: row.product_id ?? null,
      lineType,
      label: row.label,
      description: row.description ?? null,
      roleCode: row.role_code ?? null,
      suggestedHours: toNumberOrNull(row.hours_estimated),
      unit,
      quantity: toNumberOrNull(row.quantity) ?? 1,
      defaultMarginPct: toNumberOrNull(row.effective_margin_pct),
      defaultUnitPrice: toNumberOrNull(row.unit_price),
      sortOrder: row.sort_order ?? index
    }
  })

  let template

  try {
    template = await createTemplate({
      templateName,
      templateCode,
      businessLineCode: header.business_line_code,
      pricingModel: toPricingModel(header.pricing_model),
      defaultCurrency: header.currency || 'CLP',
      defaultBillingFrequency: header.billing_frequency || 'monthly',
      defaultPaymentTermsDays: header.payment_terms_days ?? 30,
      defaultContractDurationMonths: header.contract_duration_months ?? null,
      defaultConditionsText: header.conditions_text ?? null,
      defaultTermIds: termRows.map(row => row.term_id),
      description: body.description ?? null,
      active: body.active ?? true,
      createdBy: tenant.userId,
      items
    })
  } catch (error) {
    if (error instanceof TemplateValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }

  await publishTemplateSaved({
    templateId: template.templateId,
    templateCode: template.templateCode,
    sourceQuotationId: identity.quotationId,
    createdBy: tenant.userId
  })

  await recordAudit({
    quotationId: identity.quotationId,
    versionNumber: header.current_version,
    action: 'template_saved',
    actorUserId: tenant.userId,
    actorName: tenant.clientName || tenant.userId,
    details: {
      templateId: template.templateId,
      templateCode: template.templateCode,
      templateName: template.templateName,
      itemsCount: items.length,
      termIdsCount: termRows.length
    }
  })

  return NextResponse.json(
    {
      templateId: template.templateId,
      templateCode: template.templateCode,
      templateName: template.templateName,
      itemsCount: items.length,
      defaultTermIdsCount: termRows.length
    },
    { status: 201 }
  )
}
