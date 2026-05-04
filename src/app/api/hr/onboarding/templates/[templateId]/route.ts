import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { getOnboardingTemplate, updateOnboardingTemplate } from '@/lib/hr-onboarding'
import type { UpdateHrOnboardingTemplateInput } from '@/types/hr-onboarding'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ templateId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_template', action: 'read', scope: 'tenant' })

    const { templateId } = await context.params
    const template = await getOnboardingTemplate(templateId)

    return NextResponse.json({ template })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load onboarding template.')
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ templateId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_template', action: 'update', scope: 'tenant' })

    const { templateId } = await context.params
    const body = (await request.json().catch(() => ({}))) as UpdateHrOnboardingTemplateInput
    const template = await updateOnboardingTemplate({ templateId, input: body, actorUserId: tenant.userId })

    return NextResponse.json({ template })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to update onboarding template.')
  }
}
