import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import {
  GlobeCreditCapacityStatusError,
  readGlobeCreditCapacityStatus
} from '@/lib/globe/credit-capacity-status'
import { GlobeSdkError, GreenhouseGlobeConfigurationError } from '@/lib/globe/client'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  hasGlobeOAuthWorkspaceBinding,
  resolveGlobeOAuthWorkspaceBindings
} from '@/lib/sister-platforms/oauth-workspace-bindings'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const GET = async (request: Request) => {
  try {
    const session = await getServerAuthSession()

    if (!session?.user) return canonicalErrorResponse('unauthorized')
    const tenant = await getTenantContext()

    if (!tenant) return canonicalErrorResponse('forbidden')

    if (!can(buildTenantEntitlementSubject(tenant), 'platform.globe_credit_funding.read', 'read', 'all')) {
      return canonicalErrorResponse('forbidden')
    }

    const url = new URL(request.url)
    const globeWorkspaceId = url.searchParams.get('workspaceId')?.trim()
    const requestedCredits = Number(url.searchParams.get('requestedCredits'))
    const projectId = url.searchParams.get('projectId')?.trim() || undefined
    const capabilityScope = url.searchParams.get('capabilityScope')?.trim() || undefined

    if (!globeWorkspaceId || !Number.isSafeInteger(requestedCredits) || requestedCredits <= 0) {
      return canonicalErrorResponse('globe_funding_invalid_request')
    }

    const bindings = await resolveGlobeOAuthWorkspaceBindings(tenant)

    if (!hasGlobeOAuthWorkspaceBinding(bindings, globeWorkspaceId)) return canonicalErrorResponse('forbidden')

    const status = await readGlobeCreditCapacityStatus({
      globeWorkspaceId,
      requestedCredits,
      ...(projectId ? { projectId } : {}),
      ...(capabilityScope ? { capabilityScope } : {})
    })

    
return Response.json({ status }, { status: 200 })
  } catch (error) {
    if (error instanceof GreenhouseGlobeConfigurationError) return canonicalErrorResponse('globe_not_configured')
    if (error instanceof GlobeSdkError && error.retryable) return canonicalErrorResponse('globe_unavailable')
    captureWithDomain(error, 'platform', {
      extra: { operation: error instanceof GlobeCreditCapacityStatusError
        ? 'globe_credit_capacity.invalid_projection'
        : 'globe_credit_capacity.read' }
    })
    
return canonicalErrorResponse('internal_error')
  }
}
