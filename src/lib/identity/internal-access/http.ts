import 'server-only'
import { canDelegateInternalCapability } from './delegation'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { captureWithDomain } from '@/lib/observability/capture'
import { InternalAccessError, type InternalAccessCapability, type InternalAccessCommandDependencies } from './commands'

export const requireInternalAccessOperator = async (capability: InternalAccessCapability) => {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return { operator: null, response: errorResponse ?? canonicalErrorResponse('unauthorized') }
  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, capability, 'execute', 'tenant'))
    return { operator: null, response: canonicalErrorResponse('forbidden') }

  const dependencies: InternalAccessCommandDependencies = {
    authorize: async (actorId, requested) => actorId === tenant.userId && can(subject, requested, 'execute', 'tenant'),
    canDelegate: canDelegateInternalCapability
  }

  return { operator: { actorId: tenant.userId, dependencies }, response: null }
}

export const internalAccessErrorResponse = (error: unknown) => {
  if (error instanceof InternalAccessError)
    return canonicalErrorResponse(
      error.code === 'forbidden'
        ? 'forbidden'
        : error.code === 'not_found'
          ? 'external_access_not_found'
          : 'auth_server_invalid_request'
    )
  captureWithDomain(error, 'identity', { tags: { surface: 'internal-access', task: 'TASK-1836' } })

  return canonicalErrorResponse('internal_error')
}
