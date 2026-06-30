import { NextResponse } from 'next/server'

import { canonicalErrorResponse, type CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { disconnectSearchConsoleProperty, type SearchConsoleCommandResult } from '@/lib/growth/search-console'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const ERROR_TO_CANONICAL: Record<
  Exclude<SearchConsoleCommandResult, { ok: true }>['errorCode'],
  CanonicalErrorCode
> = {
  disabled: 'search_console_disabled',
  state_invalid: 'search_console_oauth_state_invalid',
  oauth_failed: 'search_console_oauth_failed',
  site_not_accessible: 'search_console_oauth_failed',
  secret_write_failed: 'search_console_oauth_failed',
  not_connected: 'search_console_not_connected'
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.search_console.connect', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.search_console.connect' }
    })
  }

  const body = (await request.json().catch(() => null)) as { organizationId?: unknown } | null
  const organizationId = typeof body?.organizationId === 'string' ? body.organizationId.trim() : ''

  if (!organizationId) {
    return canonicalErrorResponse('search_console_oauth_failed', {
      statusOverride: 400,
      extra: { reason: 'missing_organization' }
    })
  }

  try {
    const result = await disconnectSearchConsoleProperty(organizationId)

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_TO_CANONICAL[result.errorCode], {
        extra: { reason: result.errorCode }
      })
    }

    return NextResponse.json({
      ok: true,
      status: result.connection.status,
      siteUrl: result.connection.siteUrl,
      organizationId: result.connection.organizationId
    })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'search_console_disconnect', method: 'POST' }
    })

    return canonicalErrorResponse('search_console_oauth_failed')
  }
}
