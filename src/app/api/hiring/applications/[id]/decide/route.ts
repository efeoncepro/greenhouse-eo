import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  decideHiringApplication,
  hiringInvalidBodyResponse,
  toHiringErrorResponse,
} from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { DecideHiringApplicationInput } from '@/types/hiring'

export const dynamic = 'force-dynamic'

/** TASK-355 — decisión humana, estructurada, idempotente y auditable. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.application.decide', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'hiring.application.decide' },
    })
  }

  let body: DecideHiringApplicationInput

  try {
    body = (await request.json()) as DecideHiringApplicationInput
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const { id } = await params
    const result = await decideHiringApplication(id, body, tenant.userId)

    return NextResponse.json(result)
  } catch (error) {
    return toHiringErrorResponse(error, 'application_decide')
  }
}
