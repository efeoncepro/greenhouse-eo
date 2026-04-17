import { NextResponse } from 'next/server'

import {
  deactivateTemplate,
  getTemplate,
  updateTemplate,
  TemplateValidationError
} from '@/lib/commercial/governance/templates-store'
import type { QuotationPricingModel } from '@/lib/commercial/governance/contracts'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const template = await getTemplate(id)

  if (!template) {
    return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
  }

  return NextResponse.json(template)
}

interface UpdateTemplateBody {
  templateName?: string
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

  let body: UpdateTemplateBody

  try {
    body = (await request.json()) as UpdateTemplateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  try {
    const updated = await updateTemplate(id, body)

    if (!updated) {
      return NextResponse.json({ error: 'Template not found or no fields to update.' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof TemplateValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const ok = await deactivateTemplate(id)

  if (!ok) {
    return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
  }

  return NextResponse.json({ templateId: id, deactivated: true })
}
