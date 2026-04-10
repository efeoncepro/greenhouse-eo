import 'server-only'

import type { DerivedTenantAccessContext } from '@/lib/tenant/authorization'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import { getPersonAccess } from '@/lib/people/permissions'
import { assertMemberInPeopleOrganizationScope } from '@/lib/people/organization-scope'
import { PeopleValidationError } from '@/lib/people/shared'

export const getPersonAccessForTenant = (
  tenant: Pick<TenantContext, 'roleCodes'>,
  accessContext: DerivedTenantAccessContext | null | undefined
) =>
  getPersonAccess(tenant.roleCodes, {
    supervisorScoped: accessContext?.accessMode === 'supervisor'
  })

export const resolveVisiblePeopleMemberIds = (
  accessContext: DerivedTenantAccessContext | null | undefined
) => (accessContext?.accessMode === 'supervisor' ? accessContext.supervisorScope?.visibleMemberIds ?? [] : null)

export const assertMemberVisibleInPeopleScope = async ({
  memberId,
  organizationId,
  accessContext
}: {
  memberId: string
  organizationId: string | null
  accessContext: DerivedTenantAccessContext | null | undefined
}) => {
  await assertMemberInPeopleOrganizationScope(memberId, organizationId)

  const visibleMemberIds = resolveVisiblePeopleMemberIds(accessContext)

  if (visibleMemberIds && !visibleMemberIds.includes(memberId)) {
    throw new PeopleValidationError('Person not found.', 404)
  }
}

export const assertPeopleCapability = ({
  allowed,
  message = 'Forbidden'
}: {
  allowed: boolean
  message?: string
}) => {
  if (!allowed) {
    throw new PeopleValidationError(message, 403)
  }
}
