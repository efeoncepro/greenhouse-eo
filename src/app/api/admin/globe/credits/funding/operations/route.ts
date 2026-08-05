import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { GlobeSdkError, GreenhouseGlobeConfigurationError } from '@/lib/globe/client'
import {
  isGlobeCreditFundingOperationState,
  listGlobeCreditFundingOperations,
  readGreenhouseCreditFundingIntentEvidence
} from '@/lib/globe/credit-funding-operations'
import { hasGlobeOAuthWorkspaceBinding, resolveGlobeOAuthWorkspaceBindings } from '@/lib/sister-platforms/oauth-workspace-bindings'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const GET = async (request: Request) => {
  try {
    const session = await getServerAuthSession()

    if (!session?.user) return canonicalErrorResponse('unauthorized')
    const tenant = await getTenantContext()

    if (!tenant || !can(buildTenantEntitlementSubject(tenant), 'platform.globe_credit_funding.read', 'read', 'all')) {
      return canonicalErrorResponse('forbidden')
    }

    const url = new URL(request.url)
    const globeWorkspaceId = url.searchParams.get('workspaceId')?.trim()
    const state = url.searchParams.get('state')?.trim() || undefined
    const cursor = url.searchParams.get('cursor')?.trim() || undefined
    const limitRaw = url.searchParams.get('limit')
    const limit = limitRaw === null ? undefined : Number(limitRaw)

    if (!globeWorkspaceId || (state && !isGlobeCreditFundingOperationState(state)) ||
      (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 100))) {
      return canonicalErrorResponse('globe_funding_invalid_request')
    }

    const bindings = await resolveGlobeOAuthWorkspaceBindings(tenant)

    if (!hasGlobeOAuthWorkspaceBinding(bindings, globeWorkspaceId)) return canonicalErrorResponse('forbidden')

    const operations = await listGlobeCreditFundingOperations({
      globeWorkspaceId,
      ...(state ? { state } : {}),
      ...(cursor ? { cursor } : {}),
      ...(limit === undefined ? {} : { limit })
    })

    const evidence = await readGreenhouseCreditFundingIntentEvidence(
      globeWorkspaceId,
      operations.items.map(operation => operation.proposalId)
    )

    
return Response.json({ operations: {
      ...operations,
      items: operations.items.map(operation => ({
        ...operation,
        greenhouseIntentEvidence: evidence.get(operation.proposalId) ?? []
      }))
    } }, { status: 200 })
  } catch (error) {
    if (error instanceof GreenhouseGlobeConfigurationError) return canonicalErrorResponse('globe_not_configured')
    if (error instanceof GlobeSdkError && error.retryable) return canonicalErrorResponse('globe_unavailable')
    
return canonicalErrorResponse('internal_error')
  }
}
