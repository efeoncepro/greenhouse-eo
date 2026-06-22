import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { DesignHandoffError } from '@/lib/design-system/handoff/state-machine'
import { assignDesignHandoffOwner } from '@/lib/design-system/handoff/store'
import type { DesignHandoffOwnerKind } from '@/lib/design-system/handoff/types'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

import { mapDesignHandoffError, requireHandoffCapability, runDesignHandoffCommand } from '../../api-helpers'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'design_system.handoff.owner.assign' as const

export async function PATCH(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')

  const forbidden = requireHandoffCapability(tenant, CAPABILITY, 'update')

  if (forbidden) return forbidden

  const { entryId } = await params
  const body = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
  const ownerKind = body.ownerKind === 'designer' || body.ownerKind === 'dev' ? (body.ownerKind as DesignHandoffOwnerKind) : null

  if (!ownerKind) return canonicalErrorResponse('invalid_design_handoff_input')

  try {
    return await runDesignHandoffCommand({
      tenant,
      request,
      routeKey: 'design_system.handoff.owner.assign',
      body: { entryId, ...body },
      run: async () => ({
        ok: true,
        entry: await assignDesignHandoffOwner({
          entryId,
          ownerKind,
          memberId: typeof body.memberId === 'string' ? body.memberId : null,
          actorUserId: tenant.userId
        })
      })
    })
  } catch (error) {
    if (error instanceof DesignHandoffError) return mapDesignHandoffError(error)
    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_owner_assign' } })

    return canonicalErrorResponse('internal_error')
  }
}
