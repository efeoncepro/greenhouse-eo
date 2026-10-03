import 'server-only'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

import { LoginAnnouncementError } from './types'

type ManagerGate = { actorId: string; response: null } | { actorId: null; response: Response }

/** TASK-1963 — Exige sesión de administración y `login_announcements.manage` con la acción pedida. */
export const requireLoginAnnouncementsManager = async (action: 'create' | 'update'): Promise<ManagerGate> => {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return { actorId: null, response: errorResponse ?? canonicalErrorResponse('unauthorized') }

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'login_announcements.manage', action, 'tenant'))
    return { actorId: null, response: canonicalErrorResponse('forbidden') }

  return { actorId: tenant.userId, response: null }
}

export const loginAnnouncementErrorResponse = (error: unknown) => {
  if (error instanceof LoginAnnouncementError)
    return canonicalErrorResponse(error.code === 'not_found' ? 'login_announcement_not_found' : 'invalid_request',
      error.code === 'invalid' ? { extra: { issues: error.issues } } : undefined)

  captureWithDomain(error, 'platform', { tags: { surface: 'login-announcements', task: 'TASK-1963' } })

  return canonicalErrorResponse('internal_error')
}
