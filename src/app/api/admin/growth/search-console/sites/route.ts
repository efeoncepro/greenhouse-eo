import { NextResponse } from 'next/server'

import { canonicalErrorResponse, type CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { listSearchConsoleSitesForOrg, type SearchConsoleSitesResult } from '@/lib/growth/search-console'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1282 — `GET /api/admin/growth/search-console/sites?organizationId=…`
 *
 * Desplegable post-consentimiento: lista TODAS las propiedades de Search Console que
 * la cuenta del operador puede ver (flujo property-picker estilo Semrush). Requiere
 * una conexión `pending`/`active` para esa org (token de operador ya guardado).
 *
 * Auth dual-gate: requireInternalTenantContext + capability `growth.search_console.connect`.
 */

export const dynamic = 'force-dynamic'

const ERROR_TO_CANONICAL: Record<
  Exclude<SearchConsoleSitesResult, { ok: true }>['errorCode'],
  CanonicalErrorCode
> = {
  disabled: 'search_console_disabled',
  not_connected: 'search_console_not_connected',
  token_unhealthy: 'search_console_token_unhealthy',
  query_failed: 'search_console_sites_unavailable'
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.search_console.connect', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.search_console.connect' }
    })
  }

  const organizationId = new URL(request.url).searchParams.get('organizationId')?.trim()

  if (!organizationId) {
    return canonicalErrorResponse('search_console_not_connected', { extra: { reason: 'missing_organization' } })
  }

  try {
    const result = await listSearchConsoleSitesForOrg(organizationId)

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_TO_CANONICAL[result.errorCode], { extra: { reason: result.errorCode } })
    }

    return NextResponse.json({ sites: result.sites })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'search_console_sites', method: 'GET' }
    })

    return canonicalErrorResponse('search_console_sites_unavailable')
  }
}
