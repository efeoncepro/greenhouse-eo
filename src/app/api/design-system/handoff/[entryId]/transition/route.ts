import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { DesignHandoffError, isDesignHandoffStatus } from '@/lib/design-system/handoff/state-machine'
import { transitionDesignHandoffEntry } from '@/lib/design-system/handoff/store'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

import { mapDesignHandoffError, runDesignHandoffCommand } from '../../api-helpers'

export const dynamic = 'force-dynamic'

const TRANSITION_CAPABILITY = 'design_system.handoff.transition' as const

interface TransitionBody {
  toStatus?: unknown
  implementedSurfaceKey?: unknown
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
  const toStatus = body.toStatus

  try {
    return await runDesignHandoffCommand({
      tenant,
      request,
      routeKey: 'design_system.handoff.transition',
      body: { entryId, ...body },
      run: async () => ({
        ok: true,
        ...(await transitionDesignHandoffEntry({
          entryId,
          toStatus,
          implementedSurfaceKey: typeof body.implementedSurfaceKey === 'string' ? body.implementedSurfaceKey : null,
          actorUserId: tenant.userId
        }))
      })
    })
  } catch (error) {
    if (error instanceof DesignHandoffError) {
      return mapDesignHandoffError(error)
    }

    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_transition' } })

    return canonicalErrorResponse('internal_error')
  }
}
