import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { DesignHandoffError } from '@/lib/design-system/handoff/state-machine'
import { deprecateDesignHandoffAllowedFile } from '@/lib/design-system/handoff/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

import { mapDesignHandoffError, requireHandoffCapability, runDesignHandoffCommand } from '../../../api-helpers'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'design_system.handoff.allowlist.manage' as const

export async function PATCH(request: Request, { params }: { params: Promise<{ fileKey: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')

  const forbidden = requireHandoffCapability(tenant, CAPABILITY, 'update')

  if (forbidden) return forbidden

  const { fileKey } = await params

  try {
    return await runDesignHandoffCommand({
      tenant,
      request,
      routeKey: 'design_system.handoff.allowlist.deprecate',
      body: { fileKey },
      run: async () => ({
        ok: true,
        allowedFile: await deprecateDesignHandoffAllowedFile({ fileKey, actorUserId: tenant.userId })
      })
    })
  } catch (error) {
    if (error instanceof DesignHandoffError) return mapDesignHandoffError(error)
    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_allowlist_deprecate' } })

    return canonicalErrorResponse('internal_error')
  }
}
