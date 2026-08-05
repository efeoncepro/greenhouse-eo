import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { GlobeSdkError, GreenhouseGlobeConfigurationError } from '@/lib/globe/client'
import { readGlobeCreditCapacityStatus } from '@/lib/globe/credit-capacity-status'
import { hasGlobeOAuthWorkspaceBinding, resolveGlobeOAuthWorkspaceBindings } from '@/lib/sister-platforms/oauth-workspace-bindings'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const POST = async (request: Request) => {
  try {
    const session = await getServerAuthSession()

    if (!session?.user) return canonicalErrorResponse('unauthorized')
    const tenant = await getTenantContext()

    if (!tenant || !can(buildTenantEntitlementSubject(tenant), 'platform.globe_credit_funding.read', 'read', 'all')) {
      return canonicalErrorResponse('forbidden')
    }

    const body = await request.json().catch(() => undefined)
    const parsed = parsePreviewBody(body)

    if (!parsed) return canonicalErrorResponse('globe_funding_invalid_request')
    const bindings = await resolveGlobeOAuthWorkspaceBindings(tenant)

    if (!hasGlobeOAuthWorkspaceBinding(bindings, parsed.globeWorkspaceId)) {
      return canonicalErrorResponse('forbidden')
    }

    const preview = await readGlobeCreditCapacityStatus(parsed)

    
return Response.json({ preview }, { status: 200 })
  } catch (error) {
    if (error instanceof GreenhouseGlobeConfigurationError) return canonicalErrorResponse('globe_not_configured')
    if (error instanceof GlobeSdkError && error.retryable) return canonicalErrorResponse('globe_unavailable')
    
return canonicalErrorResponse('internal_error')
  }
}

function parsePreviewBody(raw: unknown): Readonly<{
  globeWorkspaceId: string
  requestedCredits: number
  projectId?: string
  capabilityScope?: string
}> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const value = raw as Record<string, unknown>
  const globeWorkspaceId = bounded(value.globeWorkspaceId)
  const requestedCredits = value.requestedCredits
  const projectId = value.projectId === undefined ? undefined : bounded(value.projectId)
  const capabilityScope = value.capabilityScope === undefined ? undefined : bounded(value.capabilityScope)

  if (!globeWorkspaceId || !Number.isSafeInteger(requestedCredits) || (requestedCredits as number) <= 0 ||
    (value.projectId !== undefined && !projectId) || (value.capabilityScope !== undefined && !capabilityScope)) {
    return undefined
  }

  
return {
    globeWorkspaceId,
    requestedCredits: requestedCredits as number,
    ...(projectId ? { projectId } : {}),
    ...(capabilityScope ? { capabilityScope } : {})
  }
}

function bounded(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()

  
return value.length > 0 && value.length <= 256 ? value : undefined
}
