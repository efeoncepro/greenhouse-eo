import { NextResponse } from 'next/server'

import { canonicalErrorResponse, type CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { completeSearchConsoleConnection, type SearchConsoleCommandResult } from '@/lib/growth/search-console'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1282 — `GET /api/admin/growth/search-console/oauth/callback`
 *
 * Recibe el redirect de Google con `code`+`state`. La org + site provienen del state
 * consumido (server-side, single-use), NUNCA del browser. Defense-in-depth: además del
 * state, exige sesión interna + capability (el mismo operador que inició).
 *
 * El intercambio de `code` por tokens, la verificación de propiedad, la escritura del
 * refresh token a Secret Manager y el upsert de metadata viven en el command (Full API
 * Parity). El payload crudo de Google NUNCA se devuelve: errores sanitizados.
 */

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
  const googleError = url.searchParams.get('error')
  const code = url.searchParams.get('code')?.trim()
  const state = url.searchParams.get('state')?.trim()

  if (googleError || !code || !state) {
    return canonicalErrorResponse('search_console_oauth_state_invalid', {
      extra: { reason: googleError ?? 'missing_code_or_state' }
    })
  }

  try {
    const result = await completeSearchConsoleConnection({ rawState: state, code })

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
      tags: { source: 'search_console_oauth_callback', method: 'GET' }
    })

    return canonicalErrorResponse('search_console_oauth_failed')
  }
}
