import 'server-only'

import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import type { EnablementOperation } from '@/lib/client-portal/enablement/access'
import { previewServiceEnablement } from '@/lib/client-portal/enablement/reader'
import { serviceEnablementRequestSchema } from '@/lib/client-portal/enablement/validation'

export const runEcosystemClientServiceEnablement = async ({ context, operation, body }: {
  context: ApiPlatformRequestContext; operation: EnablementOperation; body: unknown
}): Promise<{ data: unknown }> => {
  // Administrative inventory is internal-only. A client/space binding never obtains admin data.
  if (context.binding.greenhouseScopeType !== 'internal' || context.binding.organizationId) {
    throw new ApiPlatformError('Service enablement inventory requires internal administration scope.', { statusCode: 403, errorCode: 'scope_not_allowed' })
  }

  // A downstream consumer authenticates a MACHINE. Do not use createdBy, metadata or a body
  // actorUserId as human approval. The same denial is observable from API and MCP. Delegated
  // human authority travels through the app lane with a sister-platform bearer minted for the
  // human (`client_services.enablement.write`, RFC 8693 exchange), never through this binding.
  if (operation !== 'preview') throw new ApiPlatformError('An attributed human administration session is required. Use the app lane with a first-party session or a delegated bearer for the human.', {
    statusCode: 403, errorCode: 'invalid_delegated_context'
  })

  const input = serviceEnablementRequestSchema.safeParse(body)

  if (!input.success) throw new ApiPlatformError('Invalid service enablement input.', { statusCode: 400, errorCode: 'bad_request' })

  return { data: await previewServiceEnablement(input.data) }
}
