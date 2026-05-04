import { NextResponse } from 'next/server'

import {
  createOffboardingCase,
  listOffboardingCases,
  OFFBOARDING_CASE_STATUSES,
  OFFBOARDING_SEPARATION_TYPES,
  type CreateOffboardingCaseInput
} from '@/lib/workforce/offboarding'
import {
  assertHrEntitlement,
  requireHrCoreManageTenantContext,
  requireHrCoreReadTenantContext,
  toHrCoreErrorResponse
} from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({
      tenant,
      capability: 'hr.offboarding_case',
      action: 'read',
      scope: 'tenant'
    })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const memberId = searchParams.get('memberId')
    const limit = searchParams.get('limit')

    const cases = await listOffboardingCases({
      status: status === 'active' || OFFBOARDING_CASE_STATUSES.includes(status as never) ? status as never : null,
      memberId,
      limit: limit ? Number(limit) : undefined
    })

    return NextResponse.json({ cases })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load offboarding cases.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({
      tenant,
      capability: 'hr.offboarding_case',
      action: 'create',
      scope: 'tenant'
    })

    const body = (await request.json().catch(() => null)) as CreateOffboardingCaseInput | null

    if (!body || !body.memberId || !OFFBOARDING_SEPARATION_TYPES.includes(body.separationType as never)) {
      return NextResponse.json({ error: 'Invalid offboarding case payload.' }, { status: 400 })
    }

    const created = await createOffboardingCase({
      input: {
        ...body,
        source: body.source ?? 'manual_hr'
      },
      actorUserId: tenant.userId
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to create offboarding case.')
  }
}
