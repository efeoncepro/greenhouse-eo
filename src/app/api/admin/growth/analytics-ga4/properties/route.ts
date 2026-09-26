import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { listGa4PropertiesForOrg } from '@/lib/growth/analytics-ga4'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')
  if (!can(tenant, 'growth.ga4.connect', 'execute', 'tenant')) return canonicalErrorResponse('forbidden')

  const organizationId = new URL(request.url).searchParams.get('organizationId')?.trim()

  if (!organizationId) return canonicalErrorResponse('invalid_request')

  try {
    const result = await listGa4PropertiesForOrg(organizationId)

    return result.ok ? NextResponse.json({ properties: result.value }) : canonicalErrorResponse('internal_error', { extra: { reason: result.errorCode } })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'ga4_properties' } })

    return canonicalErrorResponse('internal_error')
  }
}
