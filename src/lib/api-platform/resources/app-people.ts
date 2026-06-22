import 'server-only'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import type { PeopleActivitySubject } from '@/lib/people/person-activity-access'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import {
  buildMemberPerformancePayload,
  resolveMemberPerformanceFromQuery,
  type MemberPerformancePayload
} from './people-performance-shared'

/**
 * API Platform app lane (first-party apps) del desempeño ICO por persona (TASK-1216, `people.v1`).
 * Consumer del MISMO primitive `readMemberIcoProfileForSubject` que Nexa, el ecosystem lane y la UI.
 *
 * A diferencia del ecosystem lane, el app lane SÍ tiene un usuario real (`context.tenant`): el subject
 * se mapea 1:1, así que la autorización People completa aplica (broad o supervisor → subárbol propio).
 * No se sintetiza ningún privilegio: lo que el usuario puede ver en la UI es exactamente lo que ve acá.
 */

const tenantToSubject = (tenant: TenantContext): PeopleActivitySubject => ({
  userId: tenant.userId,
  tenantType: tenant.tenantType,
  memberId: tenant.memberId ?? null,
  roleCodes: tenant.roleCodes,
  routeGroups: tenant.routeGroups,
  organizationId: tenant.organizationId ?? null
})

export const getAppMemberPerformancePayload = async ({
  context,
  request
}: {
  context: AppPlatformRequestContext
  request: Request
}): Promise<MemberPerformancePayload> => {
  const person = resolveMemberPerformanceFromQuery(request)
  const subject = tenantToSubject(context.tenant)

  return buildMemberPerformancePayload(subject, person)
}
