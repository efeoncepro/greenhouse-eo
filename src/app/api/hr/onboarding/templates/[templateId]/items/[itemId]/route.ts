import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { deleteOnboardingTemplateItem, updateOnboardingTemplateItem } from '@/lib/hr-onboarding'
import type { HrOnboardingAssignedRole } from '@/types/hr-onboarding'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ templateId: string; itemId: string }> }
) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_template', action: 'update', scope: 'tenant' })

    const { templateId, itemId } = await context.params

    const body = (await request.json().catch(() => ({}))) as Partial<{
      title: string
      description: string | null
      assignedRole: HrOnboardingAssignedRole
      dueDaysOffset: number
      required: boolean
    }>

    const template = await updateOnboardingTemplateItem({ templateId, itemId, input: body })

    return NextResponse.json({ template })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to update onboarding template item.')
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ templateId: string; itemId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_template', action: 'manage', scope: 'tenant' })

    const { templateId, itemId } = await context.params
    const template = await deleteOnboardingTemplateItem(templateId, itemId)

    return NextResponse.json({ template })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to delete onboarding template item.')
  }
}
