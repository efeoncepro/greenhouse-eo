import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { DesignHandoffError } from '@/lib/design-system/handoff/state-machine'
import { upsertDesignHandoffAllowedFile } from '@/lib/design-system/handoff/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

import { mapDesignHandoffError, requireHandoffCapability, runDesignHandoffCommand } from '../api-helpers'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'design_system.handoff.allowlist.manage' as const

export async function POST(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')

  const forbidden = requireHandoffCapability(tenant, CAPABILITY, 'create')

  if (forbidden) return forbidden

  const body = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>

  try {
    return await runDesignHandoffCommand({
      tenant,
      request,
      routeKey: 'design_system.handoff.allowlist.upsert',
      body,
      run: async () => ({
        ok: true,
        allowedFile: await upsertDesignHandoffAllowedFile({
          fileKey: typeof body.fileKey === 'string' ? body.fileKey : '',
          fileLabel: typeof body.fileLabel === 'string' ? body.fileLabel : '',
          actorUserId: tenant.userId,
          metadata: typeof body.metadata === 'object' && body.metadata !== null ? (body.metadata as Record<string, unknown>) : {}
        })
      })
    })
  } catch (error) {
    if (error instanceof DesignHandoffError) return mapDesignHandoffError(error)
    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_allowlist_upsert' } })

    return canonicalErrorResponse('internal_error')
  }
}
