import { NextResponse } from 'next/server'

import {
  createTemplate,
  listTemplates,
  TemplateValidationError
} from '@/lib/commercial/governance/templates-store'
import {
  QUOTATION_PRICING_MODELS,
  type QuotationPricingModel
} from '@/lib/commercial/governance/contracts'
import { publishTemplateSaved } from '@/lib/commercial/quotation-events'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const businessLineCode = searchParams.get('businessLineCode')
  const pricingModelParam = searchParams.get('pricingModel')
  const includeInactive = searchParams.get('includeInactive') === 'true'

  const pricingModel =
    pricingModelParam && QUOTATION_PRICING_MODELS.includes(pricingModelParam as QuotationPricingModel)
      ? (pricingModelParam as QuotationPricingModel)
      : null

  const items = await listTemplates({
    activeOnly: !includeInactive,
    businessLineCode,
    pricingModel
  })

  return NextResponse.json({ items, total: items.length })
}

interface CreateTemplateBody {
  templateName?: string
  templateCode?: string
  businessLineCode?: string | null
  pricingModel?: QuotationPricingModel
  defaultCurrency?: string
  defaultBillingFrequency?: string
  defaultPaymentTermsDays?: number
  defaultContractDurationMonths?: number | null
  defaultConditionsText?: string | null
  defaultTermIds?: string[]
  description?: string | null
  active?: boolean
  items?: Array<{
    productId?: string | null
    lineType: 'person' | 'role' | 'deliverable' | 'direct_cost'
    label: string
    description?: string | null
    roleCode?: string | null
    suggestedHours?: number | null
    unit?: 'hour' | 'month' | 'unit' | 'project'
    quantity?: number
    defaultMarginPct?: number | null
    defaultUnitPrice?: number | null
    sortOrder?: number
  }>
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CreateTemplateBody

  try {
    body = (await request.json()) as CreateTemplateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!body.pricingModel || !QUOTATION_PRICING_MODELS.includes(body.pricingModel)) {
    return NextResponse.json(
      { error: `pricingModel inválido. Debe ser: ${QUOTATION_PRICING_MODELS.join(', ')}.` },
      { status: 400 }
    )
  }

  try {
    const template = await createTemplate({
      templateName: body.templateName ?? '',
      templateCode: body.templateCode ?? '',
      businessLineCode: body.businessLineCode ?? null,
      pricingModel: body.pricingModel,
      defaultCurrency: body.defaultCurrency,
      defaultBillingFrequency: body.defaultBillingFrequency,
      defaultPaymentTermsDays: body.defaultPaymentTermsDays,
      defaultContractDurationMonths: body.defaultContractDurationMonths ?? null,
      defaultConditionsText: body.defaultConditionsText ?? null,
      defaultTermIds: body.defaultTermIds,
      description: body.description ?? null,
      active: body.active ?? true,
      createdBy: tenant.userId,
      items: body.items
    })

    await publishTemplateSaved({
      templateId: template.templateId,
      templateCode: template.templateCode,
      sourceQuotationId: null,
      createdBy: tenant.userId
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    if (error instanceof TemplateValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
