import { randomUUID } from 'node:crypto'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { resolveFundingActorAuthMode } from '@/app/api/admin/globe/credit-funding/shared'
import {
  GlobeCreditFundingAuthorityError,
  GlobeCreditFundingOneShotAuthorityStore
} from '@/lib/globe/credit-funding-one-shot-authority'
import { captureWithDomain } from '@/lib/observability/capture'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const POST = async (request: Request, { params }: { params: Promise<{ authorityId: string }> }) => {
  try {
    const session = await getServerAuthSession()

    if (!session?.user) return canonicalErrorResponse('unauthorized')
    const tenant = await getTenantContext()

    if (
      !tenant ||
      !can(buildTenantEntitlementSubject(tenant), 'platform.globe_credit_funding.authority.revoke', 'execute', 'all')
    )
      return canonicalErrorResponse('forbidden')

    const authMode = resolveFundingActorAuthMode({
      provider: session.user.provider,
      authMode: session.user.authMode || tenant.authMode
    })

    if (authMode === 'agent' || authMode === 'unknown') return canonicalErrorResponse('forbidden')
    const body = (await request.json().catch(() => ({}))) as { reasonCode?: unknown }
    const reasonCode = body.reasonCode

    if (!['operator_revoked', 'scope_changed', 'security_response'].includes(String(reasonCode))) {
      return canonicalErrorResponse('globe_funding_invalid_request')
    }

    const correlationId = randomUUID()

    const result = await new GlobeCreditFundingOneShotAuthorityStore().revoke({
      authorityId: (await params).authorityId,
      revokedByUserId: tenant.userId,
      revokedByEntitlement: 'platform.globe_credit_funding.authority.revoke',
      revokedByAuthMode: authMode,
      authEvidenceRef: `greenhouse-auth:${tenant.userId}:${correlationId}`,
      reasonCode: reasonCode as 'operator_revoked' | 'scope_changed' | 'security_response',
      correlationId
    })

    return Response.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof GlobeCreditFundingAuthorityError) return canonicalErrorResponse('forbidden')

    captureWithDomain(error, 'platform', { extra: { operation: 'globe_credit_funding.authority.revoke' } })

    return canonicalErrorResponse('internal_error')
  }
}
