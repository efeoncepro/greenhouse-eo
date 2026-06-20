import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { DesignHandoffError } from '@/lib/design-system/handoff/state-machine'
import { setDesignHandoffPrimitiveDecision } from '@/lib/design-system/handoff/store'
import type { DesignHandoffImplementationStrategy } from '@/lib/design-system/handoff/types'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

import { mapDesignHandoffError, requireHandoffCapability, runDesignHandoffCommand } from '../../api-helpers'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'design_system.handoff.primitive_decision.manage' as const

interface PrimitiveDecisionBody {
  implementationStrategy?: unknown
  primitiveKey?: unknown
  primitiveVariant?: unknown
  primitiveKind?: unknown
  primitiveLabRoute?: unknown
  primitiveRuntimeRoute?: unknown
  primitiveGvcRef?: unknown
  primitiveDocsRef?: unknown
  primitiveRationale?: unknown
  primitiveDecisionOwner?: unknown
  primitiveDecisionDueAt?: unknown
}

const nullableString = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined
  if (value === null) return null

  return typeof value === 'string' ? value : undefined
}

export async function PATCH(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')

  const forbidden = requireHandoffCapability(tenant, CAPABILITY, 'update')

  if (forbidden) return forbidden

  const { entryId } = await params
  const body = ((await request.json().catch(() => ({}))) ?? {}) as PrimitiveDecisionBody

  try {
    return await runDesignHandoffCommand({
      tenant,
      request,
      routeKey: 'design_system.handoff.primitive_decision.manage',
      body: { entryId, ...body },
      run: async () => ({
        ok: true,
        entry: await setDesignHandoffPrimitiveDecision({
          entryId,
          implementationStrategy:
            typeof body.implementationStrategy === 'string'
              ? (body.implementationStrategy as DesignHandoffImplementationStrategy)
              : body.implementationStrategy === null
                ? null
                : undefined,
          primitiveKey: nullableString(body.primitiveKey),
          primitiveVariant: nullableString(body.primitiveVariant),
          primitiveKind: nullableString(body.primitiveKind),
          primitiveLabRoute: nullableString(body.primitiveLabRoute),
          primitiveRuntimeRoute: nullableString(body.primitiveRuntimeRoute),
          primitiveGvcRef: nullableString(body.primitiveGvcRef),
          primitiveDocsRef: nullableString(body.primitiveDocsRef),
          primitiveRationale: nullableString(body.primitiveRationale),
          primitiveDecisionOwner: nullableString(body.primitiveDecisionOwner),
          primitiveDecisionDueAt: nullableString(body.primitiveDecisionDueAt),
          actorUserId: tenant.userId
        })
      })
    })
  } catch (error) {
    if (error instanceof DesignHandoffError) return mapDesignHandoffError(error)
    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_primitive_decision_update' } })

    return canonicalErrorResponse('internal_error')
  }
}
