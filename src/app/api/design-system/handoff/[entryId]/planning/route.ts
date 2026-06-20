import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { DesignHandoffError } from '@/lib/design-system/handoff/state-machine'
import { setDesignHandoffPlanningFields } from '@/lib/design-system/handoff/store'
import type { DesignHandoffPriority } from '@/lib/design-system/handoff/types'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

import { mapDesignHandoffError, requireHandoffCapability, runDesignHandoffCommand } from '../../api-helpers'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'design_system.handoff.planning.update' as const

export async function PATCH(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')

  const forbidden = requireHandoffCapability(tenant, CAPABILITY, 'update')

  if (forbidden) return forbidden

  const { entryId } = await params
  const body = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>

  try {
    return await runDesignHandoffCommand({
      tenant,
      request,
      routeKey: 'design_system.handoff.planning.update',
      body: { entryId, ...body },
      run: async () => ({
        ok: true,
        entry: await setDesignHandoffPlanningFields({
          entryId,
          priority: typeof body.priority === 'string' ? (body.priority as DesignHandoffPriority) : undefined,
          targetSurfaceKey: typeof body.targetSurfaceKey === 'string' ? body.targetSurfaceKey : undefined,
          dueAt: typeof body.dueAt === 'string' ? body.dueAt : undefined,
          blockedReason: typeof body.blockedReason === 'string' ? body.blockedReason : undefined,
          actorUserId: tenant.userId
        })
      })
    })
  } catch (error) {
    if (error instanceof DesignHandoffError) return mapDesignHandoffError(error)
    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_planning_update' } })

    return canonicalErrorResponse('internal_error')
  }
}
