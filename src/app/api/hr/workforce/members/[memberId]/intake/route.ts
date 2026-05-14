import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { HrCoreValidationError } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import {
  updateWorkforceMemberIntake,
  type UpdateWorkforceMemberIntakeBody
} from '@/lib/workforce/intake/update-intake'

export const dynamic = 'force-dynamic'

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) => {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const tenant = await getTenantContext()

  if (!tenant) {
    return NextResponse.json({ error: 'Sin contexto de tenant' }, { status: 403 })
  }

  const { memberId } = await params
  const body = ((await request.json().catch(() => ({}))) as UpdateWorkforceMemberIntakeBody) ?? {}

  try {
    const result = await updateWorkforceMemberIntake({ memberId, tenant, body })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof HrCoreValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code ?? 'workforce_intake_update_failed',
          details: error.details ?? null
        },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error instanceof Error ? error : new Error(String(error)), 'identity', {
      tags: { source: 'hr_workforce_member_intake', stage: 'api_patch' },
      extra: { memberId }
    })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
