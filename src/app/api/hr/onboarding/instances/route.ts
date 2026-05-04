import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { createOnboardingInstance, listOnboardingInstances } from '@/lib/hr-onboarding'
import {
  HR_ONBOARDING_INSTANCE_STATUSES,
  HR_ONBOARDING_TEMPLATE_TYPES,
  type CreateHrOnboardingInstanceInput
} from '@/types/hr-onboarding'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_instance', action: 'read', scope: 'tenant' })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const memberId = searchParams.get('memberId')
    const limit = searchParams.get('limit')

    const instances = await listOnboardingInstances({
      type: HR_ONBOARDING_TEMPLATE_TYPES.includes(type as never) ? type as never : null,
      status: status === 'active' || HR_ONBOARDING_INSTANCE_STATUSES.includes(status as never) ? status as never : null,
      memberId,
      limit: limit ? Number(limit) : undefined
    })

    return NextResponse.json({ instances })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load onboarding instances.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_instance', action: 'create', scope: 'tenant' })

    const body = (await request.json().catch(() => null)) as CreateHrOnboardingInstanceInput | null

    if (!body?.memberId || !HR_ONBOARDING_TEMPLATE_TYPES.includes(body.type as never)) {
      return NextResponse.json({ error: 'Invalid onboarding instance payload.' }, { status: 400 })
    }

    const instance = await createOnboardingInstance({
      input: {
        ...body,
        source: body.source ?? 'manual_hr'
      },
      actorUserId: tenant.userId
    })

    return NextResponse.json({ instance }, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to create onboarding instance.')
  }
}
