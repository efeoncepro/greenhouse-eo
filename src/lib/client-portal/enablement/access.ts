import 'server-only'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { can } from '@/lib/entitlements/runtime'
import { getTenantAccessRecordFromPostgresByUserId } from '@/lib/tenant/access'

export type EnablementOperation = 'preview' | 'apply' | 'rollback'

/** Adapter supplies an authenticated user id; a request body never supplies the actor. */
export const authorizeServiceEnablement = async (authenticatedUserId: string, operation: EnablementOperation) => {
  const tenant = await getTenantAccessRecordFromPostgresByUserId(authenticatedUserId)

  const subject = tenant ? { ...tenant, memberId: tenant.memberId ?? undefined } : null

  if (!subject || !tenant?.active || tenant.status !== 'active' || tenant.tenantType !== 'efeonce_internal' ||
    !tenant.routeGroups.includes('admin') || !can(subject, 'client_portal.module.read_assignment', 'read', 'tenant')) {
    throw new ApiPlatformError('Service enablement administration is not allowed.', { statusCode: 403, errorCode: 'forbidden' })
  }

  if (operation === 'apply' && !can(subject, 'client_portal.module.enable', 'create', 'tenant') ||
    operation === 'rollback' && !can(subject, 'client_portal.module.pause', 'update', 'tenant')) {
    throw new ApiPlatformError('The module command is not allowed.', { statusCode: 403, errorCode: 'forbidden' })
  }

  return tenant
}

export const assertServiceEnablementWritesEnabled = () => {
  if (process.env.CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED !== 'true') {
    throw new ApiPlatformError('Service enablement writes are disabled.', { statusCode: 503, errorCode: 'service_unavailable' })
  }
}
