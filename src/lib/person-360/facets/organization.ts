import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { PersonOrganizationFacet, FacetFetchContext } from '@/types/person-complete-360'

type MembershipRow = {
  membership_id: string
  organization_id: string
  organization_name: string
  space_name: string | null
  space_type: string | null
  membership_type: string | null
  role_label: string | null
  department: string | null
  is_primary: boolean
  start_date: string | null
  public_id: string | null
}

export const fetchOrganizationFacet = async (ctx: FacetFetchContext): Promise<PersonOrganizationFacet | null> => {
  const rows = await runGreenhousePostgresQuery<MembershipRow>(
    `SELECT
      pm.membership_id,
      pm.organization_id,
      o.organization_name,
      s.space_name,
      s.space_type,
      pm.membership_type,
      pm.role_label,
      pm.department,
      pm.is_primary,
      pm.start_date::text,
      o.public_id
    FROM greenhouse_core.person_memberships pm
    JOIN greenhouse_core.organizations o ON o.organization_id = pm.organization_id
    LEFT JOIN greenhouse_core.spaces s ON s.organization_id = pm.organization_id AND s.active = TRUE
    WHERE pm.profile_id = $1
      AND pm.active = TRUE
    ORDER BY pm.is_primary DESC, o.organization_name ASC`,
    [ctx.profileId]
  )

  if (rows.length === 0) return null

  const primary = rows.find(r => r.is_primary) ?? rows[0]

  return {
    memberships: rows.map(r => ({
      membershipId: r.membership_id,
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      spaceName: r.space_name,
      spaceType: r.space_type,
      membershipType: r.membership_type,
      roleLabel: r.role_label,
      department: r.department,
      isPrimary: r.is_primary,
      startDate: r.start_date ? r.start_date.slice(0, 10) : null
    })),
    primaryOrganization: primary
      ? {
          organizationId: primary.organization_id,
          organizationName: primary.organization_name,
          publicId: primary.public_id
        }
      : null
  }
}
