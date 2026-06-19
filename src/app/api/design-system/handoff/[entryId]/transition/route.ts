import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { DesignHandoffError, isDesignHandoffStatus } from '@/lib/design-system/handoff/state-machine'
import { transitionDesignHandoffEntry } from '@/lib/design-system/handoff/store'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const TRANSITION_CAPABILITY = 'design_system.handoff.transition' as const

interface TransitionBody {
  toStatus?: unknown
  implementedSurfaceKey?: unknown
}

const mapHandoffError = (error: DesignHandoffError) => {
  if (error.code === 'design_handoff_not_found') return canonicalErrorResponse('design_handoff_not_found')
  if (error.code === 'invalid_design_handoff_input') return canonicalErrorResponse('invalid_design_handoff_input')

  return canonicalErrorResponse('invalid_design_handoff_transition')
}

export async function PATCH(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, TRANSITION_CAPABILITY, 'update', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  let body: TransitionBody = {}

  try {
    body = (await request.json()) as TransitionBody
  } catch {
    return canonicalErrorResponse('invalid_design_handoff_transition')
  }

  if (!isDesignHandoffStatus(body.toStatus)) {
    return canonicalErrorResponse('invalid_design_handoff_transition')
  }

  const { entryId } = await params

  try {
    const result = await transitionDesignHandoffEntry({
      entryId,
      toStatus: body.toStatus,
      implementedSurfaceKey: typeof body.implementedSurfaceKey === 'string' ? body.implementedSurfaceKey : null,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof DesignHandoffError) {
      return mapHandoffError(error)
    }

    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_transition' } })

    return canonicalErrorResponse('internal_error')
  }
}
