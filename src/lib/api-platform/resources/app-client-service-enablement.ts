import 'server-only'

import { ZodError } from 'zod'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { authorizeServiceEnablement, type EnablementOperation } from '@/lib/client-portal/enablement/access'
import { applyServiceEnablement, rollbackServiceEnablement } from '@/lib/client-portal/enablement/commands'
import { previewServiceEnablement } from '@/lib/client-portal/enablement/reader'
import { serviceEnablementApplySchema, serviceEnablementRequestSchema, serviceEnablementRollbackSchema } from '@/lib/client-portal/enablement/validation'
import { ClientPortalValidationError } from '@/lib/client-portal/commands/errors'

export const runAppClientServiceEnablement = async ({ context, operation, body }: {
  context: AppPlatformRequestContext; operation: EnablementOperation; body: unknown
}): Promise<{ data: unknown; meta?: Record<string, unknown> }> => {
  // The delegated OAuth lane needs a separate reviewed authority contract. A cookie/app session
  // already authenticates a human; the primitive refreshes the human's current administration rights.
  if (context.authSource === 'sister_platform_oauth' || (operation !== 'preview' && context.tenant.authMode === 'agent')) throw new ApiPlatformError('Delegated service enablement authority is unavailable.', {
    statusCode: 403, errorCode: 'invalid_delegated_context'
  })

  try {
    if (operation === 'preview') {
      await authorizeServiceEnablement(context.tenant.userId, operation)

      return { data: await previewServiceEnablement(serviceEnablementRequestSchema.parse(body)) }
    }

    const result = operation === 'apply'
      ? await applyServiceEnablement(serviceEnablementApplySchema.parse(body), context.tenant.userId)
      : await rollbackServiceEnablement(serviceEnablementRollbackSchema.parse(body), context.tenant.userId)

    return { data: result.data, meta: { replayed: result.replayed } }
  } catch (error) {
    if (error instanceof ZodError) throw new ApiPlatformError('Invalid service enablement input.', { statusCode: 400, errorCode: 'bad_request' })
    if (error instanceof ClientPortalValidationError) throw new ApiPlatformError(error.message, {
      statusCode: error.statusCode, errorCode: error.statusCode === 404 ? 'not_found' : 'bad_request'
    })

    throw error
  }
}
