import 'server-only'

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { isExternalAccessError } from '@/lib/identity/external-access/errors'
import { resolveExternalAccess } from '@/lib/identity/external-access/resolve-external-access'
import { createRuntimeInternalContexts } from '@/lib/auth-server/internal/runtime'
import { readAuthServerOAuthConfig } from '@/lib/auth-server/oauth/config'
import { isCurrentInternalAccessToken } from '@/lib/auth-server/internal/access-token'
import { PostgresOAuthStore } from '@/lib/auth-server/oauth/store/postgres-store'
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

export type InternalIdentityBindingPayload = {
  population: 'internal'
  outcome: 'bound' | 'denied'
  cacheTtlSeconds: 0
  contextVersion: 1
  authorizationContextId: string
  reason?: string
  profileId?: string
  organizationId?: string
  bindingId?: string
  grantsVersion?: number
  capabilities?: readonly string[]
}
export type EcosystemIdentityBindingPayload =
  | (ExternalAccessResolution & { cacheTtlSeconds: number })
  | InternalIdentityBindingPayload

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
  const contextKeys = ['authorizationContextId', 'contextVersion', 'grantsVersion', 'audience', 'jti']
  const allKeys = ['environment', 'subject', 'clientId', ...contextKeys]

  if (
    allKeys.some(key => searchParams.getAll(key).length > 1) ||
    (!searchParams.has('authorizationContextId') && contextKeys.some(key => searchParams.has(key)))
  ) {
    throw new ApiPlatformError('Invalid authorization context parameters', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

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
    const contextId = searchParams.get('authorizationContextId')

    if (contextId !== null) {
      const config = readAuthServerOAuthConfig()
      const rawVersion = searchParams.get('contextVersion') ?? ''
      const rawGv = searchParams.get('grantsVersion') ?? ''
      const version = Number(rawVersion)
      const gv = Number(rawGv)
      const audience = searchParams.get('audience') ?? ''
      const jti = searchParams.get('jti') ?? ''

      if (
        !/^[A-Za-z0-9_-]{22}$/.test(jti) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contextId) ||
        rawVersion !== '1' ||
        !/^[1-9][0-9]*$/.test(rawGv) ||
        version !== 1 ||
        !Number.isSafeInteger(gv) ||
        gv < 1 ||
        !clientId ||
        environmentId !== config.environmentId ||
        audience !== config.mcpAudience
      ) {
        throw new ApiPlatformError('Invalid authorization context', { statusCode: 400, errorCode: 'bad_request' })
      }

      // The trusted gateway supplies jti from its verified JWT. Never accept a live context alone.
      // Issuer/audience/version/gv remain validated by config and the context resolver below.
      const tokenCurrent = await isCurrentInternalAccessToken(
        { jti, environmentId, subject, clientId, authorizationContextId: contextId },
        new PostgresOAuthStore()
      )

      if (!tokenCurrent)
        return {
          data: {
            population: 'internal',
            outcome: 'denied',
            cacheTtlSeconds: 0,
            contextVersion: 1,
            authorizationContextId: contextId,
            reason: 'token_invalid'
          },
          cacheControl: 'private, no-store'
        }

      const { contexts } = createRuntimeInternalContexts()

      const result = await contexts.resolve({
        id: contextId,
        version,
        issuer: config.issuer,
        environmentId,
        subject,
        clientId,
        audience,
        grantsVersion: gv
      })

      const data: InternalIdentityBindingPayload = result.allowed
        ? {
            population: 'internal',
            outcome: 'bound',
            cacheTtlSeconds: 0,
            contextVersion: 1,
            authorizationContextId: contextId,
            profileId: result.context.profileId,
            organizationId: result.context.organizationId,
            bindingId: result.context.bindingId,
            grantsVersion: result.grantsVersion,
            capabilities: result.capabilities
          }
        : {
            population: 'internal',
            outcome: 'denied',
            cacheTtlSeconds: 0,
            contextVersion: 1,
            authorizationContextId: contextId,
            reason: result.reason
          }

      return { data, cacheControl: 'private, no-store' }
    }

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
