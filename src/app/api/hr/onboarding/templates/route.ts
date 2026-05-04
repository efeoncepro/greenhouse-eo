import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { createOnboardingTemplate, listOnboardingTemplates } from '@/lib/hr-onboarding'
import { HR_ONBOARDING_TEMPLATE_TYPES, type CreateHrOnboardingTemplateInput } from '@/types/hr-onboarding'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_template', action: 'read', scope: 'tenant' })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const active = searchParams.get('active')

    const templates = await listOnboardingTemplates({
      type: HR_ONBOARDING_TEMPLATE_TYPES.includes(type as never) ? type as never : null,
      active: active === null ? null : active === 'true'
    })

    return NextResponse.json({ templates })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load onboarding templates.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_template', action: 'create', scope: 'tenant' })

    const body = (await request.json().catch(() => null)) as CreateHrOnboardingTemplateInput | null

    if (!body) return NextResponse.json({ error: 'Invalid onboarding template payload.' }, { status: 400 })

    const template = await createOnboardingTemplate({ input: body, actorUserId: tenant.userId })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to create onboarding template.')
  }
}
