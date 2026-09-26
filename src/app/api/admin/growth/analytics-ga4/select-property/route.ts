import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { selectGa4Property } from '@/lib/growth/analytics-ga4'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')
  if (!can(tenant, 'growth.ga4.connect', 'execute', 'tenant')) return canonicalErrorResponse('forbidden')

  const body = (await request.json().catch(() => null)) as { organizationId?: unknown; propertyId?: unknown } | null
  const organizationId = typeof body?.organizationId === 'string' ? body.organizationId.trim() : ''
  const propertyId = typeof body?.propertyId === 'string' ? body.propertyId.trim() : ''

  if (!organizationId || !/^\d+$/.test(propertyId)) return canonicalErrorResponse('invalid_request')

  try {
    const result = await selectGa4Property(organizationId, propertyId)

    return result.ok ? NextResponse.json({
      ok: true,
      organizationId: result.value.organizationId,
      propertyId: result.value.propertyId,
      propertyName: result.value.propertyName,
      status: result.value.status
    }) : canonicalErrorResponse('invalid_request', { extra: { reason: result.errorCode } })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'ga4_select_property' } })

    return canonicalErrorResponse('internal_error')
  }
}
