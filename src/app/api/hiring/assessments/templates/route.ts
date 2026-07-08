import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import { createTemplate, listTemplates } from '@/lib/hiring/assessment'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { CreateTemplateInput } from '@/types/hiring-assessment'

/**
 * TASK-1360 — `GET/POST /api/hiring/assessments/templates`. Dual-gate interno + capability.
 * GET (read): plantillas activas. POST (author): compone una plantilla por competencias+pesos.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.read' } })
  }

  try {
    const items = await listTemplates()

    
return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_templates_list')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.author', 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.author' } })
  }

  let body: CreateTemplateInput

  try {
    body = (await request.json()) as CreateTemplateInput
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const template = await createTemplate(body, tenant.userId)

    
return NextResponse.json(template, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_template_create')
  }
}
