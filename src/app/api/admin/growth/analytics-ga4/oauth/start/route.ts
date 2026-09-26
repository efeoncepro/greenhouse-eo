import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { startGa4Connection } from '@/lib/growth/analytics-ga4'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')
  if (!can(tenant, 'growth.ga4.connect', 'execute', 'tenant')) return canonicalErrorResponse('forbidden')
  if (!tenant.userId) return canonicalErrorResponse('unauthorized')

  const organizationId = new URL(request.url).searchParams.get('organizationId')?.trim()

  if (!organizationId) return canonicalErrorResponse('invalid_request')

  try {
    const result = await startGa4Connection(organizationId, tenant.userId)

    return result.ok ? NextResponse.redirect(result.value) : canonicalErrorResponse('internal_error', { extra: { reason: result.errorCode } })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'ga4_oauth_start' } })

    return canonicalErrorResponse('internal_error')
  }
}
