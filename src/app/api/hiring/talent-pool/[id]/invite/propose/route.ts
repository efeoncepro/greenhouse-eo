import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  hiringInvalidBodyResponse,
  proposeTalentInvitation,
  talentPoolFlags,
  toHiringErrorResponse
} from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')
  if (!can(tenant, 'hiring.talent_pool.invite', 'execute', 'tenant')) return canonicalErrorResponse('forbidden')
  if (!talentPoolFlags().invite)
    return NextResponse.json(
      {
        error: 'Las invitaciones del banco de talento están deshabilitadas.',
        code: 'talent_pool_invite_disabled',
        actionable: false
      },
      { status: 503 }
    )
  const body = (await request.json().catch(() => null)) as { openingId?: string; idempotencyKey?: string } | null

  if (!body) return hiringInvalidBodyResponse()

  try {
    return NextResponse.json(
      await proposeTalentInvitation({
        talentProfileId: (await params).id,
        openingId: body.openingId ?? '',
        requestedBy: tenant.userId,
        idempotencyKey: request.headers.get('idempotency-key') ?? body.idempotencyKey ?? ''
      })
    )
  } catch (error) {
    return toHiringErrorResponse(error, 'talent_pool_invite_propose')
  }
}
