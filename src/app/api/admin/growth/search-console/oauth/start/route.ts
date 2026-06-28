import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { startSearchConsoleConnection } from '@/lib/growth/search-console'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1282 — `GET /api/admin/growth/search-console/oauth/start`
 *
 * Lane admin v1: un operador conecta la propiedad Search Console EN NOMBRE de una
 * organización cliente. La org objetivo es un parámetro gobernado (el operador tiene
 * scope `tenant`); se valida server-side y se HORNEA en el `state` firmado single-use
 * — la callback confía en el state, NUNCA en el browser (anti confused-deputy).
 *
 * Auth dual-gate: requireInternalTenantContext (clientes excluidos) + capability
 * `growth.search_console.connect`. Con el flag OFF, el command resuelve `disabled`.
 *
 * Éxito → 302 a la consent URL de Google (scope `webmasters.readonly`).
 */

export const dynamic = 'force-dynamic'

const asNonEmptyString = (value: string | null): string | null =>
  value && value.trim().length > 0 ? value.trim() : null

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

  const url = new URL(request.url)
  const organizationId = asNonEmptyString(url.searchParams.get('organizationId'))
  const siteUrl = asNonEmptyString(url.searchParams.get('siteUrl'))

  if (!organizationId || !siteUrl) {
    return canonicalErrorResponse('search_console_oauth_failed', {
      statusOverride: 400,
      extra: { reason: 'missing_organization_or_site' }
    })
  }

  try {
    const result = await startSearchConsoleConnection({
      organizationId,
      siteUrl,
      userId: tenant.userId ?? null
    })

    if (!result.ok) {
      return canonicalErrorResponse('search_console_disabled', {
        extra: { reason: result.errorCode }
      })
    }

    return NextResponse.redirect(result.consentUrl)
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'search_console_oauth_start', method: 'GET' }
    })

    return canonicalErrorResponse('search_console_oauth_failed')
  }
}
