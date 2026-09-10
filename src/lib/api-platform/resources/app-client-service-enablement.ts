import 'server-only'

import { ZodError } from 'zod'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import {
  authorizeServiceEnablement,
  CLIENT_SERVICE_ENABLEMENT_DELEGATED_SCOPE,
  CLIENT_SERVICE_ENABLEMENT_EXCHANGE_CLIENT_ID,
  type EnablementOperation
} from '@/lib/client-portal/enablement/access'
import { applyServiceEnablement, rollbackServiceEnablement } from '@/lib/client-portal/enablement/commands'
import { previewServiceEnablement } from '@/lib/client-portal/enablement/reader'
import type { ServiceEnablementAuthority } from '@/lib/client-portal/enablement/types'
import { serviceEnablementApplySchema, serviceEnablementRequestSchema, serviceEnablementRollbackSchema } from '@/lib/client-portal/enablement/validation'
import { ClientPortalValidationError } from '@/lib/client-portal/commands/errors'

const HUMAN_OAUTH_SESSION_MODES = new Set(['credentials', 'both', 'microsoft_sso', 'google_sso'])

const denyDelegated = (message: string): never => {
  throw new ApiPlatformError(message, { statusCode: 403, errorCode: 'invalid_delegated_context' })
}

/**
 * Delegated human authority contract (TASK-1852, Full API Parity for writes).
 *
 * A sister-platform bearer is accepted only when it carries evidence that a HUMAN, not a
 * machine, is behind it and that this human delegated exactly this class of action:
 *   1. the token's capabilities include `client_services.enablement.write` (write implies inventory);
 *   2. the bearer has a durable client + token identity for provenance/revocation;
 *   3. the OAuth session is a human mode, or it is the RFC 8693 exchange client, which only mints
 *      for an Entra-verified internal human and records `agent` as its transport provenance;
 *   4. the human's tenant record is not itself a diagnostic agent.
 * Authorization is NOT decided here: the primitive re-reads the human's current administration
 * rights (admin route group + capability + active status) inside the command transaction.
 */
export const resolveServiceEnablementAuthority = (context: AppPlatformRequestContext, operation: EnablementOperation): ServiceEnablementAuthority => {
  if (context.authSource !== 'sister_platform_oauth') {
    if (operation !== 'preview' && context.tenant.authMode === 'agent') {
      denyDelegated('An attributed human administration session is required; an agent session cannot approve writes.')
    }

    return { kind: 'app_session' }
  }

  if (!context.oauthCapabilities.includes(CLIENT_SERVICE_ENABLEMENT_DELEGATED_SCOPE)) {
    throw new ApiPlatformError('The OAuth token does not grant service enablement.', { statusCode: 403, errorCode: 'scope_not_allowed' })
  }

  const clientId = context.oauthClientId ?? null
  const accessTokenId = context.oauthAccessTokenId ?? null
  const sessionMode = context.oauthSessionAuthMode ?? null

  if (!clientId || !accessTokenId) denyDelegated('The delegated bearer lacks durable client/token provenance.')

  const humanSession = sessionMode !== null && HUMAN_OAUTH_SESSION_MODES.has(sessionMode)
  const exchangedForHuman = sessionMode === 'agent' && clientId === CLIENT_SERVICE_ENABLEMENT_EXCHANGE_CLIENT_ID

  if (!humanSession && !exchangedForHuman) denyDelegated('The delegated bearer is not attributable to a human administrator.')
  if (context.tenant.authMode === 'agent') denyDelegated('A diagnostic agent identity cannot be the delegating human.')

  return { kind: 'delegated_oauth', clientId: clientId!, accessTokenId: accessTokenId!, correlationId: context.oauthCorrelationId ?? context.requestId }
}

export const runAppClientServiceEnablement = async ({ context, operation, body }: {
  context: AppPlatformRequestContext; operation: EnablementOperation; body: unknown
}): Promise<{ data: unknown; meta?: Record<string, unknown> }> => {
  const authority = resolveServiceEnablementAuthority(context, operation)

  try {
    if (operation === 'preview') {
      await authorizeServiceEnablement(context.tenant.userId, operation)

      return { data: await previewServiceEnablement(serviceEnablementRequestSchema.parse(body)) }
    }

    const result = operation === 'apply'
      ? await applyServiceEnablement(serviceEnablementApplySchema.parse(body), context.tenant.userId, authority)
      : await rollbackServiceEnablement(serviceEnablementRollbackSchema.parse(body), context.tenant.userId, authority)

    return { data: result.data, meta: { replayed: result.replayed, authority: authority.kind } }
  } catch (error) {
    if (error instanceof ZodError) throw new ApiPlatformError('Invalid service enablement input.', { statusCode: 400, errorCode: 'bad_request' })
    if (error instanceof ClientPortalValidationError) throw new ApiPlatformError(error.message, {
      statusCode: error.statusCode, errorCode: error.statusCode === 404 ? 'not_found' : 'bad_request'
    })

    throw error
  }
}
