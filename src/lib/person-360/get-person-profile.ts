import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { Person360 } from '@/types/person-360'

type Person360Row = {
  identity_profile_id: string
  identity_public_id: string | null
  canonical_email: string | null
  full_name: string
  job_title: string | null
  profile_type: string
  identity_status: string
  identity_active: boolean
  primary_source_system: string | null
  member_id: string | null
  member_public_id: string | null
  member_display_name: string | null
  member_email: string | null
  job_level: string | null
  employment_type: string | null
  hire_date: string | null
  member_status: string | null
  member_active: boolean | null
  department_id: string | null
  department_name: string | null
  user_id: string | null
  user_public_id: string | null
  user_email: string | null
  tenant_type: string | null
  auth_mode: string | null
  user_status: string | null
  user_active: boolean | null
  client_id: string | null
  client_name: string | null
  last_login_at: string | null
  crm_contact_id: string | null
  crm_display_name: string | null
  crm_email: string | null
  user_count: number
  source_link_count: number
  linked_systems: string[] | null
  has_member_facet: boolean
  has_user_facet: boolean
  has_crm_facet: boolean
  created_at: string | null
  updated_at: string | null
}

const PERSON_360_SELECT = `
  SELECT *
  FROM greenhouse_serving.person_360
`

const normalizeRow = (row: Person360Row): Person360 => ({
  identityProfileId: row.identity_profile_id,
  identityPublicId: row.identity_public_id,
  canonicalEmail: row.canonical_email,
  fullName: row.full_name,
  jobTitle: row.job_title,
  profileType: row.profile_type,
  identityStatus: row.identity_status,
  identityActive: row.identity_active,
  primarySourceSystem: row.primary_source_system,

  memberFacet: row.member_id
    ? {
        memberId: row.member_id,
        memberPublicId: row.member_public_id,
        displayName: row.member_display_name ?? row.full_name,
        email: row.member_email,
        jobLevel: row.job_level,
        employmentType: row.employment_type,
        hireDate: row.hire_date,
        status: row.member_status ?? 'unknown',
        active: row.member_active ?? false,
        departmentId: row.department_id,
        departmentName: row.department_name
      }
    : null,

  userFacet: row.user_id
    ? {
        userId: row.user_id,
        userPublicId: row.user_public_id,
        email: row.user_email,
        tenantType: row.tenant_type ?? 'client',
        authMode: row.auth_mode,
        status: row.user_status ?? 'unknown',
        active: row.user_active ?? false,
        clientId: row.client_id,
        clientName: row.client_name,
        lastLoginAt: row.last_login_at
      }
    : null,

  crmFacet: row.crm_contact_id
    ? {
        contactRecordId: row.crm_contact_id,
        displayName: row.crm_display_name,
        email: row.crm_email
      }
    : null,

  userCount: Number(row.user_count) || 0,
  sourceLinkCount: Number(row.source_link_count) || 0,
  linkedSystems: row.linked_systems ?? [],

  hasMemberFacet: row.has_member_facet,
  hasUserFacet: row.has_user_facet,
  hasCrmFacet: row.has_crm_facet
})

export const getPersonProfile = async (identityProfileId: string): Promise<Person360 | null> => {
  const rows = await runGreenhousePostgresQuery<Person360Row>(
    `${PERSON_360_SELECT} WHERE identity_profile_id = $1 LIMIT 1`,
    [identityProfileId]
  )

  return rows[0] ? normalizeRow(rows[0]) : null
}

export const getPersonProfileByMemberId = async (memberId: string): Promise<Person360 | null> => {
  const rows = await runGreenhousePostgresQuery<Person360Row>(
    `${PERSON_360_SELECT} WHERE member_id = $1 LIMIT 1`,
    [memberId]
  )

  return rows[0] ? normalizeRow(rows[0]) : null
}

export const getPersonProfileByUserId = async (userId: string): Promise<Person360 | null> => {
  const rows = await runGreenhousePostgresQuery<Person360Row>(
    `${PERSON_360_SELECT} WHERE user_id = $1 LIMIT 1`,
    [userId]
  )

  return rows[0] ? normalizeRow(rows[0]) : null
}
