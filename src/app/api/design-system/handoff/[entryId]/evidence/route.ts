import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { DesignHandoffError } from '@/lib/design-system/handoff/state-machine'
import { attachDesignHandoffEvidence } from '@/lib/design-system/handoff/store'
import type { DesignHandoffEvidenceType } from '@/lib/design-system/handoff/types'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

import { mapDesignHandoffError, requireHandoffCapability, runDesignHandoffCommand } from '../../api-helpers'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'design_system.handoff.evidence.attach' as const

export async function POST(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')

  const forbidden = requireHandoffCapability(tenant, CAPABILITY, 'create')

  if (forbidden) return forbidden

  const { entryId } = await params
  const body = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>

  try {
    return await runDesignHandoffCommand({
      tenant,
      request,
      routeKey: 'design_system.handoff.evidence.attach',
      body: { entryId, ...body },
      run: async () => ({
        ok: true,
        evidence: await attachDesignHandoffEvidence({
          entryId,
          evidenceType: body.evidenceType as DesignHandoffEvidenceType,
          ref: typeof body.ref === 'string' ? body.ref : '',
          label: typeof body.label === 'string' ? body.label : null,
          actorUserId: tenant.userId,
          metadata: typeof body.metadata === 'object' && body.metadata !== null ? (body.metadata as Record<string, unknown>) : {}
        })
      })
    })
  } catch (error) {
    if (error instanceof DesignHandoffError) return mapDesignHandoffError(error)
    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_evidence_attach' } })

    return canonicalErrorResponse('internal_error')
  }
}
