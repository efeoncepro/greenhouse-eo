import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { Person360, PersonProfileSummary } from '@/types/person-360'

type Person360Row = {

  // Identity anchor
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
  default_auth_mode: string | null

  // Resolved
  resolved_email: string | null
  resolved_display_name: string
  resolved_avatar_url: string | null
  resolved_phone: string | null
  resolved_job_title: string | null

  // Member facet
  member_id: string | null
  member_public_id: string | null
  member_display_name: string | null
  member_email: string | null
  member_phone: string | null
  job_level: string | null
  employment_type: string | null
  hire_date: string | null
  contract_end_date: string | null
  daily_required: boolean | null
  reports_to_member_id: string | null
  member_status: string | null
  member_active: boolean | null
  department_id: string | null
  department_name: string | null

  // User facet
  user_id: string | null
  user_public_id: string | null
  user_email: string | null
  user_full_name: string | null
  tenant_type: string | null
  auth_mode: string | null
  user_status: string | null
  user_active: boolean | null
  client_id: string | null
  client_name: string | null
  last_login_at: string | null
  avatar_url: string | null
  user_timezone: string | null
  default_portal_home_path: string | null
  microsoft_oid: string | null
  google_sub: string | null
  password_hash_algorithm: string | null

  // CRM facet
  crm_contact_id: string | null
  crm_display_name: string | null
  crm_email: string | null
  crm_job_title: string | null
  crm_phone: string | null
  crm_mobile_phone: string | null
  lifecycle_stage: string | null
  lead_status: string | null
  hubspot_contact_id: string | null

  // Aggregates
  user_count: number
  source_link_count: number
  linked_systems: string[] | null
  active_role_codes: string[] | null

  // Facet booleans
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
  eoId: row.eo_id,
  serialNumber: Number(row.serial_number),
  canonicalEmail: row.canonical_email,
  fullName: row.full_name,
  jobTitle: row.job_title,
  profileType: row.profile_type,
  identityStatus: row.identity_status,
  identityActive: row.identity_active,
  primarySourceSystem: row.primary_source_system,
  defaultAuthMode: row.default_auth_mode,

  resolved: {
    email: row.resolved_email,
    displayName: row.resolved_display_name ?? row.full_name,
    avatarUrl: row.resolved_avatar_url,
    phone: row.resolved_phone,
    jobTitle: row.resolved_job_title
  },

  memberFacet: row.member_id
    ? {
        memberId: row.member_id,
        memberPublicId: row.member_public_id,
        displayName: row.member_display_name ?? row.full_name,
        email: row.member_email,
        phone: row.member_phone,
        jobLevel: row.job_level,
        employmentType: row.employment_type,
        hireDate: row.hire_date,
        contractEndDate: row.contract_end_date,
        dailyRequired: row.daily_required ?? true,
        reportsToMemberId: row.reports_to_member_id,
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
        fullName: row.user_full_name,
        tenantType: row.tenant_type ?? 'client',
        authMode: row.auth_mode,
        status: row.user_status ?? 'unknown',
        active: row.user_active ?? false,
        clientId: row.client_id,
        clientName: row.client_name,
        lastLoginAt: row.last_login_at,
        avatarUrl: row.avatar_url,
        timezone: row.user_timezone,
        defaultPortalHomePath: row.default_portal_home_path,
        microsoftOid: row.microsoft_oid,
        googleSub: row.google_sub,
        passwordHashAlgorithm: row.password_hash_algorithm
      }
    : null,

  crmFacet: row.crm_contact_id
    ? {
        contactRecordId: row.crm_contact_id,
        displayName: row.crm_display_name,
        email: row.crm_email,
        jobTitle: row.crm_job_title,
        phone: row.crm_phone,
        mobilePhone: row.crm_mobile_phone,
        lifecycleStage: row.lifecycle_stage,
        leadStatus: row.lead_status,
        hubspotContactId: row.hubspot_contact_id
      }
    : null,

  userCount: Number(row.user_count) || 0,
  sourceLinkCount: Number(row.source_link_count) || 0,
  linkedSystems: row.linked_systems ?? [],
  activeRoleCodes: row.active_role_codes ?? [],

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

export const getPersonProfileByEoId = async (eoId: string): Promise<Person360 | null> => {
  const rows = await runGreenhousePostgresQuery<Person360Row>(
    `${PERSON_360_SELECT} WHERE eo_id = $1 LIMIT 1`,
    [eoId]
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

/** Flat projection of Person360 for self-service profile views */
export const toPersonProfileSummary = (p: Person360): PersonProfileSummary => ({
  resolvedDisplayName: p.resolved.displayName,
  resolvedEmail: p.resolved.email,
  resolvedPhone: p.resolved.phone,
  resolvedAvatarUrl: p.resolved.avatarUrl,
  resolvedJobTitle: p.resolved.jobTitle,
  departmentName: p.memberFacet?.departmentName ?? null,
  jobLevel: p.memberFacet?.jobLevel ?? null,
  employmentType: p.memberFacet?.employmentType ?? null,
  hireDate: p.memberFacet?.hireDate ?? null,
  hasMemberFacet: p.hasMemberFacet,
  hasUserFacet: p.hasUserFacet,
  hasCrmFacet: p.hasCrmFacet,
  linkedSystems: p.linkedSystems
})
