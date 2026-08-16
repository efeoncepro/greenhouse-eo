import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse, updateTalentAvailability } from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')
  if (!can(tenant, 'hiring.talent_pool.manage', 'update', 'tenant')) return canonicalErrorResponse('forbidden')
  const body = (await request.json().catch(() => null)) as { availability?: string; idempotencyKey?: string } | null

  if (!body) return hiringInvalidBodyResponse()

  try {
    return NextResponse.json(
      await updateTalentAvailability({
        talentProfileId: (await params).id,
        availability: body.availability ?? '',
        idempotencyKey: request.headers.get('idempotency-key') ?? body.idempotencyKey ?? '',
        actorUserId: tenant.userId
      })
    )
  } catch (error) {
    return toHiringErrorResponse(error, 'talent_pool_availability')
  }
}
