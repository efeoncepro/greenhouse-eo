import 'server-only'

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { isExternalAccessError } from '@/lib/identity/external-access/errors'
import { resolveExternalAccess } from '@/lib/identity/external-access/resolve-external-access'
import type { ExternalAccessResolution } from '@/lib/identity/external-access/types'

/**
 * TASK-1631 — Lane ecosystem del reader de acceso externo (consumer: gateway MCP, TASK-1831).
 *
 *   GET /api/platform/ecosystem/identity/binding?environment=<id>&subject=<sub>[&clientId=<azp>]
 *       (+ externalScopeType/externalScopeId del binding sister-platform del gateway)
 *
 * Sólo un consumer con binding de scope `internal` (el gateway) puede resolver personas: para
 * cualquier otro binding la ruta responde `404` anti-oráculo, igual que el catálogo de skills.
 * La respuesta nunca incluye el subject ni el email; el gateway ya tiene el token.
 *
 * Contrato con el gateway: `outcome === 'bound'` ⇒ `memberships[]` con `organizationId`,
 * `grantsVersion` (igualdad estricta contra el `gv` del token) y `grants` (capabilities). Cualquier
 * otro outcome es deny; el gateway lo cachea ≤ 60 s (`cacheTtlSeconds`).
 */

export type EcosystemIdentityBindingPayload = ExternalAccessResolution & {
  cacheTtlSeconds: number
}

export const EXTERNAL_ACCESS_CACHE_TTL_SECONDS = 60

export const getEcosystemIdentityBindingPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemIdentityBindingPayload>> => {
  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Not found', { statusCode: 404, errorCode: 'not_found' })
  }

  const { searchParams } = new URL(request.url)
  const environmentId = searchParams.get('environment')?.trim() ?? ''
  const subject = searchParams.get('subject')?.trim() ?? ''
  const clientId = searchParams.get('clientId')?.trim() || null

  if (!environmentId || !subject) {
    throw new ApiPlatformError('Missing required query params: environment, subject', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  try {
    const resolution = await resolveExternalAccess({ environmentId, subject, clientId })

    return {
      data: { ...resolution, cacheTtlSeconds: EXTERNAL_ACCESS_CACHE_TTL_SECONDS },
      cacheControl: 'private, no-store'
    }
  } catch (error) {
    if (isExternalAccessError(error) && error.code === 'invalid_request') {
      throw new ApiPlatformError('Invalid environment or subject', {
        statusCode: 400,
        errorCode: 'bad_request',
        details: error.details ?? null
      })
    }

    throw error
  }
}
