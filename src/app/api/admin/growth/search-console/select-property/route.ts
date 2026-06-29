import { NextResponse } from 'next/server'

import { canonicalErrorResponse, type CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { selectSearchConsoleProperty, type SelectSearchConsolePropertyResult } from '@/lib/growth/search-console'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1282 — `POST /api/admin/growth/search-console/select-property`
 *
 * Ata la propiedad elegida del desplegable a la org (flujo property-picker). Verifica
 * server-side que el token realmente tenga acceso a esa propiedad (anti-binding ajeno)
 * y marca la conexión `active`. El LLM nunca elige: acción humana confirmada.
 *
 * Auth dual-gate: requireInternalTenantContext + capability `growth.search_console.connect`.
 */

export const dynamic = 'force-dynamic'

const ERROR_TO_CANONICAL: Record<
  Exclude<SelectSearchConsolePropertyResult, { ok: true }>['errorCode'],
  CanonicalErrorCode
> = {
  disabled: 'search_console_disabled',
  not_connected: 'search_console_not_connected',
  token_unhealthy: 'search_console_token_unhealthy',
  site_not_accessible: 'search_console_property_not_accessible'
}

interface SelectPropertyBody {
  organizationId?: unknown
  siteUrl?: unknown
}

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

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

  let body: SelectPropertyBody

  try {
    body = (await request.json()) as SelectPropertyBody
  } catch {
    return canonicalErrorResponse('search_console_property_not_accessible', { extra: { reason: 'invalid_json' } })
  }

  const organizationId = asNonEmptyString(body.organizationId)
  const siteUrl = asNonEmptyString(body.siteUrl)

  if (!organizationId || !siteUrl) {
    return canonicalErrorResponse('search_console_property_not_accessible', {
      extra: { reason: 'missing_organization_or_site' }
    })
  }

  try {
    const result = await selectSearchConsoleProperty(organizationId, siteUrl)

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_TO_CANONICAL[result.errorCode], { extra: { reason: result.errorCode } })
    }

    return NextResponse.json({
      ok: true,
      status: result.connection.status,
      siteUrl: result.connection.siteUrl,
      organizationId: result.connection.organizationId
    })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'search_console_select_property', method: 'POST' }
    })

    return canonicalErrorResponse('search_console_sites_unavailable')
  }
}
