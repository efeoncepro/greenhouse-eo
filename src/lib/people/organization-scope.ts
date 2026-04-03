import 'server-only'

import type { TenantAccessRecord } from '@/lib/tenant/access'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { PeopleValidationError } from './shared'

const normalizeOrganizationId = (request: Request) =>
  new URL(request.url).searchParams.get('organizationId')?.trim() || null

export const resolvePeopleOrganizationScope = (
  request: Request,
  tenant: Pick<TenantAccessRecord, 'tenantType' | 'organizationId'> | Pick<TenantContext, 'tenantType' | 'organizationId'>
): string | null => {
  const requestedOrganizationId = normalizeOrganizationId(request)

  if (tenant.tenantType === 'client') {
    if (
      requestedOrganizationId &&
      tenant.organizationId &&
      requestedOrganizationId !== tenant.organizationId
    ) {
      throw new PeopleValidationError('Forbidden', 403)
    }

    return tenant.organizationId || requestedOrganizationId
  }

  return requestedOrganizationId
}

export const memberHasOrganizationScope = async (
  memberId: string,
  organizationId: string
): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `
      SELECT 1
      FROM greenhouse_core.members m
      JOIN greenhouse_core.person_memberships pm
        ON pm.profile_id = m.identity_profile_id
       AND pm.active = TRUE
      WHERE m.member_id = $1
        AND m.active = TRUE
        AND pm.organization_id = $2
      LIMIT 1
    `,
    [memberId, organizationId]
  )

  return rows.length > 0
}

export const assertMemberInPeopleOrganizationScope = async (
  memberId: string,
  organizationId: string | null
) => {
  if (!organizationId) {
    return
  }

  const allowed = await memberHasOrganizationScope(memberId, organizationId)

  if (!allowed) {
    throw new PeopleValidationError('Person not found.', 404)
  }
}
