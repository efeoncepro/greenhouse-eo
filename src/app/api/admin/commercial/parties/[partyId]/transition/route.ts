import { NextResponse } from 'next/server'

import {
  buildTenantEntitlementSubject,
  LIFECYCLE_STAGES,
  materializePartyLifecycleSnapshot,
  overridePartyLifecycle,
  type LifecycleStage
} from '@/lib/commercial/party'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RouteParams {
  partyId: string
}

interface TransitionBody {
  toStage?: unknown
  reason?: unknown
}

export async function POST(request: Request, { params }: { params: Promise<RouteParams> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasEntitlement(buildTenantEntitlementSubject(tenant), 'commercial.party.override_lifecycle', 'update')) {
    return NextResponse.json(
      { error: 'Missing capability commercial.party.override_lifecycle.' },
      { status: 403 }
    )
  }

  const { partyId } = await params

  let body: TransitionBody

  try {
    body = (await request.json()) as TransitionBody
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON.' }, { status: 400 })
  }

  const toStage = typeof body.toStage === 'string' ? body.toStage.trim() : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  if (!LIFECYCLE_STAGES.includes(toStage as LifecycleStage)) {
    return NextResponse.json(
      { error: `toStage must be one of: ${LIFECYCLE_STAGES.join(', ')}` },
      { status: 400 }
    )
  }

  if (!reason) {
    return NextResponse.json({ error: 'reason is required.' }, { status: 400 })
  }

  try {
    const result = await overridePartyLifecycle({
      partyId,
      toStage: toStage as LifecycleStage,
      reason,
      actor: {
        userId: tenant.userId,
        roleCodes: tenant.roleCodes,
        reason
      }
    })

    const snapshot = await materializePartyLifecycleSnapshot(result.organizationId)

    return NextResponse.json({ result, snapshot })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      'message' in error
    ) {
      const typed = error as { statusCode: number; message: string; code?: string; details?: unknown }

      return NextResponse.json(
        { error: typed.message, code: typed.code, details: typed.details },
        { status: typed.statusCode }
      )
    }

    throw error
  }
}
