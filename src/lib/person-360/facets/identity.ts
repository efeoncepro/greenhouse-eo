import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveAvatarUrl } from '@/lib/person-360/resolve-avatar'
import type { PersonIdentityFacet, FacetFetchContext } from '@/types/person-complete-360'

type IdentityRow = {
  identity_profile_id: string
  eo_id: string
  serial_number: number
  canonical_email: string | null
  full_name: string
  job_title: string | null
  profile_type: string
  identity_status: string
  identity_active: boolean
  primary_source_system: string | null
  resolved_email: string | null
  resolved_display_name: string
  resolved_avatar_url: string | null
  resolved_phone: string | null
  resolved_job_title: string | null
  member_id: string | null
  department_id: string | null
  department_name: string | null
  job_level: string | null
  employment_type: string | null
  hire_date: string | null
  contract_end_date: string | null
  user_id: string | null
  has_member_facet: boolean
  has_user_facet: boolean
  has_crm_facet: boolean
  linked_systems: string[] | null
  active_role_codes: string[] | null
}

export const fetchIdentityFacet = async (ctx: FacetFetchContext): Promise<PersonIdentityFacet | null> => {
  const rows = await runGreenhousePostgresQuery<IdentityRow>(
    `SELECT
      identity_profile_id, eo_id, serial_number, canonical_email, full_name,
      job_title, profile_type, identity_status, identity_active,
      primary_source_system, resolved_email, resolved_display_name,
      resolved_avatar_url, resolved_phone, resolved_job_title,
      member_id, department_id, department_name, job_level, employment_type,
      hire_date, contract_end_date, user_id,
      has_member_facet, has_user_facet, has_crm_facet,
      linked_systems, active_role_codes
    FROM greenhouse_serving.person_360
    WHERE identity_profile_id = $1
    LIMIT 1`,
    [ctx.profileId]
  )

  const row = rows[0]

  if (!row) return null

  return {
    identityProfileId: row.identity_profile_id,
    eoId: row.eo_id,
    serialNumber: Number(row.serial_number),
    canonicalEmail: row.canonical_email,
    resolvedDisplayName: row.resolved_display_name ?? row.full_name,
    resolvedEmail: row.resolved_email,
    resolvedPhone: row.resolved_phone,
    resolvedAvatarUrl: resolveAvatarUrl(row.resolved_avatar_url, row.user_id),
    resolvedJobTitle: row.resolved_job_title,
    departmentId: row.department_id,
    departmentName: row.department_name,
    jobLevel: row.job_level,
    employmentType: row.employment_type,
    hireDate: row.hire_date ? row.hire_date.slice(0, 10) : null,
    contractEndDate: row.contract_end_date ? row.contract_end_date.slice(0, 10) : null,
    profileType: row.profile_type,
    identityStatus: row.identity_status,
    identityActive: row.identity_active,
    primarySourceSystem: row.primary_source_system,
    hasMemberFacet: row.has_member_facet,
    hasUserFacet: row.has_user_facet,
    hasCrmFacet: row.has_crm_facet,
    linkedSystems: row.linked_systems ?? [],
    activeRoleCodes: row.active_role_codes ?? []
  }
}
