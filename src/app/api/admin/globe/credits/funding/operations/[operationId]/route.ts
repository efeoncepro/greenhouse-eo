import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { GlobeSdkError, GreenhouseGlobeConfigurationError } from '@/lib/globe/client'
import {
  getGlobeCreditFundingOperation,
  readGreenhouseCreditFundingIntentEvidence
} from '@/lib/globe/credit-funding-operations'
import { hasGlobeOAuthWorkspaceBinding, resolveGlobeOAuthWorkspaceBindings } from '@/lib/sister-platforms/oauth-workspace-bindings'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const GET = async (request: Request, { params }: { params: Promise<{ operationId: string }> }) => {
  try {
    const session = await getServerAuthSession()

    if (!session?.user) return canonicalErrorResponse('unauthorized')
    const tenant = await getTenantContext()

    if (!tenant || !can(buildTenantEntitlementSubject(tenant), 'platform.globe_credit_funding.read', 'read', 'all')) {
      return canonicalErrorResponse('forbidden')
    }

    const globeWorkspaceId = new URL(request.url).searchParams.get('workspaceId')?.trim()
    const operationId = (await params).operationId.trim()

    if (!globeWorkspaceId || !operationId) return canonicalErrorResponse('globe_funding_invalid_request')
    const bindings = await resolveGlobeOAuthWorkspaceBindings(tenant)

    if (!hasGlobeOAuthWorkspaceBinding(bindings, globeWorkspaceId)) return canonicalErrorResponse('forbidden')
    const operation = await getGlobeCreditFundingOperation({ globeWorkspaceId, operationId })
    const evidence = await readGreenhouseCreditFundingIntentEvidence(globeWorkspaceId, [operation.proposalId])

    
return Response.json({ operation: {
      ...operation,
      greenhouseIntentEvidence: evidence.get(operation.proposalId) ?? []
    } }, { status: 200 })
  } catch (error) {
    if (error instanceof GreenhouseGlobeConfigurationError) return canonicalErrorResponse('globe_not_configured')
    if (error instanceof GlobeSdkError && error.retryable) return canonicalErrorResponse('globe_unavailable')
    
return canonicalErrorResponse('internal_error')
  }
}
