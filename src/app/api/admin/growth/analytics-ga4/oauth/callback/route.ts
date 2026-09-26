import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { completeGa4Connection } from '@/lib/growth/analytics-ga4'
import { consumeGa4OAuthState } from '@/lib/growth/analytics-ga4/state-store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const redirectToLifecycle = (requestUrl: URL, organizationId: string, result: 'connected' | 'error') => {
  const target = new URL(`/agency/clients/${encodeURIComponent(organizationId)}/lifecycle`, requestUrl.origin)

  target.searchParams.set('ga4', result)

  return NextResponse.redirect(target, { status: 303 })
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')
  if (!can(tenant, 'growth.ga4.connect', 'execute', 'tenant')) return canonicalErrorResponse('forbidden')
  if (!tenant.userId) return canonicalErrorResponse('unauthorized')

  const url = new URL(request.url)
  const code = url.searchParams.get('code')?.trim()
  const state = url.searchParams.get('state')?.trim()

  try {
    if (url.searchParams.has('error')) {
      const consumed = state ? await consumeGa4OAuthState(state) : null

      return consumed?.userId === tenant.userId
        ? redirectToLifecycle(url, consumed.organizationId, 'error')
        : canonicalErrorResponse('invalid_request')
    }

    if (!code || !state) return canonicalErrorResponse('invalid_request')

    const result = await completeGa4Connection(state, code, tenant.userId)

    if (!result.ok) return result.organizationId
      ? redirectToLifecycle(url, result.organizationId, 'error')
      : canonicalErrorResponse('internal_error', { extra: { reason: result.errorCode } })

    return redirectToLifecycle(url, result.value.organizationId, 'connected')
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'ga4_oauth_callback' } })

    return canonicalErrorResponse('internal_error')
  }
}
