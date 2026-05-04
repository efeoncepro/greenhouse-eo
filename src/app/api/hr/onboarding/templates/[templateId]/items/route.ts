import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { addOnboardingTemplateItem } from '@/lib/hr-onboarding'
import type { HrOnboardingAssignedRole } from '@/types/hr-onboarding'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ templateId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_template', action: 'update', scope: 'tenant' })

    const { templateId } = await context.params

    const body = (await request.json().catch(() => null)) as {
      title?: string
      description?: string | null
      assignedRole?: HrOnboardingAssignedRole
      dueDaysOffset?: number
      required?: boolean
      displayOrder?: number
    } | null

    if (!body?.title || !body.assignedRole) {
      return NextResponse.json({ error: 'Invalid onboarding template item payload.' }, { status: 400 })
    }

    const template = await addOnboardingTemplateItem({
      templateId,
      title: body.title,
      description: body.description,
      assignedRole: body.assignedRole,
      dueDaysOffset: body.dueDaysOffset,
      required: body.required,
      displayOrder: body.displayOrder
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to add onboarding template item.')
  }
}
