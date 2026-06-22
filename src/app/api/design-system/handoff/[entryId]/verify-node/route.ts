import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { DesignHandoffError } from '@/lib/design-system/handoff/state-machine'
import { verifyDesignHandoffFigmaNode } from '@/lib/design-system/handoff/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

import { mapDesignHandoffError, requireHandoffCapability, runDesignHandoffCommand } from '../../api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CAPABILITY = 'design_system.handoff.verify' as const

export async function POST(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')

  const forbidden = requireHandoffCapability(tenant, CAPABILITY, 'update')

  if (forbidden) return forbidden

  const { entryId } = await params

  try {
    return await runDesignHandoffCommand({
      tenant,
      request,
      routeKey: 'design_system.handoff.node.verify',
      body: { entryId },
      run: async () => ({
        ok: true,
        snapshot: await verifyDesignHandoffFigmaNode({ entryId, actorUserId: tenant.userId })
      })
    })
  } catch (error) {
    if (error instanceof DesignHandoffError) return mapDesignHandoffError(error)
    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_node_verify' } })

    return canonicalErrorResponse('internal_error')
  }
}
